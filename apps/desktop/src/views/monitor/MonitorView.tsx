import type { JobRecord, TelemetrySnapshot } from "@mdx-studio/protocol";
import {
  Badge,
  Button,
  Callout,
  Field,
  KeyValueList,
  LineChart,
  MetricTile,
  OriginBadge,
  Panel,
  ProgressBar,
} from "@mdx-studio/ui";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useJobEvents, useJobs, useTelemetry } from "../../hooks/use-live";
import {
  formatBytes,
  formatDuration,
  formatNs,
  formatPercent,
  formatTimestamp,
} from "../../services/format";
import { ErrorNotice, PageHeader } from "../common";
import { DeviceStateBadge, JobStateBadge } from "../state-tone";

const TERMINAL = ["COMPLETED", "FAILED", "ABORTED"];

function sortedJobs(jobs: readonly JobRecord[]): JobRecord[] {
  return [...jobs].sort((a, b) => {
    const aLive = TERMINAL.includes(a.state) ? 1 : 0;
    const bLive = TERMINAL.includes(b.state) ? 1 : 0;
    return aLive - bLive || b.createdAt.localeCompare(a.createdAt);
  });
}

function pick(
  history: readonly TelemetrySnapshot[],
  select: (snapshot: TelemetrySnapshot) => number | null | undefined,
): number[] {
  return history.flatMap((snapshot) => {
    const value = select(snapshot);
    return value === null || value === undefined ? [] : [value];
  });
}

export function MonitorView() {
  const runtime = useRuntime();
  const [params, setParams] = useSearchParams();
  const { jobs, loaded } = useJobs();
  const ordered = sortedJobs(jobs);
  const requested = params.get("job");
  const job = ordered.find((entry) => entry.id === requested) ?? ordered[0];

  const history = useTelemetry(job?.id);
  const events = useJobEvents(job?.id);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [stopError, setStopError] = useState<Error>();

  if (!loaded) return <p className="mdx-muted">Loading jobs&hellip;</p>;
  if (job === undefined) {
    return (
      <div className="stack">
        <PageHeader title="Monitor" />
        <Callout tone="info" title="No runs to monitor">
          Start a simulation from{" "}
          <Link className="link" to="/simulation/setup">
            Simulation
          </Link>{" "}
          to see live telemetry.
        </Callout>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const sim = latest?.simulation ?? null;
  const canStop = job.allowedActions.includes("stop");

  async function stop(target: JobRecord) {
    setStopError(undefined);
    try {
      await runtime.stopJob(target.id);
    } catch (error: unknown) {
      setStopError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setConfirmingStop(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Monitor"
        origin={job.origin}
        subtitle={
          <>
            <span className="mdx-mono">{job.id}</span> &middot; {job.request.runMode} &middot;{" "}
            {job.request.projectId} / {job.request.stage} &middot;{" "}
            <Link className="link" to={`/runs/${job.runId}`}>
              provenance
            </Link>
          </>
        }
        actions={
          <>
            <JobStateBadge state={job.state} />
            {canStop ? (
              confirmingStop ? (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      void stop(job);
                    }}
                  >
                    Confirm stop
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmingStop(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmingStop(true);
                  }}
                >
                  Stop run
                </Button>
              )
            ) : null}
          </>
        }
      />

      {stopError === undefined ? null : (
        <ErrorNotice error={stopError} title="Could not stop the run" />
      )}

      {job.failure === null ? null : (
        <Callout tone="fail" title="Run failed" role="alert">
          {job.failure.message}
        </Callout>
      )}

      <Panel title="Select run">
        <Field label="Run">
          <select
            className="mdx-select"
            value={job.id}
            onChange={(event) => {
              setParams({ job: event.target.value });
              setConfirmingStop(false);
            }}
          >
            {ordered.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id} &mdash; {entry.request.runMode} {entry.request.stage} ({entry.state})
              </option>
            ))}
          </select>
        </Field>
      </Panel>

      <Panel
        title="Simulation"
        actions={latest === undefined ? null : <OriginBadge origin={latest.origin} />}
      >
        {sim === null ? (
          <p className="mdx-muted" style={{ margin: 0 }} role="status">
            Waiting for telemetry (job is {job.state}).
          </p>
        ) : (
          <div className="stack">
            <ProgressBar
              label="Progress"
              value={sim.progress}
              detail={`${formatNs(sim.timeNs)} / ${formatNs(sim.targetTimeNs)} ns · ${formatPercent(sim.progress)}`}
            />
            <div className="grid grid--4">
              <MetricTile label="Step" value={sim.step.toLocaleString("en-US")} />
              <MetricTile
                label="Simulation time"
                value={formatNs(sim.timeNs)}
                unit="ns"
                hint={`target ${formatNs(sim.targetTimeNs)} ns`}
              />
              <MetricTile label="Throughput" value={sim.nsPerDay.toFixed(0)} unit="ns/day" />
              <MetricTile label="ETA" value={formatDuration(sim.etaSeconds)} />
            </div>
          </div>
        )}
      </Panel>

      {latest?.gromacs == null ? null : (
        <Panel title="GROMACS" actions={<OriginBadge origin={latest.origin} />}>
          <div className="grid grid--4">
            <LineChart
              title="Temperature"
              unit="K"
              precision={2}
              series={[{ label: "T", values: pick(history, (s) => s.gromacs?.temperatureK) }]}
            />
            <LineChart
              title="Pressure"
              unit="bar"
              precision={0}
              series={[{ label: "P", values: pick(history, (s) => s.gromacs?.pressureBar) }]}
            />
            <LineChart
              title="Potential energy"
              unit="kJ/mol"
              precision={0}
              series={[
                { label: "Epot", values: pick(history, (s) => s.gromacs?.potentialEnergyKJMol) },
              ]}
            />
            <LineChart
              title="Total energy"
              unit="kJ/mol"
              precision={0}
              series={[
                { label: "Etot", values: pick(history, (s) => s.gromacs?.totalEnergyKJMol) },
              ]}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <KeyValueList
              items={[
                {
                  label: "Neighbor-list rebuilds",
                  value: latest.gromacs.neighborListRebuilds.toLocaleString("en-US"),
                  mono: true,
                },
              ]}
            />
          </div>
        </Panel>
      )}

      {latest?.mdx == null ? null : (
        <Panel title="MDX" actions={<OriginBadge origin={latest.origin} />}>
          <div className="stack">
            <div className="row">
              <DeviceStateBadge state={latest.mdx.deviceState} />
              <Badge tone={latest.mdx.watchdog === "TRIPPED" ? "fail" : "neutral"}>
                Watchdog {latest.mdx.watchdog}
              </Badge>
              <Badge tone={latest.mdx.errorCount > 0 ? "fail" : "pass"}>
                {latest.mdx.errorCount} errors
              </Badge>
            </div>
            <div className="grid grid--4">
              <LineChart
                title="Utilization"
                unit="%"
                yDomain={[0, 100]}
                series={[
                  {
                    label: "util",
                    values: pick(history, (s) => (s.mdx === null ? null : s.mdx.utilization * 100)),
                  },
                ]}
              />
              <LineChart
                title="Pair throughput"
                unit="Gpairs/s"
                series={[
                  {
                    label: "pairs",
                    values: pick(history, (s) => s.mdx?.pairThroughputGPairsPerSecond),
                  },
                ]}
              />
              <LineChart
                title="Queue occupancy"
                unit="%"
                yDomain={[0, 100]}
                series={[
                  {
                    label: "queue",
                    values: pick(history, (s) =>
                      s.mdx === null ? null : s.mdx.queueOccupancy * 100,
                    ),
                  },
                ]}
              />
              <LineChart
                title="Backpressure"
                unit="%"
                yDomain={[0, 100]}
                series={[
                  {
                    label: "bp",
                    values: pick(history, (s) =>
                      s.mdx === null ? null : s.mdx.backpressure * 100,
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </Panel>
      )}

      {latest?.hardware == null ? null : (
        <Panel title="Hardware" actions={<OriginBadge origin={latest.origin} />}>
          <div className="grid grid--4">
            <LineChart
              title="Device temperature"
              unit="°C"
              series={[{ label: "T", values: pick(history, (s) => s.hardware?.temperatureC) }]}
            />
            <LineChart
              title="Power"
              unit="W"
              series={[{ label: "P", values: pick(history, (s) => s.hardware?.powerW) }]}
            />
            <MetricTile label="Clock" value={latest.hardware.clockMHz} unit="MHz" />
            <MetricTile
              label="PCIe link"
              value={`Gen${latest.hardware.pcieLink.generation} x${latest.hardware.pcieLink.lanes}`}
              hint={`link ${latest.hardware.pcieLink.status}`}
              tone={latest.hardware.pcieLink.status === "up" ? undefined : "warn"}
            />
          </div>
        </Panel>
      )}

      {latest === undefined ? null : (
        <Panel title="Host" actions={<OriginBadge origin={latest.origin} />}>
          <div className="grid grid--4">
            <LineChart
              title="CPU"
              unit="%"
              yDomain={[0, 100]}
              series={[{ label: "cpu", values: pick(history, (s) => s.host.cpuUtilization * 100) }]}
            />
            <MetricTile
              label="Memory"
              value={formatBytes(latest.host.memoryUsedBytes)}
              hint={`of ${formatBytes(latest.host.memoryTotalBytes)}`}
            />
            <MetricTile label="GPU" value="—" hint="not reported yet" />
          </div>
        </Panel>
      )}

      <Panel title="Event log" flush>
        {events.length === 0 ? (
          <p className="mdx-muted" style={{ padding: 16, margin: 0 }}>
            No events yet.
          </p>
        ) : (
          <ol className="event-log" aria-label="Job events">
            {events.map((event) => (
              <li key={event.sequence}>
                <span className="mdx-faint">{formatTimestamp(event.timestamp)}</span>{" "}
                {event.type === "state-changed"
                  ? `${event.from} → ${event.to}${event.reason === null ? "" : ` (${event.reason})`}`
                  : event.type === "log"
                    ? event.message
                    : `ERROR ${event.error.message}`}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
