import { z } from "zod";
import { IsoTimestampSchema, OriginSchema } from "./common";
import { RunModeSchema } from "./simulation";

export const CHECK_STATUSES = ["PASS", "WARN", "FAIL", "SKIPPED"] as const;
export const CheckStatusSchema = z.enum(CHECK_STATUSES);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const PreflightCheckSchema = z.object({
  id: z.string(),
  group: z.enum(["inputs", "runtime", "gromacs", "device", "policy"]),
  title: z.string(),
  status: CheckStatusSchema,
  /** A FAIL of a critical check blocks start. The runtime decides; the UI only displays. */
  critical: z.boolean(),
  detail: z.string(),
  origin: OriginSchema,
});
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;

export const PreflightReportSchema = z.object({
  runMode: RunModeSchema,
  generatedAt: IsoTimestampSchema,
  origin: OriginSchema,
  checks: z.array(PreflightCheckSchema),
  /** Worst non-skipped status across all checks. */
  verdict: z.enum(["PASS", "WARN", "FAIL"]),
  /**
   * Backend-owned gate. `false` whenever any critical check FAILs. The desktop must bind its
   * Start control to this flag and must not recompute it.
   */
  startPermitted: z.boolean(),
  blockingCheckIds: z.array(z.string()),
});
export type PreflightReport = z.infer<typeof PreflightReportSchema>;
