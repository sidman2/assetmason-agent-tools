import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";
import { runCommand } from "../src/commands.js";

describe("assetmason-cli", () => {
  it("prints help", async () => {
    expect(await main(["--help"])).toBe(0);
  });

  it("prints list scenarios", async () => {
    expect(await main(["list-scenarios"])).toBe(0);
  });

  it("rejects unknown commands", () => {
    expect(runCommand(["nope"]).code).toBe(1);
  });

  it("renders markdown output", () => {
    expect(runCommand(["plan", "--format", "markdown"]).text).toContain("# resource-plan");
  });
});
