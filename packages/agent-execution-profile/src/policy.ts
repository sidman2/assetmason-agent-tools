import { sortAndDedupe } from "./stable-json.js";
import type { EffectivePolicy, EffectivePolicyConflict, PolicyLayer } from "./types.js";

export function resolvePolicyLayers(policyLayers: PolicyLayer[]): { effective_policy: EffectivePolicy; conflicts: EffectivePolicyConflict[]; hard_bounds?: PolicyLayer["hard_bounds"] } {
  const deniedResources = new Set<string>();
  const forbiddenResources = new Set<string>();
  const verificationGates = new Set<string>();
  const escalationRequirements = new Set<string>();
  const preferredResources = new Set<string>();
  const capabilityRequirements = new Set<string>();
  const allow = new Set<string>();
  const deny = new Set<string>();
  for (const layer of policyLayers) {
    for (const value of layer.hard_bounds?.denied_resources ?? []) deniedResources.add(value);
    for (const value of layer.hard_bounds?.forbidden_resources ?? []) forbiddenResources.add(value);
    for (const value of layer.hard_bounds?.verification_gates ?? []) verificationGates.add(value);
    for (const value of layer.hard_bounds?.escalation ?? []) escalationRequirements.add(value);
    for (const value of layer.preferences?.preferred_resources ?? []) preferredResources.add(value);
    for (const value of layer.preferences?.capability_requirements ?? []) capabilityRequirements.add(value);
    for (const value of layer.hard_bounds?.permissions?.allow ?? []) allow.add(value);
    for (const value of layer.hard_bounds?.permissions?.deny ?? []) deny.add(value);
    for (const value of layer.preferences?.permissions?.allow ?? []) allow.add(value);
    for (const value of layer.preferences?.permissions?.deny ?? []) deny.add(value);
  }
  for (const denied of deny) allow.delete(denied);
  const conflicts: EffectivePolicyConflict[] = [];
  for (const resource of deniedResources) conflicts.push({ field: "denied_resources", status: "resolved", winning_layer: "host_hard_constraints", explanation: `Denied resource ${resource} remains denied.` });
  return {
    effective_policy: {
      permissions: { allow: sortAndDedupe([...allow]), deny: sortAndDedupe([...deny]) },
      denied_resources: sortAndDedupe([...deniedResources]),
      forbidden_resources: sortAndDedupe([...forbiddenResources]),
      verification_gates: sortAndDedupe([...verificationGates]),
      escalation_requirements: sortAndDedupe([...escalationRequirements]),
      context_budget: {},
      preferred_resources: sortAndDedupe([...preferredResources]),
      capability_requirements: sortAndDedupe([...capabilityRequirements]),
      conflict_trace: conflicts
    },
    conflicts,
    hard_bounds: undefined
  };
}
