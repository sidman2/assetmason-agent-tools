import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
function runNpm(args, options = {}) {
  if (process.platform === "win32") {
    return execFileSync("cmd", ["/d", "/s", "/c", "npm", ...args], { cwd: repoRoot, encoding: "utf8", ...options });
  }
  return execFileSync("npm", args, { cwd: repoRoot, encoding: "utf8", ...options });
}
function runNpx(args, options = {}) {
  if (process.platform === "win32") {
    return execFileSync("cmd", ["/d", "/s", "/c", "npx", ...args], { cwd: repoRoot, encoding: "utf8", ...options });
  }
  return execFileSync("npx", args, { cwd: repoRoot, encoding: "utf8", ...options });
}
const agentTarball = runNpm(["pack", "--workspace", "agent-resource-plan"]).trim().split(/\r?\n/).pop();
const executionProfileTarball = runNpm(["pack", "--workspace", "agent-execution-profile"]).trim().split(/\r?\n/).pop();
const cliTarball = runNpm(["pack", "--workspace", "assetmason-cli"]).trim().split(/\r?\n/).pop();
const smokeDir = await mkdtemp(join(tmpdir(), "assetmason-ci-"));
try {
  runNpm(["init", "-y"], { cwd: smokeDir, stdio: "ignore" });
  runNpm(["install", "--no-save", join(repoRoot, cliTarball), join(repoRoot, agentTarball), join(repoRoot, executionProfileTarball)], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "--help"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "select", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "profile", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "profile-lock", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "plan", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "check", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "lock", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, stdio: "ignore" });
  const selectionPath = join(smokeDir, "selection.json");
  const selectionJson = runNpx(["assetmason", "select", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, encoding: "utf8" });
  await writeFile(selectionPath, selectionJson, "utf8");
  runNpx(["assetmason", "validate", "--file", selectionPath, "--kind", "minimum-approved-resource-set"], { cwd: smokeDir, stdio: "ignore" });
  const evaluationPath = join(smokeDir, "evaluation.json");
  await writeFile(evaluationPath, JSON.stringify({
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
  }, null, 2), "utf8");
  runNpx(["assetmason", "validate", "--file", evaluationPath, "--kind", "minimum-toolset-evaluation"], { cwd: smokeDir, stdio: "ignore" });
  const profilePath = join(smokeDir, "profile.json");
  const profileJson = runNpx(["assetmason", "profile", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, encoding: "utf8" });
  await writeFile(profilePath, profileJson, "utf8");
  const profileLockPath = join(smokeDir, "profile-lock.json");
  const profileLockJson = runNpx(["assetmason", "profile-lock", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, encoding: "utf8" });
  await writeFile(profileLockPath, profileLockJson, "utf8");
  const exportPath = join(smokeDir, "export.json");
  const exportJson = runNpx(["assetmason", "export", "--scenario", "auth-redirect-bug", "--format", "json"], { cwd: smokeDir, encoding: "utf8" });
  await writeFile(exportPath, exportJson, "utf8");
  runNpx(["assetmason", "validate", "--file", profileLockPath, "--kind", "execution-profile-lock"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "validate", "--file", profilePath, "--kind", "execution-profile"], { cwd: smokeDir, stdio: "ignore" });
  const profileDiffPath = join(smokeDir, "profile-diff.json");
  const profileDiffJson = runNpx(["assetmason", "profile-diff", "--before", profilePath, "--after", profileLockPath, "--format", "json"], { cwd: smokeDir, encoding: "utf8" });
  await writeFile(profileDiffPath, profileDiffJson, "utf8");
  runNpx(["assetmason", "validate", "--file", profileDiffPath, "--kind", "execution-profile-diff"], { cwd: smokeDir, stdio: "ignore" });
  runNpx(["assetmason", "validate", "--file", exportPath, "--kind", "host-export"], { cwd: smokeDir, stdio: "ignore" });
  const receiptPath = join(smokeDir, "receipt.json");
  await writeFile(receiptPath, JSON.stringify({
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
  runNpx(["assetmason", "validate", "--file", receiptPath, "--kind", "outcome-receipt"], { cwd: smokeDir, stdio: "ignore" });
} finally {
  await rm(smokeDir, { recursive: true, force: true });
}
