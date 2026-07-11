import { execFileSync } from "node:child_process";

const patterns = ["assetmason-resource-plan", "packages/assetmason-resource-plan"];
const args = [
  "rg",
  "-n",
  patterns.join("|"),
  "package.json",
  "package-lock.json",
  "packages",
  ".github/workflows",
  "tsconfig.json",
  "-g",
  "!**/*.md",
  "-g",
  "!**/README*",
  "-g",
  "!**/docs/**",
  "-g",
  "!**/CHANGELOG*",
  "-g",
  "!**/history/**"
];

try {
  const output = execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  if (output) {
    process.stderr.write(`${output}\n`);
    process.exit(1);
  }
} catch (error) {
  if (error?.status === 1) {
    process.exit(0);
  }
  throw error;
}
