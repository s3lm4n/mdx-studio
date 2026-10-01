import type { MdxTelemetry, Origin } from "@mdx-studio/protocol";
import {
  CutoffRingsMotif,
  Meter,
  OriginBadge,
  Panel,
  RadialGauge,
  StatusDot,
  TraceChart,
} from "@mdx-studio/ui";
import { windowStats } from "../../services/telemetry";
import { DeviceStateBadge } from "../state-tone";

/**
 * The MDX pipeline as an instrument: utilization dial, queue and backpressure meters, and the
 * pair-throughput trace. Every scale is a neutral bounded fraction; no limits or redlines are
 * drawn because the runtime does not supply any (DESIGN_LANGUAGE.md §2.5).
 */
export function MdxPipelinePanel({
  mdx,
  pairThroughput,
  live,
  interval,
  origin,
}: {
  mdx: MdxTelemetry;
  pairThroughput: readonly number[];
  live: boolean;
  interval: number;
  origin: Origin;
}) {
  const throughput = windowStats(pairThroughput);
  return (
    <Panel
      title="MDX pipeline"
      description="Accelerator dataflow, latest sample and rolling window"
      className="mon-card mon-mdx"
      actions={<OriginBadge origin={origin} />}
      motif={<CutoffRingsMotif className="mon-mdx__rings" fade="radial" />}
    >
      <div className="mon-mdx__body">
        <div className="mon-mdx__dial">
          <RadialGauge label="Utilization" value={mdx.utilization} live={live} size={196} />
          <p className="mon-mdx__caption">Pipeline utilization, latest sample</p>
          <div className="mon-status-row">
            <DeviceStateBadge state={mdx.deviceState} appearance="plain" />
            <span className="mon-status-row__item">
              Watchdog{" "}
              {mdx.watchdog === "TRIPPED" ? (
                <StatusDot tone="fail">TRIPPED</StatusDot>
              ) : (
                <span className="mon-status-row__value">{mdx.watchdog}</span>
              )}
            </span>
            <span className="mon-status-row__item">
              Errors{" "}
              {mdx.errorCount > 0 ? (
                <StatusDot tone="fail">{String(mdx.errorCount)}</StatusDot>
              ) : (
                <span className="mon-status-row__value mdx-num">0</span>
              )}
            </span>
          </div>
        </div>
        <div className="mon-mdx__side">
          <Meter label="Queue occupancy" value={mdx.queueOccupancy} />
          <Meter label="Backpressure" value={mdx.backpressure} />
          <div className="mon-mdx__throughput">
            <div className="mon-tile__head">
              <h3 className="mon-tile__label">Pair throughput</h3>
              <p className="mon-tile__value mdx-num">
                {throughput === null ? "—" : throughput.latest.toFixed(1)}
                <span className="mon-unit">Gpairs/s</span>
              </p>
            </div>
            <TraceChart
              title="Pair throughput history"
              values={pairThroughput}
              unit="Gpairs/s"
              precision={1}
              tone="trace"
              area
              live={live}
              sampleIntervalSeconds={interval}
              height={118}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
