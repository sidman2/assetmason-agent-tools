import { sha256Canonical, sortAndDedupe } from "./stable-json.js";
import { resolvePolicyLayers } from "./policy.js";
import { executionProfileSemanticDigest } from "./semantic.js";
import type { AgentRoleCard, ExecutionProfile, PolicyLayer } from "./types.js";

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
