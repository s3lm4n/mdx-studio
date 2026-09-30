import { z } from "zod";
import { IdSchema, IsoTimestampSchema, OriginSchema } from "./common";

export const VALIDATION_QUANTITIES = [
  "force",
  "energy",
  "virial",
  "position",
  "shift-force",
] as const;
export const ValidationQuantitySchema = z.enum(VALIDATION_QUANTITIES);
export type ValidationQuantity = z.infer<typeof ValidationQuantitySchema>;

export const ValidationGateSchema = z.object({
  id: z.string(),
  quantity: ValidationQuantitySchema,
  description: z.string(),
  /** Runtime-supplied acceptance bound. The UI must never define or alter tolerances. */
  maxAbsoluteError: z.number().nonnegative(),
  unit: z.string(),
});
export type ValidationGate = z.infer<typeof ValidationGateSchema>;

export const ValidationProfileSchema = z.object({
  id: IdSchema,
  version: z.string(),
  title: z.string(),
  description: z.string(),
  origin: OriginSchema,
  /** `placeholder` profiles carry demo numbers only and are not qualified tolerances. */
  status: z.enum(["placeholder", "experimental", "qualified"]),
  gates: z.array(ValidationGateSchema),
});
export type ValidationProfile = z.infer<typeof ValidationProfileSchema>;

export const GateResultSchema = z.object({
  gateId: z.string(),
  quantity: ValidationQuantitySchema,
  observedMaxError: z.number().nonnegative().nullable(),
  maxAbsoluteError: z.number().nonnegative(),
  unit: z.string(),
  /** Decided by the runtime. `null` while not yet evaluated. */
  passed: z.boolean().nullable(),
});
export type GateResult = z.infer<typeof GateResultSchema>;

export const ValidationResultSchema = z.object({
  id: IdSchema,
  jobId: IdSchema,
  projectId: IdSchema,
  profileId: IdSchema,
  profileVersion: z.string(),
  origin: OriginSchema,
  status: z.enum(["pending", "passed", "failed"]),
  completedAt: IsoTimestampSchema.nullable(),
  gates: z.array(GateResultSchema),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
