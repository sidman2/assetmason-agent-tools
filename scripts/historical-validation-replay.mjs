#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { execPath } from "node:process";
import { promisify } from "node:util";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const harness = join(repoRoot, "scripts", "validation-harness.mjs");
const output = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : join(repoRoot, "tmp", "historical-validation.jsonl");
const requestedCount = Number(process.argv.includes("--count") ? process.argv[process.argv.indexOf("--count") + 1] : 20);

function run(command, args, cwd = repoRoot, shell = false) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, shell, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
  });
}

const logResult = await run("git", ["log", "--no-merges", "--format=%H%x09%P%x09%s", "-n", String(Math.max(requestedCount + 10, 30))], repoRoot, true);
if (logResult.code !== 0) throw new Error(`git history lookup failed: ${logResult.stderr}`);
const commits = logResult.stdout.trim().split(/\r?\n/).map((line) => {
  const [sha, parents, ...subject] = line.split("\t");
  return { sha, base_sha: parents.split(" ")[0], task: subject.join("\t") };
}).filter((item) => item.sha && item.base_sha).slice(0, requestedCount);
if (commits.length < requestedCount) throw new Error(`only ${commits.length} traceable non-merge commits available`);

const runRoot = await mkdtemp(join(tmpdir(), "assetmason-historical-replay-"));
try {
  const records = [];
  for (const item of commits) {
    const target = join(runRoot, item.sha);
    await mkdir(target, { recursive: true });
    const archivePath = join(runRoot, `${item.sha}.tar`);
    const archived = await run("git", ["archive", item.base_sha, "-o", archivePath], repoRoot, true);
    if (archived.code !== 0) throw new Error(`git archive failed for ${item.base_sha}: ${archived.stderr}`);
    const extracted = await run("tar", ["-xf", archivePath, "-C", target], repoRoot, true);
    if (extracted.code !== 0) throw new Error(`tar extraction failed for ${item.base_sha}: ${extracted.stderr}`);
    const result = await run(execPath, [harness, "--root", target, "--task", item.task, "--task-class", "historical-commit-replay", "--real"]);
    const parsed = result.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).at(-1);
    records.push({ ...parsed, real_or_fixture: "REAL_TASK", replay: true, source_commit: item.sha, base_sha: item.base_sha, task_source: `git commit ${item.sha}`, harness_exit_code: result.code, harness_stderr: result.stderr });
  }
  await writeFile(resolve(output), records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
  process.stdout.write(JSON.stringify({ kind: "historical-validation-replay", requested: requestedCount, completed: records.length, output: resolve(output), denominator: "REAL_TASK", source: "repository commit history" }) + "\n");
} finally {
  await rm(runRoot, { recursive: true, force: true });
}
