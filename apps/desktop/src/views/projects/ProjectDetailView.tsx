import type { ProjectFile, ProjectFileKind, ProjectStage, RunSummary } from "@mdx-studio/protocol";
import { DataTable, Panel, type DataTableColumn } from "@mdx-studio/ui";
import { Link, useParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useJobs } from "../../hooks/use-live";
import { formatBytes } from "../../services/format";
import { ErrorNotice, Loading, PageHeader, Timestamp } from "../common";
import { RunStatusBadge, StageStatusBadge, ValidationStatusBadge } from "../state-tone";

const KIND_LABELS: Record<ProjectFileKind, string> = {
  gro: "Structure (GRO)",
  tpr: "Run input (TPR)",
  top: "Topology (TOP)",
  itp: "Include topology (ITP)",
  mdp: "Parameters (MDP)",
  cpt: "Checkpoint (CPT)",
};

const KIND_ORDER: readonly ProjectFileKind[] = ["gro", "top", "itp", "mdp", "tpr", "cpt"];

/** Keyed by project so navigating between projects never flashes the previous one's data. */
export function ProjectDetailView() {
  const { projectId = "" } = useParams();
  return <ProjectDetail key={projectId} projectId={projectId} />;
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const runtime = useRuntime();
  const { jobs } = useJobs();
  const jobsKey = jobs.map((job) => `${job.id}:${job.state}`).join("|");

  const project = useAsync(() => runtime.getProject(projectId), [runtime, projectId, jobsKey], {
    keepPrevious: true,
  });
  const runs = useAsync(() => runtime.listRuns(projectId), [runtime, projectId, jobsKey], {
    keepPrevious: true,
  });

  if (project.error !== undefined)
    return <ErrorNotice error={project.error} title="Project unavailable" />;
  if (project.data === undefined) return <Loading what="project" />;
  const detail = project.data;

  const stageColumns: readonly DataTableColumn<ProjectStage>[] = [
    { key: "stage", header: "Stage", render: (stage) => <strong>{stage.stage}</strong> },
    {
      key: "status",
      header: "Status",
      render: (stage) => <StageStatusBadge status={stage.status} />,
    },
    {
      key: "mdp",
      header: "MDP",
      render: (stage) =>
        stage.mdp === null ? (
          <span className="mdx-muted">not assigned</span>
        ) : (
          <span className="mdx-mono">{stage.mdp}</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (stage) => (
        <span className="row">
          {stage.mdp === null ? null : (
            <Link
              className="link"
              to={`/simulation/mdp?project=${detail.id}&path=${encodeURIComponent(stage.mdp)}`}
            >
              Edit MDP
            </Link>
          )}
          <Link className="link" to={`/simulation/setup?project=${detail.id}&stage=${stage.stage}`}>
            Set up run
          </Link>
        </span>
      ),
    },
  ];

  const runColumns: readonly DataTableColumn<RunSummary>[] = [
    {
      key: "run",
      header: "Run",
      render: (run) => (
        <Link className="link mdx-mono nowrap" to={`/runs/${run.runId}`}>
          {run.runId}
        </Link>
      ),
    },
    { key: "stage", header: "Stage", render: (run) => run.stage },
    { key: "mode", header: "Mode", render: (run) => run.runMode },
    { key: "status", header: "Status", render: (run) => <RunStatusBadge status={run.status} /> },
    {
      key: "validation",
      header: "Validation",
      render: (run) => <ValidationStatusBadge status={run.validationStatus} />,
    },
    { key: "started", header: "Started (UTC)", render: (run) => <Timestamp iso={run.startedAt} /> },
  ];

  const fileColumns: readonly DataTableColumn<ProjectFile>[] = [
    {
      key: "path",
      header: "Path",
      render: (file) => <span className="mdx-mono">{file.path}</span>,
    },
    { key: "size", header: "Size", align: "right", render: (file) => formatBytes(file.sizeBytes) },
  ];

  return (
    <div className="stack">
      <PageHeader
        title={detail.name}
        origin={detail.origin}
        subtitle={detail.description}
        actions={
          <Link
            className="mdx-button mdx-button--primary"
            to={`/simulation/setup?project=${detail.id}`}
          >
            New simulation
          </Link>
        }
      />

      <Panel title="Simulation stages" flush>
        <DataTable
          caption="Simulation stages"
          columns={stageColumns}
          rows={detail.stages}
          getRowKey={(stage) => stage.stage}
        />
      </Panel>

      <div className="grid grid--2">
        {KIND_ORDER.map((kind) => {
          const files = detail.files.filter((file) => file.kind === kind);
          if (files.length === 0) return null;
          return (
            <Panel key={kind} title={KIND_LABELS[kind]} flush>
              <DataTable
                caption={KIND_LABELS[kind]}
                columns={fileColumns}
                rows={files}
                getRowKey={(file) => file.path}
              />
            </Panel>
          );
        })}
      </div>

      <Panel title="Run history" flush>
        {runs.data === undefined ? (
          <div style={{ padding: 16 }}>
            <Loading what="runs" />
          </div>
        ) : (
          <DataTable
            caption="Run history"
            columns={runColumns}
            rows={runs.data}
            getRowKey={(run) => run.runId}
            emptyMessage="No runs for this project."
          />
        )}
      </Panel>
    </div>
  );
}
