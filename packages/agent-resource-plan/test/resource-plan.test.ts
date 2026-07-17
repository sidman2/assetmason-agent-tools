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
  buildWorkOrder,
  canonicalizeResourceArtifact,
  computeResourceArtifactDigest,
  diffResourceArtifacts,
  listResourceScenarios,
  renderResourceArtifactMarkdown,
  renderWorkOrderJson,
  renderWorkOrderMarkdown,
  scanResourceInventory,
  validateResourceArtifact,
  validateWorkOrder
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

  it("builds and validates a work order deterministically", () => {
    const workOrder = buildWorkOrder({
      schema_version: "0.1.0",
      work_order_id: "wo-103",
      task_text: "Implement the additive WorkOrder contract.",
      task_class: "small_fix",
      acceptance_criteria: { knowledge_state: "known", items: ["export the type", "render JSON and markdown"] },
      repository: { revision_state: "known", revision: "abc123", scope_state: "unknown" },
      selected_host: { knowledge_state: "known", host_id: "agent-resource-plan" },
      required_evidence: [{ evidence_id: "bundle-sha", description: "Verify bundle SHA-256", status: "required" }],
      runtime_advisory_only: true
    });

    expect(workOrder.spec_digest).toBe(computeResourceArtifactDigest({ ...workOrder, spec_digest: undefined }));
    expect(validateWorkOrder(workOrder).ok).toBe(true);
    expect(renderWorkOrderJson(workOrder)).toContain('"work_order_id": "wo-103"');
    expect(renderWorkOrderMarkdown(workOrder)).toContain("## Required Evidence");
  });

  it("reports path-aware validation issues", () => {
    const result = validateWorkOrder({
      schema_version: "0.1.0",
      work_order_id: "wo-103",
      task_text: "Missing nested fields",
      task_class: "small_fix",
      acceptance_criteria: { knowledge_state: "known", items: [] },
      repository: { revision_state: "known", scope_state: "known" },
      selected_host: { knowledge_state: "known" },
      required_evidence: [],
      runtime_advisory_only: true
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.path === "repository.revision")).toBe(true);
    expect(result.errors.some((issue) => issue.path === "selected_host.host_id")).toBe(true);
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
