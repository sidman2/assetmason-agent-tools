import { executionProfileSemanticDigest } from "./semantic.js";
import type { ExecutionProfileDiff, ExecutionProfileLock, OutcomeReceipt, PlanActualDiff } from "./types.js";

export function diffExecutionProfile(previousValue: unknown, currentValue: unknown): ExecutionProfileDiff {
  const previousDigest = previousValue ? executionProfileSemanticDigest(previousValue) : undefined;
  const currentDigest = currentValue ? executionProfileSemanticDigest(currentValue) : undefined;
  const drift_status = previousDigest === currentDigest ? "clean" : "changed";
  return {
    schema_version: "0.1.0",
    generated_at: new Date().toISOString(),
    previous_digest: previousDigest,
    current_digest: currentDigest,
    drift_status,
    changed_fields: drift_status === "clean" ? [] : ["semantic-digest-changed"],
    human_readable_reasons: drift_status === "clean" ? [] : ["Semantic digest changed."],
    runtime_advisory_only: true
  };
}

export function diffExecutionProfileLock(previousLock: ExecutionProfileLock, currentLock: ExecutionProfileLock) {
  return diffExecutionProfile(previousLock, currentLock);
}

function sortAndDedupe(values: string[]) {
  return [...new Set(values)].sort();
}

function truthyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function refFrom(prefix: string, value: string | undefined, digest: string | undefined) {
  if (value) return value;
  if (digest) return `${prefix}:${digest}`;
  return undefined;
}

function objectString(value: unknown, key: string) {
  if (!value || typeof value !== "object") return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export type BuildPlanActualDiffInput = {
  plan: unknown;
  lock?: unknown;
  receipt?: unknown;
  reconciliationId: string;
  generatedAt?: string;
  declaredAcceptanceItems?: string[];
  observedEvidenceRefs?: string[];
  missingEvidence?: string[];
  contradictedEvidence?: string[];
  explicitUnknowns?: string[];
  resourceDrift?: string[];
  scopeOrDigestDrift?: string[];
  completionClaimState?: PlanActualDiff["completion_claim_state"];
  sourceArtifactRefs?: string[];
};

export function buildPlanActualDiff(input: BuildPlanActualDiffInput): PlanActualDiff {
  const planDigest = executionProfileSemanticDigest(input.plan);
  const lockDigest = input.lock ? executionProfileSemanticDigest(input.lock) : undefined;
  const receiptDigest = input.receipt ? executionProfileSemanticDigest(input.receipt) : undefined;
  const completionClaimState = input.completionClaimState ?? "unknown";
  const declaredAcceptanceItems = sortAndDedupe(input.declaredAcceptanceItems ?? []);
  const observedEvidenceRefs = sortAndDedupe(input.observedEvidenceRefs ?? []);
  const missingEvidence = sortAndDedupe(input.missingEvidence ?? []);
  const contradictedEvidence = sortAndDedupe(input.contradictedEvidence ?? []);
  const explicitUnknowns = sortAndDedupe(input.explicitUnknowns ?? []);
  const resourceDrift = sortAndDedupe(input.resourceDrift ?? []);
  const scopeOrDigestDrift = sortAndDedupe(input.scopeOrDigestDrift ?? []);
  const sourceArtifactRefs = sortAndDedupe(
    [
      ...(input.sourceArtifactRefs ?? []),
      refFrom("plan", objectString(input.plan, "plan_ref"), planDigest),
      refFrom("lock", objectString(input.lock, "lock_ref"), lockDigest),
      refFrom("receipt", objectString(input.receipt, "receipt_ref"), receiptDigest)
    ].filter(truthyString)
  );
  const overall_state: PlanActualDiff["overall_state"] =
    contradictedEvidence.length > 0 || resourceDrift.length > 0 || scopeOrDigestDrift.length > 0 ? "drifted"
      : missingEvidence.length > 0 ? "drifted"
      : explicitUnknowns.length > 0 ? "unknown"
      : "matched";

  return {
    schema_version: "0.1.0",
    reconciliation_id: input.reconciliationId,
    generated_at: input.generatedAt,
    plan_ref: objectString(input.plan, "plan_ref"),
    plan_digest: planDigest,
    lock_ref: objectString(input.lock, "lock_ref"),
    lock_digest: lockDigest,
    receipt_ref: objectString(input.receipt, "receipt_ref"),
    receipt_digest: receiptDigest,
    overall_state,
    declared_acceptance_items: declaredAcceptanceItems,
    observed_evidence_refs: observedEvidenceRefs,
    missing_evidence: missingEvidence,
    contradicted_evidence: contradictedEvidence,
    explicit_unknowns: explicitUnknowns,
    resource_drift: resourceDrift,
    scope_or_digest_drift: scopeOrDigestDrift,
    completion_claim_state: completionClaimState,
    source_artifact_refs: sourceArtifactRefs
  };
}
