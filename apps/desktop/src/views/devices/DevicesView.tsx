import { DEVICE_STATES } from "@mdx-studio/protocol";
import { DEVICE_MACHINE } from "@mdx-studio/simulation-model";
import {
  Callout,
  DataTable,
  KeyValueList,
  OriginBadge,
  Panel,
  StateStrip,
  type DataTableColumn,
} from "@mdx-studio/ui";
import { useDeviceStatus } from "../../hooks/use-live";
import { Loading, PageHeader } from "../common";
import { DeviceStateBadge } from "../state-tone";

interface TransitionRow {
  state: string;
  next: string;
}

// Display-only rendering of the runtime's documented lifecycle. The UI never drives it.
const TRANSITIONS: TransitionRow[] = DEVICE_STATES.map((state) => ({
  state,
  next:
    Object.entries(DEVICE_MACHINE.transitions[state])
      .map(([event, target]) => `${event} → ${target}`)
      .join(", ") || "—",
}));

const COLUMNS: readonly DataTableColumn<TransitionRow>[] = [
  { key: "state", header: "State", render: (row) => <span className="mdx-mono">{row.state}</span> },
  {
    key: "next",
    header: "Events",
    render: (row) => <span className="mdx-muted mdx-mono">{row.next}</span>,
  },
];

export function DevicesView() {
  const device = useDeviceStatus();

  return (
    <div className="stack">
      <PageHeader title="Devices" subtitle="MDX device status as reported by the runtime." />
      <Callout tone="demo" title="No physical MDX hardware">
        MDX hardware integration is not implemented. This page shows a simulated device provided by
        the demo runtime so the interface can be developed without hardware.
      </Callout>

      {device === undefined ? (
        <Loading what="device" />
      ) : (
        <>
          <Panel title="Status" actions={<OriginBadge origin={device.origin} />}>
            <div className="stack">
              <div className="row">
                <DeviceStateBadge state={device.state} />
              </div>
              <StateStrip
                ariaLabel="Device lifecycle"
                states={DEVICE_STATES}
                current={device.state}
              />
              {device.lastError === null ? null : (
                <Callout tone="fail" title={`Last error: ${device.lastError.code}`} role="alert">
                  {device.lastError.message}
                </Callout>
              )}
            </div>
          </Panel>

          <div className="grid grid--2">
            <Panel title="Identity">
              {device.identity === null ? (
                <p className="mdx-muted" style={{ margin: 0 }}>
                  No device connected.
                </p>
              ) : (
                <KeyValueList
                  items={[
                    { label: "Model", value: device.identity.model },
                    { label: "Firmware", value: device.identity.firmwareVersion, mono: true },
                    {
                      label: "Bitstream checksum",
                      value: device.identity.bitstreamChecksum,
                      mono: true,
                    },
                  ]}
                />
              )}
            </Panel>
            <Panel title="Telemetry snapshot">
              <KeyValueList
                items={[
                  {
                    label: "Temperature",
                    value:
                      device.temperatureC === null ? "—" : `${device.temperatureC.toFixed(1)} °C`,
                    mono: true,
                  },
                  {
                    label: "Power",
                    value: device.powerW === null ? "—" : `${device.powerW.toFixed(1)} W`,
                    mono: true,
                  },
                  {
                    label: "Clock",
                    value: device.clockMHz === null ? "—" : `${device.clockMHz} MHz`,
                    mono: true,
                  },
                  {
                    label: "PCIe link",
                    value:
                      device.link === null
                        ? "—"
                        : `Gen${device.link.generation} x${device.link.lanes} (${device.link.status})`,
                    mono: true,
                  },
                  {
                    label: "Watchdog",
                    value: `${device.watchdog.state} (timeout ${device.watchdog.timeoutMs} ms)`,
                  },
                ]}
              />
            </Panel>
          </div>
        </>
      )}

      <Panel title="Device lifecycle (reference)" flush>
        <DataTable
          caption="Device state transitions"
          columns={COLUMNS}
          rows={TRANSITIONS}
          getRowKey={(row) => row.state}
        />
      </Panel>
    </div>
  );
}
