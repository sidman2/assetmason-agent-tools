import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const manifestPath = resolve(process.cwd(), "scripts", "execution-profile-source-manifest.json");

describe("execution-profile source manifest", () => {
  it("declares the parity input contract", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(manifest).toEqual({
      manifest_version: 1,
      parity_contract: "execution-profile-private-source-v1",
      private_source_root_env: "ASSETMASON_PRIVATE_SOURCE_ROOT",
      private_source_sha_env: "ASSETMASON_PRIVATE_SOURCE_SHA",
      parity_mode_env: "ASSETMASON_PARITY_MODE",
      default_parity_mode: "public"
    });
  });
});
