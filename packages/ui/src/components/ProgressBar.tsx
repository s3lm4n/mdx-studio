import { useId } from "react";

export interface ProgressBarProps {
  /** Fraction in [0, 1]. Out-of-range and non-finite values are clamped. */
  value: number;
  label: string;
  detail?: string;
}

export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function ProgressBar({ value, label, detail }: ProgressBarProps) {
  const labelId = useId();
  const fraction = clampFraction(value);
  const percent = fraction * 100;
  return (
    <div className="mdx-progress">
      <div className="mdx-progress__head">
        <span id={labelId}>{label}</span>
        <span className="mdx-mono">{detail ?? `${percent.toFixed(2)} %`}</span>
      </div>
      <div
        className="mdx-progress__track"
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(percent.toFixed(2))}
      >
        <div className="mdx-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
