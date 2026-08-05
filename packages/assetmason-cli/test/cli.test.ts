import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../src/main.js";
import { runCommand } from "../src/commands.js";
import { buildExecutionProfile } from "agent-execution-profile";
import { buildExecutionProfileLock } from "agent-execution-profile";
import { buildGenericHostExportArtifact } from "agent-execution-profile";
import { buildResourceInventory, buildResourceLock, buildResourcePlan } from "agent-resource-plan";

describe("assetmason-cli", () => {
  it("prints help for the new command surface", async () => {
    expect(await main(["--help"])).toBe(0);
    const help = (await runCommand(["--help"])).text;
    expect(help).toContain("assetmason doctor");
    expect(help).toContain("assetmason context");
    expect(help).toContain("assetmason explain-context");
    expect(help).toContain("assetmason check");
  });

  it("emits a deterministic doctor report", async () => {
    const result = await runCommand(["doctor", "--root", ".", "--format", "json"]);
    const report = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(report.kind).toBe("doctor-report");
    expect(typeof report.generatedAt).toBe("string");
    expect(report.provenance.root).toContain("assetmason-agent-tools");
    expect(report.repository.packageName).toBe("assetmason-agent-tools");
    expect(Array.isArray(report.findings)).toBe(true);
    expect(report.instructionFiles.some((entry: { path?: string }) => entry.path === "packages/assetmason-cli/README.md")).toBe(true);
    expect(report.packages.some((entry: { path?: string }) => entry.path === "packages/assetmason-cli/package.json")).toBe(true);
  });

  it("builds a source-referenced context pack", async () => {
    const result = await runCommand(["context", "--root", ".", "--task", "update the public CLI", "--format", "json"]);
    const pack = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(pack.kind).toBe("context-pack");
    expect(pack.provenance.task).toBe("update the public CLI");
    expect(pack.entries.length).toBeGreaterThan(0);
    expect(pack.explanation.join("\n")).toContain("Declared scripts");
    expect(pack.omissions.length).toBeGreaterThanOrEqual(0);
  });

  it("explains a selected context entry", async () => {
    const result = await runCommand(["explain-context", "--root", ".", "--entry", "packages/assetmason-cli/src/commands.ts", "--format", "json"]);
    const explanation = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(explanation.kind).toBe("context-explanation");
    expect(explanation.found).toBe(true);
    expect(explanation.freshness).toBe("fresh");
    expect(explanation.authorityRelevance).toBe("workspace-owned");
  });

  it("explains an excluded context entry", async () => {
    const result = await runCommand(["explain-context", "--root", ".", "--entry", "README.md", "--format", "json"]);
    const explanation = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(explanation.kind).toBe("context-explanation");
    expect(explanation.found).toBe(true);
    expect(explanation.status).toBe("excluded");
    expect(explanation.freshness).toBe("current-but-excluded");
    expect(explanation.authorityRelevance).toBe("repository-guidance");
  });

  it("compiles a run plan from doctor and context findings", async () => {
    const result = await runCommand(["check", "--root", ".", "--task", "add public CLI diagnostics", "--format", "json"]);
    const plan = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(plan.kind).toBe("run-plan");
    expect(typeof plan.generatedAt).toBe("string");
    expect(plan.resourcePlan.kind).toBe("resource-plan");
    expect(plan.selectionSet.kind).toBe("minimum-approved-resource-set");
    expect(plan.nextAction).toContain("repository evidence");
  });

  it("compares worker projections without changing policy", async () => {
    const result = await runCommand(["context", "--root", ".", "--task", "add public CLI diagnostics", "--diff", "codex", "claude-code", "--format", "json"]);
    const diff = JSON.parse(result.text);
    expect(result.code).toBe(0);
    expect(diff.kind).toBe("context-diff");
    expect(diff.invariantPolicy).toContain("unchanged");
    expect(diff.differences.length).toBeGreaterThan(0);
  });

  it("supports the legacy compatibility surface", async () => {
    expect((await runCommand(["check", "--scenario", "auth-redirect-bug", "--format", "markdown"])).text).toContain("resource-check");
    expect((await runCommand(["profile", "--format", "markdown"])).text).toContain("Agent Execution Profile");
    expect((await runCommand(["export", "--format", "markdown"])).text).toContain("Generated Agent Execution Profile Export");
  });

  it("validates current execution-profile artifacts through the legacy surface", async () => {
    const dir = mkdtempSync(join(tmpdir(), "assetmason-cli-"));
    const profile = buildExecutionProfile({
      task_or_intent: "auth redirect bug",
      task_class: "small_fix",
      host_context: "codex",
      policy_layers: []
    });
    const lock = buildExecutionProfileLock(profile);
    const exportArtifact = buildGenericHostExportArtifact(profile);
    const profilePath = join(dir, "profile.json");
    const lockPath = join(dir, "lock.json");
    const exportPath = join(dir, "export.json");
    writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf8");
    writeFileSync(lockPath, JSON.stringify(lock, null, 2), "utf8");
    writeFileSync(exportPath, JSON.stringify(exportArtifact, null, 2), "utf8");

    expect((await runCommand(["validate", "--file", profilePath, "--kind", "execution-profile"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", lockPath, "--kind", "execution-profile-lock"])).code).toBe(0);
    expect((await runCommand(["validate", "--file", exportPath, "--kind", "host-export"])).code).toBe(0);
  });

  it("still validates resource artifacts through the legacy surface", async () => {
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

  it("pins a deterministic fixture repo discovery pass", async () => {
    const fixtureRoot = join(process.cwd(), "packages", "assetmason-cli", "test", "fixtures", "repo-a");

    const doctor = JSON.parse((await runCommand(["doctor", "--root", fixtureRoot, "--format", "json"])).text);
    const context = JSON.parse((await runCommand(["context", "--root", fixtureRoot, "--task", "discover the fixture repo", "--format", "json"])).text);
    const runPlan = JSON.parse((await runCommand(["check", "--root", fixtureRoot, "--task", "discover the fixture repo", "--format", "json"])).text);

    expect(doctor.repository.packageName).toBe("fixture-repo-a");
    expect(doctor.findings.some((finding: { code?: string }) => finding.code === "repo.verify-public")).toBe(true);
    expect(doctor.instructionFiles.some((entry: { path?: string }) => entry.path === "packages/child/AGENTS.md")).toBe(true);
    expect(context.entries.some((entry: { path?: string }) => entry.path === "packages/assetmason-cli/src/commands.ts")).toBe(true);
    expect(context.omissions.some((entry: { path?: string }) => entry.path === "README.md")).toBe(true);
    expect(runPlan.resourcePlan.kind).toBe("resource-plan");
    expect(runPlan.selectionSet.kind).toBe("minimum-approved-resource-set");
  }, 20000);
});
