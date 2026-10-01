/**
 * Pure geometry for the visualization primitives. No DOM, no React: everything here is unit-tested.
 * Angles are in degrees, 0° pointing up, increasing clockwise.
 */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export interface Point {
  x: number;
  y: number;
}

export function polar(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const f = (n: number) => n.toFixed(2);

/** SVG arc from `startDeg` to `endDeg` (clockwise). Empty string for a zero-length sweep. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const sweep = endDeg - startDeg;
  if (!(sweep > 0)) return "";
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, Math.min(endDeg, startDeg + 359.99));
  const large = sweep > 180 ? 1 : 0;
  return `M${f(start.x)} ${f(start.y)} A${f(r)} ${f(r)} 0 ${large} 1 ${f(end.x)} ${f(end.y)}`;
}

export interface GaugeTick {
  fraction: number;
  major: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GaugeGeometry {
  track: string;
  value: string;
  /** End of the value arc (for the live cap); null when there is no value. */
  cap: Point | null;
  ticks: GaugeTick[];
}

export interface GaugeOptions {
  size: number;
  /** Total sweep of the dial in degrees (centred on the top). */
  sweep?: number;
  stroke?: number;
  /** Minor tick every `1 / minorDivisions`; majors every `majorEvery` minors. */
  minorDivisions?: number;
  majorEvery?: number;
}

/**
 * Dial geometry for a bounded fraction. Deliberately has no notion of limits or redlines: those
 * must come from the runtime (DESIGN_LANGUAGE.md §2.5).
 */
export function gaugeGeometry(fraction: number | null, options: GaugeOptions): GaugeGeometry {
  const { size, sweep = 240, stroke = 3, minorDivisions = 10, majorEvery = 5 } = options;
  const c = size / 2;
  const r = c - stroke - 12;
  const start = -sweep / 2;
  const end = sweep / 2;
  const ticks: GaugeTick[] = [];
  for (let i = 0; i <= minorDivisions; i++) {
    const t = i / minorDivisions;
    const major = i % majorEvery === 0;
    const angle = start + sweep * t;
    const inner = polar(c, c, r + stroke / 2 + 4, angle);
    const outer = polar(c, c, r + stroke / 2 + (major ? 10 : 7), angle);
    ticks.push({ fraction: t, major, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y });
  }
  if (fraction === null || !Number.isFinite(fraction)) {
    return { track: arcPath(c, c, r, start, end), value: "", cap: null, ticks };
  }
  const t = clamp01(fraction);
  const valueEnd = start + sweep * t;
  return {
    track: arcPath(c, c, r, start, end),
    value: arcPath(c, c, r, start, valueEnd),
    cap: polar(c, c, r, valueEnd),
    ticks,
  };
}

/** "Nice" tick values covering [min, max] with roughly `count` intervals (1-2-2.5-5 steps). */
export function niceTicks(min: number, max: number, count = 3): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max < min) [min, max] = [max, min];
  if (max === min) {
    const pad = Math.abs(max) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const step =
    (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10) *
    magnitude;
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= last + step / 2; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

export interface TraceGeometry {
  /** Domain actually drawn (snapped to ticks unless fixed). */
  min: number;
  max: number;
  ticks: number[];
  /** One `d` for the line; non-finite samples break it into separate segments. */
  line: string;
  /** Closed area under each continuous segment, down to the plot floor. */
  area: string;
  /** Latest finite sample, in viewBox units; null if there is none. */
  last: (Point & { index: number; value: number }) | null;
  /** x position of sample `i` in viewBox units. */
  xOf: (index: number) => number;
  yOf: (value: number) => number;
}

export interface TraceOptions {
  width: number;
  height: number;
  yDomain?: readonly [number, number];
  tickCount?: number;
  /**
   * Minimum fitted y-span as a fraction of the data's magnitude (e.g. 0.06 = at least ±3 % around
   * the centre). Stops tiny sample-to-sample jitter from being magnified to full plot height.
   * Only the scale changes; the samples are drawn as received.
   */
  minRelativeSpan?: number;
}

/** Geometry for a rolling time series; returns null when there are no finite samples. */
export function traceGeometry(
  values: readonly number[],
  options: TraceOptions,
): TraceGeometry | null {
  const { width, height, yDomain, tickCount = 3, minRelativeSpan = 0 } = options;
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;

  let min: number;
  let max: number;
  let ticks: number[];
  if (yDomain !== undefined) {
    [min, max] = yDomain;
    if (max === min) max = min + 1;
    ticks = niceTicks(min, max, tickCount).filter((t) => t >= min && t <= max);
  } else {
    let lo = Math.min(...finite);
    let hi = Math.max(...finite);
    const centre = (lo + hi) / 2;
    const minSpan = Math.abs(centre) * minRelativeSpan;
    if (hi - lo < minSpan) {
      lo = centre - minSpan / 2;
      hi = centre + minSpan / 2;
    }
    const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.02 || 1;
    ticks = niceTicks(lo - pad, hi + pad, tickCount);
    min = ticks[0] ?? lo - pad;
    max = ticks[ticks.length - 1] ?? hi + pad;
    if (max === min) max = min + 1;
  }

  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const xOf = (index: number) => (values.length > 1 ? index * step : width);
  const yOf = (value: number) => height - ((value - min) / (max - min)) * height;

  let line = "";
  let area = "";
  let segment: Point[] = [];
  const flush = () => {
    if (segment.length === 0) return;
    const first = segment[0];
    const lastPoint = segment[segment.length - 1];
    if (first !== undefined && lastPoint !== undefined) {
      const pts = segment.map((p) => `${f(p.x)} ${f(p.y)}`);
      line += `M${pts.join(" L")} `;
      area += `M${f(first.x)} ${f(height)} L${pts.join(" L")} L${f(lastPoint.x)} ${f(height)} Z `;
    }
    segment = [];
  };
  let last: TraceGeometry["last"] = null;
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      flush();
      return;
    }
    const point = { x: xOf(index), y: yOf(value) };
    segment.push(point);
    last = { ...point, index, value };
  });
  flush();

  return { min, max, ticks, line: line.trim(), area: area.trim(), last, xOf, yOf };
}

/** Index of the sample nearest to a horizontal position given as a fraction of the plot width. */
export function nearestIndex(length: number, xFraction: number): number {
  if (length <= 1) return 0;
  return Math.round(clamp01(xFraction) * (length - 1));
}

/** Tick positions (fractions) for a ruler with `divisions` intervals; majors every `majorEvery`. */
export function rulerTicks(
  divisions: number,
  majorEvery: number,
): { at: number; major: boolean }[] {
  const n = Math.max(1, Math.floor(divisions));
  return Array.from({ length: n + 1 }, (_, i) => ({ at: i / n, major: i % majorEvery === 0 }));
}
