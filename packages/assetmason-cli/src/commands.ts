import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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
  const scenario = getOption(rest, "--scenario") ?? "auth-redirect-bug";
  if (!command || command === "--help" || command === "-h") return { code: 0, text: helpText() };
  if (command === "list-scenarios") {
    const resourcePlan = await loadResourcePlanModule();
    return { code: 0, text: `${[...resourcePlan.listResourceScenarios(), ...resourcePlan.listSelectionScenarios()].join("\n")}\n` };
  }
  if (command === "check") {
    const resourcePlan = await loadResourcePlanModule();
    return render(resourcePlan.buildBeforeBuildPacket(scenario), format, resourcePlan);
  }
  if (command === "plan") {
    const resourcePlan = await loadResourcePlanModule();
    return render(resourcePlan.buildResourcePlan(scenario), format, resourcePlan);
  }
  if (command === "select") {
    const resourcePlan = await loadResourcePlanModule();
    return renderSelection(resourcePlan.buildSelectionScenario(scenario), format, resourcePlan);
  }
  if (command === "profile") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfile(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    }), format, executionProfile);
  }
  if (command === "profile-lock") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfileLock(executionProfile.buildExecutionProfileLock(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    })), format, executionProfile);
  }
  if (command === "profile-diff") {
    const before = getOption(rest, "--before");
    const after = getOption(rest, "--after");
    if (!before || !after) return error("profile-diff requires --before and --after");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndDiff(before, after, format, executionProfile, "profile-diff");
  }
  if (command === "export") {
    const executionProfile = await loadExecutionProfileModule();
    return renderExecutionProfileExport(executionProfile.buildGenericHostExportArtifact(executionProfile.buildExecutionProfile({
      task_or_intent: scenario,
      task_class: "small_fix",
      host_context: "assetmason-cli",
      policy_layers: []
    })), format, executionProfile);
  }
  if (command === "scan") {
    const resourcePlan = await loadResourcePlanModule();
    return render(resourcePlan.scanResourceInventory(getOption(rest, "--root") ?? "."), format, resourcePlan);
  }
  if (command === "lock") {
    const resourcePlan = await loadResourcePlanModule();
    const fromPlan = getOption(rest, "--from-plan");
    if (fromPlan) return loadPlanAndLock(fromPlan, getOption(rest, "--out"), format, resourcePlan);
    return render(resourcePlan.buildResourceLock(resourcePlan.buildResourcePlan(scenario), resourcePlan.buildResourceInventory(".")), format, resourcePlan);
  }
  if (command === "diff") {
    const before = getOption(rest, "--before");
    const after = getOption(rest, "--after");
    if (!before || !after) return error("diff requires --before and --after");
    const resourcePlan = await loadResourcePlanModule();
    return loadAndDiff(before, after, format, resourcePlan);
  }
  if (command === "reconcile") {
    const planPath = getOption(rest, "--plan");
    const receiptPath = getOption(rest, "--receipt");
    if (!planPath || !receiptPath) return error("reconcile requires --plan and --receipt");
    const lockPath = getOption(rest, "--lock");
    const outPath = getOption(rest, "--out");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndReconcile(planPath, lockPath, receiptPath, outPath, format, executionProfile);
  }
  if (command === "receipt-init") {
    const planPath = getOption(rest, "--plan");
    if (!planPath) return error("receipt-init requires --plan");
    const lockPath = getOption(rest, "--lock");
    const outPath = getOption(rest, "--out");
    const executionProfile = await loadExecutionProfileModule();
    return loadAndInitReceipt(planPath, lockPath, outPath, format, executionProfile);
  }
  const resourcePlan = await loadResourcePlanModule();
  const executionProfile = await loadExecutionProfileModule();
  if (command === "validate") return validateArtifact(getOption(rest, "--file") ?? "", getOption(rest, "--kind"), resourcePlan, executionProfile);
  if (command === "handoff") return render({ kind: "host-handoff", scenario, advisoryOnly: true, note: "Review the plan locally and hand off only public-safe findings." }, format, resourcePlan);
  return error(`Unknown command: ${command}`);
}

function helpText(): string {
  return [
    "assetmason --help",
    "assetmason list-scenarios",
    "assetmason check --scenario <name> --format json|markdown",
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
    "assetmason validate --file <file> [--kind resource-plan|resource-lock|selection-policy-envelope|minimum-approved-resource-set|minimum-toolset-evaluation|work-order|execution-profile|execution-profile-lock|execution-profile-diff|host-export|outcome-receipt]",
    "assetmason handoff --scenario <name>"
  ].join("\n") + "\n";
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function render(value: unknown, format: string, resourcePlan: any) {
  return { code: 0, text: format === "markdown" ? resourcePlan.renderResourceArtifactMarkdown(value) : resourcePlan.renderResourceArtifactJson(value) };
}

function renderSelection(value: unknown, format: string, resourcePlan: any) {
  return { code: 0, text: format === "markdown" ? resourcePlan.renderMinimumApprovedResourceSetMarkdown(value) : resourcePlan.renderMinimumApprovedResourceSetJson(value) };
}

function renderExecutionProfile(value: unknown, format: string, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

function renderExecutionProfileLock(value: unknown, format: string, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileLockMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

function renderExecutionProfileExport(value: unknown, format: string, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? String((value as { content?: string }).content ?? "") : JSON.stringify(value, null, 2) + "\n" };
}

async function loadPlanAndLock(planPath: string, outPath: string | undefined, format: string, resourcePlan: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const lock = resourcePlan.buildResourceLock(plan, resourcePlan.buildResourceInventory("."));
  if (outPath) await safeWrite(outPath, JSON.stringify(lock, null, 2) + "\n");
  return render(lock, format, resourcePlan);
}

async function loadAndDiff(beforePath: string, afterPath: string, format: string, resourcePlan: any, kind = "resource-diff") {
  const before = JSON.parse(await readFile(beforePath, "utf8"));
  const after = JSON.parse(await readFile(afterPath, "utf8"));
  if (kind === "profile-diff") return renderExecutionProfileDiff(resourcePlan.diffExecutionProfile(before, after), format, resourcePlan);
  return render(resourcePlan.diffResourceArtifacts(before, after), format, resourcePlan);
}

function renderExecutionProfileDiff(value: unknown, format: string, executionProfile: any) {
  return { code: 0, text: format === "markdown" ? executionProfile.renderExecutionProfileDiffMarkdown(value) : JSON.stringify(value, null, 2) + "\n" };
}

async function loadAndReconcile(planPath: string, lockPath: string | undefined, receiptPath: string, outPath: string | undefined, format: string, executionProfile: any) {
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

async function loadAndInitReceipt(planPath: string, lockPath: string | undefined, outPath: string | undefined, format: string, executionProfile: any) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const lock = lockPath ? JSON.parse(await readFile(lockPath, "utf8")) : undefined;
  const receipt = {
    schema_version: "0.1.0",
    receipt_id: `${plan.plan_id ?? "plan"}-receipt`,
    profile_id: plan.plan_id ?? "unknown-plan",
    profile_digest: plan.digest ?? plan.plan_digest ?? "unknown-digest",
    actual_host: "assetmason-cli",
    resolved_roles: [],
    attempt_count: 0,
    verification_results: [],
    user_accepted: false,
    reverted: false,
    warnings: ["Receipt scaffold is incomplete and requires reconciliation evidence."],
    unknowns: [lock ? "lock provided but not yet reconciled" : "lock not provided"],
    local_only: true
  };
  const text = format === "markdown" ? executionProfile.renderOutcomeReceiptMarkdown(receipt) : JSON.stringify(receipt, null, 2) + "\n";
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

function error(message: string) {
  return { code: 1, text: `${message}\n` };
}
