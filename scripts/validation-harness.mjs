#!/usr/bin/env node

import { appendFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = resolve(repoRoot, "packages/assetmason-cli/bin/assetmason.js");

function usage() {
  console.error("Usage: node scripts/validation-harness.mjs --root <dir> --task <text> --task-class <class> --real|--fixture [--out <jsonl>]");
}

function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--real" || value === "--fixture") result.kind = value.slice(2);
    else if (value.startsWith("--")) result[value.slice(2)] = argv[++i];
  }
  return result;
}

function run(command, commandArgs, timeoutMs = 30000) {
  return new Promise((resolveRun) => {
    const started = performance.now();
    const child = spawn(process.execPath, [cli, command, ...commandArgs], { cwd: repoRoot });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolveRun({
      code,
      signal,
      stdout,
      stderr,
      latency: Math.round(performance.now() - started),
      timed_out: code === null && signal !== null,
      });
    });
  });
}

function parseJson(output) {
  try { return JSON.parse(output); } catch { return undefined; }
}

const options = args(process.argv.slice(2));
if (!options.root || !options.task || !options["task-class"] || !options.kind) {
  usage();
  process.exitCode = 2;
} else {
  const startedAt = new Date().toISOString();
  const commands = ["doctor", "context", "check"];
  const observations = {};
  for (const command of commands) {
    const commandArgs = ["--root", resolve(options.root), ...(command === "doctor" ? [] : ["--task", options.task]), "--format", "json"];
    const result = await run(command, commandArgs);
    observations[command] = { ...result, parsed: parseJson(result.stdout) };
  }
  const readiness = observations.check.parsed?.readiness ?? observations.context.parsed?.readiness ?? "unknown";
  const record = {
    validation_id: `validation-${Date.now()}`,
    repository: resolve(options.root),
    exact_sha: observations.doctor.parsed?.git?.head ?? observations.doctor.parsed?.head ?? "unknown",
    task: options.task,
    task_class: options["task-class"],
    real_or_fixture: options.kind,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    latency: Object.fromEntries(commands.map((command) => [command, observations[command].latency])),
    readiness,
    material_findings: observations.check.parsed?.findings ?? [],
    source_links: observations.context.parsed?.entries ?? [],
    reuse: observations.context.parsed?.reuse ?? [],
    adapt: observations.context.parsed?.adapt ?? [],
    add: observations.context.parsed?.add ?? [],
    exclude: observations.context.parsed?.exclude ?? [],
    human_question: observations.check.parsed?.humanQuestion ?? null,
    error: commands.some((command) => observations[command].code !== 0),
    notes: observations,
  };
  const output = `${JSON.stringify(record)}\n`;
  if (options.out) await appendFile(resolve(options.out), output, "utf8");
  else process.stdout.write(output);
  process.exitCode = record.error ? 1 : 0;
}
