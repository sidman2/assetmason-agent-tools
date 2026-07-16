import { describe, expect, it } from "vitest";
import {
  buildApprovalRequirement,
  buildEvidenceReference,
  buildSelectionPolicyEnvelope,
  buildSelectionScenario,
  buildMinimumToolsetEvaluation,
  computeSelectionDigest,
  type SelectionCandidate,
  listSelectionScenarios,
  selectMinimumApprovedResources,
  renderMinimumApprovedResourceSetJson,
  renderSelectionPolicyEnvelopeJson,
  renderMinimumToolsetEvaluationMarkdown,
  validateMinimumApprovedResourceSet,
  validateMinimumToolsetEvaluation,
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
    expect(computeSelectionDigest({ a: 1, b: 2 })).toBe(computeSelectionDigest({ b: 2, a: 1 }));
    expect(renderSelectionPolicyEnvelopeJson(envelope)).toContain('"envelope_id": "selection-envelope-auth-redirect-bug"');
  });
});

describe("selection helper constructors", () => {
  it("builds approval and evidence references", () => {
    expect(buildApprovalRequirement("review", "public review required")).toEqual({
      approval_id: "review",
      reason: "public review required",
      review_status: "not_requested"
    });
    expect(buildEvidenceReference("fixture label")).toEqual({
      kind: "fixture",
      label: "fixture label"
    });
    expect(buildEvidenceReference("public label", "https://example.com/evidence")).toEqual({
      kind: "public",
      label: "public label",
      href: "https://example.com/evidence"
    });
  });
});

describe("minimum approved resource selection", () => {
  const candidates: SelectionCandidate[] = [
    { resource_id: "docs", resource_kind: "docs", tool_name: "help-reader", capability: ["read", "docs"], source: { kind: "fixture", label: "docs" } },
    { resource_id: "browser-qa", resource_kind: "tool", tool_name: "browser", capability: ["read", "browser"], source: { kind: "fixture", label: "browser" }, ask_first: true },
    { resource_id: "forbidden-debugger", resource_kind: "tool", tool_name: "debugger", capability: ["read"], source: { kind: "fixture", label: "debugger" }, evidence_status: "missing" },
    { resource_id: "stale-docs", resource_kind: "docs", tool_name: "docs-reader", capability: ["read"], source: { kind: "fixture", label: "stale docs" }, evidence_status: "stale" },
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
    expect(selection.unknown_resources).toEqual(["stale-docs"]);
    expect(selection.selection_trace.map((entry) => entry.resource_id)).toEqual(["browser-qa", "docs", "forbidden-debugger", "local-sim", "stale-docs"]);
    expect(selection.selection_trace.find((entry) => entry.resource_id === "docs")?.decision).toBe("selected");
    expect(selection.selection_trace.find((entry) => entry.resource_id === "forbidden-debugger")?.decision).toBe("denied");
    expect(selection.selection_trace.find((entry) => entry.resource_id === "forbidden-debugger")?.reason_code).toBe("denied_resource");
    expect(selection.selection_trace.find((entry) => entry.resource_id === "stale-docs")?.decision).toBe("unknown");
    expect(selection.selection_trace.find((entry) => entry.resource_id === "stale-docs")?.reason_code).toBe("stale_evidence");
    expect(validateMinimumApprovedResourceSet(selection).ok).toBe(true);
    expect(renderMinimumApprovedResourceSetJson(selection)).toContain('"selected_resources": [');
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

  it("pins expected selections for all public-safe scenarios", () => {
    const expectedSelections: Record<string, string[]> = {
      "auth-redirect-bug": ["docs"],
      "overloaded-mcp-config": ["docs"],
      "docs-rag-task": ["docs"],
      "browser-qa-task": [],
      "architecture-sensitive-feature": ["docs"],
      "billing-migration-sensitive-task": ["docs"],
      "official-sdk-vs-custom": ["docs"],
      "stale-or-missing-evidence": ["docs"]
    };

    expect(listSelectionScenarios()).toEqual(Object.keys(expectedSelections));
    for (const scenario of listSelectionScenarios()) {
      expect(buildSelectionScenario(scenario).selected_resources).toEqual(expectedSelections[scenario]);
    }
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
    expect(evaluation.requiredResourceRecall).toBe(1);
    expect(evaluation.unnecessaryResourcePrecision).toBe(1);
    expect(validateMinimumToolsetEvaluation(evaluation).ok).toBe(true);
    expect(renderMinimumToolsetEvaluationMarkdown(evaluation)).toContain("minimum-toolset-evaluation");
  });
});
