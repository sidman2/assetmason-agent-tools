import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("agent-resource-plan package surface", () => {
  it("exposes the work-order schema export and includes it in the packed tarball", () => {
    const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")) as {
      exports?: Record<string, string | Record<string, string>>;
      files?: string[];
    };

    expect(packageJson.exports?.["./work-order.schema.json"]).toBe("./work-order.schema.json");
    expect(packageJson.files).toContain("work-order.schema.json");

    const packJson = execSync("npm pack --dry-run --json", {
      cwd: join(import.meta.dirname, ".."),
      encoding: "utf8"
    });
    const packData = JSON.parse(packJson) as Array<{ files?: Array<{ path?: string }> }>;
    const packedFiles = (packData[0]?.files ?? []).map((file) => file.path);
    expect(packedFiles).toContain("work-order.schema.json");
  });
});
