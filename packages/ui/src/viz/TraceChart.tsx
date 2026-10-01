import { useId, useState, type PointerEvent } from "react";
import { nearestIndex, traceGeometry } from "./geometry";

export type TraceTone = "trace" | "mdx" | "native";

export interface TraceChartProps {
  /** Accessible name of the chart (the visible title is the caller's card heading). */
  title: string;
  values: readonly number[];
  unit?: string;
  /** Decimal places for axis and readout labels. */
  precision?: number;
  height?: number;
  /** Fix the y-range (e.g. [0, 100] for percentages); otherwise it is fitted to nice ticks. */
  yDomain?: readonly [number, number];
  /** Fill the area under the trace. Use only where the area encodes magnitude. */
  area?: boolean;
  /**
   * `trace`: standalone telemetry (smoked plum). `mdx` / `native`: the semantic comparison pair —
   * use only when a view contrasts the two paths.
   */
  tone?: TraceTone;
  /** The source is currently live (for example the job is RUNNING). Draws the live-edge marker. */
  live?: boolean;
  /** Seconds between samples, used to label the relative time axis and hover readout. */
  sampleIntervalSeconds?: number;
  /** Minimum fitted y-span relative to the data magnitude (see `traceGeometry`). */
  minRelativeSpan?: number;
  /** Text for the explicit empty state. */
  emptyLabel?: string;
}

const WIDTH = 1000;

const STROKE: Record<TraceTone, string> = {
  trace: "var(--mdx-trace)",
  mdx: "var(--mdx-series-mdx)",
  native: "var(--mdx-series-native)",
};

export function formatSpan(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  return `${Number((seconds / 60).toFixed(1))} min`;
}

/**
 * Rolling time-series chart: hairline grid, y-scale in a right-hand gutter (never over the data),
 * relative time axis, optional live-edge marker, crosshair readout on hover. It plots exactly the
 * samples it is given; it does not smooth or resample.
 */
export function TraceChart({
  title,
  values,
  unit,
  precision = 1,
  height = 120,
  yDomain,
  area = false,
  tone = "trace",
  live = false,
  sampleIntervalSeconds = 1,
  minRelativeSpan = 0,
  emptyLabel = "No data",
}: TraceChartProps) {
  const gradientId = `mdx-trace-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);
  const geometry = traceGeometry(values, {
    width: WIDTH,
    height,
    minRelativeSpan,
    ...(yDomain ? { yDomain } : {}),
  });
  const format = (value: number) => value.toFixed(precision);
  const span = Math.max(0, values.length - 1) * sampleIntervalSeconds;

  if (geometry === null) {
    return (
      <figure className="mdx-trace" style={{ margin: 0 }} aria-label={title}>
        <div className="mdx-trace__empty" style={{ height }}>
          {emptyLabel}
        </div>
      </figure>
    );
  }

  const { min, max, ticks, line, last } = geometry;
  const pct = (value: number) => `${((1 - (value - min) / (max - min)) * 100).toFixed(3)}%`;
  const hoveredValue = hover === null ? undefined : values[hover];
  const hovered =
    hover === null || hoveredValue === undefined || !Number.isFinite(hoveredValue)
      ? null
      : { index: hover, value: hoveredValue };

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    setHover(nearestIndex(values.length, (event.clientX - rect.left) / rect.width));
  }

  const summary =
    last === null
      ? title
      : `${title}: latest ${format(last.value)}${unit === undefined ? "" : ` ${unit}`}, scale ${format(min)} to ${format(max)}, last ${formatSpan(span)}`;

  return (
    <figure className={`mdx-trace mdx-trace--${tone}`} style={{ margin: 0 }}>
      <div className="mdx-trace__body">
        <div
          className="mdx-trace__plot"
          style={{ height }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setHover(null);
          }}
        >
          <svg
            className="mdx-trace__svg"
            viewBox={`0 0 ${WIDTH} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={summary}
            height={height}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--mdx-trace-fill-top)" }} />
                <stop offset="0.55" style={{ stopColor: "var(--mdx-trace-fill-mid)" }} />
                <stop offset="1" style={{ stopColor: "var(--mdx-trace-fill-bottom)" }} />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={WIDTH}
                y1={geometry.yOf(tick)}
                y2={geometry.yOf(tick)}
                className="mdx-trace__grid"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {area ? <path d={geometry.area} fill={`url(#${gradientId})`} stroke="none" /> : null}
            <path
              d={line}
              fill="none"
              stroke={STROKE[tone]}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {live && last !== null ? (
            <span
              className="mdx-trace__live"
              aria-hidden="true"
              style={{ left: `${(last.x / WIDTH) * 100}%`, top: pct(last.value) }}
            />
          ) : null}
          {hovered === null ? null : (
            <div
              className="mdx-trace__cursor"
              aria-hidden="true"
              style={{ left: `${(geometry.xOf(hovered.index) / WIDTH) * 100}%` }}
            >
              <span className="mdx-trace__cursor-dot" style={{ top: pct(hovered.value) }} />
              <span
                className={`mdx-trace__readout${hovered.index > values.length / 2 ? " mdx-trace__readout--left" : ""}`}
              >
                <strong className="mdx-num">{format(hovered.value)}</strong>
                {unit === undefined ? null : <span className="mdx-faint"> {unit}</span>}
                <span className="mdx-trace__readout-time">
                  {hovered.index === values.length - 1
                    ? "latest"
                    : `−${formatSpan((values.length - 1 - hovered.index) * sampleIntervalSeconds)}`}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="mdx-trace__yaxis" aria-hidden="true" style={{ height }}>
          {ticks.map((tick) => (
            <span key={tick} className="mdx-trace__ytick" style={{ top: pct(tick) }}>
              {format(tick)}
            </span>
          ))}
        </div>
      </div>
      <div className="mdx-trace__xaxis" aria-hidden="true">
        <span>−{formatSpan(span)}</span>
        <span>{live ? "now" : "latest"}</span>
      </div>
    </figure>
  );
}
