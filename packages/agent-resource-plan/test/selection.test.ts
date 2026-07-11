import { describe, expect, it } from "vitest";
import {
  buildSelectionPolicyEnvelope,
  buildMinimumToolsetEvaluation,
  type SelectionCandidate,
  selectMinimumApprovedResources,
  renderMinimumToolsetEvaluationMarkdown,
  validateSelectionPolicyEnvelope
} from "../src/index.js";

const envelope = buildSelectionPolicyEnvelope({
  schema_version: "0.1.0",
  envelope_id: "selection-envelope-auth-redirect-bug",
  envelope_digest: "",
  task_class: "small_fix",
  phase: "plan",
  host_context: "codex-desktop",
  allowed_resources: ["docs", "repo"],
  denied_resources: ["forbidden-debugger"],
  ask_first_resources: ["browser-qa"],
  sandbox_only_resources: ["local-sim"],
  allowed_permissions: ["read"],
  denied_permissions: ["publish"],
  required_approvals: [{ approval_id: "review", reason: "public review required", review_status: "not_requested" }],
  required_verification_gates: ["typecheck", "test"],
  context_budget: { maximum_resource_count: 3, maximum_tool_schema_count: 2 },
  unknowns: ["private ranking not exposed"],
  evidence_refs: [{ kind: "fixture", label: "public fixture" }],
  runtime_advisory_only: true,
  rules: [
    { rule_id: "allow-docs", effect: "allow", resource_kind: "docs", reason_code: "official_supported_route", human_explanation: "Docs are always allowed." },
    { rule_id: "deny-forbidden", effect: "deny", resource_id: "forbidden-debugger", reason_code: "forbidden_resource", human_explanation: "Forbidden debug tooling is denied." }
  ],
  conflicts: [
    {
      resource_id: "forbidden-debugger",
      winning_rule_id: "deny-forbidden",
      losing_rule_id: "allow-docs",
      winning_effect: "deny",
      losing_effect: "allow",
      reason: "deny overrides allow"
    }
  ]
});

describe("selection policy envelope", () => {
  it("validates deterministically", () => {
    expect(validateSelectionPolicyEnvelope(envelope).ok).toBe(true);
  });

  it("hashes semantic material deterministically", () => {
    expect(envelope.envelope_digest).toBe(buildSelectionPolicyEnvelope({ ...envelope, envelope_digest: "" }).envelope_digest);
  });
});

describe("minimum approved resource selection", () => {
  const candidates: SelectionCandidate[] = [
    { resource_id: "docs", resource_kind: "docs", tool_name: "help-reader", capability: ["read", "docs"], source: { kind: "fixture", label: "docs" } },
    { resource_id: "browser-qa", resource_kind: "tool", tool_name: "browser", capability: ["read", "browser"], source: { kind: "fixture", label: "browser" }, ask_first: true },
    { resource_id: "forbidden-debugger", resource_kind: "tool", tool_name: "debugger", capability: ["read"], source: { kind: "fixture", label: "debugger" }, evidence_status: "missing" },
    { resource_id: "local-sim", resource_kind: "tool", tool_name: "sim", capability: ["read"], source: { kind: "fixture", label: "sim" }, sandbox_only: true }
  ];

  it("selects the minimum approved resource set with traceability", () => {
    const selection = selectMinimumApprovedResources({
      candidates: [...candidates],
      envelope,
      requiredCapabilities: ["read"],
      hostContext: "codex-desktop",
      evidence: [{ kind: "public", label: "repo evidence" }]
    });

    expect(selection.selected_resources).toEqual(["docs"]);
    expect(selection.denied_resources).toEqual(["forbidden-debugger"]);
    expect(selection.ask_first_resources).toEqual(["browser-qa"]);
    expect(selection.sandbox_only_resources).toEqual(["local-sim"]);
    expect(selection.selection_trace.map((entry) => entry.resource_id)).toEqual(["browser-qa", "docs", "forbidden-debugger", "local-sim"]);
    expect(selection.selection_trace.find((entry) => entry.resource_id === "docs")?.decision).toBe("selected");
    expect(selection.selection_trace.find((entry) => entry.resource_id === "forbidden-debugger")?.reason_code).toBe("forbidden_resource");
  });

  it("stays deterministic under candidate reordering", () => {
    const forward = selectMinimumApprovedResources({
      candidates: [...candidates],
      envelope,
      requiredCapabilities: ["read"],
      hostContext: "codex-desktop",
      evidence: []
    });
    const reverse = selectMinimumApprovedResources({
      candidates: [...candidates].reverse() as typeof candidates,
      envelope,
      requiredCapabilities: ["read"],
      hostContext: "codex-desktop",
      evidence: []
    });

    expect(reverse.selection_digest).toBe(forward.selection_digest);
    expect(reverse.selected_resources).toEqual(forward.selected_resources);
  });

  it("builds a comparison evaluation", () => {
    const selection = selectMinimumApprovedResources({
      candidates: [...candidates],
      envelope,
      requiredCapabilities: ["read"],
      hostContext: "codex-desktop",
      evidence: []
    });
    const evaluation = buildMinimumToolsetEvaluation(selection, selection);
    expect(evaluation.deterministicRepeatability).toBe(true);
    expect(renderMinimumToolsetEvaluationMarkdown(evaluation)).toContain("minimum-toolset-evaluation");
  });
});
