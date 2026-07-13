import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildExecutionProfile } from "../packages/agent-execution-profile/src/build.ts";
import { buildExecutionProfileLock } from "../packages/agent-execution-profile/src/lock.ts";
import { buildGenericHostExportArtifact } from "../packages/agent-execution-profile/src/hosts/generic.ts";
import { buildCodexHostExportArtifact } from "../packages/agent-execution-profile/src/hosts/codex.ts";
import { buildClaudeCodeHostExportArtifact } from "../packages/agent-execution-profile/src/hosts/claude-code.ts";
import { diffExecutionProfile, diffExecutionProfileLock } from "../packages/agent-execution-profile/src/diff.ts";
import { validateExecutionProfile, validateExecutionProfileLock, validateExecutionProfileDiff, validateHostExport } from "../packages/agent-execution-profile/src/validate.ts";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const privateRoot = "C:/Users/sudhir.manchanda/OneDrive - Accenture/Desktop/Tinkering/graphiki-human-ui-fresh";
const outputDir = resolve(repoRoot, "tmp", "review-packet", "pr6-closeout", "parity");

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === "object" && Object.prototype.toString.call(value) === "[object Object]") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableSort(value[key]);
      return acc;
    }, {});
  }
  return value;
}

async function runPrivateEval(code) {
  const tempScript = resolve(outputDir, "private-probe.ts");
  await mkdir(outputDir, { recursive: true });
  await writeFile(tempScript, code, "utf8");
  const tempScriptUrl = pathToFileURL(tempScript).href;
  const result = execFileSync("node", ["--input-type=module", "--import", "tsx", "--eval", `await import(${JSON.stringify(tempScriptUrl)});`], {
    cwd: privateRoot,
    encoding: "utf8"
  });
  return JSON.parse(result.trim());
}

function publicScenario(name, input) {
  const profile = buildExecutionProfile(input);
  const lock = buildExecutionProfileLock(profile);
  const genericExport = buildGenericHostExportArtifact(profile);
  const codexExport = buildCodexHostExportArtifact(profile);
  const claudeExport = buildClaudeCodeHostExportArtifact(profile);
  const roleSnapshot = (role) => ({
    role_id: role.role_id,
    role_type: role.role_type,
    required_capabilities: role.required_capabilities,
    assigned_resources: role.assigned_resources,
    context_budget: role.context_budget,
    verification_gates: role.verification_gates,
    verifier_independent: role.verifier_independent ?? false
  });
  const normalizedProfile = {
    profile_id: profile.profile_id,
    task_class: profile.task_class,
    host_context: profile.host_context,
    roles: profile.roles.map(roleSnapshot),
    verification_gates: profile.verification_gates
  };
  return {
    profile,
    normalizedProfile,
    lock,
    genericExport,
    codexExport,
    claudeExport,
    profileDiff: diffExecutionProfile(profile, { ...profile, review_notes: [...profile.review_notes, "changed"] }),
    lockDiff: diffExecutionProfileLock(lock, buildExecutionProfileLock({ ...profile, review_notes: [...profile.review_notes, "changed"] })),
    validations: {
      profile: validateExecutionProfile(profile),
      lock: validateExecutionProfileLock(lock),
      profileDiff: validateExecutionProfileDiff(diffExecutionProfile(profile, profile)),
      hostExport: validateHostExport(genericExport)
    }
  };
}

const publicScenarios = [
  {
    id: "auth-redirect-bug",
    task_or_intent: "Fix auth redirect bug",
    task_class: "small_fix",
    host_context: "web app with login callback and protected routes",
    policy_layers: [
      {
        layer: "host_hard_constraints",
        hard_bounds: {
          permissions: { allow: ["repo_read", "scoped_repo_write", "test_commands"], deny: ["deployment", "production_secrets"] },
          denied_resources: ["production_secrets"],
          forbidden_resources: ["runtime_execution"],
          context_budget: { maximum_resource_count: 6, maximum_tool_schema_count: 4 },
          verification_gates: ["tests_pass"]
        }
      }
    ]
  },
  {
    id: "architecture-sensitive-feature",
    task_or_intent: "Implement architecture-sensitive feature",
    task_class: "architecture_sensitive",
    host_context: "product codebase with layered services",
    policy_layers: [
      {
        layer: "repository_policy",
        hard_bounds: {
          permissions: { allow: ["repo_read"], deny: ["deployment", "production_secrets"] },
          context_budget: { maximum_resource_count: 8, maximum_tool_schema_count: 4 },
          verification_gates: ["tests_pass", "regression_tests_pass"]
        }
      }
    ]
  },
  {
    id: "billing-or-migration-sensitive",
    task_or_intent: "Assess billing or migration-sensitive change",
    task_class: "billing_sensitive",
    host_context: "billing flow or schema migration path",
    policy_layers: [
      {
        layer: "host_hard_constraints",
        hard_bounds: {
          permissions: { allow: ["repo_read"], deny: ["production_write", "production_secrets", "deployment"] },
          context_budget: { maximum_resource_count: 5, maximum_tool_schema_count: 3 },
          verification_gates: ["rollback_plan_present", "approval_required_for_migration"],
          escalation: ["manual_approval_required"]
        }
      }
    ]
  }
];

const privateRootUrl = pathToFileURL(privateRoot.endsWith("/") ? privateRoot : `${privateRoot}/`).href.replace(/\/$/, "");
const privateScenarios = await runPrivateEval([
  `import { EXECUTION_PROFILE_SCENARIOS } from "${privateRootUrl}/src/lib/assetmason/execution-profile/fixtures/scenarios.ts";`,
  `import { buildExecutionProfile } from "${privateRootUrl}/src/lib/assetmason/execution-profile/build.ts";`,
  `import { buildGenericHostExportArtifact } from "${privateRootUrl}/src/lib/assetmason/execution-profile/hosts/generic.ts";`,
  `import { buildCodexHostExportArtifact } from "${privateRootUrl}/src/lib/assetmason/execution-profile/hosts/codex.ts";`,
  `import { buildClaudeCodeHostExportArtifact } from "${privateRootUrl}/src/lib/assetmason/execution-profile/hosts/claude-code.ts";`,
  `import { buildExecutionProfileLock } from "${privateRootUrl}/src/lib/assetmason/execution-profile/lock.ts";`,
  `import { diffExecutionProfile } from "${privateRootUrl}/src/lib/assetmason/execution-profile/diff.ts";`,
  `import { diffExecutionProfileLock } from "${privateRootUrl}/src/lib/assetmason/execution-profile/lock.ts";`,
  `import { validateExecutionProfile, validateExecutionProfileLock, validateExecutionProfileDiff, validateHostExport } from "${privateRootUrl}/src/lib/assetmason/execution-profile/validate.ts";`,
  '',
  'const scenarios = EXECUTION_PROFILE_SCENARIOS.map((scenario) => {',
  '  const profile = buildExecutionProfile(scenario);',
  '  const lock = buildExecutionProfileLock(profile);',
  '  const genericExport = buildGenericHostExportArtifact(profile);',
  '  const codexExport = buildCodexHostExportArtifact(profile);',
  '  const claudeExport = buildClaudeCodeHostExportArtifact(profile);',
  '  return {',
  '    id: scenario.id,',
  '    profile,',
  '    lock,',
  '    genericExport,',
  '    codexExport,',
  '    claudeExport,',
  '    profileDiff: diffExecutionProfile(profile, { ...profile, review_notes: [...profile.review_notes, "changed"] }),',
  '    lockDiff: diffExecutionProfileLock(lock, buildExecutionProfileLock({ ...profile, review_notes: [...profile.review_notes, "changed"] })),',
  '    validations: {',
  '      profile: validateExecutionProfile(profile),',
  '      lock: validateExecutionProfileLock(lock),',
  '      profileDiff: validateExecutionProfileDiff(diffExecutionProfile(profile, profile)),',
  '      hostExport: validateHostExport(genericExport),',
  '    }',
  '  };',
  '});',
  'console.log(JSON.stringify({ source_sha: "85ad469a1f9f755e6155d34198afd733192d959e", scenarios }, null, 2));'
].join("\n"));

const report = {
  source_sha: "85ad469a1f9f755e6155d34198afd733192d959e",
  supported_artifacts: [
    "effective_policy",
    "winning_and_losing_conflicts",
    "resolved_requires_review_blocked_unknown_states",
    "profile_id_and_semantic_digest",
    "profile_lock",
    "profile_diff",
    "generic_export",
    "codex_export",
    "claude_code_export"
  ],
  unsupported_artifacts: ["OpenCode export", "outcome receipt validation", "receipt bundle validation", "receipt diff validation"],
  scenarios: []
};

for (const scenario of publicScenarios) {
  const publicResult = publicScenario(scenario.id, scenario);
  const privateResult = privateScenarios.scenarios.find((item) => item.id === scenario.id);
  const privateRoleSnapshot = (role) => ({
    role_id: role.role_id,
    role_type: role.role_type,
    required_capabilities: role.required_capabilities,
    assigned_resources: role.assigned_resources,
    context_budget: role.context_budget,
    verification_gates: role.verification_gates,
    verifier_independent: role.verifier_independent ?? false
  });
  const mismatches = [
    privateResult && publicResult.profile.profile_digest !== privateResult.profile.profile_digest ? "profile_digest" : undefined,
    privateResult && publicResult.lock.profile_digest !== privateResult.lock.profile_digest ? "lock_digest" : undefined,
    privateResult && publicResult.genericExport.content !== privateResult.genericExport.content ? "generic_export" : undefined,
    privateResult && publicResult.codexExport.content !== privateResult.codexExport.content ? "codex_export" : undefined,
    privateResult && publicResult.claudeExport.content !== privateResult.claudeExport.content ? "claude_export" : undefined
  ].filter(Boolean);
  const structuralMatches = privateResult ? {
    profile_id: publicResult.normalizedProfile.profile_id === privateResult.profile.profile_id,
    task_class: publicResult.normalizedProfile.task_class === privateResult.profile.task_class,
    host_context: publicResult.normalizedProfile.host_context === privateResult.profile.host_context,
    roles: JSON.stringify(stableSort(publicResult.normalizedProfile.roles)) === JSON.stringify(stableSort(privateResult.profile.roles.map(privateRoleSnapshot))),
    verification_gates: JSON.stringify(stableSort(publicResult.normalizedProfile.verification_gates)) === JSON.stringify(stableSort(privateResult.profile.verification_gates))
  } : undefined;
  const acceptedAdaptations = privateResult ? [{
    adaptation_id: "public-safe-role-permissions",
    reason: "Public package intentionally omits private role permission grants while preserving role selection and resource coverage.",
    affected_fields: ["roles.permissions"],
    preserved_invariants: ["profile_id", "task_class", "host_context", "role_ids", "assigned_resources", "verification_gates"],
    status: "accepted"
  }] : [];
  report.scenarios.push({
    id: scenario.id,
    profile_id: publicResult.profile.profile_id,
    public_role_ids: publicResult.profile.roles.map((role) => role.role_id),
    private_role_ids: privateResult ? privateResult.profile.roles.map((role) => role.role_id) : [],
    public_role_resources: publicResult.profile.roles.map((role) => ({ role_id: role.role_id, resources: role.assigned_resources })),
    private_role_resources: privateResult ? privateResult.profile.roles.map((role) => ({ role_id: role.role_id, resources: role.assigned_resources })) : [],
    profile_digest_match: privateResult ? publicResult.profile.profile_digest === privateResult.profile.profile_digest : false,
    lock_digest_match: privateResult ? publicResult.lock.profile_digest === privateResult.lock.profile_digest : false,
    generic_export_match: privateResult ? publicResult.genericExport.content === privateResult.genericExport.content : false,
    codex_export_match: privateResult ? publicResult.codexExport.content === privateResult.codexExport.content : false,
    claude_export_match: privateResult ? publicResult.claudeExport.content === privateResult.claudeExport.content : false,
    structural_matches: structuralMatches,
    accepted_adaptations: acceptedAdaptations,
    mismatch_summary: mismatches.length ? `Adaptation mismatch in: ${mismatches.join(", ")}` : "No mismatch",
    validation_summary: publicResult.validations
  });
}

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "parity-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
await writeFile(resolve(outputDir, "parity-summary.md"), [
  "# Execution Profile Parity Report",
  "",
  `- source SHA: ${report.source_sha}`,
  `- supported artifacts: ${report.supported_artifacts.join(", ")}`,
  `- unsupported artifacts: ${report.unsupported_artifacts.join(", ")}`,
  "",
  ...report.scenarios.flatMap((scenario) => [
    `## ${scenario.id}`,
    `- profile_id: ${scenario.profile_id}`,
    `- public_role_ids: ${JSON.stringify(scenario.public_role_ids)}`,
    `- private_role_ids: ${JSON.stringify(scenario.private_role_ids)}`,
    `- profile_digest_match: ${String(scenario.profile_digest_match)}`,
    `- lock_digest_match: ${String(scenario.lock_digest_match)}`,
    `- generic_export_match: ${String(scenario.generic_export_match)}`,
    `- codex_export_match: ${String(scenario.codex_export_match)}`,
    `- claude_export_match: ${String(scenario.claude_export_match)}`,
    `- public_role_resources: ${JSON.stringify(scenario.public_role_resources)}`,
    `- private_role_resources: ${JSON.stringify(scenario.private_role_resources)}`,
    `- structural_matches: ${JSON.stringify(scenario.structural_matches)}`,
    `- accepted_adaptations: ${JSON.stringify(scenario.accepted_adaptations)}`,
    `- mismatch_summary: ${scenario.mismatch_summary}`
  ])
].join("\n") + "\n", "utf8");
