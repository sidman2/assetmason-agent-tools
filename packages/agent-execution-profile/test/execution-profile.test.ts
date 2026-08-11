import { describe, expect, it } from "vitest";
import { buildExecutionProfile, buildHandoffPack, buildOutcomeReceipt, importEvidenceIntoReceipt } from "../src/build.js";
import { buildExecutionProfileLock, executionProfileLockDigest } from "../src/lock.js";
import { buildPlanActualDiff, diffExecutionProfile, diffExecutionProfileLock, renderExecutionProfileMarkdown, renderExecutionProfileLockMarkdown, renderExecutionProfileDiffMarkdown, renderOutcomeReceiptMarkdown, renderPlanActualDiffMarkdown, renderPlanActualDiffJson, renderHandoffPackMarkdown } from "../src/index.js";
import { buildGenericHostExportArtifact } from "../src/hosts/generic.js";
import { executionProfileSemanticDigest } from "../src/semantic.js";
import { validateExecutionProfile, validateExecutionProfileLock, validateExecutionProfileDiff, validateHostExport, validateOutcomeReceipt, validatePlanActualDiff } from "../src/validate.js";

const profile = buildExecutionProfile({
  task_or_intent: "auth redirect bug",
  task_class: "small_fix",
  host_context: "codex",
  policy_layers: [
    { layer: "task_envelope", preferences: { preferred_resources: ["repo_source"], capability_requirements: ["tool_use"] }, unknowns: ["private runtime state"] }
  ],
  review_notes: ["advisory only"]
});

describe("agent-execution-profile", () => {
  function buildMatchedDiff(overrides: Partial<Parameters<typeof buildPlanActualDiff>[0]> = {}) {
    const plan = { plan_ref: "plan-matched" };
    const planDigest = executionProfileSemanticDigest(plan);
    return buildPlanActualDiff({
      reconciliationId: "recon-matched",
      plan,
      lock: { lock_ref: "lock-matched", plan_ref: "plan-matched", resourcePlanDigest: planDigest },
      receipt: { receipt_ref: "receipt-matched", observed_evidence_refs: ["tests", "docs"] },
      requiredEvidenceRefs: ["docs", "tests"],
      declaredAcceptanceItems: ["docs", "tests"],
      observedEvidenceRefs: ["tests", "docs", "tests", "noise"],
      missingEvidence: [],
      contradictedEvidence: [],
      explicitUnknowns: [],
      resourceDrift: [],
      scopeOrDigestDrift: [],
      completionClaimed: false,
      sourceArtifactRefs: ["plan:plan-matched", "lock:lock-matched", "receipt:receipt-matched"],
      ...overrides
    });
  }

  it("builds and validates a profile", () => {
    expect(validateExecutionProfile(profile)).toBe(true);
    expect(renderExecutionProfileMarkdown(profile)).toContain("Agent Execution Profile");
  });

  it("builds and validates a lock", () => {
    const lock = buildExecutionProfileLock(profile);
    expect(validateExecutionProfileLock(lock)).toBe(true);
    expect(executionProfileLockDigest(lock)).toBe(executionProfileLockDigest(lock));
    expect(renderExecutionProfileLockMarkdown(lock)).toContain("Agent Execution Profile Lock");
  });

  it("diffs and validates the diff shape", () => {
    const diff = diffExecutionProfile(profile, profile);
    expect(validateExecutionProfileDiff(diff)).toBe(true);
    expect(renderExecutionProfileDiffMarkdown(diff)).toContain("Agent Execution Profile Diff");
    expect(diffExecutionProfileLock(buildExecutionProfileLock(profile), buildExecutionProfileLock(profile)).drift_status).toBe("clean");
  });

  it("builds and validates a host export", () => {
    const exportArtifact = buildGenericHostExportArtifact(profile);
    expect(validateHostExport(exportArtifact)).toBe(true);
    expect(validateOutcomeReceipt({
      schema_version: "0.1.0",
      receipt_id: "receipt-1",
      profile_id: profile.profile_id,
      profile_digest: profile.profile_digest,
      resolved_roles: ["implementer"],
      verification_results: [{ gate: "tests_pass", passed: true }],
      warnings: [],
      unknowns: [],
      local_only: true
    })).toBe(true);
    expect(
      renderOutcomeReceiptMarkdown(buildOutcomeReceipt({
        receipt_id: "receipt-1",
        profile_id: profile.profile_id,
        profile_digest: profile.profile_digest,
        resolved_roles: ["implementer"],
        verification_results: [{ gate: "tests_pass", passed: true }],
        warnings: [],
        unknowns: []
      }))
    ).toContain("Outcome Receipt");
  });

  it("imports explicit evidence into a receipt and renders a handoff pack", () => {
    const receipt = buildOutcomeReceipt({
      receipt_id: "receipt-2",
      profile_id: profile.profile_id,
      profile_digest: profile.profile_digest
    });
    const evidenceImport = {
      schema_version: "0.1.0" as const,
      import_id: "import-1",
      receipt_id: receipt.receipt_id,
      imported_at: "2026-08-06T00:00:00.000Z",
      source: "explicit-cli-input",
      evidence_refs: ["tests"],
      command_records: ["npm test"],
      check_records: ["typecheck"],
      artifact_refs: ["plan.json"],
      external_effects: [],
      observations: ["tests passed"],
      warnings: [],
      unknowns: [],
      contradicted_evidence: [],
      missing_evidence: [],
      variant: "ready" as const,
      local_only: true as const
    };
    const updated = importEvidenceIntoReceipt(receipt, evidenceImport);
    const handoff = buildHandoffPack({
      source_id: "task-1",
      task_text: "upgrade dependency safely",
      plan_ref: "plan-1",
      receipt_ref: updated.receipt_id,
      receipt_digest: updated.profile_digest,
      checks: ["npm test"],
      remaining_acceptance: ["safe upgrade"],
      resume_command: "assetmason reconcile --plan plan.json --receipt receipt.json"
    });

    expect(updated.evidence_imports?.length).toBe(1);
    expect(updated.evidence_state?.ready).toEqual(["import-1"]);
    expect(renderOutcomeReceiptMarkdown(updated)).toContain("evidence_imports");
    expect(renderHandoffPackMarkdown(handoff)).toContain("Handoff Pack");
  });

  it("classifies receipt evidence variants deterministically", () => {
    const receipt = buildOutcomeReceipt({
      receipt_id: "receipt-variant",
      profile_id: profile.profile_id,
      profile_digest: profile.profile_digest
    });
    let variantReceipt = receipt;
    for (const entry of [
      { import_id: "reuse", variant: "reuse_only" as const },
      { import_id: "cond", variant: "conditional" as const },
      { import_id: "block", variant: "blocked" as const },
      { import_id: "human", variant: "human" as const },
      { import_id: "unknown", variant: "unknown" as const },
      { import_id: "stale", variant: "stale_evidence" as const },
      { import_id: "missing", variant: "missing_evidence" as const },
      { import_id: "contradiction", variant: "contradiction" as const },
      { import_id: "wait", variant: "external_wait" as const }
    ]) {
      variantReceipt = importEvidenceIntoReceipt(variantReceipt, {
      schema_version: "0.1.0",
      receipt_id: receipt.receipt_id,
      imported_at: "2026-08-06T00:00:00.000Z",
      source: "fixture",
      evidence_refs: [],
      command_records: [],
      check_records: [],
      artifact_refs: [],
      external_effects: [],
      observations: [],
      warnings: [],
      unknowns: [],
      contradicted_evidence: [],
      missing_evidence: [],
      local_only: true as const,
      ...entry
    });
    }

    expect(variantReceipt.evidence_state).toMatchObject({
      ready: ["reuse"],
      conditional: ["cond"],
      blocked: ["block"],
      human: ["human"],
      unknown: ["unknown"],
      stale: ["stale"],
      missing: ["missing"],
      contradicted: ["contradiction"],
      external_wait: ["wait"]
    });
  });

  it("maps the brief's named evidence variants into explicit receipt buckets", () => {
    const receipt = buildOutcomeReceipt({
      receipt_id: "receipt-brief-variants",
      profile_id: profile.profile_id,
      profile_digest: profile.profile_digest
    });
    const cases: Array<{
      import_id: string;
      variant: NonNullable<Parameters<typeof importEvidenceIntoReceipt>[1]["variant"]>;
      expectedBucket: keyof NonNullable<typeof receipt.evidence_state>;
      expectedWaitFragment?: string;
    }> = [
      { import_id: "reuse-only", variant: "reuse_only", expectedBucket: "ready" },
      { import_id: "ready", variant: "ready", expectedBucket: "ready" },
      { import_id: "conditional", variant: "conditional", expectedBucket: "conditional" },
      { import_id: "blocked", variant: "blocked", expectedBucket: "blocked" },
      { import_id: "human", variant: "human", expectedBucket: "human" },
      { import_id: "unknown", variant: "unknown", expectedBucket: "unknown" },
      { import_id: "stale-base", variant: "stale_base", expectedBucket: "stale" },
      { import_id: "stale-evidence", variant: "stale_evidence", expectedBucket: "stale" },
      { import_id: "material-delta", variant: "material_delta", expectedBucket: "conditional" },
      { import_id: "missing", variant: "missing_evidence", expectedBucket: "missing", expectedWaitFragment: "missing evidence" },
      { import_id: "contradiction", variant: "contradiction", expectedBucket: "contradicted", expectedWaitFragment: "contradicted evidence" },
      { import_id: "partial-checks", variant: "partial_checks", expectedBucket: "conditional" },
      { import_id: "external-effect", variant: "external_effect", expectedBucket: "external_wait", expectedWaitFragment: "external wait" },
      { import_id: "external-wait", variant: "external_wait", expectedBucket: "external_wait", expectedWaitFragment: "external wait" }
    ];

    for (const testCase of cases) {
      const current = importEvidenceIntoReceipt(receipt, {
        schema_version: "0.1.0",
        receipt_id: receipt.receipt_id,
        imported_at: "2026-08-06T00:00:00.000Z",
        source: "fixture",
        evidence_refs: [],
        command_records: [],
        check_records: [],
        artifact_refs: [],
        external_effects: [],
        observations: [],
        warnings: [],
        unknowns: [],
        contradicted_evidence: [],
        missing_evidence: [],
        local_only: true as const,
        import_id: testCase.import_id,
        variant: testCase.variant
      });

      expect(current.evidence_state?.[testCase.expectedBucket]).toContain(testCase.import_id);
      const handoff = buildHandoffPack({
        source_id: "task-brief-variants",
        task_text: "upgrade dependency safely",
        receipt_ref: current.receipt_id,
        receipt_digest: current.profile_digest,
        receipt_evidence_state: current.evidence_state,
        remaining_acceptance: ["safe upgrade"]
      });
      if (testCase.expectedWaitFragment) {
        expect(handoff.waits.some((wait) => wait.includes(testCase.expectedWaitFragment as string))).toBe(true);
      }
    }
  });

  it("threads unresolved receipt state into the handoff pack", () => {
    const receipt = buildOutcomeReceipt({
      receipt_id: "receipt-wait",
      profile_id: profile.profile_id,
      profile_digest: profile.profile_digest
    });
    const updated = importEvidenceIntoReceipt(receipt, {
      schema_version: "0.1.0",
      import_id: "wait",
      receipt_id: receipt.receipt_id,
      imported_at: "2026-08-06T00:00:00.000Z",
      source: "fixture",
      evidence_refs: [],
      command_records: [],
      check_records: [],
      artifact_refs: [],
      external_effects: [],
      observations: [],
      warnings: [],
      unknowns: [],
      contradicted_evidence: [],
      missing_evidence: [],
      variant: "external_wait",
      local_only: true
    });
    const handoff = buildHandoffPack({
      source_id: "task-wait",
      task_text: "upgrade dependency safely",
      receipt_ref: updated.receipt_id,
      receipt_digest: updated.profile_digest,
      receipt_evidence_state: updated.evidence_state,
      waits: ["owner review pending"],
      remaining_acceptance: ["safe upgrade"]
    });

    expect(handoff.waits.some((wait) => wait.includes("external wait"))).toBe(true);
    expect(handoff.waits).toContain("owner review pending");
  });

  it("builds, validates, and renders a deterministic plan-actual diff", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-1",
      plan: { plan_ref: "plan-1", required_evidence: ["tests"], completion_claimed: true },
      lock: { lock_ref: "lock-1" },
      receipt: { receipt_ref: "receipt-1", observed_evidence_refs: ["tests"] },
      requiredEvidenceRefs: ["tests"],
      declaredAcceptanceItems: ["tests", "docs"],
      observedEvidenceRefs: ["evidence-tests"],
      missingEvidence: [],
      contradictedEvidence: [],
      explicitUnknowns: ["external deployment"],
      resourceDrift: [],
      scopeOrDigestDrift: [],
      completionClaimState: "claimed",
      sourceArtifactRefs: ["plan:plan-1", "lock:lock-1", "receipt:receipt-1"]
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("unknown");
    expect(diff.rule_codes).toContain("evidence.unknown");
    expect(renderPlanActualDiffMarkdown(diff)).toContain("Plan Actual Diff");
    expect(renderPlanActualDiffJson(diff)).toContain("\"reconciliation_id\": \"recon-1\"");
  });

  it("marks drift when evidence is missing or contradicted", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-2",
      plan: { plan_ref: "plan-2" },
      lock: { lock_ref: "lock-2" },
      receipt: { receipt_ref: "receipt-2" },
      requiredEvidenceRefs: ["tests"],
      missingEvidence: ["tests"],
      contradictedEvidence: ["claim"],
      resourceDrift: ["locked resource changed"],
      completionClaimState: "claimed"
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("drifted");
    expect(diff.missing_evidence).toEqual(["tests"]);
    expect(diff.contradicted_evidence).toEqual(["claim"]);
    expect(diff.evidence_state.missing).toEqual(["tests"]);
    expect(diff.evidence_state.contradicted).toEqual(["claim"]);
    expect(diff.rule_codes).toContain("evidence.missing");
    expect(diff.rule_codes).toContain("evidence.contradicted");
  });

  it("marks drift on plan lock mismatch and missing receipt", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-3",
      plan: { plan_ref: "plan-3", plan_digest: "digest-a" },
      lock: { lock_ref: "lock-3", plan_ref: "plan-x", resourcePlanDigest: "digest-b" },
      requiredEvidenceRefs: ["tests"],
      completionClaimed: true
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("drifted");
    expect(diff.rule_codes).toContain("receipt.missing");
    expect(diff.rule_codes).toContain("lock.plan.mismatch");
    expect(diff.rule_codes).toContain("digest.mismatch");
    expect(diff.rule_codes).toContain("completion.claimed-without-evidence");
  });

  it("covers the evidence-complete, no-addition, and irrelevant-evidence paths", () => {
    const diff = buildMatchedDiff();

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("matched");
    expect(diff.missing_evidence).toEqual([]);
    expect(diff.contradicted_evidence).toEqual([]);
    expect(diff.rule_codes).toEqual([]);
    expect(renderPlanActualDiffMarkdown(diff)).toContain("overall_state: matched");
  });

  it("marks missing evidence, unsupported completion, human approval pending, and unknown external evidence conservatively", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-4",
      plan: { plan_ref: "plan-4" },
      lock: { lock_ref: "lock-4", plan_ref: "plan-4", resourcePlanDigest: "digest-4" },
      receipt: { receipt_ref: "receipt-4", observed_evidence_refs: [] },
      requiredEvidenceRefs: ["tests", "docs"],
      missingEvidence: ["tests"],
      explicitUnknowns: ["human approval pending", "external evidence source unknown"],
      completionClaimed: true,
      completionClaimState: "unknown",
      sourceArtifactRefs: ["plan:plan-4", "lock:lock-4", "receipt:receipt-4"]
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("drifted");
    expect(diff.missing_evidence).toEqual(["docs", "tests"]);
    expect(diff.completion_claim_state).toBe("unknown");
    expect(diff.rule_codes).toContain("completion.claimed-without-evidence");
    expect(diff.rule_codes).toContain("evidence.missing");
    expect(diff.rule_codes).toContain("evidence.unknown");
  });

  it("retains deterministic ordering for long evidence-reference lists and malformed artifacts fail validation", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-5",
      plan: { plan_ref: "plan-5" },
      lock: { lock_ref: "lock-5", plan_ref: "plan-5", resourcePlanDigest: "digest-5" },
      receipt: { receipt_ref: "receipt-5", observed_evidence_refs: ["zeta", "alpha", "alpha", "beta"] },
      requiredEvidenceRefs: ["beta", "alpha", "alpha", "zeta"],
      observedEvidenceRefs: ["gamma", "zeta", "beta", "alpha", "gamma"],
      sourceArtifactRefs: [
        "receipt:receipt-5",
        "lock:lock-5",
        "plan:plan-5",
        "plan:plan-5",
        "evidence:zzz",
        "evidence:aaa"
      ]
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.observed_evidence_refs).toEqual(["alpha", "beta", "gamma", "zeta"]);
    expect(diff.source_artifact_refs).toEqual(["evidence:aaa", "evidence:zzz", "lock-5", "lock:lock-5", "plan-5", "plan:plan-5", "receipt-5", "receipt:receipt-5"]);
    expect(diff.evidence_state.required).toEqual(["alpha", "beta", "zeta"]);
    expect(diff.evidence_state.observed).toEqual(["alpha", "beta", "gamma", "zeta"]);
    expect(renderPlanActualDiffJson(diff)).toBe(renderPlanActualDiffJson(diff));
    expect(validatePlanActualDiff({})).toBe(false);
  });

  it("records unknown evidence conservatively", () => {
    const diff = buildPlanActualDiff({
      reconciliationId: "recon-unknown",
      plan: { plan_ref: "plan-unknown" },
      receipt: { receipt_ref: "receipt-unknown" },
      requiredEvidenceRefs: ["tests"],
      explicitUnknowns: ["stale source"],
      completionClaimed: false
    });

    expect(validatePlanActualDiff(diff)).toBe(true);
    expect(diff.overall_state).toBe("drifted");
    expect(diff.evidence_state.unknown).toEqual(["stale source"]);
    expect(diff.rule_codes).toContain("evidence.unknown");
  });
});
