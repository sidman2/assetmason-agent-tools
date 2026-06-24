export const validBasicAiCatalog = {
  specVersion: "preview-1",
  host: { displayName: "Example AssetMason Site", documentationUrl: "https://example.com/docs" },
  entries: [
    { identifier: "site-home", displayName: "Site Home", type: "page", url: "https://example.com/", representativeQueries: ["homepage", "what is this site"], description: "Public homepage", source: "public homepage", limitations: "Only public content." },
    { identifier: "docs-index", displayName: "Docs Index", type: "document", data: { title: "Docs", summary: "Public documentation index" }, representativeQueries: ["docs", "how do I use this"], description: "Documentation index", provenance: "Public docs index", limitations: "Draft preview only." }
  ]
} as const;

export const invalidMissingHostAiCatalog = { specVersion: "preview-1", entries: [] } as const;
export const invalidUrlAndDataAiCatalog = {
  specVersion: "preview-1",
  host: { displayName: "Example", documentationUrl: "https://example.com/docs" },
  entries: [{ identifier: "bad", displayName: "Bad", type: "page", url: "https://example.com", data: {}, representativeQueries: ["one", "two"], source: "docs" }]
} as const;
export const invalidUnsupportedCertificationAiCatalog = {
  specVersion: "preview-1",
  host: { displayName: "Example", documentationUrl: "https://example.com/docs" },
  entries: [{ identifier: "bad", displayName: "Bad", type: "page", url: "https://example.com", representativeQueries: ["one", "two"], source: "docs", certified: true }]
} as const;
export const invalidUnsupportedProtocolClaimAiCatalog = {
  specVersion: "preview-1",
  host: { displayName: "Example", documentationUrl: "https://example.com/docs" },
  entries: [{ identifier: "bad", displayName: "Bad", type: "page", url: "https://example.com", representativeQueries: ["one", "two"], mcpAvailable: true }]
} as const;
