import type { FieldIssue, RuntimeError, RuntimeErrorCode } from "@mdx-studio/protocol";

/** Thrown by every {@link RuntimeClient} operation; carries the protocol's structured error. */
export class RuntimeClientError extends Error {
  readonly error: RuntimeError;

  constructor(error: RuntimeError) {
    super(error.message);
    this.name = "RuntimeClientError";
    this.error = error;
  }
}

export function runtimeError(
  code: RuntimeErrorCode,
  message: string,
  issues: FieldIssue[] = [],
  retryable = false,
): RuntimeClientError {
  return new RuntimeClientError({ code, message, issues, retryable });
}

export function isRuntimeClientError(value: unknown): value is RuntimeClientError {
  return value instanceof RuntimeClientError;
}
