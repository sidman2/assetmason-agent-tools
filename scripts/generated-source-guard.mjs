import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const watchedDirs = [
  join(root, "packages", "agent-execution-profile", "src"),
  join(root, "packages", "agent-resource-plan", "src")
];

function walk(dir, matches) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, matches);
    } else if (entry.isFile() && fullPath.endsWith(".js")) {
      matches.push(fullPath);
    }
  }
}

const matches = [];
for (const dir of watchedDirs) {
  try {
    if (statSync(dir).isDirectory()) walk(dir, matches);
  } catch {
    continue;
  }
}

if (matches.length > 0) {
  process.stderr.write(`${matches.join("\n")}\n`);
  process.exit(1);
}
