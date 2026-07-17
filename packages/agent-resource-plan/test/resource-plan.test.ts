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

const workOrderBase = {
  schema_version: "0.1.0" as const,
  work_order_id: "wo-103" as const,
  task_text: "Implement the additive WorkOrder contract." as const,
  task_class: "small_fix" as const,
  acceptance_criteria: { knowledge_state: "known" as const, items: ["export the type", "render JSON and markdown"] },
  repository: { revision_state: "known" as const, revision: "abc123", scope_state: "unknown" as const },
  selected_host: { knowledge_state: "known" as const, host_id: "agent-resource-plan" },
  required_evidence: [{ evidence_id: "bundle-sha", description: "Verify bundle SHA-256", status: "required" as const }],
  runtime_advisory_only: true as const
} satisfies Parameters<typeof buildWorkOrder>[0];

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
    const workOrder = buildWorkOrder(workOrderBase);

    expect(workOrder.spec_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(workOrder.spec_digest).toBe(`sha256:${computeResourceArtifactDigest({ ...workOrder, spec_digest: undefined })}`);
    expect(validateWorkOrder(workOrder).ok).toBe(true);
    expect(renderWorkOrderJson(workOrder)).toContain('"work_order_id": "wo-103"');
    expect(renderWorkOrderMarkdown(workOrder)).toContain("## Required Evidence");
  });

  it("normalizes and canonicalizes work orders for digest and rendering", () => {
    const workOrder = buildWorkOrder({
      schema_version: "0.1.0",
      work_order_id: "  wo-104  ",
      task_text: "  Line one.\r\nLine two.  ",
      task_class: "small_fix",
      acceptance_criteria: { knowledge_state: "known", items: ["  second  ", "first", "first"] },
      repository: {
        repository_ref: "  repo-ref  ",
        revision_state: "known",
        revision: "  rev-2  ",
        scope_state: "known",
        scope: ["zeta", "alpha", "alpha"]
      },
      selected_host: { knowledge_state: "known", host_id: "  host-1  " },
      expected_duration_or_risk: {
        expected_duration_minutes: 0,
        risk_signals: ["other", "permission_sensitive", "other"]
      },
      user_constraints: ["  beta  ", "alpha", "alpha"],
      prohibited_scope: ["  deny-b  ", "deny-a", "deny-a"],
      required_evidence: [{ evidence_id: "  ev-1  ", description: "  proof\r\nline  ", status: "required" }],
      runtime_advisory_only: true
    });

    expect(workOrder.work_order_id).toBe("wo-104");
    expect(workOrder.task_text).toBe("Line one.\nLine two.");
    expect(workOrder.acceptance_criteria.items).toEqual(["second", "first", "first"]);
    expect(workOrder.repository.scope).toEqual(["alpha", "zeta"]);
    expect(workOrder.expected_duration_or_risk?.risk_signals).toEqual(["other", "permission_sensitive"]);
    expect(workOrder.user_constraints).toEqual(["alpha", "beta"]);
    expect(workOrder.prohibited_scope).toEqual(["deny-a", "deny-b"]);
    expect(workOrder.required_evidence[0]).toEqual({ evidence_id: "ev-1", description: "proof\nline", status: "required" });
    expect(renderWorkOrderJson(workOrder)).toContain('"work_order_id": "wo-104"');
    expect(renderWorkOrderJson(workOrder)).toContain('"task_text": "Line one.\\nLine two."');
  });

  it("rejects unknown properties, locked digests, and secret-like public values", () => {
    const result = validateWorkOrder({
      ...workOrderBase,
      work_order_id: "wo-105",
      task_text: "token=sk-test-1234567890",
      acceptance_criteria: { knowledge_state: "known", items: ["ok"], extra: true },
      repository: { revision_state: "known", revision: "abc123", scope_state: "unknown", extra: true },
      selected_host: { knowledge_state: "known", host_id: "host-1", extra: true },
      required_evidence: [{ evidence_id: "ev-1", description: "ok", status: "required", extra: true }],
      locked: true,
      extra: true
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === "work_order.unknown_property" && issue.path === "extra")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "work_order.acceptance_criteria.unknown_property")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "work_order.repository.unknown_property")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "work_order.selected_host.unknown_property")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "work_order.required_evidence.unknown_property")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "work_order.spec_digest")).toBe(true);
    expect(result.errors.some((issue) => String(issue.message).includes("sk-test-1234567890"))).toBe(false);
  });

  it("fails closed on locked digest format and equality mismatches", () => {
    const missing = validateWorkOrder({ ...workOrderBase, locked: true });
    const unprefixed = validateWorkOrder({ ...workOrderBase, locked: true, spec_digest: "deadbeef" });
    const malformed = validateWorkOrder({ ...workOrderBase, locked: true, spec_digest: "sha256:xyz" });
    const mismatched = validateWorkOrder({ ...workOrderBase, locked: true, spec_digest: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" });
    const exact = buildWorkOrder({ ...workOrderBase, locked: true });

    expect(missing.ok).toBe(false);
    expect(unprefixed.ok).toBe(false);
    expect(malformed.ok).toBe(false);
    expect(mismatched.ok).toBe(false);
    expect(exact.spec_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(validateWorkOrder(exact).ok).toBe(true);
  });

  it("treats nested secret-like public values as validation errors without echoing them", () => {
    const secret = "token=sk-test-1234567890";
    const result = validateWorkOrder({
      ...workOrderBase,
      acceptance_criteria: { knowledge_state: "known", items: ["ok", `nested ${secret}`] },
      repository: { revision_state: "known", revision: secret, scope_state: "known", scope: [secret] },
      selected_host: { knowledge_state: "known", host_id: secret },
      required_evidence: [{ evidence_id: secret, description: secret, status: "required" }],
      user_constraints: [secret],
      prohibited_scope: [secret],
      spec_digest: `sha256:${secret}`,
      locked: true
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === "work_order.secret_like_value")).toBe(true);
    expect(result.errors.some((issue) => String(issue.message).includes(secret))).toBe(false);
    expect(result.errors.some((issue) => String(issue.path).includes(secret))).toBe(false);
  });

  it("keeps non-WorkOrder digests byte-for-byte unchanged", () => {
    const plan = buildResourcePlan("auth-redirect-bug");
    const inventory = buildResourceInventory(".");
    const lock = buildResourceLock(plan, inventory);
    const diff = buildResourceDiff({ a: 1 }, { a: 2 });

    expect(plan.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(lock.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(diff.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("enforces conditional field parity for known nested states", () => {
    const result = validateWorkOrder({
      schema_version: "0.1.0",
      work_order_id: "wo-106",
      task_text: "Check conditionals",
      task_class: "small_fix",
      acceptance_criteria: { knowledge_state: "known", items: ["ok"] },
      repository: { revision_state: "known", scope_state: "known" },
      selected_host: { knowledge_state: "known" },
      required_evidence: [],
      runtime_advisory_only: true
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.path === "repository.revision")).toBe(true);
    expect(result.errors.some((issue) => issue.path === "repository.scope")).toBe(true);
    expect(result.errors.some((issue) => issue.path === "selected_host.host_id")).toBe(true);
  });

  it("keeps schema and types parity on the public WorkOrder surface", () => {
    const allowedTopLevel = [
      "schema_version",
      "work_order_id",
      "task_text",
      "task_class",
      "acceptance_criteria",
      "repository",
      "selected_host",
      "expected_duration_or_risk",
      "user_constraints",
      "prohibited_scope",
      "required_evidence",
      "spec_digest",
      "locked",
      "runtime_advisory_only"
    ];

    const schemaKeys = ["schema_version", "work_order_id", "task_text", "task_class", "acceptance_criteria", "repository", "selected_host", "expected_duration_or_risk", "user_constraints", "prohibited_scope", "required_evidence", "spec_digest", "locked", "runtime_advisory_only"];
    expect(schemaKeys).toEqual(allowedTopLevel);
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
