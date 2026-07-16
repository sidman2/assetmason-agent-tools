import { describe, expect, it } from "vitest";
import { buildExecutionProfile } from "../src/build.js";
import { buildExecutionProfileLock, executionProfileLockDigest } from "../src/lock.js";
import { diffExecutionProfile, diffExecutionProfileLock, renderExecutionProfileMarkdown, renderExecutionProfileLockMarkdown, renderExecutionProfileDiffMarkdown, renderOutcomeReceiptMarkdown } from "../src/index.js";
import { buildGenericHostExportArtifact } from "../src/hosts/generic.js";
import { validateExecutionProfile, validateExecutionProfileLock, validateExecutionProfileDiff, validateHostExport, validateOutcomeReceipt } from "../src/validate.js";

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
});
