import type { Origin } from "@mdx-studio/protocol";
import { OriginBadge, Panel, TraceChart } from "@mdx-studio/ui";
import { windowStats } from "../../services/telemetry";

export interface ThermoChannel {
  label: string;
  unit: string;
  precision: number;
  values: readonly number[];
}

/**
 * GROMACS thermodynamic state as a strip of instrument tiles. Each tile shows the latest sample
 * and, explicitly labelled, the mean and standard deviation over the client's rolling window.
 */
export function ThermoPanel({
  channels,
  neighborListRebuilds,
  live,
  interval,
  origin,
}: {
  channels: readonly ThermoChannel[];
  neighborListRebuilds: number | null;
  live: boolean;
  interval: number;
  origin: Origin | undefined;
}) {
  return (
    <Panel
      title="Thermodynamics"
      description="GROMACS energies and state, rolling window"
      className="mon-card mon-thermo"
      actions={
        <>
          {neighborListRebuilds === null ? null : (
            <span className="mon-chip">
              Neighbor-list rebuilds{" "}
              <span className="mdx-num mon-chip__value">
                {neighborListRebuilds.toLocaleString("en-US")}
              </span>
            </span>
          )}
          {origin === undefined ? null : <OriginBadge origin={origin} />}
        </>
      }
    >
      <div className="mon-thermo__grid">
        {channels.map((channel) => {
          const stats = windowStats(channel.values);
          return (
            <section key={channel.label} className="mon-tile" aria-label={channel.label}>
              <div className="mon-tile__head">
                <h3 className="mon-tile__label">{channel.label}</h3>
                <p className="mon-tile__value mdx-num">
                  {stats === null ? "—" : stats.latest.toFixed(channel.precision)}
                  {stats === null ? null : <span className="mon-unit">{channel.unit}</span>}
                </p>
                <p className="mon-tile__stats mdx-num">
                  {stats === null
                    ? " "
                    : `window mean ${stats.mean.toFixed(channel.precision)} · σ ${stats.sd.toFixed(channel.precision)}`}
                </p>
              </div>
              <TraceChart
                title={`${channel.label} history`}
                values={channel.values}
                unit={channel.unit}
                precision={channel.precision}
                tone="trace"
                live={live}
                sampleIntervalSeconds={interval}
                height={92}
              />
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
