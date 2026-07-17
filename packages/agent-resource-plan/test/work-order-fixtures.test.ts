import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWorkOrder, renderWorkOrderJson, validateWorkOrder } from "../src/index.js";

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "work-order", name), "utf8"));
}

describe("work-order fixtures", () => {
  it("round-trips the canonical fixture", () => {
    const fixture = loadFixture("canonical.json");
    const workOrder = buildWorkOrder(fixture);
    expect(validateWorkOrder(workOrder).ok).toBe(true);
    const rendered = JSON.parse(renderWorkOrderJson(workOrder));
    const { spec_digest: _renderedDigest, ...renderedWithoutDigest } = rendered;
    const { spec_digest: _workOrderDigest, ...workOrderWithoutDigest } = workOrder;
    expect(renderedWithoutDigest).toEqual(workOrderWithoutDigest);
  });

  it("keeps the locked fixture digest-shaped", () => {
    const fixture = loadFixture("locked.json");
    const workOrder = buildWorkOrder(fixture);
    const result = validateWorkOrder(workOrder);
    expect(result.ok).toBe(true);
    expect(workOrder.spec_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.digest).toBe(workOrder.spec_digest);
  });

  it("rejects invalid fixture boundaries", () => {
    expect(validateWorkOrder(loadFixture("invalid-unknown-property.json")).ok).toBe(false);
    expect(validateWorkOrder(loadFixture("invalid-secret.json")).ok).toBe(false);
    expect(validateWorkOrder(loadFixture("invalid-conditional.json")).ok).toBe(false);
  });
});
