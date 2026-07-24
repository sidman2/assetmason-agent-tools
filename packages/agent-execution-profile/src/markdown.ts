import { canonicalize } from "./stable-json.js";
import type { ExecutionProfile, ExecutionProfileDiff, ExecutionProfileLock, OutcomeReceipt, PlanActualDiff } from "./types.js";

function lines(title: string, body: string[]) {
  return [`# ${title}`, "", ...body].join("\n") + "\n";
}

export function renderExecutionProfileMarkdown(profile: ExecutionProfile) {
  return lines("Agent Execution Profile", [
    `- profile_id: ${profile.profile_id}`,
    `- task_or_intent: ${profile.task_or_intent}`,
    `- task_class: ${profile.task_class}`,
    `- host_context: ${profile.host_context}`,
    `- roles: ${profile.roles.map((role) => role.role_id).join(", ")}`
  ]);
}

export function renderExecutionProfileLockMarkdown(lock: ExecutionProfileLock) {
  return lines("Agent Execution Profile Lock", [`- profile_id: ${lock.profile_id}`, `- profile_digest: ${lock.profile_digest}`]);
}

export function renderExecutionProfileDiffMarkdown(diff: ExecutionProfileDiff) {
  return lines("Agent Execution Profile Diff", [`- drift_status: ${diff.drift_status}`, `- changed_fields: ${diff.changed_fields.join(", ") || "none"}`]);
}

export function renderGenericHostExportMarkdown(profile: ExecutionProfile) {
  return lines("Generated Agent Execution Profile Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`, `Class: ${profile.task_class}`]);
}

export function renderCodexHostExportMarkdown(profile: ExecutionProfile) {
  return lines("Codex Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`]);
}

export function renderClaudeCodeHostExportMarkdown(profile: ExecutionProfile) {
  return lines("Claude Code Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`]);
}

export function renderOutcomeReceiptMarkdown(receipt: OutcomeReceipt) {
  return lines("Outcome Receipt", [`- receipt_id: ${receipt.receipt_id}`, `- resolved_roles: ${receipt.resolved_roles.join(", ")}`]);
}

export function renderPlanActualDiffMarkdown(diff: PlanActualDiff) {
  return lines("Plan Actual Diff", [
    `- reconciliation_id: ${diff.reconciliation_id}`,
    `- overall_state: ${diff.overall_state}`,
    `- completion_claim_state: ${diff.completion_claim_state}`,
    `- declared_acceptance_items: ${diff.declared_acceptance_items.join(", ") || "none"}`,
    `- observed_evidence_refs: ${diff.observed_evidence_refs.join(", ") || "none"}`,
    `- missing_evidence: ${diff.missing_evidence.join(", ") || "none"}`,
    `- contradicted_evidence: ${diff.contradicted_evidence.join(", ") || "none"}`,
    `- explicit_unknowns: ${diff.explicit_unknowns.join(", ") || "none"}`,
    `- resource_drift: ${diff.resource_drift.join(", ") || "none"}`,
    `- scope_or_digest_drift: ${diff.scope_or_digest_drift.join(", ") || "none"}`,
    `- rule_codes: ${diff.rule_codes.join(", ") || "none"}`,
    `- rule_explanations: ${diff.rule_explanations.join(", ") || "none"}`
  ]);
}

export function renderPlanActualDiffJson(diff: PlanActualDiff) {
  return JSON.stringify(canonicalize(diff), null, 2) + "\n";
}
