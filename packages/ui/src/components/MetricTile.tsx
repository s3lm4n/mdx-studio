import type { ReactNode } from "react";

export interface MetricTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: "pass" | "warn" | "fail" | undefined;
}

export function MetricTile({ label, value, unit, hint, tone }: MetricTileProps) {
  return (
    <div className={`mdx-metric${tone === undefined ? "" : ` mdx-metric--${tone}`}`}>
      <span className="mdx-metric__label">{label}</span>
      <span className="mdx-metric__value">
        {value}
        {unit === undefined ? null : <span className="mdx-metric__unit">{unit}</span>}
      </span>
      {hint === undefined ? null : <span className="mdx-metric__hint">{hint}</span>}
    </div>
  );
}
