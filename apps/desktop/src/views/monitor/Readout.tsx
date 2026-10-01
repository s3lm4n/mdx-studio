import type { ReactNode } from "react";

/** A labelled instrument value: label above, tabular numeral with its unit. */
export function Readout({
  label,
  value,
  unit,
  size = "md",
  detail,
}: {
  label: string;
  value: string | null;
  unit?: string;
  size?: "md" | "lg";
  detail?: ReactNode;
}) {
  return (
    <div className={`mon-readout mon-readout--${size}`}>
      <dt>{label}</dt>
      <dd>
        <span className="mon-readout__value mdx-num">
          {value ?? "—"}
          {value === null || unit === undefined ? null : <span className="mon-unit">{unit}</span>}
        </span>
        {detail === undefined ? null : <span className="mon-readout__detail">{detail}</span>}
      </dd>
    </div>
  );
}
