import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBeforeBuildPacket,
  buildResourceDiff,
  buildResourceInventory,
  buildResourceLock,
  buildResourcePlan,
  canonicalizeResourceArtifact,
  computeResourceArtifactDigest,
  diffResourceArtifacts,
  listResourceScenarios,
  renderResourceArtifactMarkdown,
  scanResourceInventory,
  validateResourceArtifact
} from "../src/index.js";

describe("agent-resource-plan", () => {
  it("lists the preview scenario", () => {
    expect(listResourceScenarios()).toContain("auth-redirect-bug");
  });

  it("canonicalizes reordered objects", () => {
    expect(canonicalizeResourceArtifact({ b: 2, a: 1, omit: undefined })).toEqual({ a: 1, b: 2 });
    expect(computeResourceArtifactDigest({ a: 1, b: 2 })).toBe(computeResourceArtifactDigest({ b: 2, a: 1 }));
  });

  it("keeps diff clean for reordered equivalent inputs", () => {
    expect(diffResourceArtifacts({ a: 1, b: 2 }, { b: 2, a: 1 }).state).toBe("clean");
  });

  it("builds the resource plan and lock deterministically", () => {
    const plan = buildResourcePlan("auth-redirect-bug");
    const inventory = buildResourceInventory(".");
    const lock = buildResourceLock(plan, inventory);
    expect(plan.kind).toBe("resource-plan");
    expect(lock.kind).toBe("resource-lock");
    expect(lock.planDigest).toBe(plan.digest);
  });

  it("marks an explicit diff change", () => {
    expect(buildResourceDiff({ a: 1 }, { a: 2 }).state).toBe("changed");
  });

  it("builds a before-build packet", () => {
    expect(buildBeforeBuildPacket("auth-redirect-bug").state).toBe("unknown");
  });

  it("renders markdown", () => {
    expect(renderResourceArtifactMarkdown({ kind: "resource-plan", advisoryOnly: true, proposedActions: ["inspect"] })).toContain("## Proposed Actions");
  });

  it("validates artifact shape", () => {
    expect(validateResourceArtifact({ kind: "resource-plan" }).ok).toBe(true);
    expect(validateResourceArtifact(null).ok).toBe(false);
  });

  it("scans and redacts secret-shaped keys", () => {
    const root = mkdtempSync(join(tmpdir(), "assetmason-"));
    writeFileSync(join(root, "token.txt"), "secret");
    writeFileSync(join(root, ".gitignore"), "node_modules");
    const inventory = scanResourceInventory(root);
    expect(inventory.files.some((file) => file.redactedSecrets?.includes("secret-shaped-key"))).toBe(true);
    expect(inventory.files.some((file) => file.path === ".git")).toBe(false);
  });
});
