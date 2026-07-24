export const EXECUTION_PROFILE_SCHEMA_VERSION = "0.1.0" as const;
export const EXECUTION_PROFILE_LOCK_SCHEMA_VERSION = "0.1.0" as const;
export const EXECUTION_PROFILE_DIFF_SCHEMA_VERSION = "0.1.0" as const;
export const PLAN_ACTUAL_DIFF_SCHEMA_VERSION = "0.1.0" as const;
export const OUTCOME_RECEIPT_SCHEMA_VERSION = "0.1.0" as const;

export type CapabilityRequirement =
  | "architecture_judgment"
  | "deep_reasoning"
  | "fast_repo_exploration"
  | "cost_efficient_implementation"
  | "tool_use"
  | "test_iteration"
  | "independent_verification"
  | "security_reasoning"
  | "large_context_analysis"
  | "vision_ui_review"
  | "local_private_execution"
  | string;

export type PolicyLayerName =
  | "host_hard_constraints"
  | "organization_policy"
  | "repository_policy"
  | "developer_profile"
  | "task_envelope"
  | "agent_recommendation";

export type ConflictStatus = "resolved" | "requires_review" | "blocked" | "unknown";

export type ExecutionPermission = {
  allow?: string[];
  deny?: string[];
};

export type EffectivePolicyConflict = {
  field: string;
  status: ConflictStatus;
  winning_layer?: PolicyLayerName;
  losing_layer?: PolicyLayerName;
  explanation: string;
};

export type EffectivePolicy = {
  permissions: ExecutionPermission;
  denied_resources: string[];
  forbidden_resources: string[];
  verification_gates: string[];
  escalation_requirements: string[];
  context_budget: {
    maximum_resource_count?: number;
    maximum_tool_schema_count?: number;
    maximum_attempt_count?: number;
    maximum_duration_minutes?: number;
  };
  preferred_resources: string[];
  capability_requirements: CapabilityRequirement[];
  conflict_trace: EffectivePolicyConflict[];
};

export type ModelCapabilityRequirement = {
  capability: CapabilityRequirement;
  minimum_level?: "low" | "medium" | "high" | "critical";
  required?: true;
  model_resolution_hint?: string;
};

export type AgentRoleCard = {
  role_id: string;
  role_type: "implementer" | "planner" | "verifier" | "architect" | "support";
  required_capabilities: CapabilityRequirement[];
  model_capability_requirements?: ModelCapabilityRequirement[];
  assigned_resources: string[];
  permissions: ExecutionPermission;
  context_budget: {
    maximum_resource_count?: number;
    maximum_tool_schema_count?: number;
    maximum_attempt_count?: number;
    maximum_duration_minutes?: number;
  };
  verification_gates: string[];
  unknowns?: string[];
  verifier_independent?: boolean;
  escalations?: string[];
};

export type PolicyLayer = {
  layer: PolicyLayerName;
  summary?: string;
  hard_bounds?: {
    permissions?: ExecutionPermission;
    denied_resources?: string[];
    forbidden_resources?: string[];
    context_budget?: {
      maximum_resource_count?: number;
      maximum_tool_schema_count?: number;
      maximum_attempt_count?: number;
      maximum_duration_minutes?: number;
    };
    verification_gates?: string[];
    escalation?: string[];
  };
  preferences?: {
    permissions?: ExecutionPermission;
    preferred_resources?: string[];
    capability_requirements?: CapabilityRequirement[];
  };
  unknowns?: string[];
};

export type ResourceAssignment = {
  role_id: string;
  resources: string[];
};

export type ExecutionProfile = {
  schema_version: typeof EXECUTION_PROFILE_SCHEMA_VERSION;
  profile_id: string;
  generated_at: string;
  task_or_intent: string;
  task_class: string;
  host_context: string;
  source_plan_id?: string;
  source_plan_digest?: string;
  policy_layers: PolicyLayer[];
  effective_policy: EffectivePolicy;
  policy_conflicts: EffectivePolicyConflict[];
  roles: AgentRoleCard[];
  resource_assignments: ResourceAssignment[];
  budget: {
    maximum_resource_count?: number;
    maximum_tool_schema_count?: number;
    maximum_attempt_count?: number;
    maximum_duration_minutes?: number;
    cost_ceiling?: string;
  };
  escalation: {
    approval_required?: string[];
    escalation_paths?: string[];
    blocked_conditions?: string[];
  };
  verification_gates: string[];
  unknowns: string[];
  review_notes: string[];
  runtime_advisory_only: true;
  host_export_target?: "generic" | "codex" | "claude-code";
  profile_digest: string;
};

export type ExecutionProfileLock = {
  schema_version: typeof EXECUTION_PROFILE_LOCK_SCHEMA_VERSION;
  generated_at: string;
  profile_id: string;
  profile_digest: string;
  source_plan_id?: string;
  source_plan_digest?: string;
  task_or_intent: string;
  task_class: string;
  host_context: string;
  policy_layers: PolicyLayer[];
  effective_policy: EffectivePolicy;
  policy_conflicts: EffectivePolicyConflict[];
  roles: AgentRoleCard[];
  resource_assignments: ResourceAssignment[];
  budget: ExecutionProfile["budget"];
  escalation: ExecutionProfile["escalation"];
  verification_gates: string[];
  unknowns: string[];
  review_notes: string[];
  host_export_target?: "generic" | "codex" | "claude-code";
  runtime_advisory_only: true;
};

export type ExecutionProfileDiff = {
  schema_version: typeof EXECUTION_PROFILE_DIFF_SCHEMA_VERSION;
  generated_at: string;
  previous_digest?: string;
  current_digest?: string;
  drift_status: "clean" | "changed" | "unknown";
  changed_fields: string[];
  human_readable_reasons: string[];
  runtime_advisory_only: true;
};

export type PlanActualEvidenceState = "present" | "missing" | "contradicted" | "unknown";
export type PlanActualCompletionClaimState = "claimed" | "unclaimed" | "unknown";
export type PlanActualOverallState = "matched" | "drifted" | "unknown";

export type PlanActualDiff = {
  schema_version: typeof PLAN_ACTUAL_DIFF_SCHEMA_VERSION;
  reconciliation_id: string;
  generated_at?: string;
  plan_ref?: string;
  plan_digest?: string;
  lock_ref?: string;
  lock_digest?: string;
  receipt_ref?: string;
  receipt_digest?: string;
  overall_state: PlanActualOverallState;
  declared_acceptance_items: string[];
  observed_evidence_refs: string[];
  missing_evidence: string[];
  contradicted_evidence: string[];
  explicit_unknowns: string[];
  resource_drift: string[];
  scope_or_digest_drift: string[];
  completion_claim_state: PlanActualCompletionClaimState;
  source_artifact_refs: string[];
};

export type HostExportArtifact = {
  schema_version: "0.1.0";
  host: "generic" | "codex" | "claude-code";
  generated_at: string;
  profile_id: string;
  profile_digest: string;
  format: "markdown" | "json";
  content: string;
  warnings: string[];
  runtime_advisory_only: true;
};

export type OutcomeReceipt = {
  schema_version: typeof OUTCOME_RECEIPT_SCHEMA_VERSION;
  receipt_id: string;
  profile_id: string;
  profile_digest: string;
  actual_host?: string;
  resolved_roles: string[];
  attempt_count?: number;
  verification_results: Array<{ gate: string; passed: boolean; notes?: string }>;
  user_accepted?: boolean;
  reverted?: boolean;
  cost?: string;
  duration?: string;
  warnings: string[];
  unknowns: string[];
  recorded_at?: string;
  local_only: true;
};
