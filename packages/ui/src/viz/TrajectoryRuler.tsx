import { clamp01, rulerTicks } from "./geometry";

export interface TrajectoryRulerProps {
  /** Accessible name of the progress bar. */
  label: string;
  /** Fraction in [0, 1]. Out-of-range and non-finite values are clamped. */
  value: number;
  /** Evenly spaced scale labels under the ruler (first = start, last = target). */
  axisLabels?: readonly string[];
  divisions?: number;
  majorEvery?: number;
}

const WIDTH = 1000;

/**
 * Simulated-time progress drawn as a ruled axis: fine ticks, a filled span and a current marker.
 * Same progressbar semantics as `ProgressBar` (aria-valuenow in percent, two decimals).
 */
export function TrajectoryRuler({
  label,
  value,
  axisLabels = [],
  divisions = 60,
  majorEvery = 15,
}: TrajectoryRulerProps) {
  const fraction = clamp01(value);
  const percent = fraction * 100;
  const ticks = rulerTicks(divisions, majorEvery);
  return (
    <div className="mdx-ruler">
      <div
        className="mdx-ruler__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(percent.toFixed(2))}
      >
        <svg
          className="mdx-ruler__svg"
          viewBox={`0 0 ${WIDTH} 24`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {ticks.map((tick) => (
            <line
              key={tick.at}
              x1={tick.at * WIDTH}
              x2={tick.at * WIDTH}
              y1={tick.major ? 4 : 10}
              y2={18}
              className={`mdx-ruler__tick${tick.at <= fraction ? " mdx-ruler__tick--done" : ""}${tick.major ? " mdx-ruler__tick--major" : ""}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={WIDTH}
            y1={21}
            y2={21}
            className="mdx-ruler__base"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            x2={fraction * WIDTH}
            y1={21}
            y2={21}
            className="mdx-ruler__fill"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="mdx-ruler__marker" style={{ left: `${percent}%` }} aria-hidden="true" />
      </div>
      {axisLabels.length < 2 ? null : (
        <div className="mdx-ruler__axis" aria-hidden="true">
          {axisLabels.map((text, index) => (
            <span
              key={`${index}:${text}`}
              style={{ left: `${(index / (axisLabels.length - 1)) * 100}%` }}
            >
              {text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
