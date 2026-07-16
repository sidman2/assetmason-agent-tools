import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";
import { runCommand } from "../src/commands.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildExecutionProfile } from "agent-execution-profile";
import { buildExecutionProfileLock } from "agent-execution-profile";
import { buildGenericHostExportArtifact, diffExecutionProfile } from "agent-execution-profile";
import { buildResourceInventory, buildResourceLock, buildResourcePlan } from "agent-resource-plan";

describe("assetmason-cli", () => {
  it("prints help", async () => {
    expect(await main(["--help"])).toBe(0);
  });

  it("prints list scenarios", async () => {
    expect(await main(["list-scenarios"])).toBe(0);
  });

  it("prints select output", async () => {
    expect((await runCommand(["select", "--format", "markdown"])).text).toContain("minimum-approved-resource-set");
  });

  it("prints profile output", async () => {
    expect((await runCommand(["profile", "--format", "markdown"])).text).toContain("Agent Execution Profile");
  });

  it("prints export output", async () => {
    expect((await runCommand(["export", "--format", "markdown"])).text).toContain("Generated Agent Execution Profile Export");
  });

  it("prints check, scan, and handoff output", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    writeFileSync(join(dir, "token.txt"), "secret", "utf8");

    expect((await runCommand(["check", "--format", "markdown"])).text).toContain("resource-check");
    expect((await runCommand(["scan", "--root", dir, "--format", "markdown"])).text).toContain("resource-inventory");
    expect((await runCommand(["handoff", "--format", "markdown"])).text).toContain("host-handoff");
  });

  it("rejects unknown commands", () => {
    return runCommand(["nope"]).then((result) => {
      expect(result.code).toBe(1);
    });
  });

  it("renders markdown output", async () => {
    expect((await runCommand(["plan", "--format", "markdown"])).text).toContain("# resource-plan");
  });

  it("validates outcome receipts through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const receiptPath = join(dir, "receipt.json");
    writeFileSync(receiptPath, JSON.stringify({
      schema_version: "0.1.0",
      receipt_id: "receipt-1",
      profile_id: "profile-1",
      profile_digest: "digest-1",
      resolved_roles: ["implementer"],
      verification_results: [{ gate: "tests_pass", passed: true }],
      warnings: [],
      unknowns: [],
      local_only: true
    }, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", receiptPath, "--kind", "outcome-receipt"])).code).toBe(0);
  });

  it("validates execution profile artifacts through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const profile = buildExecutionProfile({
      task_or_intent: "auth redirect bug",
      task_class: "small_fix",
      host_context: "codex",
      policy_layers: [
        {
          layer: "task_envelope",
          preferences: {
            preferred_resources: ["repo_source"],
            capability_requirements: ["tool_use"]
          },
          unknowns: ["private runtime state"]
        }
      ],
      review_notes: ["advisory only"]
    });
    const lock = buildExecutionProfileLock(profile);
    const profilePath = join(dir, "profile.json");
    const lockPath = join(dir, "lock.json");
    writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf8");
    writeFileSync(lockPath, JSON.stringify(lock, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", profilePath, "--kind", "execution-profile"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", lockPath, "--kind", "execution-profile-lock"])).code).toBe(0);
  });

  it("validates execution profile diff and host export through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const profile = buildExecutionProfile({
      task_or_intent: "auth redirect bug",
      task_class: "small_fix",
      host_context: "codex",
      policy_layers: [
        {
          layer: "task_envelope",
          preferences: {
            preferred_resources: ["repo_source"],
            capability_requirements: ["tool_use"]
          },
          unknowns: ["private runtime state"]
        }
      ],
      review_notes: ["advisory only"]
    });
    const changedProfile = buildExecutionProfile({
      ...profile,
      review_notes: [...profile.review_notes, "changed"]
    });
    const exportArtifact = buildGenericHostExportArtifact(profile);
    const diffArtifact = diffExecutionProfile(profile, changedProfile);
    const exportPath = join(dir, "export.json");
    const diffPath = join(dir, "diff.json");
    writeFileSync(exportPath, JSON.stringify(exportArtifact, null, 2), "utf8");
    writeFileSync(diffPath, JSON.stringify(diffArtifact, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", exportPath, "--kind", "host-export"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", diffPath, "--kind", "execution-profile-diff"])).code).toBe(0);
  });

  it("renders diff and profile-diff commands through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const beforeResourcePlan = buildResourcePlan("auth-redirect-bug");
    const afterResourcePlan = buildResourcePlan("architecture-sensitive-feature");
    const beforeProfile = buildExecutionProfile({
      task_or_intent: "auth redirect bug",
      task_class: "small_fix",
      host_context: "codex",
      policy_layers: [
        {
          layer: "task_envelope",
          preferences: {
            preferred_resources: ["repo_source"],
            capability_requirements: ["tool_use"]
          },
          unknowns: ["private runtime state"]
        }
      ],
      review_notes: ["advisory only"]
    });
    const afterProfile = buildExecutionProfile({
      ...beforeProfile,
      review_notes: [...beforeProfile.review_notes, "changed"]
    });
    const beforeResourcePlanPath = join(dir, "before-resource-plan.json");
    const afterResourcePlanPath = join(dir, "after-resource-plan.json");
    const beforeProfilePath = join(dir, "before-profile.json");
    const afterProfilePath = join(dir, "after-profile.json");
    writeFileSync(beforeResourcePlanPath, JSON.stringify(beforeResourcePlan, null, 2), "utf8");
    writeFileSync(afterResourcePlanPath, JSON.stringify(afterResourcePlan, null, 2), "utf8");
    writeFileSync(beforeProfilePath, JSON.stringify(beforeProfile, null, 2), "utf8");
    writeFileSync(afterProfilePath, JSON.stringify(afterProfile, null, 2), "utf8");

    expect((await runCommand(["diff", "--before", beforeResourcePlanPath, "--after", afterResourcePlanPath, "--format", "markdown"])).text).toContain("resource-diff");
    expect((await runCommand(["profile-diff", "--before", beforeProfilePath, "--after", afterProfilePath, "--format", "markdown"])).text).toContain("Agent Execution Profile Diff");
  });

  it("validates selection artifacts through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const envelope = {
      schema_version: "0.1.0",
      envelope_id: "selection-envelope-auth-redirect-bug",
      envelope_digest: "",
      task_class: "small_fix",
      phase: "plan",
      host_context: "codex-desktop",
      allowed_resources: ["docs", "repo"],
      denied_resources: ["forbidden-debugger"],
      ask_first_resources: ["browser-qa"],
      sandbox_only_resources: ["local-sim"],
      allowed_permissions: ["read"],
      denied_permissions: ["publish"],
      required_approvals: [{ approval_id: "review", reason: "public review required", review_status: "not_requested" }],
      required_verification_gates: ["typecheck", "test"],
      context_budget: { maximum_resource_count: 3, maximum_tool_schema_count: 2 },
      unknowns: ["private ranking not exposed"],
      evidence_refs: [{ kind: "fixture", label: "public fixture" }],
      runtime_advisory_only: true,
      rules: [],
      conflicts: []
    };
    const evaluation = {
      kind: "minimum-toolset-evaluation",
      advisoryOnly: true,
      exactExpectedSelectionMatch: true,
      requiredResourceRecall: 1,
      unnecessaryResourcePrecision: 1,
      denialClarity: 1,
      unknownClarity: 1,
      contextBudgetReduction: 0,
      deterministicRepeatability: true,
      scenarioCount: 1
    };
    const envelopePath = join(dir, "selection-envelope.json");
    const evaluationPath = join(dir, "evaluation.json");
    writeFileSync(envelopePath, JSON.stringify(envelope, null, 2), "utf8");
    writeFileSync(evaluationPath, JSON.stringify(evaluation, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", envelopePath, "--kind", "selection-policy-envelope"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", evaluationPath, "--kind", "minimum-toolset-evaluation"])).code).toBe(0);
  });

  it("validates resource artifacts through the CLI", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const plan = buildResourcePlan("auth-redirect-bug");
    const inventory = buildResourceInventory(".");
    const lock = buildResourceLock(plan, inventory);
    const planPath = join(dir, "resource-plan.json");
    const lockPath = join(dir, "resource-lock.json");
    writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
    writeFileSync(lockPath, JSON.stringify(lock, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", planPath, "--kind", "resource-plan"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", lockPath, "--kind", "resource-lock"])).code).toBe(0);
  });
});
