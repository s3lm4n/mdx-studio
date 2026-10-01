import {
  JOB_STATES,
  type JobRecord,
  type SimulationProgress,
  type TelemetrySnapshot,
} from "@mdx-studio/protocol";
import {
  OriginBadge,
  Panel,
  ParticleFieldMotif,
  StateStrip,
  TrajectoryRuler,
  UnitCellMotif,
} from "@mdx-studio/ui";
import { formatDuration, formatNs } from "../../services/format";
import { isLiveJob, rulerAxisLabels } from "../../services/telemetry";
import { SimulatedRunNotice, Timestamp } from "../common";
import { Readout } from "./Readout";

function formatElapsed(seconds: number | null): string | null {
  return seconds === null ? null : formatDuration(seconds);
}

/** States a job passes through on the way to RUNNING, shown while there is no telemetry yet. */
const LIFECYCLE = JOB_STATES.filter((state) => state !== "PAUSED");

/**
 * Wall-clock time between the runtime's start record and its latest sample. Derived only from
 * runtime timestamps, so it is consistent with the runtime's clock, not the desktop's.
 */
export function elapsedWallSeconds(
  job: JobRecord,
  latest: TelemetrySnapshot | undefined,
): number | null {
  if (job.startedAt === null || latest === undefined) return null;
  const seconds = (Date.parse(latest.timestamp) - Date.parse(job.startedAt)) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** Focal card: simulated time against target, with the run's lifecycle while it spins up. */
export function SimulationHero({
  job,
  progress,
  latest,
}: {
  job: JobRecord;
  progress: SimulationProgress | null;
  latest: TelemetrySnapshot | undefined;
}) {
  return (
    <Panel
      title="Simulation"
      variant="hero"
      className="mon-card mon-hero"
      description={
        job.startedAt === null ? (
          "Not started yet"
        ) : (
          <>
            Started <Timestamp iso={job.startedAt} /> UTC
          </>
        )
      }
      actions={<OriginBadge origin={job.origin} />}
      motif={
        <>
          <ParticleFieldMotif className="mon-hero__particles" fade="left" />
          <UnitCellMotif className="mon-hero__cell" fade="left" strength="strong" />
        </>
      }
    >
      <div className="mon-hero__body">
        <SimulatedRunNotice origin={job.origin} />
        {progress === null ? (
          <div className="mon-hero__waiting">
            <p className="mon-hero__waiting-title" role="status">
              {isLiveJob(job)
                ? `Waiting for telemetry (${job.state}).`
                : "No telemetry was recorded for this run in this session."}
            </p>
            <StateStrip ariaLabel="Job lifecycle" states={LIFECYCLE} current={job.state} />
          </div>
        ) : (
          <>
            <div className="mon-hero__readout">
              <p className="mdx-eyebrow mon-hero__eyebrow">Simulated time</p>
              <p className="mon-hero__time mdx-num">
                {formatNs(progress.timeNs)}
                <span className="mon-hero__target"> / {formatNs(progress.targetTimeNs)} ns</span>
              </p>
              <p className="mon-hero__percent mdx-num">
                {(progress.progress * 100).toFixed(2)} %<span> complete</span>
              </p>
            </div>
            <TrajectoryRuler
              label="Simulation progress"
              value={progress.progress}
              axisLabels={rulerAxisLabels(progress.targetTimeNs)}
            />
            <dl className="mon-hero__stats">
              <Readout label="Step" value={progress.step.toLocaleString("en-US")} />
              <Readout
                label="Elapsed (wall)"
                value={formatElapsed(elapsedWallSeconds(job, latest))}
              />
              <Readout label="ETA" value={formatDuration(progress.etaSeconds)} />
              <Readout label="Mode" value={job.request.runMode} unit={job.request.stage} />
            </dl>
          </>
        )}
      </div>
    </Panel>
  );
}
