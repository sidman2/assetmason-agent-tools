import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

export type RuntimeState = "created" | "running" | "paused" | "blocked" | "completed" | "failed";

export type RunRecord = {
  schema_version: "0.1.0";
  kind: "run-record";
  task_id: string;
  run_id: string;
  workspace_id: string;
  project_root: string;
  worktree: string;
  branch: string;
  base_revision: string;
  state: RuntimeState;
  adapter: string;
  created_at: string;
  updated_at: string;
  next_safe_resume_action: string;
  event_offset: number;
  checkpoint_id?: string;
  process_id?: number;
  command?: string[];
};

export type RuntimeEvent = {
  schema_version: "0.1.0";
  kind: "event";
  sequence: number;
  event_id: string;
  task_id: string;
  run_id: string;
  type: string;
  state: RuntimeState;
  occurred_at: string;
  data?: Record<string, unknown>;
};

export type CheckpointRecord = {
  schema_version: "0.1.0";
  kind: "checkpoint-record";
  checkpoint_id: string;
  task_id: string;
  run_id: string;
  event_offset: number;
  workspace_revision: string;
  workspace_dirty: boolean;
  outstanding_acceptance: string[];
  first_safe_resume_action: string;
  created_at: string;
};

const runtimeDir = (root: string) => join(resolve(root), ".assetmason", "runtime");
const runPath = (root: string, runId: string) => join(runtimeDir(root), `${runId}.run.json`);
const eventPath = (root: string, runId: string) => join(runtimeDir(root), `${runId}.events.jsonl`);
const checkpointPath = (root: string, checkpointId: string) => join(runtimeDir(root), `${checkpointId}.checkpoint.json`);

function git(root: string, args: string[]) {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "unknown"; }
}

function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16); }

async function persist(root: string, path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function loadRun(root: string, runId: string): Promise<RunRecord> {
  return JSON.parse(await readFile(runPath(root, runId), "utf8")) as RunRecord;
}

export async function createRun(input: { root: string; task: string; adapter?: string; command?: string[] }) {
  const root = resolve(input.root);
  const task = input.task;
  const now = new Date().toISOString();
  const task_id = `task-${digest({ root, task })}`;
  const run_id = `run-${randomUUID()}`;
  const workspace_id = `workspace-${digest(root)}`;
  const branch = git(root, ["branch", "--show-current"]);
  const run: RunRecord = {
    schema_version: "0.1.0", kind: "run-record", task_id, run_id, workspace_id,
    project_root: root, worktree: root, branch, base_revision: git(root, ["rev-parse", "HEAD"]),
    state: "created", adapter: input.adapter ?? "generic-command", created_at: now, updated_at: now,
    next_safe_resume_action: "assetmason resume --root . --run <run-id>", event_offset: 0, command: input.command
  };
  await persist(root, runPath(root, run_id), run);
  await appendEvent(root, run, "run.created", "created", { task });
  return run;
}

export async function appendEvent(root: string, run: RunRecord, type: string, state: RuntimeState, data?: Record<string, unknown>) {
  const event: RuntimeEvent = {
    schema_version: "0.1.0", kind: "event", sequence: run.event_offset + 1, event_id: `event-${randomUUID()}`,
    task_id: run.task_id, run_id: run.run_id, type, state, occurred_at: new Date().toISOString(), data
  };
  await mkdir(runtimeDir(root), { recursive: true });
  await appendFile(eventPath(root, run.run_id), JSON.stringify(event) + "\n", "utf8");
  run.event_offset = event.sequence;
  run.state = state;
  run.updated_at = event.occurred_at;
  await persist(root, runPath(root, run.run_id), run);
  return event;
}

export async function loadRuntimeRun(root: string, runId: string) { return loadRun(root, runId); }

export async function checkpointRun(root: string, runId: string, outstandingAcceptance: string[] = []) {
  const run = await loadRun(root, runId);
  const checkpoint: CheckpointRecord = {
    schema_version: "0.1.0", kind: "checkpoint-record", checkpoint_id: `checkpoint-${randomUUID()}`,
    task_id: run.task_id, run_id: run.run_id, event_offset: run.event_offset,
    workspace_revision: git(root, ["rev-parse", "HEAD"]), workspace_dirty: git(root, ["status", "--porcelain"]) !== "",
    outstanding_acceptance: [...outstandingAcceptance], first_safe_resume_action: run.next_safe_resume_action,
    created_at: new Date().toISOString()
  };
  run.checkpoint_id = checkpoint.checkpoint_id;
  await persist(root, checkpointPath(root, checkpoint.checkpoint_id), checkpoint);
  await appendEvent(root, run, "checkpoint.created", run.state, { checkpoint_id: checkpoint.checkpoint_id });
  return checkpoint;
}

export async function transitionRun(root: string, runId: string, state: RuntimeState, type: string) {
  const run = await loadRun(root, runId);
  await appendEvent(root, run, type, state);
  return loadRun(root, runId);
}

export async function resumeRun(root: string, runId: string) {
  const run = await loadRun(root, runId);
  if (!run.checkpoint_id) throw new Error("run has no checkpoint; create one before resuming");
  if (run.worktree !== resolve(root)) throw new Error("resume refused: workspace binding does not match");
  return transitionRun(root, runId, "running", "run.resumed");
}
