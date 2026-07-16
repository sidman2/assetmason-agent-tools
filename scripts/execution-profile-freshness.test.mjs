import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("execution-profile freshness", () => {
  it("fails closed when the expected source SHA is not configured", () => {
    expect(() =>
      execFileSync("node", ["scripts/execution-profile-freshness.mjs"], {
        env: {
          ...process.env,
          ASSETMASON_PRIVATE_SOURCE_SHA: ""
        },
        encoding: "utf8"
      })
    ).toThrow(/set ASSETMASON_PRIVATE_SOURCE_SHA/i);
  });
});
