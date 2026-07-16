import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const reportPath = resolve(process.cwd(), "tmp", "agent-runs", "execution-profile-parity", "parity-report.json");

describe("execution-profile parity", () => {
  it("writes a public-mode report into ignored run-state", () => {
    execFileSync("node", ["scripts/execution-profile-parity.mjs"], {
      env: {
        ...process.env,
        ASSETMASON_PRIVATE_SOURCE_ROOT: "",
        ASSETMASON_PRIVATE_SOURCE_SHA: "",
        ASSETMASON_PARITY_MODE: "public"
      },
      encoding: "utf8"
    });

    const report = JSON.parse(readFileSync(reportPath, "utf8"));

    expect(report.private_parity).toEqual({
      run: false,
      reason: "private parity skipped because ASSETMASON_PRIVATE_SOURCE_ROOT and ASSETMASON_PRIVATE_SOURCE_SHA are not set"
    });
    expect(report.scenarios).toHaveLength(3);
  });
});
