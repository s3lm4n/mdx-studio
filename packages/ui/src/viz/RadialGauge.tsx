import { clamp01, gaugeGeometry } from "./geometry";

export interface RadialGaugeProps {
  /** Accessible name and visible caption. */
  label: string;
  /** Bounded fraction in [0, 1]; `null` when no sample is available. */
  value: number | null;
  /** Override the centre numeral (defaults to the percentage with one decimal). */
  display?: string;
  unit?: string;
  size?: number;
  /** The source is currently live: adds a restrained glow to the arc's end cap. */
  live?: boolean;
}

/**
 * Instrument dial for a bounded fraction (utilization, occupancy, progress). It never draws
 * limits, redlines or tolerance bands: those must come from the runtime, and the protocol does not
 * carry them yet (DESIGN_LANGUAGE.md §2.5).
 */
export function RadialGauge({
  label,
  value,
  display,
  unit = "%",
  size = 188,
  live = false,
}: RadialGaugeProps) {
  const geometry = gaugeGeometry(value, { size });
  const percent = value === null || !Number.isFinite(value) ? null : clamp01(value) * 100;
  const numeral = display ?? (percent === null ? "—" : percent.toFixed(1));

  return (
    <div
      className="mdx-gauge"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent === null ? undefined : Number(percent.toFixed(1))}
      aria-valuetext={percent === null ? "no data" : `${numeral} ${unit}`}
      style={{ width: size, height: size * 0.86, ["--mdx-gauge-size" as string]: `${size}px` }}
    >
      <svg
        className="mdx-gauge__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
      >
        {geometry.ticks.map((tick) => (
          <line
            key={tick.fraction}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            className={tick.major ? "mdx-gauge__tick mdx-gauge__tick--major" : "mdx-gauge__tick"}
          />
        ))}
        <path d={geometry.track} className="mdx-gauge__track" />
        {geometry.value === "" ? null : <path d={geometry.value} className="mdx-gauge__value" />}
        {geometry.cap === null ? null : (
          <circle
            cx={geometry.cap.x}
            cy={geometry.cap.y}
            r={3.2}
            className={`mdx-gauge__cap${live ? " mdx-gauge__cap--live" : ""}`}
          />
        )}
      </svg>
      <div className="mdx-gauge__center" aria-hidden="true">
        <span className="mdx-gauge__numeral">
          {numeral}
          {percent === null ? null : <span className="mdx-gauge__unit">{unit}</span>}
        </span>
        <span className="mdx-gauge__label">{label}</span>
      </div>
    </div>
  );
}
