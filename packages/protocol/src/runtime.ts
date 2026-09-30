import { z } from "zod";
import { IsoTimestampSchema, OriginSchema } from "./common";
import { RunModeSchema } from "./simulation";

export const ToolStatusSchema = z.object({
  name: z.string(),
  detected: z.boolean(),
  version: z.string().nullable(),
  origin: OriginSchema,
  detail: z.string().nullable(),
});
export type ToolStatus = z.infer<typeof ToolStatusSchema>;

export const RuntimeHealthSchema = z.object({
  status: z.enum(["ok", "degraded", "unavailable"]),
  protocolVersion: z.string(),
  runtimeVersion: z.string(),
  /** `mock` for the in-process demo runtime; real services report their own name. */
  implementation: z.string(),
  origin: OriginSchema,
  checkedAt: IsoTimestampSchema,
});
export type RuntimeHealth = z.infer<typeof RuntimeHealthSchema>;

export const MdxProfileSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});
export type MdxProfileSummary = z.infer<typeof MdxProfileSummarySchema>;

export const RuntimeCapabilitiesSchema = z.object({
  protocolVersion: z.string(),
  origin: OriginSchema,
  runModes: z.array(RunModeSchema),
  supportsStop: z.boolean(),
  supportsPause: z.boolean(),
  gromacs: ToolStatusSchema,
  mdxDevice: z.object({
    /** `mock` until a real device provider exists. */
    integration: z.enum(["mock", "hardware"]),
    origin: OriginSchema,
  }),
  mdxProfiles: z.array(MdxProfileSummarySchema),
});
export type RuntimeCapabilities = z.infer<typeof RuntimeCapabilitiesSchema>;
