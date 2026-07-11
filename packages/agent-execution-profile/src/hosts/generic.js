import { renderGenericHostExportMarkdown } from "../markdown.js";
export function buildGenericHostExportArtifact(profile) {
    return {
        schema_version: "0.1.0",
        host: "generic",
        generated_at: profile.generated_at,
        profile_id: profile.profile_id,
        profile_digest: profile.profile_digest,
        format: "markdown",
        content: renderGenericHostExportMarkdown(profile),
        warnings: ["Advisory only."],
        runtime_advisory_only: true
    };
}
export function renderGenericHostExport(profile) {
    return buildGenericHostExportArtifact(profile).content;
}
