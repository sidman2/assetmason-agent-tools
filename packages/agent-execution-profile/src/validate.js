function isArray(value) {
    return Array.isArray(value);
}
function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isStringArray(value) {
    return isArray(value) && value.every((item) => typeof item === "string");
}
function validatePolicyLayer(layer) {
    return isObject(layer) && typeof layer.layer === "string";
}
function validateRole(role) {
    return isObject(role) && typeof role.role_id === "string" && isStringArray(role.assigned_resources) && isObject(role.permissions) && isObject(role.context_budget) && isStringArray(role.required_capabilities) && isStringArray(role.verification_gates);
}
export function validateExecutionProfile(profile) {
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
export function validateExecutionProfileLock(lock) {
    return isObject(lock) && lock.schema_version === "0.1.0" && lock.runtime_advisory_only === true && typeof lock.profile_digest === "string" && typeof lock.profile_id === "string" && isArray(lock.policy_layers) && isObject(lock.effective_policy) && isArray(lock.policy_conflicts) && isArray(lock.roles) && isArray(lock.resource_assignments);
}
export function validateExecutionProfileDiff(diff) {
    return isObject(diff) && diff.schema_version === "0.1.0" && diff.runtime_advisory_only === true && isArray(diff.changed_fields) && isStringArray(diff.changed_fields) && isArray(diff.human_readable_reasons) && isStringArray(diff.human_readable_reasons) && ["clean", "changed", "unknown"].includes(String(diff.drift_status));
}
export function validateHostExport(exported) {
    return isObject(exported) && exported.schema_version === "0.1.0" && exported.runtime_advisory_only === true && typeof exported.generated_at === "string" && typeof exported.profile_id === "string" && typeof exported.profile_digest === "string" && (exported.host === "generic" || exported.host === "codex" || exported.host === "claude-code") && (exported.format === "markdown" || exported.format === "json") && typeof exported.content === "string" && isStringArray(exported.warnings);
}
export function validateOutcomeReceipt(receipt) {
    return isObject(receipt) && receipt.schema_version === "0.1.0" && receipt.local_only === true && typeof receipt.receipt_id === "string" && typeof receipt.profile_id === "string" && typeof receipt.profile_digest === "string" && isStringArray(receipt.resolved_roles) && isArray(receipt.verification_results) && isStringArray(receipt.warnings) && isStringArray(receipt.unknowns);
}
