import { MdxDeviceStatusSchema } from "./device";
import { RuntimeErrorSchema } from "./errors";
import { JobEventSchema, JobRecordSchema } from "./jobs";
import { PreflightReportSchema } from "./preflight";
import { MdpDocumentSchema, ProjectDetailSchema, ProjectSummarySchema } from "./project";
import { ProvenanceRecordSchema, RunSummarySchema } from "./provenance";
import { RuntimeCapabilitiesSchema, RuntimeHealthSchema } from "./runtime";
import { SimulationRequestSchema } from "./simulation";
import { TelemetrySnapshotSchema } from "./telemetry";
import { ValidationProfileSchema, ValidationResultSchema } from "./validation";

/**
 * Every top-level contract type. This map drives JSON Schema emission so that a non-TypeScript
 * runtime implementation can validate against the same contract.
 */
export const PROTOCOL_SCHEMAS = {
  RuntimeHealth: RuntimeHealthSchema,
  RuntimeCapabilities: RuntimeCapabilitiesSchema,
  RuntimeError: RuntimeErrorSchema,
  SimulationRequest: SimulationRequestSchema,
  PreflightReport: PreflightReportSchema,
  JobRecord: JobRecordSchema,
  JobEvent: JobEventSchema,
  TelemetrySnapshot: TelemetrySnapshotSchema,
  MdxDeviceStatus: MdxDeviceStatusSchema,
  ValidationProfile: ValidationProfileSchema,
  ValidationResult: ValidationResultSchema,
  ProvenanceRecord: ProvenanceRecordSchema,
  RunSummary: RunSummarySchema,
  ProjectSummary: ProjectSummarySchema,
  ProjectDetail: ProjectDetailSchema,
  MdpDocument: MdpDocumentSchema,
} as const;
