import type { JobRecord, RunSummary, SimulationProgress } from "@mdx-studio/protocol";
import {
  OriginBadge,
  Panel,
  ParticleFieldMotif,
  RdfCurveMotif,
  TrajectoryRuler,
  UnitCellMotif,
} from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { formatDuration, formatNs } from "../../services/format";
import { rulerAxisLabels } from "../../services/telemetry";
import { SimulatedRunNotice, Timestamp } from "../common";
import { JobStateBadge } from "../state-tone";
import { DashLink } from "./DashLink";

function LiveBody({ job, progress }: { job: JobRecord; progress: SimulationProgress }) {
  return (
    <div className="dash-active__live">
      <div className="dash-active__readout">
        <div>
          <p className="mdx-eyebrow dash-active__eyebrow">Simulation time</p>
          <p className="dash-active__time mdx-num">
            {formatNs(progress.timeNs)}
            <span className="dash-active__target"> / {formatNs(progress.targetTimeNs)} ns</span>
          </p>
        </div>
        <p className="dash-active__percent mdx-num">
          {(progress.progress * 100).toFixed(2)}
          <span className="dash-active__percent-unit">%</span>
        </p>
      </div>
      <TrajectoryRuler
        label="Simulation"
        value={progress.progress}
        axisLabels={rulerAxisLabels(progress.targetTimeNs)}
      />
      <dl className="dash-stats">
        <div>
          <dt>Step</dt>
          <dd className="mdx-num">{progress.step.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>Throughput</dt>
          <dd className="mdx-num">
            {progress.nsPerDay.toFixed(0)}
            <span className="dash-unit">ns/day</span>
          </dd>
        </div>
        <div>
          <dt>ETA</dt>
          <dd className="mdx-num">{formatDuration(progress.etaSeconds)}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>
            {job.request.runMode}
            <span className="dash-unit">{job.request.stage}</span>
          </dd>
        </div>
      </dl>
      <div className="dash-active__links">
        <DashLink to={`/monitor?job=${job.id}`}>Open monitor</DashLink>
        <DashLink to={`/runs/${job.runId}`}>Provenance</DashLink>
      </div>
    </div>
  );
}

function IdleBody({
  lastRun,
  demoRuntime,
}: {
  lastRun: RunSummary | undefined;
  demoRuntime: boolean;
}) {
  return (
    <div className="dash-active__idle">
      <p className="dash-active__idle-title">No run in progress.</p>
      <p className="mdx-muted dash-active__idle-text">
        The runtime reports no queued or running job. Configure inputs, MDP and run mode, then run
        pre-flight checks before starting.
      </p>
      {lastRun === undefined ? null : (
        <p className="mdx-muted dash-active__idle-text">
          Last run{" "}
          <Link className="link mdx-mono" to={`/runs/${lastRun.runId}`}>
            {lastRun.runId}
          </Link>{" "}
          · {lastRun.stage} · {lastRun.status} · <Timestamp iso={lastRun.startedAt} /> UTC
        </p>
      )}
      <div className="dash-active__idle-actions">
        <Link className="mdx-button" to="/simulation/setup">
          Set up a simulation
        </Link>
        {demoRuntime ? <DashLink to="/settings">Preview a demo run in progress</DashLink> : null}
      </div>
    </div>
  );
}

export function ActiveRunCard({
  job,
  progress,
  lastRun,
  demoRuntime,
}: {
  job: JobRecord | undefined;
  progress: SimulationProgress | null;
  lastRun: RunSummary | undefined;
  /** The demo runtime is active, so its scenario controls can offer a seeded run. */
  demoRuntime: boolean;
}) {
  const motif =
    job === undefined ? (
      <RdfCurveMotif className="dash-active__rdf" fade="left" strength="strong" />
    ) : (
      <>
        <ParticleFieldMotif className="dash-active__particles" fade="left" />
        <UnitCellMotif className="dash-active__cell" fade="left" strength="strong" />
      </>
    );

  return (
    <Panel
      title="Active run"
      variant="hero"
      className="dash-card dash-active"
      motif={motif}
      description={
        job === undefined ? undefined : (
          <>
            <span className="mdx-mono">{job.id}</span> · {job.request.projectId}
          </>
        )
      }
      actions={
        job === undefined ? undefined : (
          <>
            <JobStateBadge state={job.state} appearance="plain" />
            <OriginBadge origin={job.origin} />
          </>
        )
      }
    >
      {job === undefined ? (
        <IdleBody lastRun={lastRun} demoRuntime={demoRuntime} />
      ) : (
        <div className="dash-active__body">
          <SimulatedRunNotice origin={job.origin} />
          {progress === null ? (
            <p className="mdx-muted" style={{ margin: 0 }} role="status">
              Waiting for telemetry ({job.state}).
            </p>
          ) : (
            <LiveBody job={job} progress={progress} />
          )}
        </div>
      )}
    </Panel>
  );
}
