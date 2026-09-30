import {
  SimulationRequestSchema,
  type ProjectDetail,
  type RunMode,
  type RuntimeCapabilities,
  type SimulationRequest,
  type SimulationStage,
  type ValidationProfile,
} from "@mdx-studio/protocol";

/**
 * Application service: turns editable form state into a typed `SimulationRequest`.
 *
 * This is ergonomics only. It never produces a command line; the runtime validates the request
 * authoritatively and derives any tool invocation itself. Validation here uses the shared
 * protocol schema so the form and runtime agree on structure, but it is non-authoritative.
 */
export interface SimulationFormState {
  projectId: string;
  stage: SimulationStage;
  runMode: RunMode;
  inputStructure: string;
  topology: string;
  mdp: string;
  /** Empty string means "no checkpoint". */
  checkpoint: string;
  continuation: boolean;
  /** Kept as text so partially typed input does not fight the user. */
  threads: string;
  mdxProfile: string;
  validationProfile: string;
  outputName: string;
}

export type FormIssues = Partial<Record<string, string>>;

export type BuildResult =
  { ok: true; request: SimulationRequest } | { ok: false; issues: FormIssues };

export function stageSlug(stage: SimulationStage): string {
  return stage === "PRODUCTION" ? "production" : stage.toLowerCase();
}

export function outputDirectoryFor(outputName: string): string {
  return `outputs/${outputName}`;
}

function firstPath(project: ProjectDetail, kind: "gro" | "top"): string {
  return project.files.find((file) => file.kind === kind)?.path ?? "";
}

export function mdpForStage(project: ProjectDetail, stage: SimulationStage): string {
  return project.stages.find((entry) => entry.stage === stage)?.mdp ?? "";
}

export function defaultFormState(args: {
  project: ProjectDetail;
  stage: SimulationStage;
  runMode: RunMode;
  capabilities: RuntimeCapabilities;
  validationProfiles: readonly ValidationProfile[];
}): SimulationFormState {
  const { project, stage, runMode, capabilities, validationProfiles } = args;
  return {
    projectId: project.id,
    stage,
    runMode,
    inputStructure: firstPath(project, "gro"),
    topology: firstPath(project, "top"),
    mdp: mdpForStage(project, stage),
    checkpoint: "",
    continuation: false,
    threads: "8",
    mdxProfile: capabilities.mdxProfiles[0]?.id ?? "",
    validationProfile: validationProfiles[0]?.id ?? "",
    outputName: `${stageSlug(stage)}-001`,
  };
}

const REQUIRED_LABELS: Partial<Record<keyof SimulationFormState, string>> = {
  inputStructure: "Select a structure file.",
  topology: "Select a topology file.",
  mdp: "Select an MDP file.",
  outputName: "Enter an output name.",
};

export function buildSimulationRequest(form: SimulationFormState): BuildResult {
  const issues: FormIssues = {};
  for (const [key, message] of Object.entries(REQUIRED_LABELS)) {
    if (form[key as keyof SimulationFormState] === "") issues[key] = message;
  }

  const threads = Number(form.threads);
  if (form.threads.trim() === "" || !Number.isInteger(threads)) {
    issues["resources.threads"] = "Enter a whole number of threads.";
  }

  if (Object.keys(issues).length > 0) return { ok: false, issues };

  const candidate = {
    projectId: form.projectId,
    stage: form.stage,
    runMode: form.runMode,
    inputStructure: form.inputStructure,
    topology: form.topology,
    mdp: form.mdp,
    ...(form.checkpoint === "" ? {} : { checkpoint: form.checkpoint }),
    continuation: form.continuation,
    resources: { threads, computeTarget: "cpu" as const },
    ...(form.runMode === "native" || form.mdxProfile === "" ? {} : { mdxProfile: form.mdxProfile }),
    ...(form.runMode === "validation" && form.validationProfile !== ""
      ? { validationProfile: form.validationProfile }
      : {}),
    outputName: form.outputName,
    outputDirectory: outputDirectoryFor(form.outputName),
  };

  const parsed = SimulationRequestSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, request: parsed.data };

  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".");
    issues[path] ??= issue.message;
  }
  return { ok: false, issues };
}
