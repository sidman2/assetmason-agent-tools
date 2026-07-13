import { sha256Canonical, sortAndDedupe } from "./stable-json.js";
import type { ExecutionProfile, ExecutionProfileLock, EffectivePolicy } from "./types.js";

export function executionProfileSemanticDigest(value: unknown): string {
  return sha256Canonical(value);
}

export function normalizePolicy(policy: EffectivePolicy): EffectivePolicy {
  return {
    ...policy,
    denied_resources: sortAndDedupe(policy.denied_resources),
    forbidden_resources: sortAndDedupe(policy.forbidden_resources),
    verification_gates: sortAndDedupe(policy.verification_gates),
    escalation_requirements: sortAndDedupe(policy.escalation_requirements),
    preferred_resources: sortAndDedupe(policy.preferred_resources),
    capability_requirements: sortAndDedupe(policy.capability_requirements)
  };
}

export function executionProfileSemanticProjection(profile: ExecutionProfile | ExecutionProfileLock) {
  return {
    profile_id: profile.profile_id,
    task_or_intent: profile.task_or_intent,
    task_class: profile.task_class,
    host_context: profile.host_context,
    policy_layers: profile.policy_layers,
    effective_policy: normalizePolicy(profile.effective_policy),
    policy_conflicts: profile.policy_conflicts,
    roles: profile.roles,
    resource_assignments: profile.resource_assignments,
    verification_gates: sortAndDedupe(profile.verification_gates),
    unknowns: sortAndDedupe(profile.unknowns)
  };
}
