import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type {
  CanonicalJsonValue,
  ResourceArtifactValidationResult,
  ResourceCheckPacket,
  ResourceDiff,
  ResourceDiffState,
  ResourceInventory,
  ResourceLock,
  ResourcePlan,
  ResourceSelectionPolicyEnvelope,
  ResourceSourceReference,
  ResourceValidationIssue,
  WorkOrder,
  WorkOrderValidationResult
} from "./types.js";

const ignoredNames = new Set([".git", "node_modules", "dist", "coverage", "tmp"]);
const workOrderTaskClasses = new Set(["small_fix", "architecture_sensitive", "billing_sensitive", "migration_sensitive", "docs", "browser_qa", "other"]);
const workOrderKnowledgeStates = new Set(["known", "partial", "unknown"]);
const workOrderRepositoryStates = new Set(["known", "unknown"]);
const workOrderHostStates = new Set(["known", "unknown"]);
const workOrderEvidenceStatuses = new Set(["required", "optional", "unknown"]);
const workOrderRiskSignals = new Set([
  "brownfield_or_unfamiliar_repository",
  "integration_or_provider_change",
  "migration_or_major_dependency_upgrade",
  "cross_service_or_cross_layer",
  "permission_sensitive",
  "external_or_irreversible_effect",
  "publish_deploy_or_production_change",
  "large_review_burden",
  "high_rollback_cost",
  "unattended_or_long_running",
  "other"
]);
const scenarioCatalog: Record<string, { description: string; sources: ResourceSourceReference[]; actions: string[] }> = {
  "auth-redirect-bug": {
    description: "Public-safe preview scenario for advisory resource planning.",
    sources: [{ kind: "fixture", label: "auth redirect bug fixture" }],
    actions: ["inspect redirect flow", "compare expected artifact coverage", "hand off advisory notes"]
  }
};

export function listResourceScenarios(): string[] {
  return Object.keys(scenarioCatalog);
}

export function canonicalizeResourceArtifact(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(canonicalizeResourceArtifact);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, canonicalizeResourceArtifact(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries) as CanonicalJsonValue;
  }
  return null;
}

export function computeResourceArtifactDigest(value: unknown): string {
  const canonical = JSON.stringify(canonicalizeResourceArtifact(value));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildBeforeBuildPacket(scenario: string): ResourceCheckPacket {
  const entry = scenarioCatalog[scenario] ?? scenarioCatalog["auth-redirect-bug"];
  return { kind: "resource-check", scenario, advisoryOnly: true, state: "unknown", sources: entry.sources };
}

export function buildResourcePlan(scenario: string): ResourcePlan {
  const entry = scenarioCatalog[scenario] ?? scenarioCatalog["auth-redirect-bug"];
  const resourceCheck = buildBeforeBuildPacket(scenario);
  const selectionPolicy: ResourceSelectionPolicyEnvelope = {
    kind: "selection-policy",
    scenario,
    advisoryOnly: true,
    unknownMeans: "insufficient-evidence",
    allowedKinds: ["read-only", "public-safe", "fixture"]
  };
  const plan: ResourcePlan = {
    kind: "resource-plan",
    scenario,
    advisoryOnly: true,
    resourceCheck,
    selectionPolicy,
    proposedActions: entry.actions,
    sources: entry.sources,
    digest: ""
  };
  return { ...plan, digest: computeResourceArtifactDigest({ ...plan, digest: undefined }) };
}

export function buildResourceLock(plan: ResourcePlan, inventory: ResourceInventory): ResourceLock {
  const lock: ResourceLock = {
    kind: "resource-lock",
    scenario: plan.scenario,
    advisoryOnly: true,
    planDigest: plan.digest,
    inventoryDigest: inventory.digest,
    resourcePlanDigest: plan.digest,
    resources: inventory.files.map((file) => file.path),
    sources: plan.sources,
    digest: ""
  };
  return { ...lock, digest: computeResourceArtifactDigest({ ...lock, digest: undefined }) };
}

export function buildResourceInventory(root: string): ResourceInventory {
  const absoluteRoot = resolve(root);
  const files: ResourceInventory["files"] = [];
  const warnings: ResourceValidationIssue[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (ignoredNames.has(entry.name)) continue;
      const full = join(current, entry.name);
      let stat;
      try {
        stat = lstatSync(full);
      } catch {
        warnings.push({ level: "warning", code: "inventory.unreadable", message: "Unreadable path skipped", path: relative(absoluteRoot, full) });
        continue;
      }
      const rel = relative(absoluteRoot, full).split(sep).join("/");
      if (stat.isSymbolicLink()) {
        files.push({ path: rel, size: 0, kind: "symlink" });
        continue;
      }
      if (stat.isDirectory()) {
        files.push({ path: rel, size: 0, kind: "directory" });
        walk(full);
        continue;
      }
      const redactedSecrets = /secret|token|password|authorization/i.test(entry.name) ? ["secret-shaped-key"] : undefined;
      files.push({ path: rel, size: stat.size, kind: "file", redactedSecrets });
    }
  };
  walk(absoluteRoot);
  const inventory: ResourceInventory = { kind: "resource-inventory", root: absoluteRoot, files, warnings, digest: "" };
  return { ...inventory, digest: computeResourceArtifactDigest({ ...inventory, digest: undefined }) };
}

export function scanResourceInventory(root: string): ResourceInventory {
  return buildResourceInventory(root);
}

export function buildResourceDiff(before: unknown, after: unknown): ResourceDiff {
  const beforeDigest = computeResourceArtifactDigest(before);
  const afterDigest = computeResourceArtifactDigest(after);
  const state: ResourceDiffState = beforeDigest === afterDigest ? "clean" : "changed";
  return { kind: "resource-diff", advisoryOnly: true, state, beforeDigest, afterDigest, changes: state === "clean" ? [] : ["semantic-digest-changed"], warnings: [], digest: computeResourceArtifactDigest({ state, beforeDigest, afterDigest }) };
}

export function diffResourceArtifacts(before: unknown, after: unknown): ResourceDiff {
  return buildResourceDiff(before, after);
}

export function validateResourceArtifact(input: unknown): ResourceArtifactValidationResult {
  if (typeof input !== "object" || input === null) return { ok: false, errors: [{ level: "error", code: "root.not_object", message: "Artifact must be an object" }], warnings: [] };
  const kind = (input as Record<string, unknown>).kind;
  if (typeof kind !== "string") return { ok: false, errors: [{ level: "error", code: "root.kind", message: "kind is required" }], warnings: [] };
  const warnings: ResourceValidationIssue[] = [];
  const errors: ResourceValidationIssue[] = [];
  if ((input as any).digest && typeof (input as any).digest !== "string") warnings.push({ level: "warning", code: "artifact.digest", message: "digest should be a string" });
  return { ok: errors.length === 0, kind, errors, warnings, digest: computeResourceArtifactDigest({ ...(input as Record<string, unknown>), digest: undefined }) };
}

export function renderResourceArtifactJson(value: unknown): string {
  return JSON.stringify(canonicalizeResourceArtifact(value), null, 2) + "\n";
}

export function renderResourceArtifactMarkdown(value: unknown): string {
  const artifact = value as Record<string, unknown>;
  const lines = [`# ${(artifact.kind as string) ?? "resource-artifact"}`, "", `- advisoryOnly: ${String(artifact.advisoryOnly ?? false)}`];
  if (typeof artifact.state === "string") lines.push(`- state: ${artifact.state}`);
  if (Array.isArray(artifact.proposedActions)) lines.push("", "## Proposed Actions", ...artifact.proposedActions.map((action) => `- ${action}`));
  return lines.join("\n") + "\n";
}

function pushIssue(issues: ResourceValidationIssue[], level: ResourceValidationIssue["level"], code: string, message: string, path?: string) {
  issues.push({ level, code, message, path });
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function dedupeSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)))].sort((a, b) => a.localeCompare(b));
}

function normalizeWorkOrder(input: WorkOrder): WorkOrder {
  const acceptance = input.acceptance_criteria;
  const repository = input.repository;
  const selectedHost = input.selected_host;
  const expected = input.expected_duration_or_risk;
  return {
    ...input,
    task_text: normalizeText(input.task_text),
    work_order_id: normalizeText(input.work_order_id),
    acceptance_criteria: {
      ...acceptance,
      items: acceptance.items.map((item) => normalizeText(item))
    },
    repository: {
      ...repository,
      repository_ref: repository.repository_ref !== undefined ? normalizeText(repository.repository_ref) : undefined,
      revision: repository.revision !== undefined ? normalizeText(repository.revision) : undefined,
      scope: repository.scope ? dedupeSorted(repository.scope) : repository.scope
    },
    selected_host: {
      ...selectedHost,
      host_id: selectedHost.host_id !== undefined ? normalizeText(selectedHost.host_id) : undefined
    },
    expected_duration_or_risk: expected
      ? {
          ...expected,
          risk_signals: expected.risk_signals ? dedupeSorted(expected.risk_signals) as WorkOrder["expected_duration_or_risk"] extends infer E ? E extends { risk_signals?: infer R } ? R : never : never : expected.risk_signals
        }
      : undefined,
    user_constraints: input.user_constraints ? dedupeSorted(input.user_constraints) : input.user_constraints,
    prohibited_scope: input.prohibited_scope ? dedupeSorted(input.prohibited_scope) : input.prohibited_scope,
    required_evidence: input.required_evidence.map((entry) => ({
      ...entry,
      evidence_id: normalizeText(entry.evidence_id),
      description: normalizeText(entry.description)
    }))
  };
}

function workOrderDigestCandidate(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const workOrder = value as Record<string, unknown>;
  if (!Array.isArray(workOrder.required_evidence) || !workOrder.acceptance_criteria || !workOrder.repository || !workOrder.selected_host) {
    const { spec_digest, ...rest } = workOrder;
    return rest;
  }
  return { ...normalizeWorkOrder(workOrder as WorkOrder), spec_digest: undefined };
}

function computeWorkOrderDigest(value: unknown): string {
  return `sha256:${computeResourceArtifactDigest(workOrderDigestCandidate(value))}`;
}

function isSecretLike(value: string): boolean {
  return [
    /(?:^|[\s"'`])(?:sk|pk|rk|ghp|gho|ghu|ghs|xox[baprs]-|ya29\.)[A-Za-z0-9_\-]{8,}/i,
    /(?:api[_-]?key|secret|password|passwd|token|session|cookie)\s*[:=]\s*[^,\s]+/i,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/
  ].some((pattern) => pattern.test(value));
}

function hasUnknownProperties(value: Record<string, unknown>, allowedKeys: string[]): string[] {
  return Object.keys(value).filter((key) => !allowedKeys.includes(key));
}

function scanWorkOrderPublicSecrets(value: unknown, path: string[] = []): Array<{ path: string; value: string }> {
  if (typeof value === "string") return isSecretLike(value) ? [{ path: path.join("."), value }] : [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => scanWorkOrderPublicSecrets(item, [...path, String(index)]));
  }
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => scanWorkOrderPublicSecrets(nested, [...path, key]));
}

export function buildWorkOrder(input: Omit<WorkOrder, "spec_digest"> & { spec_digest?: string }): WorkOrder {
  const workOrder: WorkOrder = { ...input, spec_digest: "" as WorkOrder["spec_digest"] };
  return { ...normalizeWorkOrder(workOrder), spec_digest: computeWorkOrderDigest(workOrder) as WorkOrder["spec_digest"] };
}

export function validateWorkOrder(input: unknown): WorkOrderValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: [{ level: "error", code: "root.not_object", message: "WorkOrder must be an object" }], warnings: [], digest: computeResourceArtifactDigest(input) };
  }

  const workOrder = input as Record<string, unknown>;
  const errors: WorkOrderValidationResult["errors"] = [];
  const warnings: WorkOrderValidationResult["warnings"] = [];
  const allowedRootKeys = ["schema_version", "work_order_id", "task_text", "task_class", "acceptance_criteria", "repository", "selected_host", "expected_duration_or_risk", "user_constraints", "prohibited_scope", "required_evidence", "spec_digest", "locked", "runtime_advisory_only"];
  for (const key of hasUnknownProperties(workOrder, allowedRootKeys)) pushIssue(errors, "error", "work_order.unknown_property", `Unknown property '${key}' is not allowed`, key);
  const requiredStringFields: Array<keyof Pick<WorkOrder, "schema_version" | "work_order_id" | "task_text">> = ["schema_version", "work_order_id", "task_text"];
  for (const field of requiredStringFields) {
    if (typeof workOrder[field] !== "string" || String(workOrder[field]).length === 0) pushIssue(errors, "error", `work_order.${String(field)}`, `${String(field)} must be a non-empty string`, String(field));
  }
  if (workOrder.schema_version !== "0.1.0") pushIssue(errors, "error", "work_order.schema_version", "schema_version must be 0.1.0", "schema_version");
  if (!workOrderTaskClasses.has(String(workOrder.task_class))) pushIssue(errors, "error", "work_order.task_class", "task_class is invalid", "task_class");
  if (workOrder.runtime_advisory_only !== true) pushIssue(errors, "error", "work_order.runtime_advisory_only", "runtime_advisory_only must be true", "runtime_advisory_only");
  if (typeof workOrder.acceptance_criteria !== "object" || workOrder.acceptance_criteria === null) {
    pushIssue(errors, "error", "work_order.acceptance_criteria", "acceptance_criteria must be an object", "acceptance_criteria");
  } else {
    const acceptance = workOrder.acceptance_criteria as Record<string, unknown>;
    for (const key of hasUnknownProperties(acceptance, ["knowledge_state", "items"])) pushIssue(errors, "error", "work_order.acceptance_criteria.unknown_property", `Unknown property '${key}' is not allowed`, `acceptance_criteria.${key}`);
    if (!workOrderKnowledgeStates.has(String(acceptance.knowledge_state))) pushIssue(errors, "error", "work_order.acceptance_criteria.knowledge_state", "knowledge_state is invalid", "acceptance_criteria.knowledge_state");
    if (!Array.isArray(acceptance.items) || acceptance.items.some((item) => typeof item !== "string" || normalizeText(item).length === 0)) pushIssue(errors, "error", "work_order.acceptance_criteria.items", "items must be an array of non-empty strings", "acceptance_criteria.items");
  }
  if (typeof workOrder.repository !== "object" || workOrder.repository === null) {
    pushIssue(errors, "error", "work_order.repository", "repository must be an object", "repository");
  } else {
    const repository = workOrder.repository as Record<string, unknown>;
    for (const key of hasUnknownProperties(repository, ["repository_ref", "revision_state", "revision", "scope_state", "scope"])) pushIssue(errors, "error", "work_order.repository.unknown_property", `Unknown property '${key}' is not allowed`, `repository.${key}`);
    if (!workOrderRepositoryStates.has(String(repository.revision_state))) pushIssue(errors, "error", "work_order.repository.revision_state", "revision_state is invalid", "repository.revision_state");
    if (!workOrderRepositoryStates.has(String(repository.scope_state))) pushIssue(errors, "error", "work_order.repository.scope_state", "scope_state is invalid", "repository.scope_state");
    if (repository.revision_state === "known" && typeof repository.revision !== "string") pushIssue(errors, "error", "work_order.repository.revision", "revision is required when revision_state is known", "repository.revision");
    if (repository.scope_state === "known" && (!Array.isArray(repository.scope) || repository.scope.some((item) => typeof item !== "string" || normalizeText(item).length === 0))) pushIssue(errors, "error", "work_order.repository.scope", "scope is required when scope_state is known", "repository.scope");
  }
  if (typeof workOrder.selected_host !== "object" || workOrder.selected_host === null) {
    pushIssue(errors, "error", "work_order.selected_host", "selected_host must be an object", "selected_host");
  } else {
    const selectedHost = workOrder.selected_host as Record<string, unknown>;
    for (const key of hasUnknownProperties(selectedHost, ["knowledge_state", "host_id"])) pushIssue(errors, "error", "work_order.selected_host.unknown_property", `Unknown property '${key}' is not allowed`, `selected_host.${key}`);
    if (!workOrderHostStates.has(String(selectedHost.knowledge_state))) pushIssue(errors, "error", "work_order.selected_host.knowledge_state", "knowledge_state is invalid", "selected_host.knowledge_state");
    if (selectedHost.knowledge_state === "known" && typeof selectedHost.host_id !== "string") pushIssue(errors, "error", "work_order.selected_host.host_id", "host_id is required when knowledge_state is known", "selected_host.host_id");
  }
  if (Array.isArray(workOrder.required_evidence)) {
    workOrder.required_evidence.forEach((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        pushIssue(errors, "error", "work_order.required_evidence.entry", "evidence entry must be an object", `required_evidence.${index}`);
        return;
      }
      const evidence = entry as Record<string, unknown>;
      for (const key of hasUnknownProperties(evidence, ["evidence_id", "description", "status"])) pushIssue(errors, "error", "work_order.required_evidence.unknown_property", `Unknown property '${key}' is not allowed`, `required_evidence.${index}.${key}`);
      if (typeof evidence.evidence_id !== "string" || normalizeText(evidence.evidence_id).length === 0) pushIssue(errors, "error", "work_order.required_evidence.evidence_id", "evidence_id must be a non-empty string", `required_evidence.${index}.evidence_id`);
      if (typeof evidence.description !== "string" || normalizeText(evidence.description).length === 0) pushIssue(errors, "error", "work_order.required_evidence.description", "description must be a non-empty string", `required_evidence.${index}.description`);
      if (!workOrderEvidenceStatuses.has(String(evidence.status))) pushIssue(errors, "error", "work_order.required_evidence.status", "status is invalid", `required_evidence.${index}.status`);
    });
  } else {
    pushIssue(errors, "error", "work_order.required_evidence", "required_evidence must be an array", "required_evidence");
  }
  if (typeof workOrder.expected_duration_or_risk === "object" && workOrder.expected_duration_or_risk !== null) {
    const expected = workOrder.expected_duration_or_risk as Record<string, unknown>;
    for (const key of hasUnknownProperties(expected, ["expected_duration_minutes", "risk_signals"])) pushIssue(errors, "error", "work_order.expected_duration_or_risk.unknown_property", `Unknown property '${key}' is not allowed`, `expected_duration_or_risk.${key}`);
    if (expected.expected_duration_minutes !== undefined && (!Number.isInteger(expected.expected_duration_minutes) || (expected.expected_duration_minutes as number) < 0)) pushIssue(errors, "error", "work_order.expected_duration_or_risk.expected_duration_minutes", "expected_duration_minutes must be a non-negative integer", "expected_duration_or_risk.expected_duration_minutes");
    if (Array.isArray(expected.risk_signals) && expected.risk_signals.some((item) => typeof item !== "string" || !workOrderRiskSignals.has(item))) pushIssue(errors, "error", "work_order.expected_duration_or_risk.risk_signals", "risk_signals contains an invalid value", "expected_duration_or_risk.risk_signals");
  }
  if (Array.isArray(workOrder.user_constraints) && workOrder.user_constraints.some((item) => typeof item !== "string" || normalizeText(item).length === 0)) pushIssue(errors, "error", "work_order.user_constraints", "user_constraints must be non-empty strings", "user_constraints");
  if (Array.isArray(workOrder.prohibited_scope) && workOrder.prohibited_scope.some((item) => typeof item !== "string" || normalizeText(item).length === 0)) pushIssue(errors, "error", "work_order.prohibited_scope", "prohibited_scope must be non-empty strings", "prohibited_scope");
  const computedDigest = computeWorkOrderDigest(workOrder);
  if (typeof workOrder.spec_digest === "string") {
    if (!/^sha256:[0-9a-f]{64}$/.test(workOrder.spec_digest)) {
      pushIssue(errors, "error", "work_order.spec_digest", "spec_digest must be a sha256 digest", "spec_digest");
    } else if (workOrder.spec_digest !== computedDigest) {
      pushIssue(errors, "error", "work_order.spec_digest", "spec_digest does not match the canonical WorkOrder digest", "spec_digest");
    }
  } else if (workOrder.locked === true) {
    pushIssue(errors, "error", "work_order.spec_digest", "spec_digest is required when locked is true", "spec_digest");
  }
  for (const issue of scanWorkOrderPublicSecrets({
    schema_version: workOrder.schema_version,
    work_order_id: workOrder.work_order_id,
    task_text: workOrder.task_text,
    task_class: workOrder.task_class,
    acceptance_criteria: workOrder.acceptance_criteria,
    repository: workOrder.repository,
    selected_host: workOrder.selected_host,
    expected_duration_or_risk: workOrder.expected_duration_or_risk,
    user_constraints: workOrder.user_constraints,
    prohibited_scope: workOrder.prohibited_scope,
    required_evidence: workOrder.required_evidence,
    spec_digest: workOrder.spec_digest,
    locked: workOrder.locked,
    runtime_advisory_only: workOrder.runtime_advisory_only
  }, ["work_order"])) {
    pushIssue(errors, "error", "work_order.secret_like_value", "Secret-like values are not allowed in public WorkOrder fields", issue.path || "work_order");
  }
  return { ok: errors.length === 0, errors, warnings, digest: computedDigest };
}

export function renderWorkOrderJson(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(canonicalizeResourceArtifact(workOrderDigestCandidate(value)), null, 2) + "\n";
    } catch {
      return JSON.stringify(canonicalizeResourceArtifact(value), null, 2) + "\n";
    }
  }
  return JSON.stringify(canonicalizeResourceArtifact(value), null, 2) + "\n";
}

export function renderWorkOrderMarkdown(value: unknown): string {
  const workOrder = value as Record<string, unknown>;
  const lines = [`# WorkOrder`, "", `- work_order_id: ${String(workOrder.work_order_id ?? "")}`, `- task_class: ${String(workOrder.task_class ?? "")}`, `- runtime_advisory_only: ${String(workOrder.runtime_advisory_only ?? false)}`];
  if (typeof workOrder.task_text === "string") lines.push("", "## Task", workOrder.task_text);
  if (Array.isArray(workOrder.required_evidence)) {
    lines.push("", "## Required Evidence", ...workOrder.required_evidence.map((item) => {
      const evidence = item as Record<string, unknown>;
      return `- ${String(evidence.evidence_id ?? "")}: ${String(evidence.description ?? "")} (${String(evidence.status ?? "")})`;
    }));
  }
  if (Array.isArray(workOrder.prohibited_scope) && workOrder.prohibited_scope.length > 0) lines.push("", "## Prohibited Scope", ...workOrder.prohibited_scope.map((item) => `- ${String(item)}`));
  return lines.join("\n") + "\n";
}
