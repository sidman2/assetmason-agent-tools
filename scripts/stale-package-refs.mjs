import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const searchRoots = [
  join(root, "package.json"),
  join(root, "package-lock.json"),
  join(root, "packages"),
  join(root, ".github", "workflows"),
  join(root, "tsconfig.json")
];
const stalePattern = /assetmason-resource-plan|packages\/assetmason-resource-plan/;
const ignorePattern = /(^|\/)(README[^/]*|CHANGELOG[^/]*|.*\.md|docs|history)(\/|$)/i;

function collectFiles(target, files) {
  const stats = statSync(target);
  if (stats.isFile()) {
    files.push(target);
    return;
  }
  if (!stats.isDirectory()) return;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    collectFiles(join(target, entry.name), files);
  }
}

const files = [];
for (const target of searchRoots) {
  try {
    collectFiles(target, files);
  } catch {
    continue;
  }
}

const matches = [];
for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  if (ignorePattern.test(normalized)) continue;
  const content = readFileSync(file, "utf8");
  if (stalePattern.test(content)) matches.push(file);
}

if (matches.length > 0) {
  process.stderr.write(`${matches.join("\n")}\n`);
  process.exit(1);
}
