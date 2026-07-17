import { describe, expect, it } from "vitest";
import { buildWorkOrder, computeResourceArtifactDigest, renderWorkOrderJson, validateWorkOrder } from "../src/index.js";

function baseWorkOrder() {
  return {
    schema_version: "0.1.0",
    work_order_id: "wo-property",
    task_text: "Line one.\r\nLine two.",
    task_class: "small_fix",
    acceptance_criteria: { knowledge_state: "known", items: ["keep order", "normalize text"] },
    repository: {
      revision_state: "known",
      revision: "abc123",
      scope_state: "known",
      scope: ["packages/assetmason-cli", "packages/agent-resource-plan"]
    },
    selected_host: { knowledge_state: "known", host_id: "assetmason-cli" },
    expected_duration_or_risk: {
      expected_duration_minutes: 3,
      risk_signals: ["other", "permission_sensitive"]
    },
    user_constraints: ["beta", "alpha"],
    prohibited_scope: ["delta", "gamma"],
    required_evidence: [{ evidence_id: "property-evidence", description: "repeatable behavior", status: "required" }],
    runtime_advisory_only: true
  } as const;
}

describe("work-order properties", () => {
  it("is repeatable across input reorderings", () => {
    const forward = buildWorkOrder(baseWorkOrder() as any);
    const reverse = buildWorkOrder({
      ...baseWorkOrder(),
      repository: { ...baseWorkOrder().repository, scope: [...baseWorkOrder().repository.scope].reverse() },
      expected_duration_or_risk: { ...baseWorkOrder().expected_duration_or_risk, risk_signals: [...baseWorkOrder().expected_duration_or_risk.risk_signals].reverse() },
      user_constraints: [...baseWorkOrder().user_constraints].reverse(),
      prohibited_scope: [...baseWorkOrder().prohibited_scope].reverse()
    } as any);

    expect(forward.spec_digest).toBe(reverse.spec_digest);
    expect(computeResourceArtifactDigest({ ...forward, spec_digest: undefined })).toBe(computeResourceArtifactDigest({ ...reverse, spec_digest: undefined }));
  });

  it("normalizes newline and set-like fields deterministically", () => {
    const workOrder = buildWorkOrder(baseWorkOrder() as any);

    expect(workOrder.task_text).toBe("Line one.\nLine two.");
    expect(workOrder.repository.scope).toEqual(["packages/agent-resource-plan", "packages/assetmason-cli"]);
    expect(workOrder.expected_duration_or_risk?.risk_signals).toEqual(["other", "permission_sensitive"]);
    expect(workOrder.user_constraints).toEqual(["alpha", "beta"]);
    expect(workOrder.prohibited_scope).toEqual(["delta", "gamma"]);
    expect(renderWorkOrderJson(workOrder)).toContain('"task_text": "Line one.\\nLine two."');
  });

  it("rejects secret-shaped public values without echoing them", () => {
    const result = validateWorkOrder({
      ...baseWorkOrder(),
      task_text: "api_key=sk-test-1234567890"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === "work_order.secret_like_value")).toBe(true);
    expect(result.errors.some((issue) => String(issue.message).includes("sk-test-1234567890"))).toBe(false);
  });
});
