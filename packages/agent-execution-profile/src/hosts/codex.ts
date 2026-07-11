import type { ExecutionProfile, HostExportArtifact } from "../types.js";
import { renderCodexHostExportMarkdown } from "../markdown.js";

export function buildCodexHostExportArtifact(profile: ExecutionProfile): HostExportArtifact {
  return {
    schema_version: "0.1.0",
    host: "codex",
    generated_at: profile.generated_at,
    profile_id: profile.profile_id,
    profile_digest: profile.profile_digest,
    format: "markdown",
    content: renderCodexHostExportMarkdown(profile),
    warnings: ["Advisory only."],
    runtime_advisory_only: true
  };
}
