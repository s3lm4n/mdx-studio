import type {
  JobEvent,
  JobRecord,
  JobState,
  ProvenanceRecord,
  RunStatus,
  RuntimeError,
  RunSummary,
  SimulationRequest,
  TelemetrySnapshot,
  ValidationProfile,
  ValidationQuantity,
  ValidationResult,
  ValidationStatus,
} from "@mdx-studio/protocol";
import {
  JOB_MACHINE,
  RUN_MODE_INFO,
  allowedJobActions,
  estimateEtaSeconds,
  getMdpValue,
  parseMdp,
  progressFraction,
  transition,
  type JobEventName,
} from "@mdx-studio/simulation-model";
import { Emitter } from "../emitter";
import { runtimeError } from "../errors";
import type { MockDeviceProvider } from "./device-provider";
import { noise } from "./hash";
import { buildProvenance } from "./provenance-provider";
import { sampleTelemetry } from "./telemetry-provider";
import { buildValidationResult } from "./validation-provider";

const TELEMETRY_BUFFER = 600;
const HISTORY_SEED_SAMPLES = 120;
/** Demo throughput reference values (simulated; not measurements). */
const DEMO_NS_PER_DAY = { native: 180, mdx: 1700 } as const;

interface ManagedJob {
  record: JobRecord;
  readonly nsPerDay: number;
  readonly targetTimeNs: number;
  readonly dtPs: number;
  readonly nstlist: number;
  readonly usesDevice: boolean;
  readonly mdpText: string;
  timeNs: number;
  tprGenerated: boolean;
  telemetrySequence: number;
  eventSequence: number;
  readonly events: JobEvent[];
  readonly telemetry: TelemetrySnapshot[];
  validation: ValidationResult | null;
}

export interface JobManagerDeps {
  readonly device: MockDeviceProvider;
  readonly nowMs: () => number;
  readonly failingGate: ValidationQuantity | null;
  readonly validationProfile: (id: string) => ValidationProfile | undefined;
  readonly readMdpText: (projectId: string, path: string) => string | null;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function runStatusOf(state: JobState): RunStatus {
  if (state === "COMPLETED") return "completed";
  if (state === "FAILED") return "failed";
  if (state === "ABORTED") return "aborted";
  return "running";
}

/**
 * Runtime-owned job lifecycle for the mock. All transitions go through {@link JOB_MACHINE};
 * `allowedActions` is derived from it so the desktop never infers what is permitted.
 */
export class MockJobManager {
  private readonly jobs = new Map<string, ManagedJob>();
  private readonly jobChanges = new Emitter<JobRecord>();
  private readonly jobEvents = new Emitter<JobEvent>();
  private readonly telemetryEvents = new Emitter<TelemetrySnapshot>();
  private readonly counters = { mock: 0, demo: 0 };

  constructor(private readonly deps: JobManagerDeps) {}

  onJob(listener: (job: JobRecord) => void): () => void {
    return this.jobChanges.subscribe(listener);
  }
  onEvent(listener: (event: JobEvent) => void): () => void {
    return this.jobEvents.subscribe(listener);
  }
  onTelemetry(listener: (snapshot: TelemetrySnapshot) => void): () => void {
    return this.telemetryEvents.subscribe(listener);
  }

  nextId(prefix: "mock" | "demo"): string {
    this.counters[prefix] += 1;
    return `${prefix}-${String(this.counters[prefix]).padStart(4, "0")}`;
  }

  list(): JobRecord[] {
    return [...this.jobs.values()].map((j) => j.record);
  }

  get(id: string): ManagedJob {
    const job = this.jobs.get(id);
    if (job === undefined) throw runtimeError("not-found", `Job '${id}' does not exist.`);
    return job;
  }

  find(id: string): ManagedJob | undefined {
    return this.jobs.get(id);
  }

  all(): ManagedJob[] {
    return [...this.jobs.values()];
  }

  /** Id of a live job that holds the MDX device, if any. */
  deviceHolder(): string | null {
    for (const job of this.jobs.values()) {
      if (job.usesDevice && !JOB_MACHINE.terminal.includes(job.record.state)) return job.record.id;
    }
    return null;
  }

  runSummaries(): RunSummary[] {
    return this.all()
      .map((job) => ({
        runId: job.record.runId,
        jobId: job.record.id,
        projectId: job.record.projectId,
        stage: job.record.request.stage,
        runMode: job.record.request.runMode,
        status: runStatusOf(job.record.state),
        validationStatus: this.validationStatusOf(job),
        startedAt: job.record.startedAt ?? job.record.createdAt,
        finishedAt: job.record.finishedAt,
        origin: job.record.origin,
      }))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private validationStatusOf(job: ManagedJob): ValidationStatus {
    if (job.validation === null) return "not-run";
    return job.validation.status;
  }

  create(
    request: SimulationRequest,
    createdAtMs: number,
    idPrefix: "mock" | "demo" = "mock",
  ): string {
    const mdpText = this.deps.readMdpText(request.projectId, request.mdp) ?? "";
    const document = parseMdp(mdpText);
    const dtPs = parseNumber(getMdpValue(document, "dt"), 0.001);
    const nsteps = parseNumber(getMdpValue(document, "nsteps"), 1000);
    const usesDevice = RUN_MODE_INFO[request.runMode].usesMdx;
    const id = this.nextId(idPrefix);
    const jobId = `job-${id}`;
    const runId = `run-${id}`;

    const record: JobRecord = {
      id: jobId,
      runId,
      projectId: request.projectId,
      state: "CREATED",
      origin: "simulated",
      request,
      createdAt: iso(createdAtMs),
      startedAt: null,
      finishedAt: null,
      allowedActions: allowedJobActions("CREATED"),
      failure: null,
    };
    const job: ManagedJob = {
      record,
      nsPerDay: usesDevice ? DEMO_NS_PER_DAY.mdx : DEMO_NS_PER_DAY.native,
      // Simulated target derived from the project's own MDP (nsteps * dt).
      targetTimeNs: Math.max(1e-6, (Math.max(1, nsteps) * dtPs) / 1000),
      dtPs,
      nstlist: parseNumber(getMdpValue(document, "nstlist"), 20),
      usesDevice,
      mdpText,
      timeNs: 0,
      tprGenerated: false,
      telemetrySequence: 0,
      eventSequence: 0,
      events: [],
      telemetry: [],
      validation: null,
    };
    this.jobs.set(jobId, job);
    this.jobChanges.emit(record);
    return jobId;
  }

  /** Provenance is derived from current job state, so it can never drift from the job. */
  provenance(job: ManagedJob): ProvenanceRecord {
    return buildProvenance({
      job: job.record,
      mdpText: job.mdpText,
      status: runStatusOf(job.record.state),
      validationStatus: this.validationStatusOf(job),
      tprGenerated: job.tprGenerated,
    });
  }

  private log(job: ManagedJob, atMs: number, level: "info" | "warn" | "error", message: string) {
    const event: JobEvent = {
      type: "log",
      jobId: job.record.id,
      sequence: job.eventSequence++,
      timestamp: iso(atMs),
      origin: "simulated",
      level,
      message: `[simulated] ${message}`,
    };
    job.events.push(event);
    this.jobEvents.emit(event);
  }

  /** Applies a lifecycle event through the state machine. Throws on an illegal transition. */
  private apply(
    job: ManagedJob,
    event: JobEventName,
    atMs: number,
    reason: string | null,
    failure: RuntimeError | null = null,
  ): void {
    const result = transition(JOB_MACHINE, job.record.state, event);
    if (!result.ok) {
      throw runtimeError("internal", `Illegal job transition: ${result.reason}`);
    }
    const from = job.record.state;
    const to = result.state;
    const terminal = JOB_MACHINE.terminal.includes(to);
    job.record = {
      ...job.record,
      state: to,
      allowedActions: allowedJobActions(to),
      startedAt: job.record.startedAt ?? (to === "STARTING" ? iso(atMs) : null),
      finishedAt: terminal ? iso(atMs) : null,
      failure: to === "FAILED" ? failure : null,
    };
    const change: JobEvent = {
      type: "state-changed",
      jobId: job.record.id,
      sequence: job.eventSequence++,
      timestamp: iso(atMs),
      origin: "simulated",
      from,
      to,
      reason,
    };
    job.events.push(change);
    this.jobEvents.emit(change);
    this.jobChanges.emit(job.record);
  }

  /** Stops a job because of a critical fault and releases the device watchdog. */
  private stopForFault(job: ManagedJob, event: JobEventName, atMs: number, message: string): void {
    const failure: RuntimeError = { code: "unavailable", message, issues: [], retryable: false };
    this.apply(job, event, atMs, message, failure);
    if (job.record.state === "FAILED") {
      const errorEvent: JobEvent = {
        type: "error",
        jobId: job.record.id,
        sequence: job.eventSequence++,
        timestamp: iso(atMs),
        origin: "simulated",
        error: failure,
      };
      job.events.push(errorEvent);
      this.jobEvents.emit(errorEvent);
    }
    if (job.usesDevice) this.deps.device.disarmWatchdog();
  }

  stop(id: string, atMs: number): JobRecord {
    const job = this.get(id);
    if (!job.record.allowedActions.includes("stop")) {
      throw runtimeError("conflict", `Job '${id}' is ${job.record.state} and cannot be stopped.`);
    }
    const deviceBusy = job.usesDevice && ["RUNNING", "THROTTLED"].includes(this.deps.device.state);
    this.apply(job, "abort", atMs, "Stopped by request");
    this.log(job, atMs, "warn", "Run aborted by request");
    if (job.usesDevice) {
      if (deviceBusy) this.deps.device.apply("abort");
      this.deps.device.disarmWatchdog();
    }
    return job.record;
  }

  /** Runtime policy: a device fault stops every live job that depends on the device. */
  onDeviceFault(atMs: number, message: string): void {
    for (const job of this.jobs.values()) {
      if (!job.usesDevice || JOB_MACHINE.terminal.includes(job.record.state)) continue;
      const events: Partial<Record<JobState, JobEventName>> = {
        CREATED: "abort",
        VALIDATING: "validation-failed",
        READY: "abort",
        STARTING: "start-failed",
        RUNNING: "fail",
        PAUSED: "fail",
      };
      const event = events[job.record.state];
      if (event === undefined) continue;
      this.log(job, atMs, "error", `Critical device fault: ${message}. Stopping run.`);
      this.stopForFault(job, event, atMs, `Device fault: ${message}`);
    }
  }

  tick(atMs: number, dtSeconds: number): void {
    for (const job of [...this.jobs.values()]) {
      switch (job.record.state) {
        case "CREATED":
          this.apply(job, "begin-validation", atMs, null);
          this.log(job, atMs, "info", "Runtime re-validated the request");
          break;
        case "VALIDATING":
          this.apply(job, "validation-passed", atMs, null);
          this.log(job, atMs, "info", "Pre-flight passed");
          break;
        case "READY":
          this.apply(job, "start", atMs, null);
          job.tprGenerated = true;
          if (job.usesDevice) {
            this.deps.device.armWatchdog();
            this.log(job, atMs, "info", "Device READY; watchdog armed");
          }
          break;
        case "STARTING":
          if (job.usesDevice && !this.deps.device.apply("job-started")) {
            this.log(job, atMs, "error", "Device is no longer READY; refusing to start");
            this.stopForFault(job, "start-failed", atMs, "Device was not READY at start");
            break;
          }
          this.apply(job, "started", atMs, null);
          this.log(job, atMs, "info", "Simulation started");
          break;
        case "RUNNING":
          this.advance(job, atMs, dtSeconds);
          break;
        default:
          break;
      }
    }
  }

  private advance(job: ManagedJob, atMs: number, dtSeconds: number): void {
    job.timeNs = Math.min(job.targetTimeNs, job.timeNs + (job.nsPerDay / 86_400) * dtSeconds);
    this.emitTelemetry(job, atMs);
    if (job.timeNs >= job.targetTimeNs) this.finish(job, atMs);
  }

  private finish(job: ManagedJob, atMs: number): void {
    this.apply(job, "complete", atMs, null);
    this.log(job, atMs, "info", "Run completed");
    if (job.usesDevice) {
      this.deps.device.apply("job-finished");
      this.deps.device.disarmWatchdog();
    }
    if (job.record.request.runMode === "validation") this.completeValidation(job, atMs);
  }

  private completeValidation(job: ManagedJob, atMs: number): void {
    const profile = this.deps.validationProfile(job.record.request.validationProfile ?? "");
    if (profile === undefined) return;
    job.validation = buildValidationResult({
      id: `val-${job.record.id}`,
      jobId: job.record.id,
      projectId: job.record.projectId,
      profile,
      completedAt: iso(atMs),
      failingGate: this.deps.failingGate,
    });
    this.log(job, atMs, "info", `Validation ${job.validation.status}`);
  }

  /** Validation result for a job: pending while it runs, evaluated once it completes. */
  validationResult(job: ManagedJob): ValidationResult | null {
    if (job.record.request.runMode !== "validation") return null;
    if (job.validation !== null) return job.validation;
    const profile = this.deps.validationProfile(job.record.request.validationProfile ?? "");
    if (profile === undefined) return null;
    return buildValidationResult({
      id: `val-${job.record.id}`,
      jobId: job.record.id,
      projectId: job.record.projectId,
      profile,
      completedAt: null,
      failingGate: null,
    });
  }

  private progressOf(job: ManagedJob, nsPerDaySample: number) {
    const progress = progressFraction(job.timeNs, job.targetTimeNs);
    return {
      step: Math.round((job.timeNs * 1000) / job.dtPs),
      timeNs: job.timeNs,
      targetTimeNs: job.targetTimeNs,
      progress,
      nsPerDay: nsPerDaySample,
      etaSeconds: estimateEtaSeconds(job.targetTimeNs - job.timeNs, nsPerDaySample),
    };
  }

  private emitTelemetry(job: ManagedJob, atMs: number): void {
    const sequence = job.telemetrySequence++;
    const nsPerDay = job.nsPerDay * (1 + 0.008 * noise(31, sequence));
    const snapshot = sampleTelemetry({
      sequence,
      timestampMs: atMs,
      jobId: job.record.id,
      runMode: job.record.request.runMode,
      simulation: this.progressOf(job, nsPerDay),
      device: this.deps.device.status(),
      nstlist: job.nstlist,
    });
    job.telemetry.push(snapshot);
    if (job.telemetry.length > TELEMETRY_BUFFER) job.telemetry.shift();
    this.telemetryEvents.emit(snapshot);
  }

  /**
   * Seeds a job directly into RUNNING at `timeNs`, with pre-rolled telemetry history so charts
   * render immediately. History is generated backwards from the present at 1 sample / second.
   */
  seedRunning(request: SimulationRequest, nowMs: number, timeNs: number): string {
    const id = this.create(
      request,
      nowMs - Math.round((timeNs / DEMO_NS_PER_DAY.mdx) * 86_400_000),
      "demo",
    );
    const job = this.get(id);
    const startMs = Date.parse(job.record.createdAt);
    this.apply(job, "begin-validation", startMs, null);
    this.apply(job, "validation-passed", startMs, null);
    this.apply(job, "start", startMs, null);
    job.tprGenerated = true;
    this.apply(job, "started", startMs, null);
    job.events.push({
      type: "log",
      jobId: id,
      sequence: job.eventSequence++,
      timestamp: iso(startMs),
      origin: "simulated",
      level: "info",
      message: "[simulated] Demo run seeded by the mock runtime",
    });
    const perSecondNs = job.nsPerDay / 86_400;
    for (let i = HISTORY_SEED_SAMPLES - 1; i >= 0; i--) {
      job.timeNs = timeNs - i * perSecondNs;
      const sequence = job.telemetrySequence++;
      const nsPerDay = job.nsPerDay * (1 + 0.008 * noise(31, sequence));
      job.telemetry.push(
        sampleTelemetry({
          sequence,
          timestampMs: nowMs - i * 1000,
          jobId: id,
          runMode: request.runMode,
          simulation: this.progressOf(job, nsPerDay),
          device: this.deps.device.status(),
          nstlist: job.nstlist,
        }),
      );
    }
    job.timeNs = timeNs;
    return id;
  }

  /** Seeds a finished historical job by walking the real state machine with past timestamps. */
  seedFinished(request: SimulationRequest, startedAtMs: number, durationMs: number): string {
    const jobId = this.create(request, startedAtMs, "demo");
    const job = this.get(jobId);
    const steps: [JobEventName, number][] = [
      ["begin-validation", 1],
      ["validation-passed", 2],
      ["start", 3],
      ["started", 4],
      ["complete", 5],
    ];
    for (const [event, offset] of steps) {
      const at = event === "complete" ? startedAtMs + durationMs : startedAtMs + offset * 1000;
      this.apply(job, event, at, null);
      if (event === "start") job.tprGenerated = true;
    }
    job.timeNs = job.targetTimeNs;
    if (request.runMode === "validation") this.completeValidation(job, startedAtMs + durationMs);
    return jobId;
  }
}
