import { executionProfileSemanticDigest } from "./semantic.js";
export function diffExecutionProfile(previousValue, currentValue) {
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
export function diffExecutionProfileLock(previousLock, currentLock) {
    return diffExecutionProfile(previousLock, currentLock);
}
