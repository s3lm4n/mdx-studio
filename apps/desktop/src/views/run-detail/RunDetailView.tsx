import {
  DataTable,
  Callout,
  KeyValueList,
  OriginBadge,
  Panel,
  type DataTableColumn,
} from "@mdx-studio/ui";
import type { HashRecord, LogReference } from "@mdx-studio/protocol";
import { Link, useParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useJobEvents } from "../../hooks/use-live";
import { formatBytes, formatTimestamp } from "../../services/format";
import { ErrorNotice, Loading, PageHeader } from "../common";
import { RunStatusBadge, ValidationStatusBadge } from "../state-tone";

const HASH_COLUMNS: readonly DataTableColumn<HashRecord>[] = [
  { key: "name", header: "Binary", render: (hash) => hash.name },
  {
    key: "alg",
    header: "Algorithm",
    render: (hash) => <span className="mdx-mono">{hash.algorithm}</span>,
  },
  {
    key: "digest",
    header: "Digest",
    render: (hash) => <span className="mdx-mono">{hash.digest}</span>,
  },
];

const LOG_COLUMNS: readonly DataTableColumn<LogReference>[] = [
  { key: "name", header: "Log", render: (log) => log.name },
  {
    key: "path",
    header: "Path",
    render: (log) => <span className="mdx-mono">{log.relativePath}</span>,
  },
  { key: "size", header: "Size", align: "right", render: (log) => formatBytes(log.sizeBytes) },
];

export function RunDetailView() {
  const { runId = "" } = useParams();
  const runtime = useRuntime();
  const provenance = useAsync(() => runtime.getProvenance(runId), [runtime, runId]);
  const events = useJobEvents(provenance.data?.jobId);

  if (provenance.error !== undefined)
    return <ErrorNotice error={provenance.error} title="Run unavailable" />;
  if (provenance.data === undefined) return <Loading what="provenance" />;
  const record = provenance.data;

  return (
    <div className="stack">
      <PageHeader
        title={`Run ${record.runId}`}
        origin={record.origin}
        subtitle={
          <>
            Provenance record.{" "}
            <Link className="link" to={`/monitor?job=${record.jobId}`}>
              Open in monitor
            </Link>
          </>
        }
      />

      <div className="grid grid--2">
        <Panel title="Summary">
          <KeyValueList
            items={[
              { label: "Run ID", value: record.runId, mono: true },
              { label: "Job ID", value: record.jobId, mono: true },
              { label: "Result", value: <RunStatusBadge status={record.resultStatus} /> },
              {
                label: "Validation",
                value: <ValidationStatusBadge status={record.validationStatus} />,
              },
              { label: "Started", value: formatTimestamp(record.startedAt) },
              { label: "Finished", value: formatTimestamp(record.finishedAt) },
            ]}
          />
        </Panel>
        <Panel title="Versions and hashes">
          <KeyValueList
            items={[
              { label: "GROMACS", value: record.gromacsVersion ?? "—", mono: true },
              { label: "Runtime", value: record.runtimeVersion, mono: true },
              { label: "Protocol", value: record.protocolVersion, mono: true },
              {
                label: "MDX firmware",
                value: record.mdxFirmware === null ? "not used" : record.mdxFirmware.version,
                mono: true,
              },
              {
                label: "Bitstream checksum",
                value: record.mdxFirmware?.bitstreamChecksum ?? "—",
                mono: true,
              },
              { label: "TPR hash", value: record.tprHash ?? "not generated yet", mono: true },
              { label: "MDP hash", value: record.mdpHash, mono: true },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Command provenance" actions={<OriginBadge origin={record.origin} />}>
        <div className="stack">
          <Callout tone="info">
            Commands are generated and executed by the runtime from the structured request. They are
            shown for inspection only; this application cannot edit or re-run them.
          </Callout>
          {record.commands.map((command) => (
            <div key={command.display} className="stack" style={{ gap: 4 }}>
              <strong>{command.purpose}</strong>
              <pre className="code-block" aria-label={`Command: ${command.purpose}`}>
                {command.display}
              </pre>
              <span className="mdx-faint mdx-mono">cwd: {command.workingDirectory}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Runtime configuration">
        <KeyValueList
          items={Object.entries(record.runtimeConfiguration).map(([label, value]) => ({
            label,
            value: String(value),
            mono: true,
          }))}
        />
      </Panel>

      <Panel title="Binary hashes" flush>
        <DataTable
          caption="Binary hashes"
          columns={HASH_COLUMNS}
          rows={record.binaryHashes}
          getRowKey={(h) => h.name}
        />
      </Panel>

      <Panel title="Logs" flush>
        <DataTable
          caption="Logs"
          columns={LOG_COLUMNS}
          rows={record.logs}
          getRowKey={(log) => log.relativePath}
        />
      </Panel>

      <Panel title="Job events" flush>
        {events.length === 0 ? (
          <p className="mdx-muted" style={{ padding: 16, margin: 0 }}>
            No events.
          </p>
        ) : (
          <ol className="event-log" aria-label="Job events">
            {events.map((event) => (
              <li key={event.sequence}>
                <span className="mdx-faint">{formatTimestamp(event.timestamp)}</span>{" "}
                {event.type === "state-changed"
                  ? `${event.from} → ${event.to}`
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
