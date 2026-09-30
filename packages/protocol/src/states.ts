import { z } from "zod";

/**
 * Device lifecycle states. Transitions are defined by the runtime-owned state machine in
 * `@mdx-studio/simulation-model`; clients only display the reported state.
 */
export const DEVICE_STATES = [
  "DISCONNECTED",
  "CONNECTING",
  "READY",
  "RUNNING",
  "THROTTLED",
  "ERROR",
  "ABORTING",
] as const;
export const DeviceStateSchema = z.enum(DEVICE_STATES);
export type DeviceState = z.infer<typeof DeviceStateSchema>;

/**
 * Job lifecycle states. `PAUSED` is reserved in the contract; a runtime must advertise
 * `supportsPause` before any client may rely on it.
 */
export const JOB_STATES = [
  "CREATED",
  "VALIDATING",
  "READY",
  "STARTING",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "ABORTED",
] as const;
export const JobStateSchema = z.enum(JOB_STATES);
export type JobState = z.infer<typeof JobStateSchema>;

export const WatchdogStateSchema = z.enum(["DISARMED", "ARMED", "TRIPPED"]);
export type WatchdogState = z.infer<typeof WatchdogStateSchema>;
