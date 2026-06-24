import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateAiCatalog } from "ard-kit";

const version = "0.1.0-preview.0";

function isPrivateHost(url: URL): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

async function loadJson(target: string): Promise<{ value?: unknown; error?: string }> {
  if (!target) return { error: "Missing target" };
  if (/^https?:\/\//i.test(target)) {
    const url = new URL(target);
    if (isPrivateHost(url)) return { error: "Private or localhost URLs are not scanned unless explicitly local." };
    const res = await fetch(url);
    if (!res.ok) return { error: `Failed to fetch ${url.href}: ${res.status}` };
    return { value: await res.json() };
  }
  const path = target.startsWith("file://") ? fileURLToPath(target) : target;
  return { value: JSON.parse(await readFile(path, "utf8")) };
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const [command, target, ...rest] = argv;
  const json = rest.includes("--json");
  if (!command || command === "--help" || command === "-h") {
    if (json) return report({ name: "ard-cli", version, usage: "ard-cli check <path-or-url> | scan <url> | explain" }, true);
    console.log("ard-cli check <path-or-url>\nard-cli scan <url>\nard-cli explain");
    return 0;
  }
  if (command === "--version" || command === "-v") {
    console.log(json ? JSON.stringify({ name: "ard-cli", version }) : version);
    return 0;
  }
  if (command === "explain") {
    const result = {
      name: "ard-cli",
      version,
      description: "Preview ARD / AI Catalog helper.",
      capabilities: ["validates local or fetched catalog JSON", "reports readiness signals"],
      doesNotCertify: ["safety", "compliance", "ranking", "indexing", "invocation"]
    };
    console.log(json ? JSON.stringify(result) : "Preview ARD / AI Catalog helper. It validates local or fetched catalog JSON, reports readiness signals, and does not certify safety, compliance, ranking, indexing, or invocation.");
    return 0;
  }
  if (!target) {
    console.error("Missing target");
    return 1;
  }
  if (command === "check") {
    const loaded = await loadJson(target);
    if ("error" in loaded) return fail(loaded.error ?? "Unknown load error", json);
    const result = validateAiCatalog(loaded.value);
    return report(result, json);
  }
  if (command === "scan") {
    const url = new URL(target);
    if (isPrivateHost(url)) return fail("Private or localhost URLs are not scanned unless explicitly local.", json);
    const catalogUrl = new URL("/.well-known/ai-catalog.json", url).href;
    let found = null;
    try {
      const response = await fetch(catalogUrl);
      if (response.ok) found = await response.json();
    } catch {}
    const result = found ? validateAiCatalog(found) : { ok: true, errors: [], warnings: [{ level: "warning", code: "catalog.missing", message: "AI Catalog not found at well-known path", path: catalogUrl }], summary: { entriesCount: 0, checkedAt: new Date().toISOString(), profile: "assetmason-preview-ai-catalog" } };
    return report({ ...result, scan: { sourceUrl: url.href, catalogUrl, found: Boolean(found) } }, json);
  }
  console.error(`Unknown command: ${command}`);
  return 1;
}

function report(result: any, json: boolean) {
  if (json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  return result.ok === false ? 1 : 0;
}
function fail(message: string, json: boolean) {
  const result = { ok: false, errors: [{ level: "error", code: "cli.error", message }], warnings: [], summary: { entriesCount: 0, checkedAt: new Date().toISOString(), profile: "assetmason-preview-ai-catalog" } };
  return report(result, json);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
