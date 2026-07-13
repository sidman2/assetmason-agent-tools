import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const root = readJson("package.json");
const resourcePlan = readJson("packages/agent-resource-plan/package.json");
const executionProfile = readJson("packages/agent-execution-profile/package.json");
const cli = readJson("packages/assetmason-cli/package.json");

const evidence = {
  git: {
    head: git(["rev-parse", "HEAD"]),
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    status: git(["status", "--short"]) || "clean"
  },
  verification: {
    public_script: root.scripts["verify:public"],
    generated_source_check: root.scripts["generated-source:check"],
    stale_check: root.scripts["stale:check"]
  },
  packages: {
    "agent-resource-plan": { version: resourcePlan.version, directory: resourcePlan.repository?.directory, publishTag: resourcePlan.publishConfig?.tag },
    "agent-execution-profile": { version: executionProfile.version, directory: executionProfile.repository?.directory, publishTag: executionProfile.publishConfig?.tag },
    "assetmason-cli": { version: cli.version, directory: cli.repository?.directory, publishTag: cli.publishConfig?.tag, dependencyNames: Object.keys(cli.dependencies ?? {}) }
  },
  workflows: {
    ci: ".github/workflows/ci.yml",
    publish: ".github/workflows/publish-assetmason-preview.yml"
  }
};

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
