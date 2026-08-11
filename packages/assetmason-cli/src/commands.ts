import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { checkpointRun, createRun, loadRuntimeRun, resumeRun, transitionRun } from "./local-runtime.js";

type OutputFormat = "json" | "markdown";

type SourceRef = {
  kind: "file" | "package" | "script" | "git" | "registry" | "note";
  path?: string;
  label: string;
  status: "included" | "excluded" | "unknown";
  reason: string;
  content?: string;
};

type DoctorReport = {
  kind: "doctor-report";
  generatedAt: string;
  provenance: { root: string; branch: string; head: string };
  root: string;
  branch: string;
  head: string;
  worktreeClean: boolean;
  repository: {
    packageName: string;
    scripts: string[];
    workspaces: string[];
  };
  scripts: SourceRef[];
  workflows: SourceRef[];
  instructionFiles: SourceRef[];
  packages: SourceRef[];
  findings: Array<{ status: "ready" | "conditional" | "blocked" | "human" | "unknown"; code: string; message: string }>;
  sources: SourceRef[];
};

type ContextPack = {
  kind: "context-pack";
  generatedAt: string;
  provenance: { root: string; task: string; sourceHead: string };
  task: string;
  root: string;
  readiness: DoctorReport["findings"][number]["status"];
  entries: SourceRef[];
  omissions: SourceRef[];
  explanation: string[];
};

type RunPlan = {
  kind: "run-plan";
  generatedAt: string;
  provenance: { root: string; task: string; sourceHead: string };
  task: string;
  readiness: DoctorReport["findings"][number]["status"];
  objective: string;
  resourcePlan: any;
  selectionSet: any;
  sourceRefs: SourceRef[];
  findings: DoctorReport["findings"];
  nextAction: string;
};

let resourcePlanModule: any;
let executionProfileModule: any;
async function loadResourcePlanModule() {
  if (!resourcePlanModule) resourcePlanModule = await import("agent-resource-plan");
  return resourcePlanModule;
}

async function loadExecutionProfileModule() {
  if (!executionProfileModule) executionProfileModule = await import("agent-execution-profile");
  return executionProfileModule;
}

export async function runCommand(argv: string[]) {
  const [command, ...rest] = argv;
  const format = getOption(rest, "--format") ?? "json";
  const outputFormat: OutputFormat = format === "markdown" ? "markdown" : "json";
  const scenario = getOption(rest, "--scenario") ?? "auth-redirect-bug";
  const task = getOption(rest, "--task") ?? scenario;
  const root = resolve(getOption(rest, "--root") ?? ".");
  if (!command || command === "--help" || command === "-h") return { code: 0, text: helpText() };
  if (command === "doctor") return render(await buildDoctorReport(root), outputFormat, renderJson, renderJson);
  if (command === "context") {
    const diffTargets = getOptionValues(rest, "--diff");
    if (diffTargets.length === 2) return render(await buildContextDiff(root, task, diffTargets[0], diffTargets[1]), outputFormat, renderJson, renderJson);
    return render(await buildContextPack(root, task), outputFormat, renderJson, renderJson);
  }
  if (command === "explain-context") return render(await buildContextExplanation(root, getOption(rest, "--entry") ?? task), outputFormat, renderJson, renderJson);
  if (command === "check") {
    if (!getOption(rest, "--task") && getOption(rest, "--scenario")) {
      const resourcePlan = await loadResourcePlanModule();
      return render(resourcePlan.buildBeforeBuildPacket(scenario), outputFormat, renderJson, renderJson);
    }
    return render(await buildRunPlan(root, task), outputFormat, renderJson, renderJson);
  }
  if (command === "list-scenarios") {
    const resourcePlan = await loadResourcePlanModule();
    return { code: 0, text: `${[...resourcePlan.listResourceScenarios(), ...resourcePlan.listSelectionScenarios()].join("\n")}\n` };
  }
  if (command === "plan") {
    const resourcePlan = await loadResourcePlanModule();
    return render(resourcePlan.buildResourcePlan(scenario), outputFormat, renderJson, renderJson);
  }
  if (command === "select") {
    const resourcePlan = await loadResourcePlanModule();
    return renderSelection(resourcePlan.buildSelectionScenario(scenario), outputFormat, resourcePlan);
  }
  if (command === "profile") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfile(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    }), outputFormat, executionProfile);
  }
  if (command === "profile-lock") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfileLock(executionProfile.buildExecutionProfileLock(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    })), outputFormat, executionProfile);
  }
  if (command === "profile-diff") {
    const before = getOption(rest, "--before");
    const after = getOption(rest, "--after");
    if (!before || !after) return error("profile-diff requires --before and --after");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndDiff(before, after, outputFormat, executionProfile, "profile-diff");
  }
  if (command === "export") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfileExport(executionProfile.buildGenericHostExportArtifact(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    })), outputFormat, executionProfile);
  }
  if (command === "scan") {
    const resourcePlan = await loadResourcePlanModule();
    return render(resourcePlan.scanResourceInventory(getOption(rest, "--root") ?? "."), outputFormat, renderJson, renderJson);
  }
  if (command === "lock") {
    const resourcePlan = await loadResourcePlanModule();
    const fromPlan = getOption(rest, "--from-plan");
    if (fromPlan) return loadPlanAndLock(fromPlan, getOption(rest, "--out"), outputFormat, renderJson);
    return render(resourcePlan.buildResourceLock(resourcePlan.buildResourcePlan(scenario), resourcePlan.buildResourceInventory(".")), outputFormat, renderJson, renderJson);
  }
  if (command === "diff") {
    const before = getOption(rest, "--before");
    const after = getOption(rest, "--after");
    if (!before || !after) return error("diff requires --before and --after");
    const resourcePlan = await loadResourcePlanModule();
    return loadAndDiff(before, after, outputFormat, resourcePlan);
  }
  if (command === "reconcile") {
    const planPath = getOption(rest, "--plan");
    const receiptPath = getOption(rest, "--receipt");
    if (!planPath || !receiptPath) return error("reconcile requires --plan and --receipt");
    const lockPath = getOption(rest, "--lock");
    const outPath = getOption(rest, "--out");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndReconcile(planPath, lockPath, receiptPath, outPath, outputFormat, executionProfile);
  }
  if (command === "receipt-init") {
    const planPath = getOption(rest, "--plan");
    if (!planPath) return error("receipt-init requires --plan");
    const lockPath = getOption(rest, "--lock");
    const outPath = getOption(rest, "--out");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndInitReceipt(planPath, lockPath, outPath, outputFormat, executionProfile);
  }
  if (command === "run") {
    const runtime = await createRun({ root, task, adapter: getOption(rest, "--with"), command: rest, isolated: rest.includes("--isolated") });
    return render(runtime, outputFormat, renderJson, renderJson);
  }
  if (command === "status") {
    const runId = getOption(rest, "--run");
    if (!runId) return error("status requires --run");
    return render(await loadRuntimeRun(root, runId), outputFormat, renderJson, renderJson);
  }
  if (command === "checkpoint") {
    const runId = getOption(rest, "--run");
    if (!runId) return error("checkpoint requires --run");
    return render(await checkpointRun(root, runId, getOptionValues(rest, "--acceptance")), outputFormat, renderJson, renderJson);
  }
  if (command === "pause" || command === "stop" || command === "block") {
    const runId = getOption(rest, "--run");
    if (!runId) return error(`${command} requires --run`);
    const state = command === "pause" ? "paused" : command === "block" ? "blocked" : "completed";
    return render(await transitionRun(root, runId, state, `run.${command}d`), outputFormat, renderJson, renderJson);
  }
  if (command === "resume") {
    const runId = getOption(rest, "--run");
    if (!runId) return error("resume requires --run");
    return render(await resumeRun(root, runId), outputFormat, renderJson, renderJson);
  }
  if (command === "evidence-import") {
    const receiptPath = getOption(rest, "--receipt");
    const importPath = getOption(rest, "--import");
    if (!receiptPath || !importPath) return error("evidence-import requires --receipt and --import");
    const outPath = getOption(rest, "--out");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndImportEvidence(receiptPath, importPath, outPath, outputFormat, executionProfile);
  }
  const resourcePlan = await loadResourcePlanModule();
  const executionProfile = await loadExecutionProfileModule();
  if (command === "validate") return validateArtifact(getOption(rest, "--file") ?? "", getOption(rest, "--kind"), resourcePlan, executionProfile);
  if (command === "handoff") {
    const planPath = getOption(rest, "--plan");
    const receiptPath = getOption(rest, "--receipt");
    const lockPath = getOption(rest, "--lock");
    const outPath = getOption(rest, "--out");
    if (!planPath || !receiptPath) return error("handoff requires --plan and --receipt");
    return loadAndBuildHandoff(planPath, lockPath, receiptPath, outPath, outputFormat, executionProfile);
  }
  return error(`Unknown command: ${command}`);
}

function helpText(): string {
  return [
    "assetmason --help",
    "assetmason doctor --root <dir> --format json|markdown",
    "assetmason context --root <dir> --task <text> --format json|markdown",
    "assetmason context --root <dir> --task <text> --diff <worker-a> <worker-b> --format json|markdown",
    "assetmason explain-context --root <dir> --entry <name> --format json|markdown",
    "assetmason check --root <dir> --task <text> --format json|markdown",
    "assetmason list-scenarios",
    "assetmason plan --scenario <name> --format json|markdown",
    "assetmason select --scenario <name> --format json|markdown",
    "assetmason profile --scenario <name> --format json|markdown",
    "assetmason profile-lock --scenario <name> --format json|markdown",
    "assetmason profile-diff --before <file> --after <file> --format json|markdown",
    "assetmason export --scenario <name> --format json|markdown",
    "assetmason scan --root <dir> --format json|markdown",
    "assetmason lock --scenario <name> --format json|markdown",
    "assetmason diff --before <file> --after <file> --format json|markdown",
    "assetmason reconcile --plan <file> --receipt <file> [--lock <file>] --format json|markdown [--out <file>]",
    "assetmason receipt-init --plan <file> [--lock <file>] --format json|markdown [--out <file>]",
    "assetmason run --root <dir> --task <text> [--with <adapter>] [--isolated] --format json|markdown",
    "assetmason status --root <dir> --run <run-id> --format json|markdown",
    "assetmason checkpoint --root <dir> --run <run-id> [--acceptance <item> ...] --format json|markdown",
    "assetmason pause|stop|block --root <dir> --run <run-id> --format json|markdown",
    "assetmason resume --root <dir> --run <run-id> --format json|markdown",
    "assetmason evidence-import --receipt <file> --import <file> [--out <file>] --format json|markdown",
    "assetmason validate --file <file> [--kind resource-plan|resource-lock|selection-policy-envelope|minimum-approved-resource-set|minimum-toolset-evaluation|work-order|execution-profile|execution-profile-lock|execution-profile-diff|host-export|outcome-receipt]",
    "assetmason handoff --plan <file> --receipt <file> [--lock <file>] [--out <file>]"
  ].join("\n") + "\n";
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function getOptionValues(args: string[], name: string): string[] {
  const index = args.indexOf(name);
  return index >= 0 ? args.slice(index + 1, index + 3) : [];
}

function render(value: unknown, format: OutputFormat, jsonRenderer: (value: unknown) => string, markdownRenderer: (value: unknown) => string) {
  return { code: 0, text: format === "markdown" ? markdownRenderer(value) : jsonRenderer(value) };
}

function renderJson(value: unknown) { return JSON.stringify(value, null, 2) + "\n"; }

function renderSelection(value: unknown, format: OutputFormat, resourcePlan: any) {
  return { code: 0, text: format === "markdown" ? resourcePlan.renderMinimumApprovedResourceSetMarkdown(value) : resourcePlan.renderMinimumApprovedResourceSetJson(value) };
}

function renderExecutionProfile(value: unknown, format: OutputFormat, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

function renderExecutionProfileLock(value: unknown, format: OutputFormat, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileLockMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

function renderExecutionProfileExport(value: unknown, format: OutputFormat, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? String((value as { content?: string }).content ?? "") : JSON.stringify(value, null, 2) + "\n" };
}

async function buildDoctorReport(root: string): Promise<DoctorReport> {
  const packageJson = await readJson(join(root, "package.json")).catch(() => undefined);
  const workspaces = Array.isArray(packageJson?.workspaces) ? packageJson.workspaces : [];
  const branch = safeGit(["branch", "--show-current"], root) ?? "unknown";
  const head = safeGit(["rev-parse", "HEAD"], root) ?? "unknown";
  const status = safeGit(["status", "--short"], root) ?? "";
  const worktreeClean = status.trim().length === 0;
  const scriptEntries = await discoverScripts(root, packageJson);
  const workflows = await discoverWorkflows(root);
  const instructionFiles = await discoverInstructionFiles(root);
  const packageEntries = await discoverWorkspacePackages(root);
  const sources = [
    { kind: "package", label: "package.json", path: "package.json", status: packageJson ? "included" : "unknown", reason: packageJson ? "Repository manifest loaded." : "Repository manifest missing." },
    { kind: "git", label: "git branch", status: branch === "unknown" ? "unknown" : "included", reason: "Current branch detected from git." },
    { kind: "git", label: "git head", status: head === "unknown" ? "unknown" : "included", reason: "Current HEAD detected from git." },
    ...scriptEntries,
    ...workflows,
    ...instructionFiles,
    ...packageEntries
  ] satisfies SourceRef[];
  return {
    kind: "doctor-report",
    generatedAt: new Date().toISOString(),
    provenance: { root, branch, head },
    root,
    branch,
    head,
    worktreeClean,
    repository: {
      packageName: typeof packageJson?.name === "string" ? packageJson.name : "unknown",
      scripts: packageJson?.scripts ? Object.keys(packageJson.scripts) : [],
      workspaces
    },
    scripts: scriptEntries,
    workflows,
    instructionFiles,
    packages: packageEntries,
    findings: [
      { status: packageJson ? "ready" : "unknown", code: "repo.package-json", message: packageJson ? "package.json is present." : "package.json could not be read." },
      { status: worktreeClean ? "ready" : "conditional", code: "repo.worktree", message: worktreeClean ? "worktree is clean." : "worktree has local changes." },
      { status: scriptEntries.some((entry) => entry.label === "verify:public") ? "ready" : "conditional", code: "repo.verify-public", message: scriptEntries.some((entry) => entry.label === "verify:public") ? "verify:public is declared." : "verify:public is not declared." },
      { status: workflows.length > 0 ? "ready" : "conditional", code: "repo.workflows", message: workflows.length > 0 ? "GitHub workflow files are present." : "No GitHub workflow files found." },
      { status: instructionFiles.length > 0 ? "ready" : "conditional", code: "repo.instructions", message: instructionFiles.length > 0 ? "Instruction files are present." : "No instruction files found." },
      { status: packageEntries.length > 0 ? "ready" : "conditional", code: "repo.packages", message: packageEntries.length > 0 ? "Workspace packages are present." : "No workspace package manifests were found." }
    ],
    sources
  };
}

async function buildContextPack(root: string, task: string): Promise<ContextPack> {
  const doctor = await buildDoctorReport(root);
  const packageJson = await readJson(join(root, "package.json")).catch(() => undefined);
  const candidates: SourceRef[] = [
    { kind: "file", label: "packages/assetmason-cli/src/commands.ts", path: "packages/assetmason-cli/src/commands.ts", status: "included", reason: "This file owns the CLI command surface." },
    { kind: "file", label: "packages/agent-resource-plan/src/resource-plan.ts", path: "packages/agent-resource-plan/src/resource-plan.ts", status: "included", reason: "This file owns reusable plan and inventory contracts." },
    { kind: "file", label: "packages/agent-execution-profile/src/build.ts", path: "packages/agent-execution-profile/src/build.ts", status: "included", reason: "This file owns reusable execution-profile construction." },
    { kind: "package", label: "root package.json", path: "package.json", status: "included", reason: "Root scripts and workspace boundaries are relevant." },
    { kind: "file", label: ".github/workflows/ci.yml", path: ".github/workflows/ci.yml", status: "included", reason: "CI workflow evidence is relevant to repository operability." },
    { kind: "file", label: "README.md", path: "README.md", status: "included", reason: "Repository-level guidance and preview claims are relevant." }
  ];
  const entries = candidates.filter((entry) =>
    task.toLowerCase().includes("context")
      || entry.path === "package.json"
      || entry.path === "packages/assetmason-cli/src/commands.ts"
      || entry.path === "packages/agent-resource-plan/src/resource-plan.ts"
      || entry.path === "packages/agent-execution-profile/src/build.ts"
  );
  const omissions = candidates
    .filter((entry) => !entries.includes(entry))
    .map((entry) => ({ ...entry, status: "excluded" as const, reason: `Excluded from the bounded context pack for task '${task}'.` }));
  return {
    kind: "context-pack",
    generatedAt: new Date().toISOString(),
    provenance: { root, task, sourceHead: doctor.head },
    task,
    root,
    readiness: doctor.findings.some((finding) => finding.status === "blocked") ? "blocked" : doctor.findings.some((finding) => finding.status === "human") ? "human" : doctor.findings.some((finding) => finding.status === "conditional") ? "conditional" : doctor.findings.some((finding) => finding.status === "unknown") ? "unknown" : "ready",
    entries,
    omissions,
    explanation: [
      `Task: ${task}`,
      `Root package: ${typeof packageJson?.name === "string" ? packageJson.name : "unknown"}`,
      `Declared scripts: ${doctor.scripts.map((entry) => entry.label).join(", ") || "none"}`
    ]
  };
}

async function buildContextDiff(root: string, task: string, workerA: string, workerB: string) {
  const context = await buildContextPack(root, task);
  const projectWorker = (worker: string): SourceRef[] =>
    context.entries.map((entry) => ({
      ...entry,
      reason: `${entry.reason} Projected for ${worker}.`
    }));
  return {
    kind: "context-diff",
    task,
    workers: [workerA, workerB],
    invariantPolicy: "project policy unchanged",
    differences: context.entries.map((entry, index) => ({
      path: entry.path ?? entry.label,
      workerA: projectWorker(workerA)[index] ?? null,
      workerB: projectWorker(workerB)[index] ?? null,
      projectInvariant: entry.status
    }))
  };
}

async function buildContextExplanation(root: string, entryName: string) {
  const context = await buildContextPack(root, entryName);
  const match = [...context.entries, ...context.omissions].find((entry) => entry.label === entryName || entry.path === entryName);
  const doctor = await buildDoctorReport(root);
  const freshness = match?.status === "included" ? "fresh" : match?.status === "excluded" ? "current-but-excluded" : "unknown";
  const authorityRelevance = match?.path?.startsWith("packages/") ? "workspace-owned" : match?.path?.startsWith(".github/") ? "workflow-owned" : match?.path === "README.md" ? "repository-guidance" : "root-owned";
  return {
    kind: "context-explanation",
    entry: entryName,
    found: Boolean(match),
    status: match?.status ?? "unknown",
    reason: match?.reason ?? "Entry not selected by current context rules.",
    freshness,
    authorityRelevance,
    sourceHead: doctor.head,
    source: match ?? null
  };
}

async function buildRunPlan(root: string, task: string): Promise<RunPlan> {
  const doctor = await buildDoctorReport(root);
  const context = await buildContextPack(root, task);
  const resourcePlanModule = await loadResourcePlanModule();
  const resourcePlan = resourcePlanModule.buildResourcePlan(task);
  const selectionSet = { kind: "minimum-approved-resource-set", ...resourcePlanModule.buildSelectionScenario(task) };
  return {
    kind: "run-plan",
    generatedAt: new Date().toISOString(),
    provenance: { root, task, sourceHead: doctor.head },
    task,
    readiness: context.readiness,
    objective: task,
    resourcePlan,
    selectionSet,
    sourceRefs: context.entries,
    findings: doctor.findings,
    nextAction: context.readiness === "ready" ? "Proceed with the smallest implementation slice." : "Resolve the blocking or conditional repository evidence first."
  };
}

async function loadPlanAndLock(planPath: string, outPath: string | undefined, format: OutputFormat, _resourcePlan: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const resources = Array.isArray(plan.sources)
    ? plan.sources.map((source: { path?: string; label?: string }) => source.path ?? source.label ?? "unknown")
    : Array.isArray(plan.sourceRefs)
      ? plan.sourceRefs.map((source: { path?: string; label?: string }) => source.path ?? source.label ?? "unknown")
      : [];
  const inventoryDigest = JSON.stringify({ resources, plan: plan.plan_id ?? plan.task ?? plan.objective ?? plan.scenario ?? "unknown" });
  const planDigest = JSON.stringify(plan);
  const lock = {
    kind: "resource-lock",
    scenario: plan.scenario ?? plan.task ?? plan.objective ?? "unknown",
    advisoryOnly: true,
    planDigest,
    inventoryDigest,
    resourcePlanDigest: planDigest,
    freshness: "fresh",
    expiryState: "active",
    resources,
    sources: Array.isArray(plan.sources) ? plan.sources : Array.isArray(plan.sourceRefs) ? plan.sourceRefs : [],
    digest: JSON.stringify({ planDigest, inventoryDigest, resources })
  };
  if (outPath) await safeWrite(outPath, JSON.stringify(lock, null, 2) + "\n");
  return render(lock, format as OutputFormat, renderJson, renderJson);
}

async function loadAndDiff(beforePath: string, afterPath: string, format: OutputFormat, resourcePlan: any, kind = "resource-diff") {
  const before = JSON.parse(await readFile(beforePath, "utf8"));
  const after = JSON.parse(await readFile(afterPath, "utf8"));
  if (kind === "profile-diff") return renderExecutionProfileDiff(resourcePlan.diffExecutionProfile(before, after), format, resourcePlan);
  return render(resourcePlan.diffResourceArtifacts(before, after), format as OutputFormat, renderJson, renderJson);
}

function renderExecutionProfileDiff(value: unknown, format: string, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileDiffMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

async function loadAndReconcile(planPath: string, lockPath: string | undefined, receiptPath: string, outPath: string | undefined, format: OutputFormat, executionProfile: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const lock = lockPath ? JSON.parse(await readFile(lockPath, "utf8")) : undefined;
  const diff = executionProfile.buildPlanActualDiff({
    reconciliationId: receipt.receipt_id ?? plan.plan_id ?? "reconciliation",
    plan,
    lock,
    receipt,
    requiredEvidenceRefs: Array.isArray(plan.required_evidence) ? plan.required_evidence.map((item: any) => item?.evidence_id).filter(Boolean) : undefined,
    declaredAcceptanceItems: Array.isArray(plan.acceptance_criteria?.items) ? plan.acceptance_criteria.items : undefined,
    observedEvidenceRefs: Array.isArray(receipt.verification_results) ? receipt.verification_results.filter((item: any) => item?.passed).map((item: any) => item?.gate).filter(Boolean) : undefined,
    missingEvidence: [],
    contradictedEvidence: [],
    explicitUnknowns: Array.isArray(receipt.unknowns) ? receipt.unknowns : undefined,
    completionClaimed: receipt.user_accepted === true,
    completionClaimState: receipt.user_accepted === true ? "claimed" : "unknown",
    sourceArtifactRefs: [planPath, lockPath, receiptPath].filter((value): value is string => Boolean(value))
  });
  const text = format === "markdown" ? executionProfile.renderPlanActualDiffMarkdown(diff) : executionProfile.renderPlanActualDiffJson(diff);
  if (outPath) await safeWrite(outPath, text);
  return { code: 0, text };
}

async function loadAndInitReceipt(planPath: string, lockPath: string | undefined, outPath: string | undefined, format: OutputFormat, executionProfile: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const lock = lockPath ? JSON.parse(await readFile(lockPath, "utf8")) : undefined;
  const receipt = executionProfile.buildOutcomeReceipt({
    receipt_id: `${plan.plan_id ?? plan.scenario ?? "plan"}-receipt`,
    profile_id: plan.plan_id ?? plan.scenario ?? "unknown-plan",
    profile_digest: plan.digest ?? plan.plan_digest ?? "unknown-digest",
    plan_ref: plan.plan_id ?? plan.plan_ref,
    plan_digest: plan.digest ?? plan.plan_digest,
    lock_ref: lock?.lock_ref ?? lock?.resource_lock_id,
    lock_digest: lock?.digest ?? lock?.lock_digest,
    actual_host: "assetmason-cli",
    warnings: ["Receipt scaffold is incomplete and requires reconciliation evidence."],
    unknowns: [lock ? "lock provided but not yet reconciled" : "lock not provided"]
  });
  const text = format === "markdown" ? executionProfile.renderOutcomeReceiptMarkdown(receipt) : JSON.stringify(receipt, null, 2) + "\n";
  if (outPath) await safeWrite(outPath, text);
  return { code: 0, text };
}

async function loadAndImportEvidence(receiptPath: string, importPath: string, outPath: string | undefined, format: OutputFormat, executionProfile: any) {
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const evidenceImport = JSON.parse(await readFile(importPath, "utf8"));
  const updated = executionProfile.importEvidenceIntoReceipt(receipt, evidenceImport);
  const text = format === "markdown" ? executionProfile.renderOutcomeReceiptMarkdown(updated) : JSON.stringify(updated, null, 2) + "\n";
  if (outPath) await safeWrite(outPath, text);
  return { code: 0, text };
}

async function loadAndBuildHandoff(planPath: string, lockPath: string | undefined, receiptPath: string, outPath: string | undefined, format: OutputFormat, executionProfile: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const lock = lockPath ? JSON.parse(await readFile(lockPath, "utf8")) : undefined;
  const handoff = executionProfile.buildHandoffPack({
    source_id: plan.plan_id ?? plan.plan_ref ?? "plan",
    task_text: plan.task_text ?? plan.scenario ?? "unknown task",
    plan_ref: plan.plan_id ?? plan.plan_ref,
    plan_digest: plan.digest ?? plan.plan_digest,
    lock_ref: lock?.lock_ref ?? lock?.resource_lock_id,
    lock_digest: lock?.digest ?? lock?.lock_digest,
    receipt_ref: receipt.receipt_id,
    receipt_digest: receipt.profile_digest,
    branch: safeGit(["branch", "--show-current"], process.cwd()),
    worktree: process.cwd(),
    base_ref: safeGit(["rev-parse", "HEAD^"], process.cwd()),
    head_ref: safeGit(["rev-parse", "HEAD"], process.cwd()),
    checks: Array.isArray(receipt.verification_results) ? receipt.verification_results.map((result: { gate: string }) => result.gate).filter(Boolean) : [],
    decisions: Array.isArray(receipt.evidence_imports) ? receipt.evidence_imports.flatMap((item: { observations?: string[] }) => item.observations ?? []) : [],
    deviations: Array.isArray(receipt.unknowns) ? receipt.unknowns : [],
    external_effects: Array.isArray(receipt.evidence_imports) ? receipt.evidence_imports.flatMap((item: { external_effects?: string[] }) => item.external_effects ?? []) : [],
    waits: receipt.user_accepted === true ? [] : ["owner review pending"],
    remaining_acceptance: Array.isArray(plan.acceptance_criteria?.items) ? plan.acceptance_criteria.items : [],
    failed_remedies: [],
    resume_command: `assetmason reconcile --plan ${planPath} --receipt ${receiptPath}${lockPath ? ` --lock ${lockPath}` : ""}`,
    references: [planPath, receiptPath, lockPath].filter((value): value is string => Boolean(value)),
    receipt_evidence_state: receipt.evidence_state
  });
  const text = format === "markdown" ? executionProfile.renderHandoffPackMarkdown(handoff) : JSON.stringify(handoff, null, 2) + "\n";
  if (outPath) await safeWrite(outPath, text);
  return { code: 0, text };
}

async function validateArtifact(filePath: string, kind?: string, resourcePlan?: any, executionProfile?: any) {
  const artifact = JSON.parse(await readFile(filePath, "utf8"));
  const validation =
    kind === "selection-policy-envelope"
      ? resourcePlan.validateSelectionPolicyEnvelope(artifact)
      : kind === "minimum-approved-resource-set"
      ? resourcePlan.validateMinimumApprovedResourceSet(artifact)
        : kind === "minimum-toolset-evaluation"
          ? resourcePlan.validateMinimumToolsetEvaluation(artifact)
          : kind === "work-order"
            ? resourcePlan.validateWorkOrder(artifact)
          : kind === "execution-profile"
            ? { ok: executionProfile.validateExecutionProfile(artifact), issues: [] }
            : kind === "execution-profile-lock"
              ? { ok: executionProfile.validateExecutionProfileLock(artifact), issues: [] }
              : kind === "execution-profile-diff"
                ? { ok: executionProfile.validateExecutionProfileDiff(artifact), issues: [] }
                : kind === "host-export"
                  ? { ok: executionProfile.validateHostExport(artifact), issues: [] }
                  : kind === "outcome-receipt"
                    ? { ok: executionProfile.validateOutcomeReceipt(artifact), issues: [] }
                    : resourcePlan.validateResourceArtifact(artifact);
  return { code: validation.ok ? 0 : 1, text: JSON.stringify(validation, null, 2) + "\n" };
}

async function safeWrite(filePath: string, content: string) {
  await mkdir(dirname(resolve(filePath)), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function discoverScripts(root: string, packageJson: any): Promise<SourceRef[]> {
  const labels = packageJson?.scripts ? Object.keys(packageJson.scripts) : [];
  return labels.map((label) => ({
    kind: "script" as const,
    label,
    status: "included" as const,
    reason: `Declared in ${join(root, "package.json")}.`
  }));
}

async function discoverWorkflows(root: string): Promise<SourceRef[]> {
  const workflowRoot = join(root, ".github", "workflows");
  try {
    const entries = await readdir(workflowRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        kind: "file" as const,
        label: `.github/workflows/${entry.name}`,
        path: `.github/workflows/${entry.name}`,
        status: "included" as const,
        reason: "GitHub Actions workflow file found."
      }));
  } catch {
    return [];
  }
}

async function discoverInstructionFiles(root: string): Promise<SourceRef[]> {
  const candidates = ["AGENTS.md", "AGENTS.override.md", "README.md", "CONTRIBUTING.md", "SECURITY.md"];
  const results: SourceRef[] = [];
  const queue = [root];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    let entries: Array<{ name: string; dir?: boolean }> = [];
    try {
      entries = await readdir(current, { withFileTypes: true }).then((items) =>
        items.map((item) => ({ name: item.name, dir: item.isDirectory() }))
      );
    } catch {
      continue;
    }
    for (const entry of entries) {
      const absolute = join(current, entry.name);
      const relativePath = absolute.startsWith(root) ? absolute.slice(root.length + 1).replaceAll("\\", "/") : entry.name;
      if (entry.dir) {
        if (relativePath === ".git" || relativePath === "node_modules" || relativePath === "dist" || relativePath === "coverage" || relativePath === "tmp") continue;
        if (relativePath === ".github/workflows") continue;
        queue.push(absolute);
      }
      if (candidates.includes(entry.name)) {
        try {
          const info = await stat(absolute);
          if (info.isFile()) results.push({ kind: "file", label: relativePath, path: relativePath, status: "included", reason: "Instruction or guidance file found." });
        } catch {
          results.push({ kind: "file", label: relativePath, path: relativePath, status: "unknown", reason: "Instruction or guidance file not found or unreadable." });
        }
      }
    }
  }
  return results;
}

async function discoverWorkspacePackages(root: string): Promise<SourceRef[]> {
  const results: SourceRef[] = [];
  const workspaceRoot = join(root, "packages");
  try {
    const entries = await readdir(workspaceRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packagePath = join(workspaceRoot, entry.name, "package.json");
      try {
        const info = await stat(packagePath);
        if (info.isFile()) {
          results.push({
            kind: "package",
            label: `packages/${entry.name}/package.json`,
            path: `packages/${entry.name}/package.json`,
            status: "included",
            reason: "Workspace package manifest found."
          });
        }
      } catch {
        results.push({
          kind: "package",
          label: `packages/${entry.name}/package.json`,
          path: `packages/${entry.name}/package.json`,
          status: "unknown",
          reason: "Workspace package manifest not found or unreadable."
        });
      }
    }
  } catch {
    return results;
  }
  return results;
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function safeGit(args: string[], cwd: string) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function error(message: string) {
  return { code: 1, text: `${message}\n` };
}
