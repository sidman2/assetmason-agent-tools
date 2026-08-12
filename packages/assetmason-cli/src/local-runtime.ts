import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile, execFileSync, type ChildProcess } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { createTaskScope } from "./scopes.js";

export type RuntimeState = "created" | "running" | "paused" | "blocked" | "stopped" | "completed" | "failed";

export type RunRecord = {
  schema_version: "0.1.0";
  kind: "run-record";
  task_id: string;
  task: string;
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
  parent_run_id?: string;
  attempt: number;
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

export type AdapterCapability = {
  schema_version: "0.1.0";
  kind: "worker-capability";
  adapter: "codex" | "generic-command";
  executable: string;
  installed: boolean;
  launch: "supported" | "access_denied" | "not_installed" | "unknown";
  worktree_binding: "supported" | "unknown";
  process_identity: "supported" | "unknown";
  stop: "supported" | "unknown";
  continuation: "supported" | "unknown";
  unknowns: string[];
};

export type ProcessResult = {
  process_id: number;
  command: string[];
  exit_code: number | null;
  signal?: string;
  classification: "completed" | "failed" | "signaled";
  stdout: string;
  stderr: string;
  adapter?: "codex" | "generic-command";
  timed_out?: boolean;
  invocation?: { executable: string; cwd: string; args: string[]; task: string; run_id: string };
};

export type CodexAdapterOptions = {
  executable?: string;
  timeoutMs?: number;
  onChild?: (child: ChildProcess) => void;
};

export type ContinuationPack = {
  schema_version: "0.1.0";
  kind: "worker-neutral-continuation";
  task_id: string;
  run_id: string;
  parent_run_id?: string;
  attempt: number;
  adapter: string;
  project_root: string;
  worktree: string;
  base_revision: string;
  current_state: RuntimeState;
  next_safe_action: string;
  observed_events: string[];
  unsupported: string[];
};

const runtimeDir = (root: string) => join(resolve(root), ".assetmason", "runtime");
const runPath = (root: string, runId: string) => join(runtimeDir(root), `${runId}.run.json`);
const eventPath = (root: string, runId: string) => join(runtimeDir(root), `${runId}.events.jsonl`);
const checkpointPath = (root: string, checkpointId: string) => join(runtimeDir(root), `${checkpointId}.checkpoint.json`);
const activeProcesses = new Map<string, ChildProcess>();

function git(root: string, args: string[]) {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "unknown"; }
}

function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16); }

export function inspectAdapter(adapter: "codex" | "generic-command"): AdapterCapability {
  if (adapter === "generic-command") return {
    schema_version: "0.1.0", kind: "worker-capability", adapter, executable: "<user-command>", installed: true,
    launch: "supported", worktree_binding: "supported", process_identity: "supported", stop: "supported", continuation: "unknown",
    unknowns: ["generic commands do not establish cross-agent continuation semantics"]
  };
  try {
    const executable = process.platform === "win32" ? execFileSync("where.exe", ["codex"], { encoding: "utf8" }).split(/\r?\n/)[0] : execFileSync("which", ["codex"], { encoding: "utf8" }).trim();
    try { execFileSync(executable, ["--help"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/access denied|EACCES|EPERM/i.test(message)) return { schema_version: "0.1.0", kind: "worker-capability", adapter, executable, installed: true, launch: "access_denied", worktree_binding: "unknown", process_identity: "unknown", stop: "unknown", continuation: "unknown", unknowns: ["Codex executable was discovered but launch was denied by the host", "LIVE_CODEX_HOST_BLOCKED"] };
      return { schema_version: "0.1.0", kind: "worker-capability", adapter, executable, installed: true, launch: "unknown", worktree_binding: "unknown", process_identity: "unknown", stop: "unknown", continuation: "unknown", unknowns: ["Codex launch probe failed", message] };
    }
    return { schema_version: "0.1.0", kind: "worker-capability", adapter, executable, installed: true, launch: "supported", worktree_binding: "supported", process_identity: "supported", stop: "unknown", continuation: "unknown", unknowns: ["Stop and continuation semantics require a bounded live run"] };
  } catch {
    return { schema_version: "0.1.0", kind: "worker-capability", adapter, executable: "codex", installed: false, launch: "not_installed", worktree_binding: "unknown", process_identity: "unknown", stop: "unknown", continuation: "unknown", unknowns: ["Codex executable was not discoverable"] };
  }
}

async function persist(root: string, path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function loadRun(root: string, runId: string): Promise<RunRecord> {
  const raw = JSON.parse(await readFile(runPath(root, runId), "utf8")) as Partial<RunRecord>;
  return {
    ...raw,
    task: raw.task ?? raw.task_id,
    attempt: raw.attempt ?? 1
  } as RunRecord;
}

function prepareIsolatedWorktree(root: string, runId: string) {
  const gitRoot = git(root, ["rev-parse", "--show-toplevel"]);
  if (gitRoot === "unknown") return { worktree: root, branch: git(root, ["branch", "--show-current"]), base: "unknown" };
  if (git(root, ["status", "--porcelain"]) !== "") throw new Error("isolated run refused: project base is dirty");
  const base = git(root, ["rev-parse", "HEAD"]);
  const branch = `assetmason/${runId}`;
  const worktree = join(gitRoot, ".assetmason", "worktrees", runId);
  execFileSync("git", ["worktree", "add", "-b", branch, worktree, base], { cwd: gitRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { worktree, branch, base };
}

export async function createRun(input: { root: string; task: string; adapter?: string; command?: string[]; isolated?: boolean }) {
  const root = resolve(input.root);
  const task = input.task;
  const now = new Date().toISOString();
  const task_id = `task-${digest({ root, task })}`;
  const run_id = `run-${randomUUID()}`;
  const workspace_id = `workspace-${digest(root)}`;
  const workspace = input.isolated ? prepareIsolatedWorktree(root, run_id) : { worktree: root, branch: git(root, ["branch", "--show-current"]), base: git(root, ["rev-parse", "HEAD"]) };
  const run: RunRecord = {
    schema_version: "0.1.0", kind: "run-record", task_id, task, run_id, workspace_id,
    project_root: root, worktree: workspace.worktree, branch: workspace.branch, base_revision: workspace.base,
    state: "created", adapter: input.adapter ?? "generic-command", created_at: now, updated_at: now,
    next_safe_resume_action: "assetmason resume --root . --run <run-id>", event_offset: 0, attempt: 1, command: input.command
  };
  await persist(root, runPath(root, run_id), run);
  await createTaskScope(root, task_id, task);
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

export async function compileContinuation(root: string, runId: string): Promise<ContinuationPack> {
  const run = await loadRun(root, runId);
  let events: RuntimeEvent[] = [];
  try { events = (await readFile(eventPath(root, runId), "utf8")).trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as RuntimeEvent); } catch { /* no events beyond run creation */ }
  return {
    schema_version: "0.1.0", kind: "worker-neutral-continuation", task_id: run.task_id, run_id: run.run_id,
    parent_run_id: run.parent_run_id, attempt: run.attempt, adapter: run.adapter, project_root: run.project_root,
    worktree: run.worktree, base_revision: run.base_revision, current_state: run.state,
    next_safe_action: run.next_safe_resume_action, observed_events: events.map((event) => event.type),
    unsupported: ["vendor coding-agent session restoration", "cross-agent equivalence proof"]
  };
}

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
  if (state === "stopped") {
    const child = activeProcesses.get(runId);
    if (child && !child.killed) child.kill();
    if (run.process_id) {
      try { process.kill(run.process_id); } catch { /* process already exited */ }
    }
  }
  await appendEvent(root, run, type, state);
  return loadRun(root, runId);
}

export async function resumeRun(root: string, runId: string) {
  const run = await loadRun(root, runId);
  if (!run.checkpoint_id) throw new Error("run has no checkpoint; create one before resuming");
  const requestedRoot = resolve(root);
  const recordedWorktree = resolve(run.worktree);
  const projectRoot = resolve(run.project_root);
  if (requestedRoot !== recordedWorktree && requestedRoot !== projectRoot) throw new Error("resume refused: workspace binding does not match");
  if (recordedWorktree !== projectRoot && git(recordedWorktree, ["rev-parse", "HEAD"]) !== run.base_revision) throw new Error("resume refused: workspace base revision changed");
  return transitionRun(root, runId, "running", "run.resumed");
}

export async function runGenericCommand(root: string, runId: string, command: string[], timeoutMs = 60_000): Promise<ProcessResult> {
  if (command.length === 0) throw new Error("generic command requires an executable");
  const run = await loadRun(root, runId);
  if (run.worktree !== run.project_root && git(run.worktree, ["rev-parse", "HEAD"]) !== run.base_revision) throw new Error("execution refused: workspace base revision changed");
  const started = await appendEvent(root, run, "process.started", "running", { command: [command[0]], argument_count: command.length - 1 });
  const result = await new Promise<ProcessResult>((resolveResult) => {
    const child = execFile(command[0], command.slice(1), { cwd: run.worktree, windowsHide: true, timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const exit_code = typeof error?.code === "number" ? error.code : error ? null : 0;
      const signal = error?.signal ?? undefined;
      resolveResult({ process_id: child.pid ?? -1, command: [command[0], ...command.slice(1)], exit_code, signal, classification: signal ? "signaled" : exit_code === 0 ? "completed" : "failed", stdout: String(stdout), stderr: String(stderr) });
    });
    void started;
  });
  const finalRun = await loadRun(root, runId);
  await appendEvent(root, finalRun, "process.exited", result.classification === "completed" ? "running" : "failed", { process_id: result.process_id, exit_code: result.exit_code, signal: result.signal, classification: result.classification });
  return result;
}

export async function forkRun(root: string, runId: string, task?: string) {
  const parent = await loadRun(root, runId);
  const child: RunRecord = {
    ...parent,
    run_id: `run-${randomUUID()}`,
    task: task ?? parent.task,
    state: "created",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    event_offset: 0,
    checkpoint_id: undefined,
    process_id: undefined,
    parent_run_id: parent.run_id,
    attempt: parent.attempt + 1,
    next_safe_resume_action: "assetmason resume --root . --run <run-id>"
  };
  await persist(root, runPath(root, child.run_id), child);
  await appendEvent(root, child, "run.forked", "created", { parent_run_id: parent.run_id, parent_state: parent.state, attempt: child.attempt });
  return child;
}

/**
 * The project-owned Codex boundary. The executable is injectable for deterministic
 * mechanics tests; no capability probe or generic command is treated as Codex.
 */
export async function runCodexCommand(root: string, runId: string, options: CodexAdapterOptions = {}): Promise<ProcessResult> {
  const run = await loadRun(root, runId);
  if (run.adapter !== "codex") throw new Error("Codex adapter requires a run created with --with codex");
  const executable = options.executable ?? resolveCodexExecutable();
  const args = ["exec", "--json", "--", run.task];
  const timeoutMs = options.timeoutMs ?? 60_000;
  if (run.worktree !== run.project_root && git(run.worktree, ["rev-parse", "HEAD"]) !== run.base_revision) throw new Error("execution refused: workspace base revision changed");
  await appendEvent(root, run, "codex.started", "running", { executable, cwd: run.worktree, args, run_id: run.run_id });
  const result = await new Promise<ProcessResult>((resolveResult) => {
    const child = execFile(executable, args, { cwd: run.worktree, windowsHide: true, timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const timedOut = Boolean(error && (error as NodeJS.ErrnoException).code === "ETIMEDOUT");
      const exitCode = typeof error?.code === "number" ? error.code : error ? null : 0;
      const signal = error?.signal ?? undefined;
      resolveResult({ process_id: child.pid ?? -1, command: [executable, ...args], exit_code: exitCode, signal, classification: signal ? "signaled" : exitCode === 0 ? "completed" : "failed", stdout: String(stdout), stderr: String(stderr), adapter: "codex", timed_out: timedOut, invocation: { executable, cwd: run.worktree, args, task: run.task, run_id: run.run_id } });
    });
    run.process_id = child.pid;
    void persist(root, runPath(root, runId), run);
    activeProcesses.set(runId, child);
    options.onChild?.(child);
    void appendEvent(root, run, "codex.process.observed", "running", { process_id: child.pid, executable, cwd: run.worktree });
  });
  const finalRun = await loadRun(root, runId);
  activeProcesses.delete(runId);
  await appendEvent(root, finalRun, "codex.exited", result.classification === "completed" ? "running" : "failed", { process_id: result.process_id, exit_code: result.exit_code, signal: result.signal, timed_out: result.timed_out, classification: result.classification });
  return result;
}

function resolveCodexExecutable() {
  const command = process.platform === "win32" ? "where.exe" : "which";
  return execFileSync(command, ["codex"], { encoding: "utf8" }).split(/\r?\n/)[0].trim();
}
