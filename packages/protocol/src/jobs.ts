import { z } from "zod";
import { IdSchema, IsoTimestampSchema, OriginSchema } from "./common";
import { RuntimeErrorSchema } from "./errors";
import { SimulationRequestSchema } from "./simulation";
import { JobStateSchema } from "./states";

/** Actions the runtime currently permits on a job. The UI must not infer these from state. */
export const JobActionSchema = z.enum(["stop"]);
export type JobAction = z.infer<typeof JobActionSchema>;

export const JobRecordSchema = z.object({
  id: IdSchema,
  runId: IdSchema,
  projectId: IdSchema,
  state: JobStateSchema,
  origin: OriginSchema,
  request: SimulationRequestSchema,
  createdAt: IsoTimestampSchema,
  startedAt: IsoTimestampSchema.nullable(),
  finishedAt: IsoTimestampSchema.nullable(),
  allowedActions: z.array(JobActionSchema),
  failure: RuntimeErrorSchema.nullable(),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

const EventBase = {
  jobId: IdSchema,
  sequence: z.number().int().nonnegative(),
  timestamp: IsoTimestampSchema,
  origin: OriginSchema,
};

export const JobEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...EventBase,
    type: z.literal("state-changed"),
    from: JobStateSchema,
    to: JobStateSchema,
    reason: z.string().nullable(),
  }),
  z.object({
    ...EventBase,
    type: z.literal("log"),
    level: z.enum(["info", "warn", "error"]),
    message: z.string(),
  }),
  z.object({
    ...EventBase,
    type: z.literal("error"),
    error: RuntimeErrorSchema,
  }),
]);
export type JobEvent = z.infer<typeof JobEventSchema>;
