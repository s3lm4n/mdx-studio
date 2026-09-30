import {
  PROTOCOL_VERSION,
  SimulationRequestSchema,
  type FieldIssue,
  type JobEvent,
  type JobRecord,
  type MdpDocument,
  type MdxDeviceStatus,
  type PreflightReport,
  type ProjectDetail,
  type ProjectSummary,
  type ProvenanceRecord,
  type RunSummary,
  type RuntimeCapabilities,
  type RuntimeHealth,
  type SimulationRequest,
  type SimulationStage,
  type TelemetrySnapshot,
  type ValidationProfile,
  type ValidationResult,
} from "@mdx-studio/protocol";
import type { RuntimeClient, Unsubscribe } from "../client";
import { runtimeError } from "../errors";
import { systemClock, type Clock } from "./clock";
import { MockDeviceProvider } from "./device-provider";
import {
  DEMO_PROJECTS,
  MOCK_GROMACS_VERSION,
  MOCK_RUNTIME_VERSION,
  type DemoProject,
} from "./fixtures";
import { sha256Hex } from "./hash";
import { MockJobManager } from "./job-manager";
import { evaluatePreflight } from "./preflight";
import { SCENARIOS, type ScenarioDefinition, type ScenarioId } from "./scenarios";
import { DEMO_VALIDATION_PROFILES } from "./validation-provider";

export const MOCK_TICK_INTERVAL_MS = 1_000;
const MAX_MDP_BYTES = 256 * 1024;

export interface MockRuntimeOptions {
  readonly scenario?: ScenarioId;
  readonly clock?: Clock;
  readonly tickIntervalMs?: number;
  /** Start ticking immediately (default). Set false to call {@link MockRuntimeControls.start}. */
  readonly autoStart?: boolean;
}

/** Controls that exist only on the mock. They are not part of the {@link RuntimeClient} API. */
export interface MockRuntimeControls {
  readonly scenario: ScenarioDefinition;
  /** Simulate a critical device fault. The mock runtime policy then stops dependent runs. */
  injectDeviceFault(): void;
  /** Simulate an operator reset of a faulted/disconnected device. */
  resetDevice(): void;
  /** Begin advancing simulated time. Idempotent. */
  start(): void;
  /** Stop advancing simulated time. Safe to call repeatedly; `start()` resumes. */
  dispose(): void;
}

const MDX_PROFILES = [
  {
    id: "mdx-default",
    title: "MDX default (demo)",
    description: "Placeholder MDX profile for prototyping. No real profile exists yet.",
  },
  {
    id: "mdx-conservative",
    title: "MDX conservative (demo)",
    description: "Second placeholder profile so profile selection can be exercised.",
  },
] as const;

function stageFileName(stage: SimulationStage): string {
  return stage === "PRODUCTION" ? "production" : stage.toLowerCase();
}

/**
 * In-process, explicitly SIMULATED runtime used for the Phase 1 prototype.
 *
 * It composes mock providers (device, telemetry, validation, provenance) behind the same
 * {@link RuntimeClient} interface the real WSL runtime service will implement. Every record it
 * returns carries `origin: "simulated"`. It never executes anything: no processes, no shell, no
 * file-system access.
 */
export class MockRuntimeClient implements RuntimeClient, MockRuntimeControls {
  readonly kind = "mock" as const;
  readonly scenario: ScenarioDefinition;

  private readonly clock: Clock;
  private readonly device: MockDeviceProvider;
  private readonly jobs: MockJobManager;
  private readonly mdps = new Map<string, string>();
  private readonly projects: readonly DemoProject[];
  private readonly tickIntervalMs: number;
  private stopTimer: Unsubscribe | null = null;
  private lastTickMs: number;

  constructor(options: MockRuntimeOptions = {}) {
    this.scenario = SCENARIOS[options.scenario ?? "nominal"];
    this.clock = options.clock ?? systemClock;
    this.projects = DEMO_PROJECTS;
    for (const project of this.projects) {
      for (const [path, text] of Object.entries(project.mdps)) {
        this.mdps.set(`${project.summary.id}:${path}`, text);
      }
    }
    this.device = new MockDeviceProvider(this.scenario, () => this.nowIso());
    this.jobs = new MockJobManager({
      device: this.device,
      nowMs: () => this.clock.nowMs(),
      failingGate: this.scenario.failingGate,
      validationProfile: (id) => DEMO_VALIDATION_PROFILES.find((p) => p.id === id),
      readMdpText: (projectId, path) => this.mdps.get(`${projectId}:${path}`) ?? null,
    });
    this.seedHistory();
    this.tickIntervalMs = options.tickIntervalMs ?? MOCK_TICK_INTERVAL_MS;
    this.lastTickMs = this.clock.nowMs();
    if (options.autoStart ?? true) this.start();
  }

  start(): void {
    if (this.stopTimer !== null) return;
    this.lastTickMs = this.clock.nowMs();
    this.stopTimer = this.clock.every(this.tickIntervalMs, () => {
      this.tick();
    });
  }

  dispose(): void {
    this.stopTimer?.();
    this.stopTimer = null;
  }

  private nowIso(): string {
    return new Date(this.clock.nowMs()).toISOString();
  }

  private tick(): void {
    const now = this.clock.nowMs();
    const dtSeconds = Math.max(0, (now - this.lastTickMs) / 1000);
    this.lastTickMs = now;
    // Device settles: ABORTING -> READY, CONNECTING -> READY.
    if (this.device.state === "ABORTING") this.device.apply("abort-complete");
    if (this.device.state === "CONNECTING") this.device.apply("connected");
    this.jobs.tick(now, dtSeconds);
  }

  // ---- seeded demo history -------------------------------------------------------------

  private demoRequest(
    projectId: string,
    stage: SimulationStage,
    runMode: SimulationRequest["runMode"],
    extra: Partial<SimulationRequest> = {},
  ): SimulationRequest {
    const name = stageFileName(stage);
    return {
      projectId,
      stage,
      runMode,
      inputStructure: "inputs/system.gro",
      topology: "inputs/system.top",
      mdp: `mdp/${name}.mdp`,
      continuation: false,
      resources: { threads: 8, computeTarget: "cpu" },
      ...(runMode !== "native" ? { mdxProfile: "mdx-default" } : {}),
      ...(runMode === "validation" ? { validationProfile: "demo-placeholder" } : {}),
      outputName: `${name}-001`,
      outputDirectory: `outputs/${name}`,
      ...extra,
    };
  }

  private seedHistory(): void {
    const now = this.clock.nowMs();
    const day = 86_400_000;
    const history: [SimulationRequest, number, number][] = [
      [this.demoRequest("lysozyme-demo", "EM", "native"), now - 9 * day, 40_000],
      [this.demoRequest("lysozyme-demo", "NVT", "native"), now - 8 * day, 600_000],
      [this.demoRequest("lysozyme-demo", "NPT", "native"), now - 7 * day, 640_000],
      [this.demoRequest("membrane-demo", "EM", "native"), now - 5 * day, 55_000],
      [
        this.demoRequest("lysozyme-demo", "NVT", "validation", {
          outputName: "nvt-val-001",
          outputDirectory: "outputs/nvt-validation",
        }),
        now - 3 * day,
        120_000,
      ],
    ];
    for (const [request, startedAt, duration] of history) {
      this.jobs.seedFinished(request, startedAt, duration);
    }
    if (this.scenario.seedRunningJob) {
      this.jobs.seedRunning(
        this.demoRequest("lysozyme-demo", "PRODUCTION", "mdx", {
          continuation: true,
          checkpoint: "outputs/npt/npt.cpt",
          outputName: "prod-001",
          outputDirectory: "outputs/prod-001",
        }),
        now,
        104.962,
      );
    }
  }

  // ---- runtime info --------------------------------------------------------------------

  getHealth(): Promise<RuntimeHealth> {
    return Promise.resolve({
      status: "ok",
      protocolVersion: PROTOCOL_VERSION,
      runtimeVersion: MOCK_RUNTIME_VERSION,
      implementation: "mock",
      origin: "simulated",
      checkedAt: this.nowIso(),
    });
  }

  getCapabilities(): Promise<RuntimeCapabilities> {
    return Promise.resolve(this.capabilities());
  }

  private capabilities(): RuntimeCapabilities {
    return {
      protocolVersion: PROTOCOL_VERSION,
      origin: "simulated",
      runModes: ["native", "mdx", "validation"],
      supportsStop: true,
      supportsPause: false,
      gromacs: {
        name: "GROMACS",
        detected: true,
        version: MOCK_GROMACS_VERSION,
        origin: "simulated",
        detail: "Simulated detection. Real GROMACS discovery arrives with the Phase 2 runtime.",
      },
      mdxDevice: { integration: "mock", origin: "simulated" },
      mdxProfiles: [...MDX_PROFILES],
    };
  }

  getDeviceStatus(): Promise<MdxDeviceStatus> {
    return Promise.resolve(this.device.status());
  }

  // ---- projects ------------------------------------------------------------------------

  listProjects(): Promise<ProjectSummary[]> {
    return Promise.resolve(this.projects.map((p) => p.summary));
  }

  private project(projectId: string): DemoProject {
    const project = this.projects.find((p) => p.summary.id === projectId);
    if (project === undefined) {
      throw runtimeError("not-found", `Project '${projectId}' does not exist.`);
    }
    return project;
  }

  getProject(projectId: string): Promise<ProjectDetail> {
    return this.settle(() => {
      const project = this.project(projectId);
      const jobs = this.jobs.all().filter((j) => j.record.projectId === projectId);
      const stages = project.stages.map((stage) => {
        const latest = jobs
          .filter((j) => j.record.request.stage === stage.stage)
          .sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt))[0];
        if (latest === undefined) return stage;
        const state = latest.record.state;
        if (state === "COMPLETED") return { ...stage, status: "completed" as const };
        if (state === "FAILED") return { ...stage, status: "failed" as const };
        if (state === "ABORTED") return stage;
        return { ...stage, status: "running" as const };
      });
      return { ...project.summary, files: [...project.files], stages };
    });
  }

  readMdp(projectId: string, path: string): Promise<MdpDocument> {
    return this.settle(() => this.mdpDocument(projectId, path));
  }

  writeMdp(projectId: string, path: string, text: string): Promise<MdpDocument> {
    return this.settle(() => {
      this.mdpDocument(projectId, path); // existence + kind checks
      if (new TextEncoder().encode(text).length > MAX_MDP_BYTES) {
        throw runtimeError("invalid-request", "MDP text is too large.", [
          { path: "text", message: `must be at most ${String(MAX_MDP_BYTES)} bytes` },
        ]);
      }
      this.mdps.set(`${projectId}:${path}`, text);
      return this.mdpDocument(projectId, path);
    });
  }

  private mdpDocument(projectId: string, path: string): MdpDocument {
    const project = this.project(projectId);
    const file = project.files.find((f) => f.path === path && f.kind === "mdp");
    const text = this.mdps.get(`${projectId}:${path}`);
    if (file === undefined || text === undefined) {
      throw runtimeError("not-found", `MDP '${path}' does not exist in project '${projectId}'.`);
    }
    return { projectId, path, text, sha256: sha256Hex(text) };
  }

  // ---- pre-flight and jobs -------------------------------------------------------------

  private parseRequest(input: unknown): SimulationRequest {
    const parsed = SimulationRequestSchema.safeParse(input);
    if (!parsed.success) {
      const issues: FieldIssue[] = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw runtimeError("invalid-request", "The simulation request is not valid.", issues);
    }
    return parsed.data;
  }

  private preflight(request: SimulationRequest): PreflightReport {
    const project = this.project(request.projectId);
    return evaluatePreflight({
      request,
      capabilities: this.capabilities(),
      device: this.device.status(),
      deviceBusyWith: this.jobs.deviceHolder(),
      knownPaths: new Set(project.files.map((f) => f.path)),
      mdpText: this.mdps.get(`${request.projectId}:${request.mdp}`) ?? null,
      validationProfileIds: DEMO_VALIDATION_PROFILES.map((p) => p.id),
      nowIso: this.nowIso(),
    });
  }

  runPreflight(request: SimulationRequest): Promise<PreflightReport> {
    return this.settle(() => this.preflight(this.parseRequest(request)));
  }

  submitJob(request: SimulationRequest): Promise<JobRecord> {
    return this.settle(() => {
      const valid = this.parseRequest(request);
      // The runtime re-checks the gate itself; a client-held report is never trusted.
      const report = this.preflight(valid);
      if (!report.startPermitted) {
        throw runtimeError(
          "preflight-failed",
          `Pre-flight failed: ${report.blockingCheckIds.join(", ")}.`,
          report.blockingCheckIds.map((id) => ({ path: id, message: "critical check failed" })),
        );
      }
      const id = this.jobs.create(valid, this.clock.nowMs());
      return this.jobs.get(id).record;
    });
  }

  listJobs(): Promise<JobRecord[]> {
    return Promise.resolve(this.jobs.list());
  }

  getJob(jobId: string): Promise<JobRecord> {
    return this.settle(() => this.jobs.get(jobId).record);
  }

  stopJob(jobId: string): Promise<JobRecord> {
    return this.settle(() => this.jobs.stop(jobId, this.clock.nowMs()));
  }

  // ---- runs, provenance, validation ----------------------------------------------------

  listRuns(projectId?: string): Promise<RunSummary[]> {
    const runs = this.jobs.runSummaries();
    return Promise.resolve(
      projectId === undefined ? runs : runs.filter((r) => r.projectId === projectId),
    );
  }

  getProvenance(runId: string): Promise<ProvenanceRecord> {
    return this.settle(() => {
      const job = this.jobs.all().find((j) => j.record.runId === runId);
      if (job === undefined) throw runtimeError("not-found", `Run '${runId}' does not exist.`);
      return this.jobs.provenance(job);
    });
  }

  listValidationProfiles(): Promise<ValidationProfile[]> {
    return Promise.resolve([...DEMO_VALIDATION_PROFILES]);
  }

  listValidationResults(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    for (const job of this.jobs.all()) {
      const result = this.jobs.validationResult(job);
      if (result !== null) results.push(result);
    }
    return Promise.resolve(results);
  }

  getValidationResult(jobId: string): Promise<ValidationResult | null> {
    return this.settle(() => this.jobs.validationResult(this.jobs.get(jobId)));
  }

  // ---- telemetry and events ------------------------------------------------------------

  getTelemetryHistory(jobId: string, limit = 300): Promise<TelemetrySnapshot[]> {
    return this.settle(() => this.jobs.get(jobId).telemetry.slice(-Math.max(0, limit)));
  }

  getJobEvents(jobId: string): Promise<JobEvent[]> {
    return this.settle(() => [...this.jobs.get(jobId).events]);
  }

  subscribeTelemetry(jobId: string, listener: (snapshot: TelemetrySnapshot) => void): Unsubscribe {
    return this.jobs.onTelemetry((snapshot) => {
      if (snapshot.jobId === jobId) listener(snapshot);
    });
  }

  subscribeJobEvents(jobId: string, listener: (event: JobEvent) => void): Unsubscribe {
    return this.jobs.onEvent((event) => {
      if (event.jobId === jobId) listener(event);
    });
  }

  subscribeJobs(listener: (job: JobRecord) => void): Unsubscribe {
    return this.jobs.onJob(listener);
  }

  subscribeDeviceStatus(listener: (status: MdxDeviceStatus) => void): Unsubscribe {
    return this.device.onChange(() => {
      listener(this.device.status());
    });
  }

  // ---- mock-only controls --------------------------------------------------------------

  injectDeviceFault(): void {
    const moved = this.device.injectFault("MDX_SIM_FAULT", "Injected simulated device fault");
    if (!moved) {
      throw runtimeError(
        "conflict",
        `Cannot inject a fault while the device is ${this.device.state}.`,
      );
    }
    this.jobs.onDeviceFault(this.clock.nowMs(), "Injected simulated device fault");
  }

  resetDevice(): void {
    if (this.device.state !== "ERROR" && this.device.state !== "DISCONNECTED") {
      throw runtimeError(
        "conflict",
        `Device is ${this.device.state}; reset applies to ERROR or DISCONNECTED.`,
      );
    }
    if (this.device.state === "ERROR") this.device.apply("reset");
    this.device.clearError();
    this.device.apply("connect"); // settles to READY on the next tick
  }

  /** Runs a synchronous operation and adapts it to the async client surface. */
  private settle<T>(operation: () => T): Promise<T> {
    try {
      return Promise.resolve(operation());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export function isMockRuntime(client: RuntimeClient): client is MockRuntimeClient {
  return client instanceof MockRuntimeClient;
}
