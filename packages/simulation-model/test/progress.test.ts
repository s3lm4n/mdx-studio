import { describe, expect, it } from "vitest";
import { estimateEtaSeconds, progressFraction } from "../src";

describe("progress helpers", () => {
  it("computes the fraction and clamps it", () => {
    expect(progressFraction(104.962, 300)).toBeCloseTo(0.34987, 4);
    expect(progressFraction(400, 300)).toBe(1);
    expect(progressFraction(-1, 300)).toBe(0);
    expect(progressFraction(10, 0)).toBe(0);
  });

  it("estimates ETA from throughput", () => {
    expect(estimateEtaSeconds(170, 1700)).toBeCloseTo(8640, 6);
    expect(estimateEtaSeconds(0, 1700)).toBe(0);
  });

  it("returns null when throughput is unusable", () => {
    expect(estimateEtaSeconds(10, 0)).toBeNull();
    expect(estimateEtaSeconds(10, Number.NaN)).toBeNull();
    expect(estimateEtaSeconds(-1, 100)).toBeNull();
  });
});
