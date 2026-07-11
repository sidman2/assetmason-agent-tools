import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildBeforeBuildPacket,
  buildResourceDiff,
  buildResourceInventory,
  buildResourceLock,
  buildResourcePlan,
  diffResourceArtifacts,
  listResourceScenarios,
  renderResourceArtifactJson,
  renderResourceArtifactMarkdown,
  scanResourceInventory,
  validateResourceArtifact
} from "agent-resource-plan";

export async function runCommand(argv: string[]) {
  const [command, ...rest] = argv;
  const format = getOption(rest, "--format") ?? "json";
  const scenario = getOption(rest, "--scenario") ?? "auth-redirect-bug";
  if (!command || command === "--help" || command === "-h") return { code: 0, text: helpText() };
  if (command === "list-scenarios") return { code: 0, text: `${listResourceScenarios().join("\n")}\n` };
  if (command === "check") return render(buildBeforeBuildPacket(scenario), format);
  if (command === "plan") return render(buildResourcePlan(scenario), format);
  if (command === "scan") return render(scanResourceInventory(getOption(rest, "--root") ?? "."), format);
  if (command === "lock") {
    const fromPlan = getOption(rest, "--from-plan");
    if (fromPlan) return loadPlanAndLock(fromPlan, getOption(rest, "--out"), format);
    return render(buildResourceLock(buildResourcePlan(scenario), buildResourceInventory(".")), format);
  }
  if (command === "diff") {
    const before = getOption(rest, "--before");
    const after = getOption(rest, "--after");
    if (!before || !after) return error("diff requires --before and --after");
    return loadAndDiff(before, after, format);
  }
  if (command === "validate") return validateArtifact(getOption(rest, "--file") ?? "", getOption(rest, "--kind"));
  if (command === "handoff") return render({ kind: "host-handoff", scenario, advisoryOnly: true, note: "Review the plan locally and hand off only public-safe findings." }, format);
  return error(`Unknown command: ${command}`);
}

function helpText(): string {
  return ["assetmason --help", "assetmason list-scenarios", "assetmason check --scenario <name> --format json|markdown", "assetmason plan --scenario <name> --format json|markdown", "assetmason scan --root <dir> --format json|markdown", "assetmason lock --scenario <name> --format json|markdown", "assetmason diff --before <file> --after <file> --format json|markdown", "assetmason validate --file <file> [--kind resource-plan|resource-lock]", "assetmason handoff --scenario <name>"].join("\n") + "\n";
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function render(value: unknown, format: string) {
  return { code: 0, text: format === "markdown" ? renderResourceArtifactMarkdown(value) : renderResourceArtifactJson(value) };
}

async function loadPlanAndLock(planPath: string, outPath: string | undefined, format: string) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const lock = buildResourceLock(plan, buildResourceInventory("."));
  if (outPath) await safeWrite(outPath, JSON.stringify(lock, null, 2) + "\n");
  return render(lock, format);
}

async function loadAndDiff(beforePath: string, afterPath: string, format: string) {
  const before = JSON.parse(await readFile(beforePath, "utf8"));
  const after = JSON.parse(await readFile(afterPath, "utf8"));
  return render(diffResourceArtifacts(before, after), format);
}

async function validateArtifact(filePath: string, kind?: string) {
  const artifact = JSON.parse(await readFile(filePath, "utf8"));
  const validation = validateResourceArtifact(artifact);
  if (kind && validation.kind !== kind) validation.ok = false;
  return { code: validation.ok ? 0 : 1, text: JSON.stringify(validation, null, 2) + "\n" };
}

async function safeWrite(filePath: string, content: string) {
  await mkdir(dirname(resolve(filePath)), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function error(message: string) {
  return { code: 1, text: `${message}\n` };
}
