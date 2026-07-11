import { execFileSync } from "node:child_process";

const names = ["ard-kit", "ard-cli", "ai-discovery", "ard-check", "ard-scan", "ard-mcp", "agentic-resource-discovery", "agent-resource-plan", "agent-execution-profile", "agent-resource-contracts", "agent-resource-manifest", "agent-resource-kit", "agent-resource-planning", "agent-resource-planner"];
const npmCli = process.env.npm_execpath ?? "";
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
