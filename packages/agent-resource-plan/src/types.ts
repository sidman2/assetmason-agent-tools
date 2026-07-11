export type CanonicalJsonValue = null | boolean | number | string | CanonicalJsonValue[] | { [key: string]: CanonicalJsonValue };

export type ResourceSourceReference = {
  kind: "public" | "local" | "fixture";
  label: string;
  href?: string;
};

export type ResourceValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string;
};

export type ResourceCheckPacket = {
  kind: "resource-check";
  scenario: string;
  advisoryOnly: true;
  state: "unknown" | "clean" | "changed";
  sources: ResourceSourceReference[];
};

export type ResourceSelectionPolicyEnvelope = {
  kind: "selection-policy";
  scenario: string;
  advisoryOnly: true;
  unknownMeans: "insufficient-evidence";
  allowedKinds: string[];
};

export type ResourcePlan = {
  kind: "resource-plan";
  scenario: string;
  advisoryOnly: true;
  resourceCheck: ResourceCheckPacket;
  selectionPolicy: ResourceSelectionPolicyEnvelope;
  proposedActions: string[];
  sources: ResourceSourceReference[];
  digest: string;
};

export type ResourceLock = {
  kind: "resource-lock";
  scenario: string;
  advisoryOnly: true;
  planDigest: string;
  inventoryDigest: string;
  resourcePlanDigest: string;
  resources: string[];
  sources: ResourceSourceReference[];
  digest: string;
};

export type ResourceDiffState = "clean" | "changed" | "unknown";

export type ResourceDiff = {
  kind: "resource-diff";
  advisoryOnly: true;
  state: ResourceDiffState;
  beforeDigest: string;
  afterDigest: string;
  changes: string[];
  warnings: ResourceValidationIssue[];
  digest: string;
};

export type ResourceInventory = {
  kind: "resource-inventory";
  root: string;
  files: Array<{ path: string; size: number; kind: "file" | "directory" | "symlink"; redactedSecrets?: string[] }>;
  warnings: ResourceValidationIssue[];
  digest: string;
};

export type ResourceArtifactValidationResult = {
  ok: boolean;
  kind?: string;
  errors: ResourceValidationIssue[];
  warnings: ResourceValidationIssue[];
  digest?: string;
};
