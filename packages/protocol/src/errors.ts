import { z } from "zod";

export const RuntimeErrorCodeSchema = z.enum([
  "invalid-request",
  "not-found",
  "preflight-failed",
  "conflict",
  "unsupported",
  "unavailable",
  "internal",
]);
export type RuntimeErrorCode = z.infer<typeof RuntimeErrorCodeSchema>;

export const FieldIssueSchema = z.object({
  /** Dotted path of the offending request field, e.g. `resources.threads`. */
  path: z.string(),
  message: z.string(),
});
export type FieldIssue = z.infer<typeof FieldIssueSchema>;

/** Structured error returned by every runtime operation instead of free-form text. */
export const RuntimeErrorSchema = z.object({
  code: RuntimeErrorCodeSchema,
  message: z.string(),
  issues: z.array(FieldIssueSchema).default([]),
  retryable: z.boolean().default(false),
});
export type RuntimeError = z.infer<typeof RuntimeErrorSchema>;
