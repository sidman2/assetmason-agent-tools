import { describe, expect, it } from "vitest";
import { validBasicAiCatalog, invalidMissingHostAiCatalog, invalidUrlAndDataAiCatalog, invalidUnsupportedCertificationAiCatalog, invalidUnsupportedProtocolClaimAiCatalog } from "../src/fixtures.js";
import { validateAiCatalog } from "../src/index.js";

describe("validateAiCatalog", () => {
  it("passes the valid fixture", () => {
    const result = validateAiCatalog(validBasicAiCatalog);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.profile).toBe("assetmason-preview-ai-catalog");
  });

  it("fails missing host", () => {
    const result = validateAiCatalog(invalidMissingHostAiCatalog);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === "root.host")).toBe(true);
  });

  it("fails url and data together", () => {
    const result = validateAiCatalog(invalidUrlAndDataAiCatalog);
    expect(result.errors.some((issue) => issue.code === "entry.payload_conflict")).toBe(true);
  });

  it("fails unsupported certification", () => {
    const result = validateAiCatalog(invalidUnsupportedCertificationAiCatalog);
    expect(result.errors.some((issue) => issue.code === "entry.certified")).toBe(true);
  });

  it("fails unsupported protocol claim", () => {
    const result = validateAiCatalog(invalidUnsupportedProtocolClaimAiCatalog);
    expect(result.errors.some((issue) => issue.code === "entry.mcpAvailable")).toBe(true);
  });

  it("warns on representative query count", () => {
    const result = validateAiCatalog({
      specVersion: "preview-1",
      host: { displayName: "Example", documentationUrl: "https://example.com/docs" },
      entries: [{ identifier: "one", displayName: "One", type: "page", url: "https://example.com", representativeQueries: ["q1"], source: "docs" }]
    });
    expect(result.warnings.some((issue) => issue.code === "entry.representativeQueries_length")).toBe(true);
  });

  it("is JSON serializable and stable", () => {
    const result = validateAiCatalog(validBasicAiCatalog);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

