export type AiCatalogValidationLevel = "error" | "warning";

export interface AiCatalogValidationIssue {
  level: AiCatalogValidationLevel;
  code: string;
  message: string;
  path?: string;
}

export interface AiCatalogValidationResult {
  ok: boolean;
  errors: AiCatalogValidationIssue[];
  warnings: AiCatalogValidationIssue[];
  summary: {
    entriesCount: number;
    checkedAt: string;
    profile: "assetmason-preview-ai-catalog";
  };
}

