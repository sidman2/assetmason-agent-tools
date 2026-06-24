import type { AiCatalogValidationIssue, AiCatalogValidationResult } from "./types.js";

const profile = "assetmason-preview-ai-catalog" as const;

function issue(level: "error" | "warning", code: string, message: string, path?: string): AiCatalogValidationIssue {
  return { level, code, message, path };
}

function hasEvidence(entry: Record<string, unknown>): boolean {
  return ["source", "provenance", "limitations"].some((key) => key in entry);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateAiCatalog(input: unknown): AiCatalogValidationResult {
  const errors: AiCatalogValidationIssue[] = [];
  const warnings: AiCatalogValidationIssue[] = [];
  const checkedAt = new Date().toISOString();
  let entriesCount = 0;

  if (!isObject(input)) {
    errors.push(issue("error", "root.not_object", "Root must be an object"));
    return { ok: false, errors, warnings, summary: { entriesCount, checkedAt, profile } };
  }

  if (typeof input.specVersion !== "string") errors.push(issue("error", "root.specVersion", "specVersion is required and must be a string", "specVersion"));
  if (!isObject(input.host)) {
    errors.push(issue("error", "root.host", "host is required and must be an object", "host"));
  } else {
    if (typeof input.host.displayName !== "string") errors.push(issue("error", "host.displayName", "host.displayName is required and must be a string", "host.displayName"));
    if (typeof input.host.documentationUrl !== "string") warnings.push(issue("warning", "host.documentationUrl", "host.documentationUrl is missing", "host.documentationUrl"));
  }
  if (!Array.isArray(input.entries)) {
    errors.push(issue("error", "root.entries", "entries is required and must be an array", "entries"));
  } else {
    entriesCount = input.entries.length;
    input.entries.forEach((entry: unknown, index: number) => {
      const base = `entries[${index}]`;
      if (!isObject(entry)) {
        errors.push(issue("error", "entry.not_object", "Entry must be an object", base));
        return;
      }
      if (typeof entry.identifier !== "string") errors.push(issue("error", "entry.identifier", "identifier is required and must be a string", `${base}.identifier`));
      if (typeof entry.displayName !== "string") errors.push(issue("error", "entry.displayName", "displayName is required and must be a string", `${base}.displayName`));
      if (typeof entry.type !== "string") errors.push(issue("error", "entry.type", "type is required and must be a string", `${base}.type`));
      if (typeof entry.description !== "string") warnings.push(issue("warning", "entry.description", "description is missing", `${base}.description`));
      const hasUrl = "url" in entry;
      const hasData = "data" in entry;
      if (!hasUrl && !hasData) errors.push(issue("error", "entry.payload", "Entry must include either url or data", base));
      if (hasUrl && hasData) errors.push(issue("error", "entry.payload_conflict", "Entry must not include both url and data", base));
      if (!Array.isArray(entry.representativeQueries)) {
        warnings.push(issue("warning", "entry.representativeQueries", "representativeQueries is missing", `${base}.representativeQueries`));
      } else if (entry.representativeQueries.length < 2 || entry.representativeQueries.length > 5) {
        warnings.push(issue("warning", "entry.representativeQueries_length", "representativeQueries should contain between 2 and 5 items", `${base}.representativeQueries`));
      }
      if (!hasEvidence(entry)) warnings.push(issue("warning", "entry.evidence", "No source/provenance/limitations metadata field was found", base));

      const unsupportedClaims = [
        ["certified", "entry.certified", "certified is not supported"],
        ["complianceCertified", "entry.complianceCertified", "complianceCertified is not supported"],
        ["safetyCertified", "entry.safetyCertified", "safetyCertified is not supported"],
        ["guaranteedIndexed", "entry.guaranteedIndexed", "guaranteedIndexed is not supported"],
        ["guaranteedCallable", "entry.guaranteedCallable", "guaranteedCallable is not supported"],
      ] as const;
      for (const [field, code, message] of unsupportedClaims) {
        if ((entry as Record<string, unknown>)[field] === true) errors.push(issue("error", code, message, `${base}.${field}`));
      }
      const evidencePresent = hasEvidence(entry);
      for (const field of ["mcpAvailable", "a2aAvailable", "oauthAvailable", "skillsAvailable"] as const) {
        if ((entry as Record<string, unknown>)[field] === true && !evidencePresent) {
          errors.push(issue("error", `entry.${field}`, `${field} requires source/provenance evidence`, `${base}.${field}`));
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings, summary: { entriesCount, checkedAt, profile } };
}

