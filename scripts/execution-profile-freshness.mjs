import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const reportPath = resolve(repoRoot, "tmp", "review-packet", "pr6-closeout", "parity", "parity-report.json");
const expectedSourceSha = "85ad469a1f9f755e6155d34198afd733192d959e";
const expectedScenarioIds = [
  "auth-redirect-bug",
  "architecture-sensitive-feature",
  "billing-or-migration-sensitive"
];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch {
  fail(`freshness check failed: missing parity report at ${reportPath}`);
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
