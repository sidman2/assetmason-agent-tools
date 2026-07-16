import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const reportPath = resolve(repoRoot, "tmp", "review-packet", "pr6-closeout", "parity", "parity-report.json");
const sourceManifest = JSON.parse(readFileSync(resolve(repoRoot, "scripts", "execution-profile-source-manifest.json"), "utf8"));

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (sourceManifest.manifest_version !== 1 || sourceManifest.parity_contract !== "execution-profile-private-source-v1") {
  fail("freshness check failed: execution-profile source manifest contract mismatch");
}

const expectedSourceSha = process.env[sourceManifest.private_source_sha_env] ?? "";
const expectedScenarioIds = [
  "auth-redirect-bug",
  "architecture-sensitive-feature",
  "billing-or-migration-sensitive"
];

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch {
  fail(`freshness check failed: missing parity report at ${reportPath}`);
}

if (!expectedSourceSha) {
  fail("freshness check failed: set ASSETMASON_PRIVATE_SOURCE_SHA to verify the private source revision");
}

if (report.source_sha !== expectedSourceSha) {
  fail(`freshness check failed: expected source SHA ${expectedSourceSha}, found ${report.source_sha ?? "missing"}`);
}

const scenarioIds = Array.isArray(report.scenarios) ? report.scenarios.map((scenario) => scenario.id) : [];
const missingScenarios = expectedScenarioIds.filter((id) => !scenarioIds.includes(id));
if (missingScenarios.length > 0) {
  fail(`freshness check failed: missing scenario coverage for ${missingScenarios.join(", ")}`);
}

process.stdout.write("execution-profile freshness check passed\n");
