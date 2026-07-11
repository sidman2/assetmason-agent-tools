import { createHash } from "node:crypto";
export function canonicalize(value) {
    if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string")
        return value;
    if (Array.isArray(value))
        return value.map(canonicalize);
    if (typeof value === "object") {
        const entries = Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, canonicalize(v)])
            .sort(([a], [b]) => a.localeCompare(b));
        return Object.fromEntries(entries);
    }
    return null;
}
export function sha256Canonical(value) {
    return createHash("sha256").update(JSON.stringify(canonicalize(value)), "utf8").digest("hex");
}
export function sortAndDedupe(values) {
    return [...new Set(values)].sort();
}
