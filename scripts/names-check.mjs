import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const npmCli = process.env.npm_execpath ?? "";
const root = readJson("package.json");

const workspacePackageNames = [];
for (const entry of readdirSync("packages", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packageJsonPath = join("packages", entry.name, "package.json");
  try {
    const manifest = readJson(packageJsonPath);
    if (typeof manifest.name === "string") workspacePackageNames.push(manifest.name);
  } catch {
    // Skip unreadable or missing package manifests; this is a discovery check, not a hard failure for ignored paths.
  }
}

const names = [...new Set(workspacePackageNames)].sort();

for (const name of names) {
  try {
    const output = execFileSync(process.execPath, [npmCli, "view", name, "name", "version", "--json"], { encoding: "utf8" });
    process.stdout.write(`### ${name}\n${output.trim()}\n`);
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";
    process.stdout.write(`### ${name}\n${(stdout || stderr || String(error)).trim()}\n`);
  }
}
