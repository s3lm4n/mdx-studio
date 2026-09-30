import type { RunSummary } from "@mdx-studio/protocol";
import {
  Button,
  DataTable,
  KeyValueList,
  OriginBadge,
  Panel,
  ProgressBar,
  type DataTableColumn,
} from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useDeviceStatus, useJobs, useTelemetry } from "../../hooks/use-live";
import { formatDuration, formatNs, formatPercent } from "../../services/format";
import { ErrorNotice, Loading, PageHeader, Timestamp } from "../common";
import { DeviceStateBadge, RunStatusBadge, ValidationStatusBadge } from "../state-tone";

const RUN_COLUMNS: readonly DataTableColumn<RunSummary>[] = [
  {
    key: "run",
    header: "Run",
    render: (run) => (
      <Link className="link mdx-mono nowrap" to={`/runs/${run.runId}`}>
        {run.runId}
      </Link>
    ),
  },
  {
    key: "project",
    header: "Project",
    render: (run) => <span className="nowrap">{run.projectId}</span>,
  },
  {
    key: "stage",
    header: "Stage / mode",
    render: (run) => (
      <span>
        {run.stage} <span className="mdx-muted">&middot; {run.runMode}</span>
      </span>
    ),
  },
  { key: "status", header: "Status", render: (run) => <RunStatusBadge status={run.status} /> },
  {
    key: "validation",
    header: "Validation",
    render: (run) => <ValidationStatusBadge status={run.validationStatus} />,
  },
  { key: "started", header: "Started (UTC)", render: (run) => <Timestamp iso={run.startedAt} /> },
];

export function DashboardView() {
  const runtime = useRuntime();
  const { jobs } = useJobs();
  const device = useDeviceStatus();
  const jobsKey = jobs.map((job) => `${job.id}:${job.state}`).join("|");

  const health = useAsync(() => runtime.getHealth(), [runtime]);
  const capabilities = useAsync(() => runtime.getCapabilities(), [runtime]);
  const runs = useAsync(() => runtime.listRuns(), [runtime, jobsKey], { keepPrevious: true });

  const live = jobs.find((job) => !["COMPLETED", "FAILED", "ABORTED"].includes(job.state));
  const telemetry = useTelemetry(live?.id);
  const latest = telemetry[telemetry.length - 1]?.simulation ?? null;

  return (
    <div className="stack">
      <PageHeader
        title="Dashboard"
        subtitle="Runtime, toolchain and device overview."
        actions={
          <>
            <Button disabled title="Project creation needs the Phase 2 runtime service.">
              New project
            </Button>
            <Link className="mdx-button mdx-button--primary" to="/simulation/setup">
              New simulation
            </Link>
            <Link className="mdx-button" to="/simulation/setup?mode=validation">
              Validation run
            </Link>
          </>
        }
      />

      {health.error !== undefined ? (
        <ErrorNotice error={health.error} title="Runtime unreachable" />
      ) : null}
      {capabilities.error !== undefined ? <ErrorNotice error={capabilities.error} /> : null}

      <Panel title="Runtime status">
        {health.data === undefined || capabilities.data === undefined ? (
          <Loading what="runtime status" />
        ) : (
          <div className="grid grid--3">
            <div>
              <div className="row row--between">
                <strong>GROMACS</strong>
                <OriginBadge origin={capabilities.data.gromacs.origin} />
              </div>
              <KeyValueList
                items={[
                  {
                    label: "Status",
                    value: capabilities.data.gromacs.detected ? "Detected" : "Not detected",
                  },
                  { label: "Version", value: capabilities.data.gromacs.version ?? "—", mono: true },
                ]}
              />
            </div>
            <div>
              <div className="row row--between">
                <strong>MDX runtime</strong>
                <OriginBadge origin={health.data.origin} />
              </div>
              <KeyValueList
                items={[
                  { label: "Health", value: health.data.status },
                  { label: "Implementation", value: health.data.implementation, mono: true },
                  { label: "Version", value: health.data.runtimeVersion, mono: true },
                  { label: "Protocol", value: health.data.protocolVersion, mono: true },
                ]}
              />
            </div>
            <div>
              <div className="row row--between">
                <strong>MDX device</strong>
                <OriginBadge origin={capabilities.data.mdxDevice.origin} />
              </div>
              <KeyValueList
                items={[
                  {
                    label: "State",
                    value: device === undefined ? "…" : <DeviceStateBadge state={device.state} />,
                  },
                  { label: "Model", value: device?.identity?.model ?? "—" },
                  {
                    label: "Integration",
                    value: capabilities.data.mdxDevice.integration,
                    mono: true,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid--main-side">
        <Panel
          title="Recent runs"
          flush
          actions={
            <Link className="link" to="/projects">
              All projects
            </Link>
          }
        >
          {runs.data === undefined ? (
            <div style={{ padding: 16 }}>
              <Loading what="runs" />
            </div>
          ) : (
            <DataTable
              caption="Recent runs"
              columns={RUN_COLUMNS}
              rows={runs.data.slice(0, 6)}
              getRowKey={(run) => run.runId}
              emptyMessage="No runs yet."
            />
          )}
        </Panel>

        <div className="stack">
          <Panel
            title="Active run"
            actions={
              live === undefined ? undefined : (
                <Link className="link" to={`/monitor?job=${live.id}`}>
                  Monitor
                </Link>
              )
            }
          >
            {live === undefined ? (
              <p className="mdx-muted" style={{ margin: 0 }}>
                No run in progress.
              </p>
            ) : (
              <div className="stack">
                <div className="row row--between">
                  <span className="mdx-mono">{live.id}</span>
                  <OriginBadge origin={live.origin} />
                </div>
                {latest === null ? (
                  <p className="mdx-muted" style={{ margin: 0 }}>
                    Waiting for telemetry ({live.state}).
                  </p>
                ) : (
                  <>
                    <ProgressBar
                      label="Simulation"
                      value={latest.progress}
                      detail={`${formatNs(latest.timeNs)} / ${formatNs(latest.targetTimeNs)} ns · ${formatPercent(latest.progress)}`}
                    />
                    <KeyValueList
                      items={[
                        {
                          label: "Throughput",
                          value: `${latest.nsPerDay.toFixed(0)} ns/day`,
                          mono: true,
                        },
                        { label: "ETA", value: formatDuration(latest.etaSeconds), mono: true },
                      ]}
                    />
                  </>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Device"
            actions={
              <Link className="link" to="/devices">
                Details
              </Link>
            }
          >
            {device === undefined ? (
              <Loading what="device" />
            ) : (
              <div className="stack">
                <div className="row row--between">
                  <DeviceStateBadge state={device.state} />
                  <OriginBadge origin={device.origin} />
                </div>
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
                    { label: "Watchdog", value: device.watchdog.state },
                  ]}
                />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
