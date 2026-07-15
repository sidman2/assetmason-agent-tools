import { describe, expect, it } from "vitest";
import { checkExactVersion } from "./release-version-guard.mjs";

const response = (status, body = "") => ({
  status,
  text: async () => body
});

describe("release-version-guard", () => {
  it("detects absent versions as unpublished", async () => {
    const result = await checkExactVersion("agent-resource-plan@0.1.0-preview.1", {
      fetchImpl: async () => response(404, "{}")
    });

    expect(result).toEqual({
      ok: true,
      label: "PACKAGE_EXISTS_VERSION_ABSENT",
      message: expect.stringContaining("agent-resource-plan@0.1.0-preview.1")
    });
  });

  it("detects existing versions as published", async () => {
    const result = await checkExactVersion("agent-resource-plan@0.1.0-preview.0", {
      fetchImpl: async () => response(200, '{"name":"agent-resource-plan"}')
    });

    expect(result.ok).toBe(false);
    expect(result.label).toBe("VERSION_ALREADY_EXISTS");
  });

  it("fails closed on network errors", async () => {
    const result = await checkExactVersion("agent-resource-plan@0.1.0-preview.1", {
      fetchImpl: async () => {
        throw new Error("network down");
      }
    });

    expect(result.ok).toBe(false);
    expect(result.label).toBe("REGISTRY_UNREACHABLE");
  });

  it("fails closed on malformed registry responses", async () => {
    const result = await checkExactVersion("agent-resource-plan@0.1.0-preview.1", {
      fetchImpl: async () => ({
        status: 500,
        text: async () => {
          throw new Error("bad body");
        }
      })
    });

    expect(result.ok).toBe(false);
    expect(result.label).toBe("MALFORMED_RESPONSE");
  });
});
