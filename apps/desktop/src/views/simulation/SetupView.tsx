import {
  RUN_MODES,
  SIMULATION_STAGES,
  type ProjectDetail,
  type RunMode,
  type RuntimeCapabilities,
  type SimulationStage,
  type ValidationProfile,
} from "@mdx-studio/protocol";
import { RUN_MODE_INFO } from "@mdx-studio/simulation-model";
import { Button, Callout, Field, KeyValueList, Panel, SegmentedControl } from "@mdx-studio/ui";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useDeviceStatus, useJobs } from "../../hooks/use-live";
import {
  buildSimulationRequest,
  defaultFormState,
  outputDirectoryFor,
  type SimulationFormState,
} from "../../services/simulation-request";
import { ErrorNotice, Loading } from "../common";
import { PreflightPanel } from "./PreflightPanel";
import { setupReducer } from "./setup-form";
import type { PreflightReport } from "@mdx-studio/protocol";

function asRunMode(value: string | null): RunMode | undefined {
  return RUN_MODES.find((mode) => mode === value);
}
function asStage(value: string | null): SimulationStage | undefined {
  return SIMULATION_STAGES.find((stage) => stage === value);
}

export function SetupView() {
  const runtime = useRuntime();
  const [params, setParams] = useSearchParams();
  const projects = useAsync(() => runtime.listProjects(), [runtime]);
  const capabilities = useAsync(() => runtime.getCapabilities(), [runtime]);
  const profiles = useAsync(() => runtime.listValidationProfiles(), [runtime]);

  const projectId = params.get("project") ?? projects.data?.[0]?.id;
  const project = useAsync(
    () => (projectId === undefined ? Promise.resolve(undefined) : runtime.getProject(projectId)),
    [runtime, projectId],
  );

  const failure = projects.error ?? capabilities.error ?? profiles.error ?? project.error;
  if (failure !== undefined) return <ErrorNotice error={failure} />;
  if (
    projects.data === undefined ||
    capabilities.data === undefined ||
    profiles.data === undefined ||
    project.data === undefined
  ) {
    return <Loading what="project" />;
  }

  return (
    <div className="stack">
      <Panel title="Project">
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
      </Panel>
      <SetupForm
        key={project.data.id}
        project={project.data}
        capabilities={capabilities.data}
        validationProfiles={profiles.data}
        initialStage={asStage(params.get("stage")) ?? "NVT"}
        initialMode={asRunMode(params.get("mode")) ?? "native"}
      />
    </div>
  );
}

interface PreflightOutcome {
  /** Identifies the inputs this outcome answers (request + device + jobs + re-run count). */
  token: string;
  requestKey: string;
  report?: PreflightReport;
  error?: Error;
}

interface SetupFormProps {
  project: ProjectDetail;
  capabilities: RuntimeCapabilities;
  validationProfiles: readonly ValidationProfile[];
  initialStage: SimulationStage;
  initialMode: RunMode;
}

function SetupForm({
  project,
  capabilities,
  validationProfiles,
  initialStage,
  initialMode,
}: SetupFormProps) {
  const runtime = useRuntime();
  const navigate = useNavigate();
  const device = useDeviceStatus();
  const { jobs } = useJobs();
  const jobsKey = jobs.map((job) => `${job.id}:${job.state}`).join("|");

  const [form, dispatch] = useReducer(setupReducer, undefined, (): SimulationFormState =>
    defaultFormState({
      project,
      stage: initialStage,
      runMode: initialMode,
      capabilities,
      validationProfiles,
    }),
  );

  const built = useMemo(() => buildSimulationRequest(form), [form]);
  const requestKey = built.ok ? JSON.stringify(built.request) : null;

  const [nonce, setNonce] = useState(0);
  const [outcome, setOutcome] = useState<PreflightOutcome>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error>();

  // The runtime's report is only trusted for the exact inputs it was produced for. The token
  // changes with the request, the device state, the job set, and manual re-runs.
  const deviceState = device?.state;
  const token = `${requestKey ?? "invalid"}|${deviceState ?? "-"}|${jobsKey}|${String(nonce)}`;

  useEffect(() => {
    if (!built.ok) return undefined;
    let cancelled = false;
    runtime.runPreflight(built.request).then(
      (report) => {
        if (!cancelled) setOutcome({ token, requestKey: JSON.stringify(built.request), report });
      },
      (error: unknown) => {
        if (!cancelled) {
          setOutcome({
            token,
            requestKey: JSON.stringify(built.request),
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runtime, built, token]);

  const pending = built.ok && outcome?.token !== token;
  const report = outcome?.requestKey === requestKey ? outcome.report : undefined;
  const preflightError = outcome?.token === token ? outcome.error : undefined;
  const fresh = report !== undefined && !pending;
  const permitted = fresh && report.startPermitted;
  const issues = built.ok ? {} : built.issues;

  let blockedReason: string | null = null;
  if (!built.ok) blockedReason = "Fix the highlighted fields to enable start.";
  else if (!fresh) blockedReason = "Waiting for pre-flight\u2026";
  else if (!report.startPermitted) {
    // Display-only: the runtime decided; we just describe which checks blocked it.
    const blocking = report.checks.filter((check) => report.blockingCheckIds.includes(check.id));
    blockedReason = `Start is blocked by the runtime. ${blocking
      .map((check) => `${check.title}: ${check.detail}`)
      .join(" ")}`;
  }

  const info = RUN_MODE_INFO[form.runMode];
  const gro = project.files.filter((file) => file.kind === "gro");
  const top = project.files.filter((file) => file.kind === "top");
  const mdp = project.files.filter((file) => file.kind === "mdp");
  const cpt = project.files.filter((file) => file.kind === "cpt");

  async function start() {
    if (!built.ok) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const job = await runtime.submitJob(built.request);
      void navigate(`/monitor?job=${job.id}`);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error : new Error(String(error)));
      setNonce((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name: keyof SimulationFormState, value: string | boolean) => {
    dispatch({ type: "field", field: name, value });
  };

  return (
    <div className="stack">
      <Panel title="Run mode">
        <div className="stack">
          <SegmentedControl<RunMode>
            ariaLabel="Run mode"
            value={form.runMode}
            onChange={(mode) => {
              dispatch({ type: "mode", mode });
            }}
            options={capabilities.runModes.map((mode) => ({
              id: mode,
              label: RUN_MODE_INFO[mode].label,
            }))}
          />
          <span className="mdx-muted">{info.description}</span>
        </div>
      </Panel>

      <div className="grid grid--2">
        <Panel title="Inputs">
          <div className="grid grid--2">
            <Field label="Stage">
              <select
                className="mdx-select"
                value={form.stage}
                onChange={(event) => {
                  const stage = asStage(event.target.value);
                  if (stage !== undefined) dispatch({ type: "stage", stage, project });
                }}
              >
                {SIMULATION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="MDP file" error={issues["mdp"]}>
              <select
                className="mdx-select"
                value={form.mdp}
                onChange={(event) => {
                  field("mdp", event.target.value);
                }}
              >
                <option value="">Select&hellip;</option>
                {mdp.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Structure" error={issues["inputStructure"]}>
              <select
                className="mdx-select"
                value={form.inputStructure}
                onChange={(event) => {
                  field("inputStructure", event.target.value);
                }}
              >
                <option value="">Select&hellip;</option>
                {gro.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topology" error={issues["topology"]}>
              <select
                className="mdx-select"
                value={form.topology}
                onChange={(event) => {
                  field("topology", event.target.value);
                }}
              >
                <option value="">Select&hellip;</option>
                {top.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Checkpoint (optional)" error={issues["checkpoint"]}>
              <select
                className="mdx-select"
                value={form.checkpoint}
                onChange={(event) => {
                  field("checkpoint", event.target.value);
                }}
              >
                <option value="">None</option>
                {cpt.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </Field>
            <div className="mdx-field">
              <span className="mdx-field__label">Continuation</span>
              <label className="row">
                <input
                  type="checkbox"
                  checked={form.continuation}
                  onChange={(event) => {
                    field("continuation", event.target.checked);
                  }}
                />
                Continue from checkpoint
              </label>
              {issues["continuation"] === undefined ? null : (
                <span className="mdx-field__error">{issues["continuation"]}</span>
              )}
            </div>
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Runtime settings">
            <div className="grid grid--2">
              <Field
                label="Threads"
                error={issues["resources.threads"]}
                help="CPU threads (GPU selection comes later)."
              >
                <input
                  className="mdx-input"
                  inputMode="numeric"
                  value={form.threads}
                  onChange={(event) => {
                    field("threads", event.target.value);
                  }}
                />
              </Field>
              <Field label="Output name" error={issues["outputName"]}>
                <input
                  className="mdx-input"
                  value={form.outputName}
                  onChange={(event) => {
                    field("outputName", event.target.value);
                  }}
                />
              </Field>
              {info.usesMdx ? (
                <Field label="MDX profile" error={issues["mdxProfile"]}>
                  <select
                    className="mdx-select"
                    value={form.mdxProfile}
                    onChange={(event) => {
                      field("mdxProfile", event.target.value);
                    }}
                  >
                    {capabilities.mdxProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {info.usesValidationProfile ? (
                <Field label="Validation profile" error={issues["validationProfile"]}>
                  <select
                    className="mdx-select"
                    value={form.validationProfile}
                    onChange={(event) => {
                      field("validationProfile", event.target.value);
                    }}
                  >
                    {validationProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            <div style={{ marginTop: 12 }}>
              <KeyValueList
                items={[
                  {
                    label: "Output directory",
                    value: outputDirectoryFor(form.outputName),
                    mono: true,
                  },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Start">
            <div className="stack">
              {submitError === undefined ? null : (
                <ErrorNotice error={submitError} title="Start was refused" />
              )}
              <Button
                variant="primary"
                disabled={!permitted || submitting}
                aria-describedby="start-reason"
                onClick={() => {
                  void start();
                }}
              >
                {submitting
                  ? "Starting…"
                  : form.runMode === "validation"
                    ? "Start validation run"
                    : "Start simulation"}
              </Button>
              <span id="start-reason" className="mdx-muted" role="status">
                {blockedReason ?? "Pre-flight passed. The runtime will re-check before starting."}
              </span>
              <Callout tone="demo" title="Simulated execution">
                Starting creates a simulated job in the demo runtime. Nothing is executed on your
                machine or on hardware.
              </Callout>
            </div>
          </Panel>
        </div>
      </div>

      <PreflightPanel
        report={outcome?.report}
        pending={pending}
        error={preflightError}
        stale={outcome?.report !== undefined && outcome.requestKey !== requestKey}
        onRerun={() => {
          setNonce((value) => value + 1);
        }}
      />
    </div>
  );
}
