import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";

describe("ard-cli", () => {
  it("prints help", async () => {
    expect(await main(["--help"])).toBe(0);
  });
});

