import { createHash } from "node:crypto";
import { publicSafeScenarios } from "./fixtures.js";
import type {
  ApprovalRequirement,
  ContextBudget,
  EvidenceReference,
  MinimumApprovedResourceSet,
  MinimumApprovedResourceSetInput,
  MinimumToolsetEvaluation,
  SelectionCandidate,
  SelectionDecision,
  SelectionPolicyConflict,
  SelectionPolicyEnvelope,
  SelectionPolicyRule,
  SelectionTraceEntry
} from "./types.js";
import { canonicalizeResourceArtifact } from "./resource-plan.js";

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalizeResourceArtifact(value));
}

export function computeSelectionDigest(value: unknown): string {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

export function buildSelectionPolicyEnvelope(input: Omit<SelectionPolicyEnvelope, "envelope_digest"> & { envelope_digest?: string }): SelectionPolicyEnvelope {
  const envelope = { ...input, envelope_digest: "" };
  return { ...envelope, envelope_digest: computeSelectionDigest({ ...envelope, envelope_digest: undefined }) };
}

export function validateSelectionPolicyEnvelope(input: unknown): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["envelope must be an object"], warnings };
  const envelope = input as Partial<SelectionPolicyEnvelope>;
  if (envelope.schema_version !== "0.1.0") errors.push("schema_version must be 0.1.0");
  if (typeof envelope.envelope_id !== "string") errors.push("envelope_id must be a string");
  if (typeof envelope.envelope_digest !== "string") errors.push("envelope_digest must be a string");
  if (!Array.isArray(envelope.allowed_resources)) errors.push("allowed_resources must be an array");
  if (!Array.isArray(envelope.denied_resources)) errors.push("denied_resources must be an array");
  if (!Array.isArray(envelope.required_approvals)) errors.push("required_approvals must be an array");
  if (!Array.isArray(envelope.rules)) errors.push("rules must be an array");
  if (!Array.isArray(envelope.conflicts)) errors.push("conflicts must be an array");
  if (envelope.runtime_advisory_only !== true) errors.push("runtime_advisory_only must be true");
  return { ok: errors.length === 0, errors, warnings };
}

export function renderSelectionPolicyEnvelopeJson(input: SelectionPolicyEnvelope): string {
  return JSON.stringify(input, null, 2) + "\n";
}

export function renderSelectionPolicyEnvelopeMarkdown(input: SelectionPolicyEnvelope): string {
  return [
    `# selection-policy-envelope`,
    "",
    `- schema_version: ${input.schema_version}`,
    `- task_class: ${input.task_class}`,
    `- phase: ${input.phase}`,
    `- host_context: ${input.host_context}`,
    `- allowed_resources: ${input.allowed_resources.length}`,
    `- denied_resources: ${input.denied_resources.length}`,
    `- ask_first_resources: ${input.ask_first_resources.length}`,
    `- sandbox_only_resources: ${input.sandbox_only_resources.length}`,
    `- runtime_advisory_only: ${String(input.runtime_advisory_only)}`
  ].join("\n") + "\n";
}

function decisionRank(decision: SelectionDecision): number {
  return { selected: 0, ask_first: 1, sandbox_only: 2, deferred: 3, unknown: 4, denied: 5 }[decision];
}

function selectDecision(candidate: SelectionCandidate, envelope: SelectionPolicyEnvelope, requiredCapabilities: string[]): { decision: SelectionDecision; reason_code: string; human_explanation: string } {
  if (envelope.denied_resources.includes(candidate.resource_id) || candidate.evidence_status === "missing") {
    return { decision: "denied", reason_code: "forbidden_resource", human_explanation: "Resource is explicitly denied or missing required evidence." };
  }
  if (candidate.ask_first || envelope.ask_first_resources.includes(candidate.resource_id)) {
    return { decision: "ask_first", reason_code: "approval_required", human_explanation: "Resource requires explicit review before selection." };
  }
  if (candidate.sandbox_only || envelope.sandbox_only_resources.includes(candidate.resource_id)) {
    return { decision: "sandbox_only", reason_code: "sandbox_only", human_explanation: "Resource is limited to sandbox-only use." };
  }
  const satisfies = requiredCapabilities.every((capability) => candidate.capability.includes(capability));
  if (!satisfies) return { decision: "deferred", reason_code: "unnecessary_for_task", human_explanation: "Resource does not satisfy the required capability set." };
  if (candidate.evidence_status === "stale") return { decision: "unknown", reason_code: "stale_evidence", human_explanation: "Evidence is stale and needs review." };
  return { decision: "selected", reason_code: "required_capability", human_explanation: "Resource satisfies the required capability set." };
}

export function selectMinimumApprovedResources(input: MinimumApprovedResourceSetInput): MinimumApprovedResourceSet {
  const sortedCandidates = [...input.candidates].sort((a, b) => a.resource_id.localeCompare(b.resource_id));
  const trace: SelectionTraceEntry[] = [];
  const selected: SelectionCandidate[] = [];
  const denied: string[] = [];
  const deferred: string[] = [];
  const askFirst: string[] = [];
  const sandboxOnly: string[] = [];
  const unknown: string[] = [];

  for (const candidate of sortedCandidates) {
    const result = selectDecision(candidate, input.envelope, input.requiredCapabilities);
    const entry: SelectionTraceEntry = {
      resource_id: candidate.resource_id,
      decision: result.decision,
      reason_code: result.reason_code,
      human_explanation: result.human_explanation,
      policy_layer: "selection-policy-envelope",
      evidence_refs: [candidate.source, ...input.evidence]
    };
    trace.push(entry);
    if (result.decision === "selected") selected.push(candidate);
    if (result.decision === "denied") denied.push(candidate.resource_id);
    if (result.decision === "deferred") deferred.push(candidate.resource_id);
    if (result.decision === "ask_first") askFirst.push(candidate.resource_id);
    if (result.decision === "sandbox_only") sandboxOnly.push(candidate.resource_id);
    if (result.decision === "unknown") unknown.push(candidate.resource_id);
  }

  const selectedResources = selected.map((candidate) => candidate.resource_id);
  const selectedTools = [...new Set(selected.map((candidate) => candidate.tool_name).filter((value): value is string => Boolean(value)))].sort();
  const budgetBefore = input.envelope.context_budget;
  const budgetAfter: ContextBudget = {
    maximum_resource_count: selectedResources.length,
    maximum_tool_schema_count: selectedTools.length,
    maximum_attempt_count: budgetBefore.maximum_attempt_count,
    maximum_duration_minutes: budgetBefore.maximum_duration_minutes
  };
  const selection: MinimumApprovedResourceSet = {
    schema_version: "0.1.0",
    selection_id: computeSelectionDigest({ hostContext: input.hostContext, selectedResources, selectedTools, taskClass: input.envelope.task_class }),
    selection_digest: "",
    task_class: input.envelope.task_class,
    host_context: input.hostContext,
    candidate_resources: sortedCandidates.map((candidate) => candidate.resource_id),
    selected_resources: selectedResources,
    selected_tools: selectedTools,
    denied_resources: denied,
    deferred_resources: deferred,
    ask_first_resources: askFirst,
    sandbox_only_resources: sandboxOnly,
    unknown_resources: unknown,
    selection_trace: trace,
    budget_before: budgetBefore,
    budget_after: budgetAfter,
    metrics: {
      candidate_count: sortedCandidates.length,
      selected_count: selectedResources.length,
      denied_count: denied.length,
      deferred_count: deferred.length,
      unknown_count: unknown.length,
      resource_reduction_ratio: sortedCandidates.length === 0 ? 0 : 1 - selectedResources.length / sortedCandidates.length,
      tool_schema_reduction_ratio: selectedTools.length === 0 ? 0 : 1 - selectedTools.length / Math.max(1, sortedCandidates.filter((candidate) => candidate.tool_name).length)
    },
    required_approvals: input.envelope.required_approvals,
    verification_gates: input.envelope.required_verification_gates,
    warnings: [],
    unknowns: input.envelope.unknowns,
    runtime_advisory_only: true
  };
  return { ...selection, selection_digest: computeSelectionDigest({ ...selection, selection_digest: undefined }) };
}

export function minimum_toolset(input: MinimumApprovedResourceSet): string[] {
  return [...input.selected_tools];
}

export function renderMinimumApprovedResourceSetJson(input: MinimumApprovedResourceSet): string {
  return JSON.stringify(input, null, 2) + "\n";
}

export function renderMinimumApprovedResourceSetMarkdown(input: MinimumApprovedResourceSet): string {
  return [
    `# minimum-approved-resource-set`,
    "",
    `- selection_id: ${input.selection_id}`,
    `- selected_resources: ${input.selected_resources.length}`,
    `- selected_tools: ${input.selected_tools.length}`,
    `- denied_resources: ${input.denied_resources.length}`,
    `- deferred_resources: ${input.deferred_resources.length}`,
    `- unknown_resources: ${input.unknown_resources.length}`,
    `- runtime_advisory_only: ${String(input.runtime_advisory_only)}`
  ].join("\n") + "\n";
}

export function buildMinimumToolsetEvaluation(selectionA: MinimumApprovedResourceSet, selectionB: MinimumApprovedResourceSet): MinimumToolsetEvaluation {
  const exactExpectedSelectionMatch = stableJson(selectionA.selected_resources) === stableJson(selectionB.selected_resources);
  const requiredResourceRecall = selectionA.selected_resources.length === 0 ? 1 : selectionB.selected_resources.filter((resource) => selectionA.selected_resources.includes(resource)).length / selectionA.selected_resources.length;
  const unnecessaryResourcePrecision = selectionB.selected_resources.length === 0 ? 1 : selectionB.selected_resources.length / selectionB.candidate_resources.length;
  return {
    kind: "minimum-toolset-evaluation",
    advisoryOnly: true,
    exactExpectedSelectionMatch,
    requiredResourceRecall,
    unnecessaryResourcePrecision,
    denialClarity: selectionB.denied_resources.length / Math.max(1, selectionB.candidate_resources.length),
    unknownClarity: selectionB.unknown_resources.length / Math.max(1, selectionB.candidate_resources.length),
    contextBudgetReduction: selectionB.metrics.resource_reduction_ratio,
    deterministicRepeatability: stableJson(selectionA) === stableJson(selectionB),
    scenarioCount: 1
  };
}

export function renderMinimumToolsetEvaluationJson(input: MinimumToolsetEvaluation): string {
  return JSON.stringify(input, null, 2) + "\n";
}

export function renderMinimumToolsetEvaluationMarkdown(input: MinimumToolsetEvaluation): string {
  return [
    `# minimum-toolset-evaluation`,
    "",
    `- exactExpectedSelectionMatch: ${String(input.exactExpectedSelectionMatch)}`,
    `- requiredResourceRecall: ${input.requiredResourceRecall}`,
    `- unnecessaryResourcePrecision: ${input.unnecessaryResourcePrecision}`,
    `- denialClarity: ${input.denialClarity}`,
    `- unknownClarity: ${input.unknownClarity}`,
    `- contextBudgetReduction: ${input.contextBudgetReduction}`,
    `- deterministicRepeatability: ${String(input.deterministicRepeatability)}`
  ].join("\n") + "\n";
}

export function buildSelectionPolicyConflict(resourceId: string, winningRule: SelectionPolicyRule, losingRule: SelectionPolicyRule): SelectionPolicyConflict {
  return {
    resource_id: resourceId,
    winning_rule_id: winningRule.rule_id,
    losing_rule_id: losingRule.rule_id,
    winning_effect: winningRule.effect,
    losing_effect: losingRule.effect,
    reason: `${winningRule.reason_code} overrides ${losingRule.reason_code}`
  };
}

export function buildApprovalRequirement(approvalId: string, reason: string): ApprovalRequirement {
  return { approval_id: approvalId, reason, review_status: "not_requested" };
}

export function buildEvidenceReference(label: string, href?: string): EvidenceReference {
  return { kind: href ? "public" : "fixture", label, href };
}

export function listSelectionScenarios(): string[] {
  return [...publicSafeScenarios];
}

export function buildSelectionScenario(scenario: string): MinimumApprovedResourceSet {
  const commonEnvelope = buildSelectionPolicyEnvelope({
    schema_version: "0.1.0",
    envelope_id: `selection-envelope-${scenario}`,
    task_class: scenario.includes("billing") || scenario.includes("migration") ? "migration_sensitive" : scenario.includes("browser") ? "browser_qa" : scenario.includes("architecture") ? "architecture_sensitive" : scenario.includes("docs") ? "docs" : "small_fix",
    phase: "plan",
    host_context: "codex-desktop",
    allowed_resources: ["fixture", "public"],
    denied_resources: ["forbidden-debugger"],
    ask_first_resources: ["browser-qa"],
    sandbox_only_resources: ["local-sim"],
    allowed_permissions: ["read"],
    denied_permissions: ["publish"],
    required_approvals: [buildApprovalRequirement("review", "public review required")],
    required_verification_gates: ["typecheck", "test"],
    context_budget: { maximum_resource_count: 3, maximum_tool_schema_count: 2 },
    unknowns: ["private ranking not exposed"],
    evidence_refs: [buildEvidenceReference("public fixture")],
    runtime_advisory_only: true,
    rules: [],
    conflicts: []
  });

  const candidates: SelectionCandidate[] = [
    { resource_id: "docs", resource_kind: "docs", tool_name: "help-reader", capability: ["read", "docs"], source: buildEvidenceReference("docs fixture") },
    { resource_id: "browser-qa", resource_kind: "tool", tool_name: "browser", capability: ["read", "browser"], source: buildEvidenceReference("browser fixture"), ask_first: true },
    { resource_id: "forbidden-debugger", resource_kind: "tool", tool_name: "debugger", capability: ["read"], source: buildEvidenceReference("debugger fixture"), evidence_status: "missing" },
    { resource_id: "local-sim", resource_kind: "tool", tool_name: "sim", capability: ["read"], source: buildEvidenceReference("sim fixture"), sandbox_only: true }
  ];
  const requiredCapabilities = scenario.includes("browser") ? ["browser"] : ["read"];
  return selectMinimumApprovedResources({ candidates, envelope: commonEnvelope, requiredCapabilities, hostContext: "codex-desktop", evidence: [buildEvidenceReference("scenario fixture")] });
}

export function validateMinimumApprovedResourceSet(input: unknown): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["selection must be an object"], warnings };
  const selection = input as Partial<MinimumApprovedResourceSet>;
  if (selection.schema_version !== "0.1.0") errors.push("schema_version must be 0.1.0");
  if (typeof selection.selection_id !== "string") errors.push("selection_id must be a string");
  if (typeof selection.selection_digest !== "string") errors.push("selection_digest must be a string");
  if (!Array.isArray(selection.selected_resources)) errors.push("selected_resources must be an array");
  if (!Array.isArray(selection.selection_trace)) errors.push("selection_trace must be an array");
  if (selection.runtime_advisory_only !== true) errors.push("runtime_advisory_only must be true");
  return { ok: errors.length === 0, errors, warnings };
}

export function validateMinimumToolsetEvaluation(input: unknown): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["evaluation must be an object"], warnings };
  const evaluation = input as Partial<MinimumToolsetEvaluation>;
  if (evaluation.kind !== "minimum-toolset-evaluation") errors.push("kind must be minimum-toolset-evaluation");
  if (evaluation.advisoryOnly !== true) errors.push("advisoryOnly must be true");
  return { ok: errors.length === 0, errors, warnings };
}
