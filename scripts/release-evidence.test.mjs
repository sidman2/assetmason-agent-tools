import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function runScript() {
  return JSON.parse(execFileSync("node", ["scripts/release-evidence.mjs"], { encoding: "utf8" }));
}

describe("release-evidence", () => {
  it("reports the current public verification surface without mutation", () => {
    const evidence = runScript();

    expect(evidence.git.head).toMatch(/^[a-f0-9]{40}$/);
    expect(typeof evidence.git.branch).toBe("string");
    expect(evidence.verification.public_script).toContain("generated-source:check");
    expect(evidence.verification.public_script).toContain("stale:check");
    expect(evidence.packages["agent-resource-plan"].version).toBe("0.1.0-preview.3");
    expect(evidence.packages["agent-execution-profile"].version).toBe("0.1.0-preview.3");
    expect(evidence.packages["assetmason-cli"].version).toBe("0.1.0-preview.3");
    expect(evidence.packages["assetmason-cli"].publishTag).toBe("preview");
    expect(evidence.workflows.ci).toBe(".github/workflows/ci.yml");
    expect(evidence.workflows.publish).toBe(".github/workflows/publish-assetmason-preview.yml");
  });
});
