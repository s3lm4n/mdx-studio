import type {
  GateResult,
  ValidationGate,
  ValidationProfile,
  ValidationResult,
} from "@mdx-studio/protocol";
import {
  Badge,
  Callout,
  DataTable,
  OriginBadge,
  Panel,
  StatusPill,
  type DataTableColumn,
} from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useJobs } from "../../hooks/use-live";
import { formatError, formatTimestamp } from "../../services/format";
import { ErrorNotice, Loading, PageHeader } from "../common";

const GATE_COLUMNS: readonly DataTableColumn<ValidationGate>[] = [
  { key: "quantity", header: "Quantity", render: (gate) => gate.quantity },
  {
    key: "description",
    header: "Gate",
    render: (gate) => <span className="mdx-muted">{gate.description}</span>,
  },
  {
    key: "max",
    header: "Allowed max error",
    align: "right",
    render: (gate) => <span className="mdx-mono">{formatError(gate.maxAbsoluteError)}</span>,
  },
  { key: "unit", header: "Unit", render: (gate) => <span className="mdx-mono">{gate.unit}</span> },
];

const RESULT_COLUMNS: readonly DataTableColumn<GateResult>[] = [
  { key: "quantity", header: "Quantity", render: (gate) => gate.quantity },
  {
    key: "observed",
    header: "Observed max error",
    align: "right",
    render: (gate) => <span className="mdx-mono">{formatError(gate.observedMaxError)}</span>,
  },
  {
    key: "allowed",
    header: "Allowed (runtime)",
    align: "right",
    render: (gate) => <span className="mdx-mono">{formatError(gate.maxAbsoluteError)}</span>,
  },
  { key: "unit", header: "Unit", render: (gate) => <span className="mdx-mono">{gate.unit}</span> },
  {
    key: "result",
    header: "Gate",
    // `passed` is decided by the runtime. The UI never compares observed against allowed.
    render: (gate) =>
      gate.passed === null ? (
        <Badge tone="info">PENDING</Badge>
      ) : (
        <StatusPill status={gate.passed ? "PASS" : "FAIL"} />
      ),
  },
];

function ProfileStatus({ status }: { status: ValidationProfile["status"] }) {
  const tone = status === "qualified" ? "pass" : status === "experimental" ? "info" : "warn";
  return <Badge tone={tone}>{status.toUpperCase()}</Badge>;
}

function ResultPanel({ result }: { result: ValidationResult }) {
  return (
    <Panel
      title={`Result · ${result.projectId}`}
      flush
      actions={
        <>
          <OriginBadge origin={result.origin} />
          {result.status === "pending" ? (
            <Badge tone="info">PENDING</Badge>
          ) : (
            <StatusPill status={result.status === "passed" ? "PASS" : "FAIL"} />
          )}
        </>
      }
    >
      <div className="row" style={{ padding: "10px 16px" }}>
        <Link className="link mdx-mono nowrap" to={`/monitor?job=${result.jobId}`}>
          {result.jobId}
        </Link>
        <span className="mdx-muted">
          profile <span className="mdx-mono">{result.profileId}</span> v{result.profileVersion}
        </span>
        <span className="mdx-muted">{formatTimestamp(result.completedAt)}</span>
      </div>
      <DataTable
        caption={`Validation gates for ${result.jobId}`}
        columns={RESULT_COLUMNS}
        rows={result.gates}
        getRowKey={(gate) => gate.gateId}
      />
    </Panel>
  );
}

export function ValidationView() {
  const runtime = useRuntime();
  const { jobs } = useJobs();
  const jobsKey = jobs.map((job) => `${job.id}:${job.state}`).join("|");
  const profiles = useAsync(() => runtime.listValidationProfiles(), [runtime]);
  const results = useAsync(() => runtime.listValidationResults(), [runtime, jobsKey], {
    keepPrevious: true,
  });

  return (
    <div className="stack">
      <PageHeader
        title="Validation"
        subtitle="Compare a native reference run against the MDX path using runtime-provided profiles."
        actions={
          <Link className="mdx-button mdx-button--primary" to="/simulation/setup?mode=validation">
            New validation run
          </Link>
        }
      />
      <Callout tone="info" title="Tolerances come from the runtime">
        Acceptance bounds and pass/fail decisions are supplied by the runtime&rsquo;s validation
        profiles. This application displays them and never defines, edits or evaluates them.
      </Callout>

      {profiles.error !== undefined ? <ErrorNotice error={profiles.error} /> : null}
      {results.error !== undefined ? <ErrorNotice error={results.error} /> : null}

      {profiles.data === undefined ? (
        <Loading what="profiles" />
      ) : (
        profiles.data.map((profile) => (
          <Panel
            key={profile.id}
            title={`Profile · ${profile.title}`}
            flush
            actions={
              <>
                <OriginBadge origin={profile.origin} />
                <ProfileStatus status={profile.status} />
              </>
            }
          >
            <div style={{ padding: "10px 16px" }}>
              <span className="mdx-muted">{profile.description}</span>{" "}
              <span className="mdx-mono mdx-faint">
                {profile.id} v{profile.version}
              </span>
              {profile.status === "placeholder" ? (
                <p style={{ margin: "6px 0 0" }}>
                  <Badge tone="warn">Placeholder values &mdash; not qualified tolerances</Badge>
                </p>
              ) : null}
            </div>
            <DataTable
              caption={`Gates in ${profile.title}`}
              columns={GATE_COLUMNS}
              rows={profile.gates}
              getRowKey={(gate) => gate.id}
            />
          </Panel>
        ))
      )}

      <h2 style={{ fontSize: 14, margin: "8px 0 0" }}>Results</h2>
      {results.data === undefined ? (
        <Loading what="results" />
      ) : results.data.length === 0 ? (
        <Callout tone="info">No validation runs yet.</Callout>
      ) : (
        results.data.map((result) => <ResultPanel key={result.id} result={result} />)
      )}
    </div>
  );
}
