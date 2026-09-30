import type { DeviceState, JobState, RunStatus, StageStatus } from "@mdx-studio/protocol";
import { Badge, type BadgeTone } from "@mdx-studio/ui";

const JOB_TONE: Record<JobState, BadgeTone> = {
  CREATED: "neutral",
  VALIDATING: "info",
  READY: "info",
  STARTING: "info",
  RUNNING: "info",
  PAUSED: "warn",
  COMPLETED: "pass",
  FAILED: "fail",
  ABORTED: "warn",
};

const DEVICE_TONE: Record<DeviceState, BadgeTone> = {
  DISCONNECTED: "neutral",
  CONNECTING: "info",
  READY: "pass",
  RUNNING: "info",
  THROTTLED: "warn",
  ERROR: "fail",
  ABORTING: "warn",
};

const RUN_TONE: Record<RunStatus, BadgeTone> = {
  running: "info",
  completed: "pass",
  failed: "fail",
  aborted: "warn",
};

const STAGE_TONE: Record<StageStatus, BadgeTone> = {
  "not-started": "neutral",
  running: "info",
  completed: "pass",
  failed: "fail",
};

export function JobStateBadge({ state }: { state: JobState }) {
  return <Badge tone={JOB_TONE[state]}>{state}</Badge>;
}

export function DeviceStateBadge({ state }: { state: DeviceState }) {
  return <Badge tone={DEVICE_TONE[state]}>{state}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={RUN_TONE[status]}>{status}</Badge>;
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <Badge tone={STAGE_TONE[status]}>{status}</Badge>;
}

export function ValidationStatusBadge({
  status,
}: {
  status: "not-run" | "pending" | "passed" | "failed";
}) {
  const tone: BadgeTone =
    status === "passed"
      ? "pass"
      : status === "failed"
        ? "fail"
        : status === "pending"
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{status === "not-run" ? "not run" : status}</Badge>;
}
