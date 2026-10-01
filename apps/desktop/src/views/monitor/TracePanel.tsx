import type { Origin } from "@mdx-studio/protocol";
import { OriginBadge, Panel, TraceChart, formatSpan } from "@mdx-studio/ui";
import { windowStats } from "../../services/telemetry";

/** Single standalone trace (smoked plum) with latest value and the window's range. */
export function TracePanel({
  title,
  description,
  values,
  unit,
  precision,
  live,
  interval,
  origin,
  minRelativeSpan = 0,
  chartHeight = 132,
  className,
}: {
  title: string;
  description: string;
  values: readonly number[];
  unit: string;
  precision: number;
  live: boolean;
  interval: number;
  origin: Origin | undefined;
  minRelativeSpan?: number;
  chartHeight?: number;
  className?: string;
}) {
  const stats = windowStats(values);
  return (
    <Panel
      title={title}
      description={description}
      className={`mon-card${className === undefined ? "" : ` ${className}`}`}
      actions={origin === undefined ? undefined : <OriginBadge origin={origin} />}
    >
      <div className="mon-trace-panel">
        <div className="mon-trace-panel__head">
          <p className="mon-readout-xl mdx-num">
            {stats === null ? "—" : stats.latest.toFixed(precision)}
            {stats === null ? null : <span className="mon-unit">{unit}</span>}
          </p>
          {stats === null ? null : (
            <dl className="mon-range" aria-label={`${title} window range`}>
              <div>
                <dt>min</dt>
                <dd className="mdx-num">{stats.min.toFixed(precision)}</dd>
              </div>
              <div>
                <dt>max</dt>
                <dd className="mdx-num">{stats.max.toFixed(precision)}</dd>
              </div>
              <div>
                <dt>window</dt>
                <dd className="mdx-num">{formatSpan(Math.max(0, values.length - 1) * interval)}</dd>
              </div>
            </dl>
          )}
        </div>
        <TraceChart
          title={`${title} history`}
          values={values}
          unit={unit}
          precision={precision}
          area
          tone="trace"
          live={live}
          sampleIntervalSeconds={interval}
          minRelativeSpan={minRelativeSpan}
          height={chartHeight}
        />
      </div>
    </Panel>
  );
}
