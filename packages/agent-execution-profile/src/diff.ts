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
  requiredEvidenceRefs?: string[];
  declaredAcceptanceItems?: string[];
  observedEvidenceRefs?: string[];
  missingEvidence?: string[];
  contradictedEvidence?: string[];
  explicitUnknowns?: string[];
  completionClaimed?: boolean;
  resourceDrift?: string[];
  scopeOrDigestDrift?: string[];
  completionClaimState?: PlanActualDiff["completion_claim_state"];
  sourceArtifactRefs?: string[];
};

export function buildPlanActualDiff(input: BuildPlanActualDiffInput): PlanActualDiff {
  const planDigest = executionProfileSemanticDigest(input.plan);
  const lockDigest = input.lock ? executionProfileSemanticDigest(input.lock) : undefined;
  const receiptDigest = input.receipt ? executionProfileSemanticDigest(input.receipt) : undefined;
  const requiredEvidenceRefs = sortAndDedupe(input.requiredEvidenceRefs ?? []);
  const declaredAcceptanceItems = sortAndDedupe(input.declaredAcceptanceItems ?? []);
  const observedEvidenceRefs = sortAndDedupe([
    ...(input.observedEvidenceRefs ?? []),
    ...(input.receipt && typeof input.receipt === "object" && Array.isArray((input.receipt as Record<string, unknown>).observed_evidence_refs)
      ? ((input.receipt as Record<string, unknown>).observed_evidence_refs as string[])
      : [])
  ]);
  const missingEvidence = sortAndDedupe([
    ...(input.missingEvidence ?? []),
    ...requiredEvidenceRefs.filter((ref) => !observedEvidenceRefs.includes(ref))
  ]);
  const contradictedEvidence = sortAndDedupe([
    ...(input.contradictedEvidence ?? []),
    ...(input.receipt && typeof input.receipt === "object" && Array.isArray((input.receipt as Record<string, unknown>).contradicted_evidence_refs)
      ? ((input.receipt as Record<string, unknown>).contradicted_evidence_refs as string[])
      : [])
  ]);
  const explicitUnknowns = sortAndDedupe(input.explicitUnknowns ?? []);
  const resourceDrift = sortAndDedupe(input.resourceDrift ?? []);
  const scopeOrDigestDrift = sortAndDedupe(input.scopeOrDigestDrift ?? []);
  const rule_codes: string[] = [];
  const rule_explanations: string[] = [];
  const sourceArtifactRefs = sortAndDedupe(
    [
      ...(input.sourceArtifactRefs ?? []),
      refFrom("plan", objectString(input.plan, "plan_ref"), planDigest),
      refFrom("lock", objectString(input.lock, "lock_ref"), lockDigest),
      refFrom("receipt", objectString(input.receipt, "receipt_ref"), receiptDigest)
    ].filter(truthyString)
  );
  if (!input.receipt) {
    rule_codes.push("receipt.missing");
    rule_explanations.push("Outcome receipt is absent.");
  }
  if (input.lock && input.plan && typeof input.lock === "object" && typeof input.plan === "object") {
    const planRef = objectString(input.plan, "plan_ref");
    const lockPlanRef = objectString(input.lock, "plan_ref") ?? objectString(input.lock, "resourcePlanDigest");
    if (planRef && lockPlanRef && planRef !== lockPlanRef) {
      rule_codes.push("lock.plan.mismatch");
      rule_explanations.push("Plan and lock references do not match.");
    }
    const planLockDigest = objectString(input.plan, "digest") ?? objectString(input.plan, "plan_digest") ?? planDigest;
    const lockDigestRef = objectString(input.lock, "resourcePlanDigest") ?? objectString(input.lock, "planDigest");
    if (planLockDigest && lockDigestRef && planLockDigest !== lockDigestRef) {
      rule_codes.push("digest.mismatch");
      rule_explanations.push("Plan and lock digests do not match.");
    }
  }
  if (input.completionClaimed === true && missingEvidence.length > 0) {
    rule_codes.push("completion.claimed-without-evidence");
    rule_explanations.push("Completion is claimed without all required evidence.");
  }
  if (contradictedEvidence.length > 0) {
    rule_codes.push("evidence.contradicted");
    rule_explanations.push("Contradicted evidence was observed.");
  }
  if (missingEvidence.length > 0) {
    rule_codes.push("evidence.missing");
    rule_explanations.push("Required evidence is missing.");
  }
  if (resourceDrift.length > 0) {
    rule_codes.push("resource.drift");
    rule_explanations.push("Locked resource drift was detected.");
  }
  if (scopeOrDigestDrift.length > 0) {
    rule_codes.push("scope.digest.drift");
    rule_explanations.push("Scope or digest drift was detected.");
  }
  if (explicitUnknowns.length > 0) {
    rule_codes.push("evidence.unknown");
    rule_explanations.push("One or more inputs remain unknown.");
  }
  const overall_state: PlanActualDiff["overall_state"] =
    rule_codes.some((code) => code !== "receipt.missing" && code !== "evidence.unknown")
      ? "drifted"
      : rule_codes.includes("receipt.missing") || rule_codes.includes("evidence.unknown")
        ? "unknown"
        : "matched";
  const completionClaimState = input.completionClaimState ?? (input.completionClaimed === true ? "claimed" : missingEvidence.length > 0 ? "unknown" : "unclaimed");

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
    rule_codes: sortAndDedupe(rule_codes),
    rule_explanations: sortAndDedupe(rule_explanations),
    source_artifact_refs: sourceArtifactRefs
  };
}
