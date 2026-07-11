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

  it("prints select output", async () => {
    expect((await runCommand(["select", "--format", "markdown"])).text).toContain("minimum-approved-resource-set");
  });

  it("prints profile output", async () => {
    expect((await runCommand(["profile", "--format", "markdown"])).text).toContain("Agent Execution Profile");
  });

  it("prints export output", async () => {
    expect((await runCommand(["export", "--format", "markdown"])).text).toContain("Generated Agent Execution Profile Export");
  });

  it("rejects unknown commands", () => {
    return runCommand(["nope"]).then((result) => {
      expect(result.code).toBe(1);
    });
  });

  it("renders markdown output", async () => {
    expect((await runCommand(["plan", "--format", "markdown"])).text).toContain("# resource-plan");
  });
});
