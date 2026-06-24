import { execFileSync } from "node:child_process";

const names = ["ard-kit", "ard-cli", "ai-catalog", "ard-check", "ard-scan", "ard-mcp", "agentic-resource-discovery"];
for (const name of names) {
  try {
    const output = execFileSync("npm", ["view", name, "name", "version", "--json"], { encoding: "utf8" });
    process.stdout.write(`### ${name}\n${output.trim()}\n`);
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";
    process.stdout.write(`### ${name}\n${(stdout || stderr || String(error)).trim()}\n`);
  }
}
