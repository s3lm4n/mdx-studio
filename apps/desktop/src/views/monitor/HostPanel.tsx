import type { HostTelemetry, Origin } from "@mdx-studio/protocol";
import { Meter, OriginBadge, Panel, TraceChart } from "@mdx-studio/ui";
import { formatBytes } from "../../services/format";

/** Workstation load. GPU telemetry is not part of the protocol yet and is shown as such. */
export function HostPanel({
  host,
  cpu,
  live,
  interval,
  origin,
}: {
  host: HostTelemetry;
  cpu: readonly number[];
  live: boolean;
  interval: number;
  origin: Origin;
}) {
  return (
    <Panel
      title="Host"
      description="Workstation running the simulation"
      className="mon-card mon-host"
      actions={<OriginBadge origin={origin} />}
    >
      <div className="mon-host__body">
        <Meter label="CPU" value={host.cpuUtilization} />
        <TraceChart
          title="CPU history"
          values={cpu}
          unit="%"
          precision={0}
          yDomain={[0, 100]}
          tone="trace"
          live={live}
          sampleIntervalSeconds={interval}
          height={64}
        />
        <Meter
          label="Memory"
          value={host.memoryUsedBytes / host.memoryTotalBytes}
          display={formatBytes(host.memoryUsedBytes)}
          detail={`of ${formatBytes(host.memoryTotalBytes)}`}
        />
        <p className="mon-host__note">
          <span className="mon-host__note-label">GPU</span> Not reported by the runtime yet.
        </p>
      </div>
    </Panel>
  );
}
