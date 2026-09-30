import type {
  JobEvent,
  JobRecord,
  MdpDocument,
  MdxDeviceStatus,
  PreflightReport,
  ProjectDetail,
  ProjectSummary,
  ProvenanceRecord,
  RunSummary,
  RuntimeCapabilities,
  RuntimeHealth,
  SimulationRequest,
  TelemetrySnapshot,
  ValidationProfile,
  ValidationResult,
} from "@mdx-studio/protocol";
import type { Unsubscribe } from "./emitter";

export type { Unsubscribe } from "./emitter";

/**
 * The MDX Runtime Client: the ONLY surface through which the desktop talks to a runtime.
 *
 * It is deliberately typed and structured. There is no method that accepts a command line,
 * flags, environment variables or an arbitrary path outside a project. Every method may reject
 * with a {@link RuntimeClientError} carrying a protocol `RuntimeError`.
 *
 * Phase 1 ships an in-process, explicitly simulated implementation (`MockRuntimeClient`). The
 * Phase 2 WSL runtime service will provide an HTTP/IPC implementation of this same interface,
 * and a future CLI can use it too, so GUI and CLI share one runtime API.
 */
export interface RuntimeClient {
  /** Identifies the implementation for diagnostics; never used for behavior decisions. */
  readonly kind: "mock" | "service";

  getHealth(): Promise<RuntimeHealth>;
  getCapabilities(): Promise<RuntimeCapabilities>;
  getDeviceStatus(): Promise<MdxDeviceStatus>;

  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<ProjectDetail>;
  readMdp(projectId: string, path: string): Promise<MdpDocument>;
  writeMdp(projectId: string, path: string, text: string): Promise<MdpDocument>;

  /** Authoritative pre-flight. The returned `startPermitted` is the only start gate. */
  runPreflight(request: SimulationRequest): Promise<PreflightReport>;
  /** Re-runs pre-flight server-side; rejects with `preflight-failed` when start is not permitted. */
  submitJob(request: SimulationRequest): Promise<JobRecord>;
  listJobs(): Promise<JobRecord[]>;
  getJob(jobId: string): Promise<JobRecord>;
  stopJob(jobId: string): Promise<JobRecord>;

  listRuns(projectId?: string): Promise<RunSummary[]>;
  getProvenance(runId: string): Promise<ProvenanceRecord>;

  listValidationProfiles(): Promise<ValidationProfile[]>;
  listValidationResults(): Promise<ValidationResult[]>;
  getValidationResult(jobId: string): Promise<ValidationResult | null>;

  getTelemetryHistory(jobId: string, limit?: number): Promise<TelemetrySnapshot[]>;
  getJobEvents(jobId: string): Promise<JobEvent[]>;

  subscribeTelemetry(jobId: string, listener: (snapshot: TelemetrySnapshot) => void): Unsubscribe;
  subscribeJobEvents(jobId: string, listener: (event: JobEvent) => void): Unsubscribe;
  subscribeJobs(listener: (job: JobRecord) => void): Unsubscribe;
  subscribeDeviceStatus(listener: (status: MdxDeviceStatus) => void): Unsubscribe;
}
