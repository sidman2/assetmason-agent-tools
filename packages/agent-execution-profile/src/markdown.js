function lines(title, body) {
    return [`# ${title}`, "", ...body].join("\n") + "\n";
}
export function renderExecutionProfileMarkdown(profile) {
    return lines("Agent Execution Profile", [
        `- profile_id: ${profile.profile_id}`,
        `- task_or_intent: ${profile.task_or_intent}`,
        `- task_class: ${profile.task_class}`,
        `- host_context: ${profile.host_context}`,
        `- roles: ${profile.roles.map((role) => role.role_id).join(", ")}`
    ]);
}
export function renderExecutionProfileLockMarkdown(lock) {
    return lines("Agent Execution Profile Lock", [`- profile_id: ${lock.profile_id}`, `- profile_digest: ${lock.profile_digest}`]);
}
export function renderExecutionProfileDiffMarkdown(diff) {
    return lines("Agent Execution Profile Diff", [`- drift_status: ${diff.drift_status}`, `- changed_fields: ${diff.changed_fields.join(", ") || "none"}`]);
}
export function renderGenericHostExportMarkdown(profile) {
    return lines("Generated Agent Execution Profile Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`, `Class: ${profile.task_class}`]);
}
export function renderCodexHostExportMarkdown(profile) {
    return lines("Codex Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`]);
}
export function renderClaudeCodeHostExportMarkdown(profile) {
    return lines("Claude Code Export", [`Advisory only.`, `Task: ${profile.task_or_intent}`]);
}
export function renderOutcomeReceiptMarkdown(receipt) {
    return lines("Outcome Receipt", [`- receipt_id: ${receipt.receipt_id}`, `- resolved_roles: ${receipt.resolved_roles.join(", ")}`]);
}
