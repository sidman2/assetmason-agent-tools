import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";

describe("ai-catalog", () => {
  it("prints explain output", async () => {
    expect(await main(["explain"])).toBe(0);
  });
});

