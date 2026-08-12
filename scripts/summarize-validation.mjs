#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/summarize-validation.mjs <jsonl>");
  process.exit(2);
}
const records = (await readFile(resolve(input), "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const groups = records.reduce((result, record) => {
  const raw = String(record.real_or_fixture ?? "UNKNOWN").toUpperCase();
  const key = raw === "REAL" ? "REAL_TASK" : raw === "FIXTURE" ? "FIXTURE" : raw;
  (result[key] ??= []).push(record);
  return result;
}, {});
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}
function summarize(items) {
  const latencies = items.map((item) => Object.values(item.latency ?? {}).reduce((sum, value) => sum + Number(value || 0), 0));
  const count = (predicate) => items.filter(predicate).length;
  return {
    denominator: items.length,
    useful_source_linked_findings: count((item) => (item.source_links?.length ?? 0) > 0),
    actionable_plans: count((item) => item.readiness !== "blocked" && item.readiness !== "unknown"),
    human_or_blocked: count((item) => item.readiness === "human" || item.readiness === "blocked"),
    errors: count((item) => item.error === true),
    median_latency_ms: percentile(latencies, 0.5),
    p90_latency_ms: percentile(latencies, 0.9),
    source_commits: [...new Set(items.map((item) => item.source_commit).filter(Boolean))],
    unsupported_claims: count((item) => item.unsupported_claims?.length > 0),
    measurement_coverage: {
      material_corrections: items.some((item) => item.material_corrections !== undefined),
      material_confirmations: items.some((item) => item.material_confirmations !== undefined),
      no_addition_successes: items.some((item) => item.no_addition_success !== undefined),
      false_blocks: items.some((item) => item.false_block !== undefined),
      missed_material_facts: items.some((item) => item.missed_material_facts !== undefined),
      latency: latencies.length > 0
    }
  };
}
const summary = {
  kind: "validation-summary",
  source: resolve(input),
  total_records: records.length,
  REAL_TASK: summarize(groups.REAL_TASK ?? []),
  FIXTURE: summarize(groups.FIXTURE ?? []),
  unknown_denominator: summarize(groups.UNKNOWN ?? [])
};
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
