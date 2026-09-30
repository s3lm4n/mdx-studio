import type { DeviceState } from "@mdx-studio/protocol";
import type { StateMachineDefinition } from "./state-machine";

export type DeviceEventName =
  | "connect"
  | "connected"
  | "connect-failed"
  | "disconnect"
  | "job-started"
  | "job-finished"
  | "throttle"
  | "recover"
  | "fault"
  | "abort"
  | "abort-complete"
  | "reset";

/**
 * Device lifecycle. Only `READY` admits a job start (see {@link deviceAcceptsJobs}); this is the
 * "DEVICE READY" step of PRE-FLIGHT -> DEVICE READY -> WATCHDOG ARMED -> SIMULATION START.
 *
 * This models state only. No physical protection logic exists: no production MDX hardware is
 * integrated, and the mock device provider merely walks this table.
 */
export const DEVICE_MACHINE: StateMachineDefinition<DeviceState, DeviceEventName> = {
  initial: "DISCONNECTED",
  terminal: [],
  transitions: {
    DISCONNECTED: { connect: "CONNECTING" },
    CONNECTING: { connected: "READY", "connect-failed": "ERROR", disconnect: "DISCONNECTED" },
    READY: { "job-started": "RUNNING", fault: "ERROR", disconnect: "DISCONNECTED" },
    RUNNING: {
      "job-finished": "READY",
      throttle: "THROTTLED",
      fault: "ERROR",
      abort: "ABORTING",
    },
    THROTTLED: {
      recover: "RUNNING",
      "job-finished": "READY",
      fault: "ERROR",
      abort: "ABORTING",
    },
    ERROR: { abort: "ABORTING", reset: "DISCONNECTED" },
    ABORTING: { "abort-complete": "READY", fault: "ERROR", disconnect: "DISCONNECTED" },
  },
};

export function deviceAcceptsJobs(state: DeviceState): boolean {
  return state === "READY";
}
