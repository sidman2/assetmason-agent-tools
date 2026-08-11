import { sha256Canonical, sortAndDedupe } from "./stable-json.js";
import { resolvePolicyLayers } from "./policy.js";
import { executionProfileSemanticDigest } from "./semantic.js";
import type { AgentRoleCard, EvidenceImport, ExecutionProfile, HandoffPack, OutcomeReceipt, PolicyLayer } from "./types.js";

function makeProfileId(task_or_intent: string, host_context: string, task_class: string) {
  return sha256Canonical({ task_or_intent, host_context, task_class }).slice(0, 16);
}

function defaultRolesForTask(taskClass: string): AgentRoleCard[] {
  const plannerResources = ["resource_plan", "source_plan"];
  const implementerResources = ["repo_source"];
  const verifierResources = ["test_results"];
  const implementer: AgentRoleCard = {
    role_id: "implementer",
    role_type: "implementer",
    required_capabilities: ["tool_use", "test_iteration", "cost_efficient_implementation"],
    assigned_resources: implementerResources,
    permissions: { allow: [], deny: [] },
    context_budget: { maximum_resource_count: 6, maximum_tool_schema_count: 4 },
    verification_gates: ["tests_pass"],
    verifier_independent: false
  };
  const roles = [implementer];
  if (taskClass !== "small_fix") roles.unshift({
    role_id: "planner",
    role_type: "planner",
    required_capabilities: ["architecture_judgment", "deep_reasoning", "fast_repo_exploration"],
    assigned_resources: plannerResources,
    permissions: { allow: [], deny: ["deployment", "production_secrets"] },
    context_budget: { maximum_resource_count: 4, maximum_tool_schema_count: 2 },
    verification_gates: ["plan_reviewed"],
    verifier_independent: false
  });
  if (taskClass === "architecture_sensitive" || taskClass === "billing_sensitive") {
    roles.push({
      role_id: "verifier",
      role_type: "verifier",
      required_capabilities: ["independent_verification", "security_reasoning"],
      assigned_resources: verifierResources,
      permissions: { allow: [], deny: ["deployment", "production_secrets", "production_write"] },
      context_budget: { maximum_resource_count: 3, maximum_tool_schema_count: 1 },
      verification_gates: ["regression_tests_pass", "rollback_plan_present"],
      verifier_independent: true
    });
  }
  return roles;
}

function profileDigest(profile: Omit<ExecutionProfile, "profile_digest" | "generated_at" | "schema_version" | "runtime_advisory_only">) {
  return executionProfileSemanticDigest(profile);
}

function summarizeEvidenceImports(evidenceImports: EvidenceImport[] | undefined) {
  const summary = {
    ready: [] as string[],
    conditional: [] as string[],
    blocked: [] as string[],
    human: [] as string[],
    unknown: [] as string[],
    stale: [] as string[],
    missing: [] as string[],
    contradicted: [] as string[],
    external_wait: [] as string[]
  };
  for (const entry of evidenceImports ?? []) {
    let target = summary.ready;
    switch (entry.variant) {
      case "blocked":
        target = summary.blocked;
        break;
      case "human":
        target = summary.human;
        break;
      case "unknown":
        target = summary.unknown;
        break;
      case "reuse_only":
      case "ready":
        target = summary.ready;
        break;
      case "conditional":
      case "material_delta":
      case "partial_checks":
        target = summary.conditional;
        break;
      case "stale_base":
      case "stale_evidence":
        target = summary.stale;
        break;
      case "external_effect":
      case "external_wait":
        target = summary.external_wait;
        break;
      case "missing_evidence":
        target = summary.missing;
        break;
      case "contradiction":
        target = summary.contradicted;
        break;
      default:
        target = summary.ready;
        break;
    }
    target.push(entry.import_id);
  }
  return {
    ready: summary.ready.sort(),
    conditional: summary.conditional.sort(),
    blocked: summary.blocked.sort(),
    human: summary.human.sort(),
    unknown: summary.unknown.sort(),
    stale: summary.stale.sort(),
    missing: summary.missing.sort(),
    contradicted: summary.contradicted.sort(),
    external_wait: summary.external_wait.sort()
  };
}

export function buildExecutionProfile(input: {
  task_or_intent: string;
  task_class: string;
  host_context: string;
  policy_layers: PolicyLayer[];
  generated_at?: string;
  source_plan_id?: string;
  source_plan_digest?: string;
  roles?: AgentRoleCard[];
  verification_gates?: string[];
  unknowns?: string[];
  review_notes?: string[];
  host_export_target?: ExecutionProfile["host_export_target"];
}): ExecutionProfile {
  const generated_at = input.generated_at ?? new Date().toISOString();
  const resolved = resolvePolicyLayers(input.policy_layers);
  const roles = input.roles ?? defaultRolesForTask(input.task_class);
  const profile_base = {
    profile_id: makeProfileId(input.task_or_intent, input.host_context, input.task_class),
    task_or_intent: input.task_or_intent,
    task_class: input.task_class,
    host_context: input.host_context,
    source_plan_id: input.source_plan_id,
    source_plan_digest: input.source_plan_digest,
    policy_layers: input.policy_layers,
    effective_policy: resolved.effective_policy,
    policy_conflicts: resolved.conflicts,
    roles,
    resource_assignments: roles.map((role) => ({ role_id: role.role_id, resources: sortAndDedupe(role.assigned_resources) })),
    budget: {},
    escalation: {},
    verification_gates: sortAndDedupe([...(input.verification_gates ?? []), ...resolved.effective_policy.verification_gates, ...roles.flatMap((role) => role.verification_gates)]),
    unknowns: sortAndDedupe(input.unknowns ?? []),
    review_notes: sortAndDedupe(input.review_notes ?? []),
    host_export_target: input.host_export_target
  };
  const profile_digest = profileDigest(profile_base);
  return { schema_version: "0.1.0", generated_at, runtime_advisory_only: true, profile_digest, ...profile_base };
}

export function buildOutcomeReceipt(input: {
  plan_ref?: string;
  plan_digest?: string;
  lock_ref?: string;
  lock_digest?: string;
  receipt_id: string;
  profile_id: string;
  profile_digest: string;
  actual_host?: string;
  resolved_roles?: string[];
  attempt_count?: number;
  verification_results?: OutcomeReceipt["verification_results"];
  evidence_imports?: EvidenceImport[];
  user_accepted?: boolean;
  reverted?: boolean;
  cost?: string;
  duration?: string;
  warnings?: string[];
  unknowns?: string[];
  recorded_at?: string;
}): OutcomeReceipt {
  return {
    schema_version: "0.1.0",
    receipt_id: input.receipt_id,
    profile_id: input.profile_id,
    profile_digest: input.profile_digest,
    plan_ref: input.plan_ref,
    plan_digest: input.plan_digest,
    lock_ref: input.lock_ref,
    lock_digest: input.lock_digest,
    actual_host: input.actual_host,
    resolved_roles: input.resolved_roles ?? [],
    attempt_count: input.attempt_count ?? 0,
    verification_results: input.verification_results ?? [],
    evidence_imports: input.evidence_imports ?? [],
    user_accepted: input.user_accepted ?? false,
    reverted: input.reverted ?? false,
    cost: input.cost,
    duration: input.duration,
    warnings: input.warnings ?? [],
    unknowns: input.unknowns ?? [],
    evidence_state: summarizeEvidenceImports(input.evidence_imports),
    recorded_at: input.recorded_at,
    local_only: true
  };
}

export function importEvidenceIntoReceipt(receipt: OutcomeReceipt, evidenceImport: EvidenceImport): OutcomeReceipt {
  const evidence_imports = [...(receipt.evidence_imports ?? []), evidenceImport];
  return {
    ...receipt,
    evidence_imports,
    evidence_state: summarizeEvidenceImports(evidence_imports),
    warnings: [...receipt.warnings, ...evidenceImport.warnings],
    unknowns: [...receipt.unknowns, ...evidenceImport.unknowns]
  };
}

export function buildHandoffPack(input: {
  source_id: string;
  task_text: string;
  plan_ref?: string;
  plan_digest?: string;
  lock_ref?: string;
  lock_digest?: string;
  receipt_ref?: string;
  receipt_digest?: string;
  branch?: string;
  worktree?: string;
  base_ref?: string;
  head_ref?: string;
  changed_paths?: string[];
  untracked_paths?: string[];
  checks?: string[];
  decisions?: string[];
  deviations?: string[];
  external_effects?: string[];
  waits?: string[];
  remaining_acceptance?: string[];
  failed_remedies?: string[];
  resume_command?: string;
  references?: string[];
  receipt_evidence_state?: OutcomeReceipt["evidence_state"];
}): HandoffPack {
  const generated_at = new Date().toISOString();
  return {
    schema_version: "0.1.0",
    handoff_id: sha256Canonical({
      source_id: input.source_id,
      task_text: input.task_text,
      plan_ref: input.plan_ref,
      plan_digest: input.plan_digest,
      lock_ref: input.lock_ref,
      lock_digest: input.lock_digest,
      receipt_ref: input.receipt_ref,
      receipt_digest: input.receipt_digest,
      generated_at
    }).slice(0, 16),
    generated_at,
    source_id: input.source_id,
    task_text: input.task_text,
    branch: input.branch,
    worktree: input.worktree,
    base_ref: input.base_ref,
    head_ref: input.head_ref,
    plan_ref: input.plan_ref,
    plan_digest: input.plan_digest,
    lock_ref: input.lock_ref,
    lock_digest: input.lock_digest,
    receipt_ref: input.receipt_ref,
    receipt_digest: input.receipt_digest,
    changed_paths: sortAndDedupe(input.changed_paths ?? []),
    untracked_paths: sortAndDedupe(input.untracked_paths ?? []),
    checks: sortAndDedupe(input.checks ?? []),
    decisions: sortAndDedupe(input.decisions ?? []),
    deviations: sortAndDedupe(input.deviations ?? []),
    external_effects: sortAndDedupe(input.external_effects ?? []),
    waits: sortAndDedupe([
      ...(input.waits ?? []),
      ...(input.receipt_evidence_state?.external_wait ?? []).map((item) => `external wait: ${item}`),
      ...(input.receipt_evidence_state?.missing ?? []).map((item) => `missing evidence: ${item}`),
      ...(input.receipt_evidence_state?.contradicted ?? []).map((item) => `contradicted evidence: ${item}`)
    ]),
    remaining_acceptance: sortAndDedupe(input.remaining_acceptance ?? []),
    failed_remedies: sortAndDedupe(input.failed_remedies ?? []),
    resume_command: input.resume_command ?? "assetmason check --root . --task \"<task>\"",
    references: sortAndDedupe(input.references ?? []),
    local_only: true
  };
}
