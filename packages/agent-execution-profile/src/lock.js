import { executionProfileSemanticDigest } from "./semantic.js";
export function buildExecutionProfileLock(profile) {
    const lock = {
        schema_version: "0.1.0",
        generated_at: profile.generated_at,
        profile_id: profile.profile_id,
        profile_digest: profile.profile_digest,
        source_plan_id: profile.source_plan_id,
        source_plan_digest: profile.source_plan_digest,
        task_or_intent: profile.task_or_intent,
        task_class: profile.task_class,
        host_context: profile.host_context,
        policy_layers: profile.policy_layers,
        effective_policy: profile.effective_policy,
        policy_conflicts: profile.policy_conflicts,
        roles: profile.roles,
        resource_assignments: profile.resource_assignments,
        budget: profile.budget,
        escalation: profile.escalation,
        verification_gates: profile.verification_gates,
        unknowns: profile.unknowns,
        review_notes: profile.review_notes,
        host_export_target: profile.host_export_target,
        runtime_advisory_only: true
    };
    return lock;
}
export function executionProfileLockDigest(lock) {
    return executionProfileSemanticDigest(lock);
}
