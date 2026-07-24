import type { ExecutionProfile, ExecutionProfileDiff, ExecutionProfileLock, HostExportArtifact, OutcomeReceipt, PlanActualDiff, PolicyLayer } from "./types.js";

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return isArray(value) && value.every((item) => typeof item === "string");
}

function validatePolicyLayer(layer: unknown) {
  return isObject(layer) && typeof layer.layer === "string";
}

function validateRole(role: unknown) {
  return isObject(role) && typeof role.role_id === "string" && isStringArray(role.assigned_resources) && isObject(role.permissions) && isObject(role.context_budget) && isStringArray(role.required_capabilities) && isStringArray(role.verification_gates);
}

export function validateExecutionProfile(profile: unknown) {
  return isObject(profile)
    && profile.schema_version === "0.1.0"
    && profile.runtime_advisory_only === true
    && typeof profile.profile_id === "string"
    && typeof profile.profile_digest === "string"
    && typeof profile.task_or_intent === "string"
    && typeof profile.task_class === "string"
    && typeof profile.host_context === "string"
    && isArray(profile.policy_layers)
    && profile.policy_layers.every(validatePolicyLayer)
    && isObject(profile.effective_policy)
    && isArray(profile.policy_conflicts)
    && isArray(profile.roles)
    && profile.roles.every(validateRole)
    && isArray(profile.resource_assignments)
    && isArray(profile.verification_gates)
    && isStringArray(profile.unknowns)
    && isStringArray(profile.review_notes);
}

export function validateExecutionProfileLock(lock: unknown) {
  return isObject(lock) && lock.schema_version === "0.1.0" && lock.runtime_advisory_only === true && typeof lock.profile_digest === "string" && typeof lock.profile_id === "string" && isArray(lock.policy_layers) && isObject(lock.effective_policy) && isArray(lock.policy_conflicts) && isArray(lock.roles) && isArray(lock.resource_assignments);
}

export function validateExecutionProfileDiff(diff: unknown) {
  return isObject(diff) && diff.schema_version === "0.1.0" && diff.runtime_advisory_only === true && isArray(diff.changed_fields) && isStringArray(diff.changed_fields) && isArray(diff.human_readable_reasons) && isStringArray(diff.human_readable_reasons) && ["clean", "changed", "unknown"].includes(String(diff.drift_status));
}

export function validateHostExport(exported: unknown) {
  return isObject(exported) && exported.schema_version === "0.1.0" && exported.runtime_advisory_only === true && typeof exported.generated_at === "string" && typeof exported.profile_id === "string" && typeof exported.profile_digest === "string" && (exported.host === "generic" || exported.host === "codex" || exported.host === "claude-code") && (exported.format === "markdown" || exported.format === "json") && typeof exported.content === "string" && isStringArray(exported.warnings);
}

export function validateOutcomeReceipt(receipt: unknown) {
  return isObject(receipt) && receipt.schema_version === "0.1.0" && receipt.local_only === true && typeof receipt.receipt_id === "string" && typeof receipt.profile_id === "string" && typeof receipt.profile_digest === "string" && isStringArray(receipt.resolved_roles) && isArray(receipt.verification_results) && isStringArray(receipt.warnings) && isStringArray(receipt.unknowns);
}

export function validatePlanActualDiff(diff: unknown) {
  return isObject(diff)
    && diff.schema_version === "0.1.0"
    && typeof diff.reconciliation_id === "string"
    && (diff.generated_at === undefined || typeof diff.generated_at === "string")
    && (diff.plan_ref === undefined || typeof diff.plan_ref === "string")
    && (diff.plan_digest === undefined || typeof diff.plan_digest === "string")
    && (diff.lock_ref === undefined || typeof diff.lock_ref === "string")
    && (diff.lock_digest === undefined || typeof diff.lock_digest === "string")
    && (diff.receipt_ref === undefined || typeof diff.receipt_ref === "string")
    && (diff.receipt_digest === undefined || typeof diff.receipt_digest === "string")
    && ["matched", "drifted", "unknown"].includes(String(diff.overall_state))
    && isStringArray(diff.declared_acceptance_items)
    && isStringArray(diff.observed_evidence_refs)
    && isStringArray(diff.missing_evidence)
    && isStringArray(diff.contradicted_evidence)
    && isStringArray(diff.explicit_unknowns)
    && isStringArray(diff.resource_drift)
    && isStringArray(diff.scope_or_digest_drift)
    && ["claimed", "unclaimed", "unknown"].includes(String(diff.completion_claim_state))
    && isStringArray(diff.source_artifact_refs);
}
