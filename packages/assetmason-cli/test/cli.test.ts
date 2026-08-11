import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

  it("runs the public transaction workflow end to end on a fixture repo", async () => {
    const fixtureRoot = join(process.cwd(), "packages", "assetmason-cli", "test", "fixtures", "repo-a");
    const dir = mkdtempSync(join(tmpdir(), "assetmason-workflow-"));
    const doctorPath = join(dir, "doctor.json");
    const contextPath = join(dir, "context.json");
    const planPath = join(dir, "plan.json");
    const lockPath = join(dir, "lock.json");
    const receiptPath = join(dir, "receipt.json");
    const importPath = join(dir, "import.json");
    const receiptWithEvidencePath = join(dir, "receipt-with-evidence.json");
    const reconciliationPath = join(dir, "reconciliation.json");
    const handoffPath = join(dir, "handoff.json");

    const doctor = await runCommand(["doctor", "--root", fixtureRoot, "--format", "json"]);
    const context = await runCommand(["context", "--root", fixtureRoot, "--task", "upgrade dependency safely", "--format", "json"]);
    const plan = await runCommand(["check", "--root", fixtureRoot, "--task", "upgrade dependency safely", "--format", "json"]);
    writeFileSync(doctorPath, doctor.text, "utf8");
    writeFileSync(contextPath, context.text, "utf8");
    writeFileSync(planPath, plan.text, "utf8");

    const lock = await runCommand(["lock", "--from-plan", planPath, "--out", lockPath, "--format", "json"]);
    const receipt = await runCommand(["receipt-init", "--plan", planPath, "--lock", lockPath, "--out", receiptPath, "--format", "json"]);

    writeFileSync(importPath, JSON.stringify({
      schema_version: "0.1.0",
      import_id: "import-1",
      receipt_id: "plan-receipt",
      imported_at: "2026-08-06T00:00:00.000Z",
      source: "explicit-cli-input",
      evidence_refs: ["tests"],
      command_records: ["npm test"],
      check_records: ["typecheck"],
      artifact_refs: ["plan.json", "lock.json"],
      external_effects: [],
      observations: ["fixture workflow completed"],
      warnings: [],
      unknowns: [],
      contradicted_evidence: [],
      missing_evidence: [],
      local_only: true
    }, null, 2), "utf8");

    const receiptWithEvidence = await runCommand(["evidence-import", "--receipt", receiptPath, "--import", importPath, "--out", receiptWithEvidencePath, "--format", "json"]);
    const reconciliation = await runCommand(["reconcile", "--plan", planPath, "--lock", lockPath, "--receipt", receiptWithEvidencePath, "--out", reconciliationPath, "--format", "json"]);
    const handoff = await runCommand(["handoff", "--plan", planPath, "--lock", lockPath, "--receipt", receiptWithEvidencePath, "--out", handoffPath, "--format", "json"]);

    const doctorArtifact = JSON.parse(readFileSync(doctorPath, "utf8"));
    const contextArtifact = JSON.parse(readFileSync(contextPath, "utf8"));
    const planArtifact = JSON.parse(readFileSync(planPath, "utf8"));
    const lockArtifact = JSON.parse(readFileSync(lockPath, "utf8"));
    const receiptArtifact = JSON.parse(readFileSync(receiptWithEvidencePath, "utf8"));
    const reconciliationArtifact = JSON.parse(readFileSync(reconciliationPath, "utf8"));
    const handoffArtifact = JSON.parse(readFileSync(handoffPath, "utf8"));

    expect(doctor.code).toBe(0);
    expect(context.code).toBe(0);
    expect(plan.code).toBe(0);
    expect(lock.code).toBe(0);
    expect(receipt.code).toBe(0);
    expect(receiptWithEvidence.code).toBe(0);
    expect(reconciliation.code).toBe(0);
    expect(handoff.code).toBe(0);
    expect(doctorArtifact.kind).toBe("doctor-report");
    expect(contextArtifact.kind).toBe("context-pack");
    expect(planArtifact.kind).toBe("run-plan");
    expect(lockArtifact.kind).toBe("resource-lock");
    expect(receiptArtifact.evidence_imports?.length).toBe(1);
    expect(reconciliationArtifact.schema_version).toBe("0.1.0");
    expect(handoffArtifact.schema_version).toBe("0.1.0");
  }, 40000);

  it("runs a CLI artifact corpus for the named receipt variants", async () => {
    const fixtureRoot = join(process.cwd(), "packages", "assetmason-cli", "test", "fixtures", "repo-a");
    const variants = [
      { import_id: "ready", variant: "ready", evidenceBucket: "ready", waitFragment: undefined },
      { import_id: "missing", variant: "missing_evidence", evidenceBucket: "missing", waitFragment: "missing evidence" },
      { import_id: "contradiction", variant: "contradiction", evidenceBucket: "contradicted", waitFragment: "contradicted evidence" },
      { import_id: "stale", variant: "stale_evidence", evidenceBucket: "stale", waitFragment: undefined },
      { import_id: "external", variant: "external_wait", evidenceBucket: "external_wait", waitFragment: "external wait" },
      { import_id: "delta", variant: "conditional", evidenceBucket: "conditional", waitFragment: undefined }
    ] as const;

    for (const variant of variants) {
      const dir = mkdtempSync(join(tmpdir(), `assetmason-variant-${variant.import_id}-`));
      const planPath = join(dir, "plan.json");
      const lockPath = join(dir, "lock.json");
      const receiptPath = join(dir, "receipt.json");
      const importPath = join(dir, "import.json");
      const receiptWithEvidencePath = join(dir, "receipt-with-evidence.json");
      const reconciliationPath = join(dir, "reconciliation.json");
      const handoffPath = join(dir, "handoff.json");

      const plan = await runCommand(["check", "--root", fixtureRoot, "--task", `variant ${variant.import_id}`, "--format", "json"]);
      writeFileSync(planPath, plan.text, "utf8");
      const lock = await runCommand(["lock", "--from-plan", planPath, "--out", lockPath, "--format", "json"]);
      const receipt = await runCommand(["receipt-init", "--plan", planPath, "--lock", lockPath, "--out", receiptPath, "--format", "json"]);

      writeFileSync(importPath, JSON.stringify({
        schema_version: "0.1.0",
        import_id: variant.import_id,
        receipt_id: "plan-receipt",
        imported_at: "2026-08-06T00:00:00.000Z",
        source: "explicit-cli-input",
        evidence_refs: [],
        command_records: [],
        check_records: [],
        artifact_refs: [],
        external_effects: [],
        observations: [],
        warnings: [],
        unknowns: [],
        contradicted_evidence: [],
        missing_evidence: [],
        variant: variant.variant,
        local_only: true
      }, null, 2), "utf8");

      const receiptWithEvidence = await runCommand(["evidence-import", "--receipt", receiptPath, "--import", importPath, "--out", receiptWithEvidencePath, "--format", "json"]);
      const reconciliation = await runCommand(["reconcile", "--plan", planPath, "--lock", lockPath, "--receipt", receiptWithEvidencePath, "--out", reconciliationPath, "--format", "json"]);
      const handoff = await runCommand(["handoff", "--plan", planPath, "--lock", lockPath, "--receipt", receiptWithEvidencePath, "--out", handoffPath, "--format", "json"]);

      const receiptArtifact = JSON.parse(readFileSync(receiptWithEvidencePath, "utf8"));
      const handoffArtifact = JSON.parse(readFileSync(handoffPath, "utf8"));

      expect(plan.code).toBe(0);
      expect(lock.code).toBe(0);
      expect(receipt.code).toBe(0);
      expect(receiptWithEvidence.code).toBe(0);
      expect(reconciliation.code).toBe(0);
      expect(handoff.code).toBe(0);
      expect(receiptArtifact.evidence_state?.[variant.evidenceBucket]).toContain(variant.import_id);
      if (variant.waitFragment) {
        expect(handoffArtifact.waits.some((wait: string) => wait.includes(variant.waitFragment as string))).toBe(true);
      }
    }
  }, 60000);

  it("persists a runtime event log across pause, checkpoint, and fresh-process resume", async () => {
    const root = mkdtempSync(join(tmpdir(), "assetmason-runtime-"));
    const runResult = await runCommand(["run", "--root", root, "--task", "record a local checkpoint", "--with", "generic-command"]);
    const run = JSON.parse(runResult.text);
    expect(runResult.code).toBe(0);
    expect(run.kind).toBe("run-record");
    expect(run.state).toBe("created");

    const pausedResult = await runCommand(["pause", "--root", root, "--run", run.run_id]);
    expect(JSON.parse(pausedResult.text).state).toBe("paused");
    const checkpointResult = await runCommand(["checkpoint", "--root", root, "--run", run.run_id, "--acceptance", "verify receipt"]);
    const checkpoint = JSON.parse(checkpointResult.text);
    expect(checkpoint.kind).toBe("checkpoint-record");
    expect(checkpoint.outstanding_acceptance).toEqual(["verify receipt"]);

    const resumedResult = await runCommand(["resume", "--root", root, "--run", run.run_id]);
    const resumed = JSON.parse(resumedResult.text);
    expect(resumed.state).toBe("running");
    expect(resumed.event_offset).toBeGreaterThan(run.event_offset);
    const status = JSON.parse((await runCommand(["status", "--root", root, "--run", run.run_id])).text);
    expect(status.checkpoint_id).toBe(checkpoint.checkpoint_id);
  });
});
