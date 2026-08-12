import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

export type ScopeStatus = "active" | "archived";
export type MemoryState = "candidate" | "accepted" | "rejected" | "deferred" | "superseded" | "expired";

export type PersonalScope = {
  schema_version: "0.1.0";
  kind: "personal-scope";
  scope_id: string;
  status: ScopeStatus;
  owner: string;
  proof_preferences: string[];
  created_at: string;
  updated_at: string;
};

export type ProjectScope = {
  schema_version: "0.1.0";
  kind: "project-scope";
  scope_id: string;
  status: ScopeStatus;
  project_root: string;
  repository_head: string;
  discovered_instructions: string[];
  defaults: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type TaskScope = {
  schema_version: "0.1.0";
  kind: "task-scope";
  scope_id: string;
  status: ScopeStatus;
  task_id: string;
  objective: string;
  project_scope_id: string;
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
};

export type DecisionMemory = {
  schema_version: "0.1.0";
  kind: "decision-memory";
  decision_id: string;
  state: MemoryState;
  statement: string;
  rationale: string;
  source_refs: string[];
  proposed_by: "run" | "owner";
  accepted_by?: "owner" | "policy";
  created_at: string;
  updated_at: string;
  freshness: "fresh" | "stale" | "unknown";
  conflicts: string[];
  supersedes?: string;
  no_silent_promotion: true;
};

type ScopeBundle = { personal: PersonalScope; project: ProjectScope; tasks: TaskScope[]; decisions: DecisionMemory[] };
const scopesDir = (root: string) => join(resolve(root), ".assetmason", "scopes");
const bundlePath = (root: string) => join(scopesDir(root), "scope-state.json");

function digest(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 16); }
function now() { return new Date().toISOString(); }

function git(root: string, args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return "unknown"; }
}

export async function loadScopes(root: string): Promise<ScopeBundle | undefined> {
  try { return JSON.parse(await readFile(bundlePath(root), "utf8")) as ScopeBundle; } catch { return undefined; }
}

export async function initializeScopes(root: string, owner = "local-user") {
  const existing = await loadScopes(root);
  if (existing) return existing;
  const timestamp = now();
  const projectRoot = resolve(root);
  const project: ProjectScope = {
    schema_version: "0.1.0", kind: "project-scope", scope_id: `project-${digest(projectRoot)}`, status: "active",
    project_root: projectRoot, repository_head: git(projectRoot, ["rev-parse", "HEAD"]),
    discovered_instructions: (await Promise.all(["AGENTS.md", "AGENTS.override.md", "CLAUDE.md", "README.md"].map(async (name) => { try { await access(join(projectRoot, name)); return name; } catch { return undefined; } }))).filter((name): name is string => Boolean(name)),
    defaults: {}, created_at: timestamp, updated_at: timestamp
  };
  const bundle: ScopeBundle = {
    personal: { schema_version: "0.1.0", kind: "personal-scope", scope_id: `personal-${digest(owner)}`, status: "active", owner, proof_preferences: [], created_at: timestamp, updated_at: timestamp },
    project, tasks: [], decisions: []
  };
  await persist(root, bundle);
  return bundle;
}

export async function createTaskScope(root: string, taskId: string, objective: string, parentTaskId?: string) {
  const bundle = await initializeScopes(root);
  const timestamp = now();
  const task: TaskScope = { schema_version: "0.1.0", kind: "task-scope", scope_id: `task-scope-${digest(taskId)}`, status: "active", task_id: taskId, objective, project_scope_id: bundle.project.scope_id, parent_task_id: parentTaskId, created_at: timestamp, updated_at: timestamp };
  const next = { ...bundle, tasks: [...bundle.tasks.filter((item) => item.task_id !== taskId), task] };
  await persist(root, next);
  return task;
}

export async function addDecisionCandidate(root: string, statement: string, rationale: string, sourceRefs: string[] = []) {
  const bundle = await initializeScopes(root);
  const timestamp = now();
  const decision: DecisionMemory = { schema_version: "0.1.0", kind: "decision-memory", decision_id: `decision-${randomUUID()}`, state: "candidate", statement, rationale, source_refs: [...new Set(sourceRefs)].sort(), proposed_by: "run", created_at: timestamp, updated_at: timestamp, freshness: "fresh", conflicts: [], no_silent_promotion: true };
  await persist(root, { ...bundle, decisions: [...bundle.decisions, decision] });
  return decision;
}

export async function transitionDecision(root: string, decisionId: string, state: Exclude<MemoryState, "candidate">, conflicts: string[] = []) {
  const bundle = await initializeScopes(root);
  const current = bundle.decisions.find((item) => item.decision_id === decisionId);
  if (!current) throw new Error(`decision not found: ${decisionId}`);
  if (current.state !== "candidate" && state === "accepted") throw new Error("only candidate decisions may be accepted");
  const updated: DecisionMemory = { ...current, state, accepted_by: state === "accepted" ? "owner" : current.accepted_by, conflicts: [...new Set(conflicts)].sort(), updated_at: now() };
  await persist(root, { ...bundle, decisions: bundle.decisions.map((item) => item.decision_id === decisionId ? updated : item) });
  return updated;
}

async function persist(root: string, bundle: ScopeBundle) {
  await mkdir(scopesDir(root), { recursive: true });
  await writeFile(bundlePath(root), JSON.stringify(bundle, null, 2) + "\n", "utf8");
}
