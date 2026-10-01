import { Panel, RdfCurveMotif } from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { DashLink } from "../dashboard/DashLink";

/** Shown when no run is live and none is selected: never present an old run as current. */
export function MonitorIdle({ demoRuntime, pastRuns }: { demoRuntime: boolean; pastRuns: number }) {
  return (
    <Panel
      title="Live monitor"
      variant="hero"
      className="mon-card mon-idle"
      motif={<RdfCurveMotif className="mon-idle__rdf" fade="left" strength="strong" />}
    >
      <div className="mon-idle__body">
        <p className="mon-idle__title">No run in progress.</p>
        <p className="mdx-muted mon-idle__text">
          Live telemetry appears here while the runtime reports a queued or running job.
          {pastRuns > 0
            ? ` ${String(pastRuns)} finished run${pastRuns === 1 ? "" : "s"} can be inspected with the Run picker above.`
            : ""}
        </p>
        <div className="mon-idle__actions">
          <Link className="mdx-button" to="/simulation/setup">
            Set up a simulation
          </Link>
          {demoRuntime ? <DashLink to="/settings">Preview a demo run in progress</DashLink> : null}
        </div>
      </div>
    </Panel>
  );
}
