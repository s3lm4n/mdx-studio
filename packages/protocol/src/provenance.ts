import { z } from "zod";
import {
  IdSchema,
  IsoTimestampSchema,
  OriginSchema,
  ProjectDirectorySchema,
  ProjectPathSchema,
} from "./common";
import { RunModeSchema, SimulationStageSchema } from "./simulation";

/**
 * A command the RUNTIME generated and executed, recorded for inspection. It is output-only:
 * no request type accepts it, and the desktop never builds or sends one.
 */
export const CommandProvenanceSchema = z.object({
  purpose: z.string(),
  argv: z.array(z.string()).min(1),
  /** Human-oriented, shell-quoted rendering produced by the runtime. Display only. */
  display: z.string(),
  workingDirectory: ProjectDirectorySchema,
});
export type CommandProvenance = z.infer<typeof CommandProvenanceSchema>;

export const HashRecordSchema = z.object({
  name: z.string(),
  algorithm: z.literal("sha256"),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export type HashRecord = z.infer<typeof HashRecordSchema>;

export const RunStatusSchema = z.enum(["running", "completed", "failed", "aborted"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const ValidationStatusSchema = z.enum(["not-run", "pending", "passed", "failed"]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const RunSummarySchema = z.object({
  runId: IdSchema,
  jobId: IdSchema,
  projectId: IdSchema,
  stage: SimulationStageSchema,
  runMode: RunModeSchema,
  status: RunStatusSchema,
  validationStatus: ValidationStatusSchema,
  startedAt: IsoTimestampSchema,
  finishedAt: IsoTimestampSchema.nullable(),
  origin: OriginSchema,
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

export const LogReferenceSchema = z.object({
  name: z.string(),
  relativePath: ProjectPathSchema,
  sizeBytes: z.number().int().nonnegative(),
});
export type LogReference = z.infer<typeof LogReferenceSchema>;

export const ProvenanceRecordSchema = z.object({
  runId: IdSchema,
  jobId: IdSchema,
  origin: OriginSchema,
  startedAt: IsoTimestampSchema,
  finishedAt: IsoTimestampSchema.nullable(),
  resultStatus: RunStatusSchema,
  validationStatus: ValidationStatusSchema,
  gromacsVersion: z.string().nullable(),
  runtimeVersion: z.string(),
  protocolVersion: z.string(),
  mdxFirmware: z.object({ version: z.string(), bitstreamChecksum: z.string() }).nullable(),
  binaryHashes: z.array(HashRecordSchema),
  tprHash: z.string().nullable(),
  mdpHash: z.string(),
  commands: z.array(CommandProvenanceSchema),
  runtimeConfiguration: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  logs: z.array(LogReferenceSchema),
});
export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;
