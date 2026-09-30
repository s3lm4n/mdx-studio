import type { PreflightCheck, PreflightReport } from "@mdx-studio/protocol";
import {
  Badge,
  DataTable,
  OriginBadge,
  Panel,
  StatusPill,
  type DataTableColumn,
} from "@mdx-studio/ui";
import { ErrorNotice } from "../common";

const COLUMNS: readonly DataTableColumn<PreflightCheck>[] = [
  {
    key: "title",
    header: "Check",
    render: (check) => (
      <span>
        {check.title}
        {check.critical ? (
          <span className="mdx-faint" title="A FAIL on this check blocks start">
            {" "}
            (critical)
          </span>
        ) : null}
      </span>
    ),
  },
  { key: "status", header: "Result", render: (check) => <StatusPill status={check.status} /> },
  {
    key: "detail",
    header: "Detail",
    render: (check) => <span className="mdx-muted">{check.detail}</span>,
  },
];

export interface PreflightPanelProps {
  report: PreflightReport | undefined;
  pending: boolean;
  error: Error | undefined;
  /** True when the displayed report no longer matches the current form. */
  stale: boolean;
  onRerun: () => void;
}

/** Renders the runtime's pre-flight report. It displays `startPermitted`; it never computes it. */
export function PreflightPanel({ report, pending, error, stale, onRerun }: PreflightPanelProps) {
  return (
    <Panel
      title="Pre-flight"
      flush
      actions={
        <>
          {report === undefined ? null : <OriginBadge origin={report.origin} />}
          <button type="button" className="mdx-button mdx-button--ghost" onClick={onRerun}>
            Re-run
          </button>
        </>
      }
    >
      {error !== undefined ? (
        <div style={{ padding: 16 }}>
          <ErrorNotice error={error} title="Pre-flight could not run" />
        </div>
      ) : null}
      {report === undefined ? (
        error === undefined ? (
          <p className="mdx-muted" style={{ padding: 16, margin: 0 }} role="status">
            {pending ? "Running pre-flight…" : "Complete the form to run pre-flight."}
          </p>
        ) : null
      ) : (
        <>
          <div className="row" style={{ padding: "12px 16px" }} role="status">
            <span>Verdict</span>
            <StatusPill status={report.verdict} />
            {report.startPermitted ? (
              <Badge tone="pass">Start permitted</Badge>
            ) : (
              <Badge tone="fail">Start blocked</Badge>
            )}
            {stale || pending ? <span className="mdx-muted">updating&hellip;</span> : null}
            {report.blockingCheckIds.length > 0 ? (
              <span className="mdx-muted">
                Blocking: <span className="mdx-mono">{report.blockingCheckIds.join(", ")}</span>
              </span>
            ) : null}
          </div>
          <DataTable
            caption="Pre-flight checks"
            columns={COLUMNS}
            rows={report.checks}
            getRowKey={(check) => check.id}
          />
        </>
      )}
    </Panel>
  );
}
