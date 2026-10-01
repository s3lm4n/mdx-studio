import type { JobRecord, TelemetrySnapshot } from "@mdx-studio/protocol";
import { describe, expect, it } from "vitest";
import {
  orderJobs,
  rulerAxisLabels,
  sampleInterval,
  series,
  windowStats,
} from "../services/telemetry";
import { elapsedWallSeconds } from "../views/monitor/SimulationHero";

const snapshot = (timestamp: string, nsPerDay: number | null): TelemetrySnapshot =>
  ({
    timestamp,
    simulation: nsPerDay === null ? null : { nsPerDay },
  }) as unknown as TelemetrySnapshot;

const job = (
  id: string,
  state: JobRecord["state"],
  createdAt: string,
  startedAt: string | null = null,
) => ({ id, state, createdAt, startedAt }) as unknown as JobRecord;

describe("telemetry helpers", () => {
  it("windowStats summarises finite samples only", () => {
    expect(windowStats([])).toBeNull();
    expect(windowStats([Number.NaN])).toBeNull();
    const stats = windowStats([1, Number.NaN, 3, 5]);
    expect(stats).toMatchObject({ latest: 5, mean: 3, min: 1, max: 5, count: 3 });
    expect(stats?.sd).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });

  it("series keeps time alignment by marking missing values as NaN", () => {
    const values = series(
      [snapshot("2026-01-01T00:00:00Z", 10), snapshot("2026-01-01T00:00:01Z", null)],
      (s) => s.simulation?.nsPerDay,
    );
    expect(values[0]).toBe(10);
    expect(Number.isNaN(values[1])).toBe(true);
  });

  it("sampleInterval reads the cadence from runtime timestamps", () => {
    expect(sampleInterval([])).toBe(1);
    expect(
      sampleInterval([
        snapshot("2026-01-01T00:00:00Z", 1),
        snapshot("2026-01-01T00:00:02Z", 1),
        snapshot("2026-01-01T00:00:04Z", 1),
      ]),
    ).toBe(2);
  });

  it("orderJobs lists live runs first, then newest first", () => {
    const ordered = orderJobs([
      job("old", "COMPLETED", "2026-01-01T00:00:00Z"),
      job("new", "COMPLETED", "2026-01-03T00:00:00Z"),
      job("live", "RUNNING", "2025-12-01T00:00:00Z"),
    ]);
    expect(ordered.map((j) => j.id)).toEqual(["live", "new", "old"]);
  });

  it("rulerAxisLabels spans 0 to target in four divisions", () => {
    expect(rulerAxisLabels(300)).toEqual(["0", "75", "150", "225", "300 ns"]);
  });

  it("elapsedWallSeconds uses runtime timestamps and refuses impossible values", () => {
    const started = job("j", "RUNNING", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    expect(elapsedWallSeconds(started, snapshot("2026-01-01T01:00:00Z", 1))).toBe(3600);
    expect(elapsedWallSeconds(started, undefined)).toBeNull();
    expect(
      elapsedWallSeconds(
        job("j", "CREATED", "2026-01-01T00:00:00Z"),
        snapshot("2026-01-01T01:00:00Z", 1),
      ),
    ).toBeNull();
    expect(elapsedWallSeconds(started, snapshot("2025-12-31T23:00:00Z", 1))).toBeNull();
  });
});
