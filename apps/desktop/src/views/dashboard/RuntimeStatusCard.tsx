import type { MdxDeviceStatus, RuntimeCapabilities, RuntimeHealth } from "@mdx-studio/protocol";
import { KeyValueList, OriginBadge, Panel, StatusDot, type BadgeTone } from "@mdx-studio/ui";
import type { ReactNode } from "react";
import { Loading } from "../common";
import { DeviceStateBadge } from "../state-tone";

const HEALTH_TONE: Record<RuntimeHealth["status"], BadgeTone> = {
  ok: "pass",
  degraded: "warn",
  unavailable: "fail",
};

function ToolRow({
  name,
  origin,
  status,
  children,
}: {
  name: string;
  origin: ReactNode;
  status: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dash-runtime__tool">
      <div className="dash-runtime__head">
        <strong className="dash-runtime__name">{name}</strong>
        <span className="dash-runtime__status">{status}</span>
        <span className="dash-runtime__origin">{origin}</span>
      </div>
      <div className="dash-runtime__facts">{children}</div>
    </div>
  );
}

/** Toolchain strip: GROMACS, MDX runtime and MDX device, each with its own provenance chip. */
export function RuntimeStatusCard({
  health,
  capabilities,
  device,
}: {
  health: RuntimeHealth | undefined;
  capabilities: RuntimeCapabilities | undefined;
  device: MdxDeviceStatus | undefined;
}) {
  return (
    <Panel title="Runtime status" className="dash-card dash-runtime">
      {health === undefined || capabilities === undefined ? (
        <Loading what="runtime status" />
      ) : (
        <div className="dash-runtime__list">
          <ToolRow
            name="GROMACS"
            origin={<OriginBadge origin={capabilities.gromacs.origin} />}
            status={
              <StatusDot tone={capabilities.gromacs.detected ? "pass" : "warn"}>
                {capabilities.gromacs.detected ? "Detected" : "Not detected"}
              </StatusDot>
            }
          >
            <KeyValueList
              items={[{ label: "Version", value: capabilities.gromacs.version ?? "—", mono: true }]}
            />
          </ToolRow>
          <ToolRow
            name="MDX runtime"
            origin={<OriginBadge origin={health.origin} />}
            status={<StatusDot tone={HEALTH_TONE[health.status]}>Health {health.status}</StatusDot>}
          >
            <KeyValueList
              items={[
                { label: "Implementation", value: health.implementation, mono: true },
                { label: "Version", value: health.runtimeVersion, mono: true },
                { label: "Protocol", value: health.protocolVersion, mono: true },
              ]}
            />
          </ToolRow>
          <ToolRow
            name="MDX device"
            origin={<OriginBadge origin={capabilities.mdxDevice.origin} />}
            status={
              device === undefined ? (
                <span className="mdx-faint">…</span>
              ) : (
                <DeviceStateBadge state={device.state} appearance="plain" />
              )
            }
          >
            <KeyValueList
              items={[
                { label: "Model", value: device?.identity?.model ?? "—" },
                {
                  label: "Integration",
                  value: capabilities.mdxDevice.integration,
                  mono: true,
                },
              ]}
            />
          </ToolRow>
        </div>
      )}
    </Panel>
  );
}
