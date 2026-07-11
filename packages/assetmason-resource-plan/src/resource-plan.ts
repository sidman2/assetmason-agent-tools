import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type {
  CanonicalJsonValue,
  ResourceArtifactValidationResult,
  ResourceCheckPacket,
  ResourceDiff,
  ResourceDiffState,
  ResourceInventory,
  ResourceLock,
  ResourcePlan,
  ResourceSelectionPolicyEnvelope,
  ResourceSourceReference,
  ResourceValidationIssue
} from "./types.js";

const ignoredNames = new Set([".git", "node_modules", "dist", "coverage", "tmp"]);
const scenarioCatalog: Record<string, { description: string; sources: ResourceSourceReference[]; actions: string[] }> = {
  "auth-redirect-bug": {
    description: "Public-safe preview scenario for advisory resource planning.",
    sources: [{ kind: "fixture", label: "auth redirect bug fixture" }],
    actions: ["inspect redirect flow", "compare expected artifact coverage", "hand off advisory notes"]
  }
};

export function listResourceScenarios(): string[] {
  return Object.keys(scenarioCatalog);
}

export function canonicalizeResourceArtifact(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(canonicalizeResourceArtifact);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, canonicalizeResourceArtifact(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries) as CanonicalJsonValue;
  }
  return null;
}

export function computeResourceArtifactDigest(value: unknown): string {
  const canonical = JSON.stringify(canonicalizeResourceArtifact(value));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildBeforeBuildPacket(scenario: string): ResourceCheckPacket {
  const entry = scenarioCatalog[scenario] ?? scenarioCatalog["auth-redirect-bug"];
  return { kind: "resource-check", scenario, advisoryOnly: true, state: "unknown", sources: entry.sources };
}

export function buildResourcePlan(scenario: string): ResourcePlan {
  const entry = scenarioCatalog[scenario] ?? scenarioCatalog["auth-redirect-bug"];
  const resourceCheck = buildBeforeBuildPacket(scenario);
  const selectionPolicy: ResourceSelectionPolicyEnvelope = {
    kind: "selection-policy",
    scenario,
    advisoryOnly: true,
    unknownMeans: "insufficient-evidence",
    allowedKinds: ["read-only", "public-safe", "fixture"]
  };
  const plan: ResourcePlan = {
    kind: "resource-plan",
    scenario,
    advisoryOnly: true,
    resourceCheck,
    selectionPolicy,
    proposedActions: entry.actions,
    sources: entry.sources,
    digest: ""
  };
  return { ...plan, digest: computeResourceArtifactDigest({ ...plan, digest: undefined }) };
}

export function buildResourceLock(plan: ResourcePlan, inventory: ResourceInventory): ResourceLock {
  const lock: ResourceLock = {
    kind: "resource-lock",
    scenario: plan.scenario,
    advisoryOnly: true,
    planDigest: plan.digest,
    inventoryDigest: inventory.digest,
    resourcePlanDigest: plan.digest,
    resources: inventory.files.map((file) => file.path),
    sources: plan.sources,
    digest: ""
  };
  return { ...lock, digest: computeResourceArtifactDigest({ ...lock, digest: undefined }) };
}

export function buildResourceInventory(root: string): ResourceInventory {
  const absoluteRoot = resolve(root);
  const files: ResourceInventory["files"] = [];
  const warnings: ResourceValidationIssue[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (ignoredNames.has(entry.name)) continue;
      const full = join(current, entry.name);
      let stat;
      try {
        stat = lstatSync(full);
      } catch {
        warnings.push({ level: "warning", code: "inventory.unreadable", message: "Unreadable path skipped", path: relative(absoluteRoot, full) });
        continue;
      }
      const rel = relative(absoluteRoot, full).split(sep).join("/");
      if (stat.isSymbolicLink()) {
        files.push({ path: rel, size: 0, kind: "symlink" });
        continue;
      }
      if (stat.isDirectory()) {
        files.push({ path: rel, size: 0, kind: "directory" });
        walk(full);
        continue;
      }
      const redactedSecrets = /secret|token|password|authorization/i.test(entry.name) ? ["secret-shaped-key"] : undefined;
      files.push({ path: rel, size: stat.size, kind: "file", redactedSecrets });
    }
  };
  walk(absoluteRoot);
  const inventory: ResourceInventory = { kind: "resource-inventory", root: absoluteRoot, files, warnings, digest: "" };
  return { ...inventory, digest: computeResourceArtifactDigest({ ...inventory, digest: undefined }) };
}

export function scanResourceInventory(root: string): ResourceInventory {
  return buildResourceInventory(root);
}

export function buildResourceDiff(before: unknown, after: unknown): ResourceDiff {
  const beforeDigest = computeResourceArtifactDigest(before);
  const afterDigest = computeResourceArtifactDigest(after);
  const state: ResourceDiffState = beforeDigest === afterDigest ? "clean" : "changed";
  return { kind: "resource-diff", advisoryOnly: true, state, beforeDigest, afterDigest, changes: state === "clean" ? [] : ["semantic-digest-changed"], warnings: [], digest: computeResourceArtifactDigest({ state, beforeDigest, afterDigest }) };
}

export function diffResourceArtifacts(before: unknown, after: unknown): ResourceDiff {
  return buildResourceDiff(before, after);
}

export function validateResourceArtifact(input: unknown): ResourceArtifactValidationResult {
  if (typeof input !== "object" || input === null) return { ok: false, errors: [{ level: "error", code: "root.not_object", message: "Artifact must be an object" }], warnings: [] };
  const kind = (input as Record<string, unknown>).kind;
  if (typeof kind !== "string") return { ok: false, errors: [{ level: "error", code: "root.kind", message: "kind is required" }], warnings: [] };
  const warnings: ResourceValidationIssue[] = [];
  const errors: ResourceValidationIssue[] = [];
  if ((input as any).digest && typeof (input as any).digest !== "string") warnings.push({ level: "warning", code: "artifact.digest", message: "digest should be a string" });
  return { ok: errors.length === 0, kind, errors, warnings, digest: computeResourceArtifactDigest({ ...(input as Record<string, unknown>), digest: undefined }) };
}

export function renderResourceArtifactJson(value: unknown): string {
  return JSON.stringify(canonicalizeResourceArtifact(value), null, 2) + "\n";
}

export function renderResourceArtifactMarkdown(value: unknown): string {
  const artifact = value as Record<string, unknown>;
  const lines = [`# ${(artifact.kind as string) ?? "resource-artifact"}`, "", `- advisoryOnly: ${String(artifact.advisoryOnly ?? false)}`];
  if (typeof artifact.state === "string") lines.push(`- state: ${artifact.state}`);
  if (Array.isArray(artifact.proposedActions)) lines.push("", "## Proposed Actions", ...artifact.proposedActions.map((action) => `- ${action}`));
  return lines.join("\n") + "\n";
}
