import type { JobRecord, TelemetrySnapshot } from "@mdx-studio/protocol";
import { OriginBadge, Panel, TraceChart, formatSpan } from "@mdx-studio/ui";
import { sampleInterval } from "../../services/telemetry";

/** Standalone ns/day telemetry for the active run: smoked-plum trace (not a comparison). */
export function ThroughputCard({
  job,
  history,
}: {
  job: JobRecord | undefined;
  history: readonly TelemetrySnapshot[];
}) {
  const values = history.map((s) => s.simulation?.nsPerDay ?? Number.NaN);
  const finite = values.filter((v) => Number.isFinite(v));
  const latest = finite[finite.length - 1];
  const origin = history[history.length - 1]?.origin;
  const interval = sampleInterval(history);

  return (
    <Panel
      title="Throughput"
      className="dash-card dash-throughput"
      description="Trajectory ns per wall-clock day, rolling window"
      actions={origin === undefined ? undefined : <OriginBadge origin={origin} />}
    >
      {job === undefined ? (
        <div className="dash-throughput__body">
          <p className="mdx-muted" style={{ margin: 0 }}>
            Throughput is reported while a run is in progress.
          </p>
          <TraceChart
            title="Throughput history"
            values={[]}
            height={150}
            emptyLabel="No active run"
          />
        </div>
      ) : latest === undefined ? (
        <p className="mdx-muted" style={{ margin: 0 }} role="status">
          Waiting for telemetry ({job.state}).
        </p>
      ) : (
        <div className="dash-throughput__body">
          <div className="dash-throughput__head">
            <p className="dash-readout-lg mdx-num">
              {latest.toFixed(0)}
              <span className="dash-unit">ns/day</span>
            </p>
            <dl className="dash-throughput__range">
              <div>
                <dt>min</dt>
                <dd className="mdx-num">{Math.min(...finite).toFixed(0)}</dd>
              </div>
              <div>
                <dt>max</dt>
                <dd className="mdx-num">{Math.max(...finite).toFixed(0)}</dd>
              </div>
              <div>
                <dt>window</dt>
                <dd className="mdx-num">{formatSpan(Math.max(0, values.length - 1) * interval)}</dd>
              </div>
            </dl>
          </div>
          <TraceChart
            title="Throughput history"
            unit="ns/day"
            precision={0}
            values={values}
            area
            tone="trace"
            live={job.state === "RUNNING"}
            sampleIntervalSeconds={interval}
            minRelativeSpan={0.06}
            height={118}
          />
        </div>
      )}
    </Panel>
  );
}
