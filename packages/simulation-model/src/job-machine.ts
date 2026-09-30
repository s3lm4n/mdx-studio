import type { JobAction, JobState } from "@mdx-studio/protocol";
import { canTransition, type StateMachineDefinition } from "./state-machine";

export type JobEventName =
  | "begin-validation"
  | "validation-passed"
  | "validation-failed"
  | "start"
  | "started"
  | "start-failed"
  | "pause"
  | "resume"
  | "complete"
  | "fail"
  | "abort";

/**
 * Job lifecycle owned by the runtime. `pause`/`resume` exist in the table so the contract is
 * complete, but a runtime must only expose them once it advertises `supportsPause`.
 */
export const JOB_MACHINE: StateMachineDefinition<JobState, JobEventName> = {
  initial: "CREATED",
  terminal: ["COMPLETED", "FAILED", "ABORTED"],
  transitions: {
    CREATED: { "begin-validation": "VALIDATING", abort: "ABORTED" },
    VALIDATING: {
      "validation-passed": "READY",
      "validation-failed": "FAILED",
      abort: "ABORTED",
    },
    READY: { start: "STARTING", abort: "ABORTED" },
    STARTING: { started: "RUNNING", "start-failed": "FAILED", abort: "ABORTED" },
    RUNNING: { pause: "PAUSED", complete: "COMPLETED", fail: "FAILED", abort: "ABORTED" },
    PAUSED: { resume: "RUNNING", fail: "FAILED", abort: "ABORTED" },
    COMPLETED: {},
    FAILED: {},
    ABORTED: {},
  },
};

/** Actions a runtime may offer for a job in the given state. */
export function allowedJobActions(state: JobState): JobAction[] {
  return canTransition(JOB_MACHINE, state, "abort") ? ["stop"] : [];
}
