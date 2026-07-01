import { writeFile } from "node:fs/promises";
import { validateAiCatalog } from "ard-kit";

const version = "0.1.0-preview.0";

function hostnameFrom(url: string): string { return new URL(url).hostname; }
function isJsonFlag(args: string[]): boolean { return args.includes("--json"); }

async function loadCatalog(target: string): Promise<{ value: unknown }> {
  if (/^https?:\/\//i.test(target)) return { value: await (await fetch(target)).json() };
  return { value: JSON.parse(await (await import("node:fs/promises")).readFile(target, "utf8")) };
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const json = isJsonFlag(rest);
  if (!command || command === "--help") {
    if (json) return out({ name: "ai-discovery", version, usage: "ai-discovery validate <path-or-url> | explain | generate --url <url> --out <path>" }, true);
    console.log("ai-discovery validate <path-or-url>\nai-discovery explain\nai-discovery generate --url <url> --out <path>");
    return 0;
  }
  if (command === "--version") {
    if (json) return out({ name: "ai-discovery", version }, true);
    console.log(version);
    return 0;
  }
  if (command === "explain") return out({ name: "ai-discovery", version, what: "Preview ai-catalog.json validator and generator.", checks: ["structure", "limited readiness signals"], doesNotCertify: ["safety", "compliance", "ranking", "indexing", "invocation"] }, json);
  if (command === "validate") {
    const target = rest.find((arg) => !arg.startsWith("--")) ?? "";
    const loaded = await loadCatalog(target);
    return out(validateAiCatalog(loaded.value), json);
  }
  if (command === "generate") {
    const url = rest[rest.indexOf("--url") + 1] ?? "";
    const outPath = rest[rest.indexOf("--out") + 1] ?? "";
    const draft = { specVersion: "preview-1", host: { displayName: hostnameFrom(url) }, entries: [{ identifier: "public-site-resource", displayName: "Public site resource", type: "page", url, representativeQueries: ["site", "docs"], limitations: "Draft generated from URL only; no unsupported capabilities inferred." }] };
    await writeFile(outPath, JSON.stringify(draft, null, 2), "utf8");
    return out({ ok: true, out: outPath }, json);
  }
  return out({ ok: false, error: `Unknown command: ${command}` }, json, 1);
}

function out(value: any, json: boolean, exitCode = value?.ok === false ? 1 : 0) {
  console.log(json ? JSON.stringify(value) : JSON.stringify(value, null, 2));
  return exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) main().then((code) => process.exit(code));
