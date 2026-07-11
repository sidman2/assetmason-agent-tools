export type CanonicalJsonValue = null | boolean | number | string | CanonicalJsonValue[] | { [key: string]: CanonicalJsonValue };

export type ResourceSourceReference = {
  kind: "public" | "local" | "fixture";
  label: string;
  href?: string;
};

export type ResourceValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string;
};

export type ResourceCheckPacket = {
  kind: "resource-check";
  scenario: string;
  advisoryOnly: true;
  state: "unknown" | "clean" | "changed";
  sources: ResourceSourceReference[];
};

export type ResourceSelectionPolicyEnvelope = {
  kind: "selection-policy";
  scenario: string;
  advisoryOnly: true;
  unknownMeans: "insufficient-evidence";
  allowedKinds: string[];
};

export type SelectionDecision = "selected" | "denied" | "deferred" | "ask_first" | "sandbox_only" | "unknown";

export type EvidenceReference = {
  kind: "public" | "local" | "fixture";
  label: string;
  href?: string;
};

export type ApprovalRequirement = {
  approval_id: string;
  reason: string;
  review_status: "not_requested" | "requested" | "approved" | "rejected";
};

export type ContextBudget = {
  maximum_resource_count?: number;
  maximum_tool_schema_count?: number;
  maximum_attempt_count?: number;
  maximum_duration_minutes?: number;
};

export type SelectionPolicyRule = {
  rule_id: string;
  effect: "allow" | "deny" | "ask_first" | "sandbox_only" | "prefer";
  resource_id?: string;
  resource_kind?: string;
  tool_name?: string;
  reason_code: string;
  human_explanation: string;
  evidence_refs?: EvidenceReference[];
};

export type SelectionPolicyConflict = {
  resource_id: string;
  winning_rule_id: string;
  losing_rule_id: string;
  winning_effect: SelectionPolicyRule["effect"];
  losing_effect: SelectionPolicyRule["effect"];
  reason: string;
};

export type SelectionPolicyEnvelope = {
  schema_version: "0.1.0";
  envelope_id: string;
  envelope_digest: string;
  task_class: "small_fix" | "architecture_sensitive" | "billing_sensitive" | "migration_sensitive" | "docs" | "browser_qa" | "other";
  phase: "discover" | "plan" | "implement" | "verify" | "deploy";
  host_context: string;
  allowed_resources: string[];
  denied_resources: string[];
  ask_first_resources: string[];
  sandbox_only_resources: string[];
  allowed_permissions: string[];
  denied_permissions: string[];
  required_approvals: ApprovalRequirement[];
  required_verification_gates: string[];
  context_budget: ContextBudget;
  unknowns: string[];
  evidence_refs: EvidenceReference[];
  rules: SelectionPolicyRule[];
  conflicts: SelectionPolicyConflict[];
  runtime_advisory_only: true;
};

export type SelectionTraceEntry = {
  resource_id: string;
  decision: SelectionDecision;
  reason_code: string;
  human_explanation: string;
  policy_layer?: string;
  evidence_refs: EvidenceReference[];
};

export type MinimumApprovedResourceSet = {
  schema_version: "0.1.0";
  selection_id: string;
  selection_digest: string;
  task_class: string;
  host_context: string;
  candidate_resources: string[];
  selected_resources: string[];
  selected_tools: string[];
  denied_resources: string[];
  deferred_resources: string[];
  ask_first_resources: string[];
  sandbox_only_resources: string[];
  unknown_resources: string[];
  selection_trace: SelectionTraceEntry[];
  budget_before: ContextBudget;
  budget_after: ContextBudget;
  metrics: {
    candidate_count: number;
    selected_count: number;
    denied_count: number;
    deferred_count: number;
    unknown_count: number;
    resource_reduction_ratio: number;
    tool_schema_reduction_ratio: number;
  };
  required_approvals: ApprovalRequirement[];
  verification_gates: string[];
  warnings: string[];
  unknowns: string[];
  runtime_advisory_only: true;
};

export type MinimumToolsetEvaluation = {
  kind: "minimum-toolset-evaluation";
  advisoryOnly: true;
  exactExpectedSelectionMatch: boolean;
  requiredResourceRecall: number;
  unnecessaryResourcePrecision: number;
  denialClarity: number;
  unknownClarity: number;
  contextBudgetReduction: number;
  deterministicRepeatability: boolean;
  scenarioCount: number;
};

export type SelectionCandidate = {
  resource_id: string;
  resource_kind: string;
  tool_name?: string;
  capability: string[];
  source: EvidenceReference;
  risk?: "low" | "medium" | "high";
  approval_required?: boolean;
  sandbox_only?: boolean;
  ask_first?: boolean;
  evidence_status?: "supported" | "stale" | "missing";
};

export type MinimumApprovedResourceSetInput = {
  candidates: SelectionCandidate[];
  envelope: SelectionPolicyEnvelope;
  requiredCapabilities: string[];
  hostContext: string;
  evidence: EvidenceReference[];
};

export type ResourcePlan = {
  kind: "resource-plan";
  scenario: string;
  advisoryOnly: true;
  resourceCheck: ResourceCheckPacket;
  selectionPolicy: ResourceSelectionPolicyEnvelope;
  proposedActions: string[];
  sources: ResourceSourceReference[];
  digest: string;
};

export type ResourceLock = {
  kind: "resource-lock";
  scenario: string;
  advisoryOnly: true;
  planDigest: string;
  inventoryDigest: string;
  resourcePlanDigest: string;
  resources: string[];
  sources: ResourceSourceReference[];
  digest: string;
};

export type ResourceDiffState = "clean" | "changed" | "unknown";

export type ResourceDiff = {
  kind: "resource-diff";
  advisoryOnly: true;
  state: ResourceDiffState;
  beforeDigest: string;
  afterDigest: string;
  changes: string[];
  warnings: ResourceValidationIssue[];
  digest: string;
};

export type ResourceInventory = {
  kind: "resource-inventory";
  root: string;
  files: Array<{ path: string; size: number; kind: "file" | "directory" | "symlink"; redactedSecrets?: string[] }>;
  warnings: ResourceValidationIssue[];
  digest: string;
};

export type ResourceArtifactValidationResult = {
  ok: boolean;
  kind?: string;
  errors: ResourceValidationIssue[];
  warnings: ResourceValidationIssue[];
  digest?: string;
};
