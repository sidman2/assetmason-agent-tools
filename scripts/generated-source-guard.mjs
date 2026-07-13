import { execFileSync } from "node:child_process";

const targets = [
  "packages/agent-execution-profile/src/**/*.js",
  "packages/agent-resource-plan/src/**/*.js"
];

const args = [
  "rg",
  "-n",
  targets.join("|"),
  ".",
  "-g",
  "!**/dist/**",
  "-g",
  "!**/node_modules/**",
  "-g",
  "!**/*.md",
  "-g",
  "!**/README*"
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
