import type { JobRecord } from "@mdx-studio/protocol";
import { isMockRuntime } from "@mdx-studio/runtime-client";
import { Callout } from "@mdx-studio/ui";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useJobEvents, useJobs, useTelemetry } from "../../hooks/use-live";
import { isLiveJob, orderJobs, sampleInterval, series } from "../../services/telemetry";
import { ErrorNotice, PageHeader } from "../common";
import { DashLink } from "../dashboard/DashLink";
import { EventLogPanel } from "./EventLogPanel";
import { HardwarePanel } from "./HardwarePanel";
import { HostPanel } from "./HostPanel";
import { MdxPipelinePanel } from "./MdxPipelinePanel";
import { MonitorIdle } from "./MonitorIdle";
import { SimulationHero } from "./SimulationHero";
import { ThermoPanel } from "./ThermoPanel";
import { TracePanel } from "./TracePanel";
import { RunControls } from "./RunControls";
import "./monitor.css";

/**
 * Live monitor for one run, recomposed in the Patina language. It plots exactly what the runtime
 * sends; the only client-side processing is the labelled window statistics.
 */
export function MonitorView() {
  const runtime = useRuntime();
  const [params, setParams] = useSearchParams();
  const { jobs, loaded } = useJobs();
  const ordered = orderJobs(jobs);
  const requested = params.get("job");
  const liveJob = ordered.find(isLiveJob);
  // The run being followed automatically. It stays on screen after it ends (so a stop or a
  // fault is visible), but a newly started live run takes over.
  const [followedId, setFollowedId] = useState<string | null>(null);
  if (requested === null && liveJob !== undefined && liveJob.id !== followedId) {
    setFollowedId(liveJob.id);
  }
  // Explicit selection wins; then the live run; then the run that was being followed. Never
  // default to an arbitrary finished run.
  const job =
    requested === null
      ? (liveJob ?? ordered.find((candidate) => candidate.id === followedId))
      : ordered.find((candidate) => candidate.id === requested);

  const history = useTelemetry(job?.id);
  const events = useJobEvents(job?.id);
  const [stopError, setStopError] = useState<Error>();

  if (!loaded) return <p className="mdx-muted">Loading runs…</p>;

  const latest = history[history.length - 1];
  const interval = sampleInterval(history);
  const live = job?.state === "RUNNING";

  async function stop(target: JobRecord) {
    setStopError(undefined);
    try {
      await runtime.stopJob(target.id);
    } catch (error: unknown) {
      setStopError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const controls = (
    <RunControls
      jobs={ordered}
      selected={job}
      onSelect={(jobId) => {
        setParams({ job: jobId });
      }}
      onStop={stop}
    />
  );

  return (
    <div className="stack mon">
      <PageHeader
        eyebrow="Live monitor"
        title="Monitor"
        {...(job === undefined ? {} : { origin: job.origin })}
        subtitle={
          job === undefined ? undefined : (
            <span className="mon-subtitle">
              <span className="mdx-mono">{job.id}</span>
              <span>
                {job.request.runMode} · {job.request.projectId} / {job.request.stage}
              </span>
              <DashLink to={`/runs/${job.runId}`}>Provenance</DashLink>
            </span>
          )
        }
        actions={controls}
      />

      {stopError === undefined ? null : (
        <ErrorNotice error={stopError} title="Could not stop the run" />
      )}
      {job?.failure == null ? null : (
        <Callout tone="fail" title="Run failed" role="alert">
          {job.failure.message}
        </Callout>
      )}

      {job === undefined ? (
        <MonitorIdle demoRuntime={isMockRuntime(runtime)} pastRuns={ordered.length} />
      ) : (
        <div className="mon-grid">
          <SimulationHero job={job} progress={latest?.simulation ?? null} latest={latest} />
          <TracePanel
            title="Throughput"
            description="Trajectory ns per wall-clock day"
            className="mon-throughput"
            values={series(history, (s) => s.simulation?.nsPerDay)}
            unit="ns/day"
            precision={0}
            minRelativeSpan={0.06}
            chartHeight={236}
            live={live}
            interval={interval}
            origin={latest?.origin ?? job.origin}
          />

          {latest?.gromacs == null ? null : (
            <ThermoPanel
              live={live}
              interval={interval}
              origin={latest.origin}
              neighborListRebuilds={latest.gromacs.neighborListRebuilds}
              channels={[
                {
                  label: "Temperature",
                  unit: "K",
                  precision: 2,
                  values: series(history, (s) => s.gromacs?.temperatureK),
                },
                {
                  label: "Pressure",
                  unit: "bar",
                  precision: 1,
                  values: series(history, (s) => s.gromacs?.pressureBar),
                },
                {
                  label: "Potential energy",
                  unit: "kJ/mol",
                  precision: 0,
                  values: series(history, (s) => s.gromacs?.potentialEnergyKJMol),
                },
                {
                  label: "Total energy",
                  unit: "kJ/mol",
                  precision: 0,
                  values: series(history, (s) => s.gromacs?.totalEnergyKJMol),
                },
              ]}
            />
          )}

          {latest?.mdx == null ? null : (
            <MdxPipelinePanel
              mdx={latest.mdx}
              pairThroughput={series(history, (s) => s.mdx?.pairThroughputGPairsPerSecond)}
              live={live}
              interval={interval}
              origin={latest.origin}
            />
          )}
          {latest?.hardware == null ? null : (
            <HardwarePanel
              hardware={latest.hardware}
              temperature={series(history, (s) => s.hardware?.temperatureC)}
              power={series(history, (s) => s.hardware?.powerW)}
              live={live}
              interval={interval}
              origin={latest.origin}
            />
          )}
          {latest?.mdx === null && job.request.runMode === "native" ? (
            <p className="mon-note">
              Native GROMACS run: the MDX pipeline and accelerator are not involved.{" "}
              <Link className="link" to="/devices">
                Device status
              </Link>
            </p>
          ) : null}

          <EventLogPanel events={events} />
          {latest === undefined ? null : (
            <HostPanel
              host={latest.host}
              cpu={series(history, (s) => s.host.cpuUtilization * 100)}
              live={live}
              interval={interval}
              origin={latest.origin}
            />
          )}
        </div>
      )}
    </div>
  );
}
