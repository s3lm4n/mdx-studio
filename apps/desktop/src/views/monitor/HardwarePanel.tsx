import type { HardwareTelemetry, Origin } from "@mdx-studio/protocol";
import { OriginBadge, Panel, StatusDot, TraceChart } from "@mdx-studio/ui";
import { windowStats } from "../../services/telemetry";

function Channel({
  label,
  unit,
  values,
  live,
  interval,
}: {
  label: string;
  unit: string;
  values: readonly number[];
  live: boolean;
  interval: number;
}) {
  const stats = windowStats(values);
  return (
    <section className="mon-tile" aria-label={label}>
      <div className="mon-tile__head">
        <h3 className="mon-tile__label">{label}</h3>
        <p className="mon-tile__value mdx-num">
          {stats === null ? "—" : stats.latest.toFixed(1)}
          <span className="mon-unit">{unit}</span>
        </p>
      </div>
      <TraceChart
        title={`${label} history`}
        values={values}
        unit={unit}
        precision={1}
        tone="trace"
        live={live}
        sampleIntervalSeconds={interval}
        height={72}
      />
    </section>
  );
}

/** Accelerator board readings. No thermal or power limits are drawn: the runtime has none yet. */
export function HardwarePanel({
  hardware,
  temperature,
  power,
  live,
  interval,
  origin,
}: {
  hardware: HardwareTelemetry;
  temperature: readonly number[];
  power: readonly number[];
  live: boolean;
  interval: number;
  origin: Origin;
}) {
  const link = hardware.pcieLink;
  return (
    <Panel
      title="Accelerator hardware"
      description="Board sensors and host link"
      className="mon-card mon-hw"
      actions={<OriginBadge origin={origin} />}
    >
      <div className="mon-hw__body">
        <Channel
          label="Device temperature"
          unit="°C"
          values={temperature}
          live={live}
          interval={interval}
        />
        <Channel label="Power" unit="W" values={power} live={live} interval={interval} />
        <dl className="mon-spec">
          <div>
            <dt>Clock</dt>
            <dd className="mdx-num">
              {hardware.clockMHz}
              <span className="mon-unit">MHz</span>
            </dd>
          </div>
          <div>
            <dt>PCIe link</dt>
            <dd>
              <span className="mdx-num">
                Gen{link.generation} ×{link.lanes}
              </span>{" "}
              {link.status === "up" ? (
                <span className="mon-spec__muted">up</span>
              ) : (
                <StatusDot tone={link.status === "degraded" ? "warn" : "fail"}>
                  {link.status}
                </StatusDot>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
