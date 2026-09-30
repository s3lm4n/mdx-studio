import { Field, Panel } from "@mdx-studio/ui";
import { useSearchParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { ErrorNotice, Loading } from "../common";
import { MdpEditor } from "./MdpEditor";

export function MdpEditorView() {
  const runtime = useRuntime();
  const [params, setParams] = useSearchParams();
  const projects = useAsync(() => runtime.listProjects(), [runtime]);
  const projectId = params.get("project") ?? projects.data?.[0]?.id;

  const project = useAsync(
    () => (projectId === undefined ? Promise.resolve(undefined) : runtime.getProject(projectId)),
    [runtime, projectId],
  );
  const mdpFiles = project.data?.files.filter((file) => file.kind === "mdp") ?? [];
  const requested = params.get("path");
  const path =
    requested !== null && mdpFiles.some((file) => file.path === requested)
      ? requested
      : mdpFiles[0]?.path;

  const document = useAsync(
    () =>
      projectId === undefined || path === undefined
        ? Promise.resolve(undefined)
        : runtime.readMdp(projectId, path),
    [runtime, projectId, path],
  );

  const failure = projects.error ?? project.error ?? document.error;
  if (failure !== undefined) return <ErrorNotice error={failure} />;
  if (projects.data === undefined || project.data === undefined) return <Loading what="project" />;

  return (
    <div className="stack">
      <Panel title="File">
        <div className="grid grid--2">
          <Field label="Project">
            <select
              className="mdx-select"
              value={project.data.id}
              onChange={(event) => {
                setParams({ project: event.target.value });
              }}
            >
              {projects.data.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="MDP file">
            <select
              className="mdx-select"
              value={path ?? ""}
              onChange={(event) => {
                setParams({ project: project.data?.id ?? "", path: event.target.value });
              }}
            >
              {mdpFiles.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.path}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>
      {document.data === undefined ? (
        path === undefined ? (
          <p className="mdx-muted">This project has no MDP files.</p>
        ) : (
          <Loading what="MDP" />
        )
      ) : (
        <MdpEditor
          key={`${document.data.projectId}:${document.data.path}`}
          stored={document.data}
        />
      )}
    </div>
  );
}
