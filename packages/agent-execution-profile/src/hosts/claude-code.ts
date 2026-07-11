import type { ExecutionProfile, HostExportArtifact } from "../types.js";
import { renderClaudeCodeHostExportMarkdown } from "../markdown.js";

export function buildClaudeCodeHostExportArtifact(profile: ExecutionProfile): HostExportArtifact {
  return {
    schema_version: "0.1.0",
    host: "claude-code",
    generated_at: profile.generated_at,
    profile_id: profile.profile_id,
    profile_digest: profile.profile_digest,
    format: "markdown",
    content: renderClaudeCodeHostExportMarkdown(profile),
    warnings: ["Advisory only."],
    runtime_advisory_only: true
  };
}
