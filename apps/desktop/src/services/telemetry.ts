import type { JobRecord, JobState, TelemetrySnapshot } from "@mdx-studio/protocol";

/** States after which a job never changes again. */
export const TERMINAL_STATES: readonly JobState[] = ["COMPLETED", "FAILED", "ABORTED"];

export function isLiveJob(job: JobRecord): boolean {
  return !TERMINAL_STATES.includes(job.state);
}

/** Live jobs first, then most recent first. */
export function orderJobs(jobs: readonly JobRecord[]): JobRecord[] {
  return [...jobs].sort((a, b) => {
    const liveOrder = Number(isLiveJob(b)) - Number(isLiveJob(a));
    return liveOrder !== 0 ? liveOrder : b.createdAt.localeCompare(a.createdAt);
  });
}

/** Seconds between telemetry samples as reported by timestamps (falls back to 1 s). */
export function sampleInterval(history: readonly TelemetrySnapshot[]): number {
  const first = history[0];
  const last = history[history.length - 1];
  if (first === undefined || last === undefined || history.length < 2) return 1;
  const span = (Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 1000;
  return Number.isFinite(span) && span > 0 ? span / (history.length - 1) : 1;
}

/**
 * One value per snapshot, in order. Missing values become `NaN` so the series stays aligned with
 * time; charts break the line there instead of joining across the gap.
 */
export function series(
  history: readonly TelemetrySnapshot[],
  select: (snapshot: TelemetrySnapshot) => number | null | undefined,
): number[] {
  return history.map((snapshot) => select(snapshot) ?? Number.NaN);
}

export interface WindowStats {
  latest: number;
  mean: number;
  /** Population standard deviation over the window. */
  sd: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Summary of the rolling window the client holds. This is client-side processing of runtime
 * samples, so every place that shows it must label it as a window statistic.
 */
export function windowStats(values: readonly number[]): WindowStats | null {
  const finite = values.filter((value) => Number.isFinite(value));
  const latest = finite[finite.length - 1];
  if (latest === undefined) return null;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const variance = finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / finite.length;
  return {
    latest,
    mean,
    sd: Math.sqrt(variance),
    min: Math.min(...finite),
    max: Math.max(...finite),
    count: finite.length,
  };
}

const AXIS_DIVISIONS = 4;

/** Evenly spaced simulated-time labels: "0", "75", "150", "225", "300 ns". */
export function rulerAxisLabels(targetNs: number, divisions = AXIS_DIVISIONS): string[] {
  return Array.from({ length: divisions + 1 }, (_, i) => {
    const value = (targetNs * i) / divisions;
    const text = i === 0 ? "0" : String(Number(value.toPrecision(3)));
    return i === divisions ? `${text} ns` : text;
  });
}
