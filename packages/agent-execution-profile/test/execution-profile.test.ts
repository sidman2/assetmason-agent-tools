import { describe, expect, it } from "vitest";
import { buildExecutionProfile } from "../src/build.js";
import { buildExecutionProfileLock, executionProfileLockDigest } from "../src/lock.js";
import { buildPlanActualDiff, diffExecutionProfile, diffExecutionProfileLock, renderExecutionProfileMarkdown, renderExecutionProfileLockMarkdown, renderExecutionProfileDiffMarkdown, renderOutcomeReceiptMarkdown, renderPlanActualDiffMarkdown } from "../src/index.js";
import { buildGenericHostExportArtifact } from "../src/hosts/generic.js";
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
      renderOutcomeReceiptMarkdown({
        schema_version: "0.1.0",
        receipt_id: "receipt-1",
        profile_id: profile.profile_id,
        profile_digest: profile.profile_digest,
        resolved_roles: ["implementer"],
        verification_results: [{ gate: "tests_pass", passed: true }],
        warnings: [],
        unknowns: [],
        local_only: true
      })
    ).toContain("Outcome Receipt");
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
});
