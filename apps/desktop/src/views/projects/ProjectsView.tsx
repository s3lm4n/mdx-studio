import type { ProjectSummary } from "@mdx-studio/protocol";
import { DataTable, OriginBadge, Panel, type DataTableColumn } from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { ErrorNotice, Loading, PageHeader, Timestamp } from "../common";

const COLUMNS: readonly DataTableColumn<ProjectSummary>[] = [
  {
    key: "name",
    header: "Project",
    render: (project) => (
      <Link className="link" to={`/projects/${project.id}`}>
        {project.name}
      </Link>
    ),
  },
  { key: "id", header: "ID", render: (project) => <span className="mdx-mono">{project.id}</span> },
  { key: "description", header: "Description", render: (project) => project.description },
  { key: "origin", header: "Source", render: (project) => <OriginBadge origin={project.origin} /> },
  {
    key: "updated",
    header: "Updated (UTC)",
    render: (project) => <Timestamp iso={project.updatedAt} />,
  },
];

export function ProjectsView() {
  const runtime = useRuntime();
  const projects = useAsync(() => runtime.listProjects(), [runtime]);

  return (
    <div className="stack">
      <PageHeader title="Projects" subtitle="Projects known to the runtime." />
      {projects.error !== undefined ? <ErrorNotice error={projects.error} /> : null}
      <Panel title="All projects" flush>
        {projects.data === undefined ? (
          <div style={{ padding: 16 }}>
            <Loading what="projects" />
          </div>
        ) : (
          <DataTable
            caption="Projects"
            columns={COLUMNS}
            rows={projects.data}
            getRowKey={(project) => project.id}
            emptyMessage="No projects."
          />
        )}
      </Panel>
    </div>
  );
}
