import { useId } from "react";

export interface ChartSeries {
  label: string;
  values: readonly number[];
  /** CSS colour; defaults to the theme's chart palette by series index. */
  color?: string;
}

export interface LineChartProps {
  title: string;
  series: readonly ChartSeries[];
  unit?: string;
  height?: number;
  /** Fix the y-range (e.g. [0, 100] for percentages); otherwise it is fitted to the data. */
  yDomain?: readonly [number, number];
  /** Decimal places for axis and latest-value labels. */
  precision?: number;
}

const WIDTH = 600;
const PALETTE = [
  "var(--mdx-chart-1)",
  "var(--mdx-chart-2)",
  "var(--mdx-chart-3)",
  "var(--mdx-chart-4)",
];

export interface ChartGeometry {
  min: number;
  max: number;
  paths: string[];
}

/** Pure geometry so it can be unit-tested: non-finite samples break the line instead of NaN. */
export function computeChartGeometry(
  series: readonly ChartSeries[],
  height: number,
  yDomain?: readonly [number, number],
): ChartGeometry | null {
  const finite = series.flatMap((s) => s.values.filter((v) => Number.isFinite(v)));
  if (finite.length === 0) return null;

  let min = yDomain?.[0] ?? Math.min(...finite);
  let max = yDomain?.[1] ?? Math.max(...finite);
  if (yDomain === undefined) {
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  if (max === min) max = min + 1;

  const longest = Math.max(...series.map((s) => s.values.length));
  const step = longest > 1 ? WIDTH / (longest - 1) : 0;
  const y = (value: number) => height - ((value - min) / (max - min)) * height;

  const paths = series.map((s) => {
    let d = "";
    let penDown = false;
    s.values.forEach((value, index) => {
      if (!Number.isFinite(value)) {
        penDown = false;
        return;
      }
      d += `${penDown ? "L" : "M"}${(index * step).toFixed(2)} ${y(value).toFixed(2)} `;
      penDown = true;
    });
    return d.trim();
  });
  return { min, max, paths };
}

export function LineChart({
  title,
  series,
  unit,
  height = 110,
  yDomain,
  precision = 1,
}: LineChartProps) {
  const titleId = useId();
  const geometry = computeChartGeometry(series, height, yDomain);
  const latest = series[0]?.values.filter((v) => Number.isFinite(v)).at(-1);
  const format = (value: number) => value.toFixed(precision);

  return (
    <figure className="mdx-chart" aria-labelledby={titleId} style={{ margin: 0 }}>
      <figcaption className="mdx-chart__head">
        <span className="mdx-chart__title" id={titleId}>
          {title}
        </span>
        <span className="mdx-chart__latest">
          {latest === undefined ? "—" : format(latest)}
          {unit === undefined || latest === undefined ? null : (
            <span className="mdx-faint"> {unit}</span>
          )}
        </span>
      </figcaption>
      <div className="mdx-chart__plot" style={{ height }}>
        {geometry === null ? (
          <div className="mdx-chart__empty" style={{ height }}>
            No data
          </div>
        ) : (
          <>
            <svg
              className="mdx-chart__svg"
              viewBox={`0 0 ${WIDTH} ${height}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${title} history`}
              height={height}
            >
              {[0.25, 0.5, 0.75].map((fraction) => (
                <line
                  key={fraction}
                  x1={0}
                  x2={WIDTH}
                  y1={height * fraction}
                  y2={height * fraction}
                  stroke="var(--mdx-chart-grid)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {geometry.paths.map((d, index) => (
                <path
                  key={series[index]?.label ?? index}
                  d={d}
                  fill="none"
                  stroke={series[index]?.color ?? PALETTE[index % PALETTE.length]}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <span className="mdx-chart__axis mdx-chart__axis--max">{format(geometry.max)}</span>
            <span className="mdx-chart__axis mdx-chart__axis--min">{format(geometry.min)}</span>
          </>
        )}
      </div>
      {series.length > 1 ? (
        <div className="mdx-chart__legend">
          {series.map((s, index) => (
            <span key={s.label}>
              <span
                className="mdx-chart__swatch"
                style={{ background: s.color ?? PALETTE[index % PALETTE.length] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
