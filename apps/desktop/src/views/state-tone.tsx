import type { DeviceState, JobState, RunStatus, StageStatus } from "@mdx-studio/protocol";
import { Badge, type BadgeAppearance, type BadgeTone } from "@mdx-studio/ui";

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

interface AppearanceProp {
  /** `plain` renders glyph + word without a chip (for status lines inside cards and tables). */
  appearance?: BadgeAppearance;
}

export function JobStateBadge({ state, appearance }: { state: JobState } & AppearanceProp) {
  return (
    <Badge tone={JOB_TONE[state]} {...(appearance === undefined ? {} : { appearance })}>
      {state}
    </Badge>
  );
}

export function DeviceStateBadge({ state, appearance }: { state: DeviceState } & AppearanceProp) {
  return (
    <Badge tone={DEVICE_TONE[state]} {...(appearance === undefined ? {} : { appearance })}>
      {state}
    </Badge>
  );
}

export function RunStatusBadge({ status, appearance }: { status: RunStatus } & AppearanceProp) {
  return (
    <Badge tone={RUN_TONE[status]} {...(appearance === undefined ? {} : { appearance })}>
      {status}
    </Badge>
  );
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <Badge tone={STAGE_TONE[status]}>{status}</Badge>;
}

export type ValidationStatusValue = "not-run" | "pending" | "passed" | "failed";

export const VALIDATION_TONE: Record<ValidationStatusValue, BadgeTone> = {
  passed: "pass",
  failed: "fail",
  pending: "info",
  "not-run": "neutral",
};

export function validationLabel(status: ValidationStatusValue): string {
  return status === "not-run" ? "not run" : status;
}

export function ValidationStatusBadge({
  status,
  appearance,
}: { status: ValidationStatusValue } & AppearanceProp) {
  return (
    <Badge tone={VALIDATION_TONE[status]} {...(appearance === undefined ? {} : { appearance })}>
      {validationLabel(status)}
    </Badge>
  );
}
