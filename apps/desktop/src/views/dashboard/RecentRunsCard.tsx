import type { RunSummary } from "@mdx-studio/protocol";
import { DataTable, Panel, type DataTableColumn } from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { Loading, Timestamp } from "../common";
import { RunStatusBadge, ValidationStatusBadge } from "../state-tone";
import { DashLink } from "./DashLink";

const RUN_COLUMNS: readonly DataTableColumn<RunSummary>[] = [
  {
    key: "run",
    header: "Run",
    render: (run) => (
      <Link className="dash-runs__id mdx-mono nowrap" to={`/runs/${run.runId}`}>
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
      <span className="nowrap">
        {run.stage} <span className="mdx-faint">&middot; {run.runMode}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (run) => <RunStatusBadge status={run.status} appearance="plain" />,
  },
  {
    key: "validation",
    header: "Validation",
    render: (run) => <ValidationStatusBadge status={run.validationStatus} appearance="plain" />,
  },
  {
    key: "started",
    header: "Started (UTC)",
    render: (run) => (
      <span className="mdx-num mdx-muted">
        <Timestamp iso={run.startedAt} />
      </span>
    ),
  },
];

export function RecentRunsCard({ runs }: { runs: readonly RunSummary[] | undefined }) {
  return (
    <Panel
      title="Recent runs"
      flush
      className="dash-card dash-runs"
      actions={<DashLink to="/projects">All projects</DashLink>}
    >
      {runs === undefined ? (
        <div style={{ padding: "0 20px 20px" }}>
          <Loading what="runs" />
        </div>
      ) : (
        <DataTable
          caption="Recent runs"
          columns={RUN_COLUMNS}
          rows={runs.slice(0, 6)}
          getRowKey={(run) => run.runId}
          emptyMessage="No runs yet."
        />
      )}
    </Panel>
  );
}
