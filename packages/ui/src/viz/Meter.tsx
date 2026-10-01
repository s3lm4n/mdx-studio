import { useId } from "react";
import { clamp01 } from "./geometry";

export interface MeterProps {
  label: string;
  /** Bounded fraction in [0, 1]; `null` when no sample is available. */
  value: number | null;
  /** Readout text; defaults to the percentage with one decimal. */
  display?: string;
  /** Secondary text after the readout (e.g. "of 64 GiB"). */
  detail?: string;
}

/** Thin linear fraction bar on a neutral scale. No thresholds (DESIGN_LANGUAGE.md §2.5). */
export function Meter({ label, value, display, detail }: MeterProps) {
  const labelId = useId();
  const percent = value === null || !Number.isFinite(value) ? null : clamp01(value) * 100;
  const readout = display ?? (percent === null ? "—" : `${percent.toFixed(1)} %`);
  return (
    <div className="mdx-meter">
      <div className="mdx-meter__head">
        <span id={labelId} className="mdx-meter__label">
          {label}
        </span>
        <span className="mdx-meter__value mdx-num">
          {readout}
          {detail === undefined ? null : <span className="mdx-faint"> {detail}</span>}
        </span>
      </div>
      <div
        className="mdx-meter__track"
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent === null ? undefined : Number(percent.toFixed(1))}
        aria-valuetext={readout}
      >
        <div className="mdx-meter__fill" style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}
