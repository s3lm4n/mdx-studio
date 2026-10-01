import type { MdxDeviceStatus, MdxTelemetry } from "@mdx-studio/protocol";
import { CutoffRingsMotif, OriginBadge, Panel, RadialGauge } from "@mdx-studio/ui";
import { Loading } from "../common";
import { DeviceStateBadge } from "../state-tone";
import { DashLink } from "./DashLink";

function Readout({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mdx-num">
        {value ?? "—"}
        {value === null ? null : <span className="dash-unit">{unit}</span>}
      </dd>
    </div>
  );
}

/**
 * MDX device instrument. The dial shows pipeline utilization from the active run's telemetry only;
 * without an MDX run it shows no value rather than an invented idle reading. No limits or redlines
 * are drawn: the runtime does not supply any yet.
 */
export function AcceleratorCard({
  device,
  mdx,
  live,
}: {
  device: MdxDeviceStatus | undefined;
  mdx: MdxTelemetry | null;
  live: boolean;
}) {
  return (
    <Panel
      title="Accelerator"
      className="dash-card dash-accel"
      description={device?.identity?.model ?? "No device identity reported"}
      actions={device === undefined ? undefined : <OriginBadge origin={device.origin} />}
      motif={<CutoffRingsMotif className="dash-accel__rings" fade="radial" />}
    >
      {device === undefined ? (
        <Loading what="device" />
      ) : (
        <div className="dash-accel__body">
          <div className="dash-accel__dial">
            <RadialGauge label="Utilization" value={mdx?.utilization ?? null} live={live} />
            <p className="dash-accel__caption">
              {mdx === null ? "No active MDX run" : "MDX pipeline, latest sample"}
            </p>
          </div>
          <dl className="dash-readouts">
            <Readout
              label="Temperature"
              value={device.temperatureC === null ? null : device.temperatureC.toFixed(1)}
              unit="°C"
            />
            <Readout
              label="Power"
              value={device.powerW === null ? null : device.powerW.toFixed(1)}
              unit="W"
            />
            <Readout
              label="Clock"
              value={device.clockMHz === null ? null : String(device.clockMHz)}
              unit="MHz"
            />
          </dl>
          <div className="dash-accel__status">
            <div className="dash-accel__status-row">
              <DeviceStateBadge state={device.state} appearance="plain" />
              <DashLink to="/devices">Details</DashLink>
            </div>
            <div className="dash-accel__meta-row">
              <span>
                Watchdog <span className="dash-accel__meta-value">{device.watchdog.state}</span>
              </span>
              {device.link === null ? null : (
                <span>
                  PCIe{" "}
                  <span className="dash-accel__meta-value">
                    Gen{device.link.generation} ×{device.link.lanes} {device.link.status}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
