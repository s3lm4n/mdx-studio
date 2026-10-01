import type { DeviceState, ValidationQuantity } from "@mdx-studio/protocol";

export const SCENARIO_IDS = [
  "idle",
  "demo-run",
  "degraded",
  "device-missing",
  "device-fault",
  "validation-mismatch",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

/**
 * The app starts idle so a fresh launch never looks like a real simulation is running. The
 * in-progress demo run is opt-in from Settings → Demo runtime controls.
 */
export const DEFAULT_SCENARIO: ScenarioId = "idle";

export interface ScenarioDefinition {
  readonly id: ScenarioId;
  readonly label: string;
  /** Compact name for always-visible chrome (the disclosure ribbon). */
  readonly shortLabel: string;
  readonly description: string;
  readonly deviceState: DeviceState;
  readonly baseTemperatureC: number;
  readonly clockMHz: number;
  readonly link: { status: "up" | "degraded" | "down"; generation: number; lanes: number };
  readonly lastError: { code: string; message: string } | null;
  /** Start with an MDX run in progress (matches the DEMO monitor reference numbers). */
  readonly seedRunningJob: boolean;
  /** Quantity whose validation gate the simulated candidate run exceeds. */
  readonly failingGate: ValidationQuantity | null;
}

const NOMINAL_LINK = { status: "up", generation: 4, lanes: 8 } as const;

/**
 * Demo scenarios let the prototype exercise PASS / WARN / FAIL pre-flight gating and device
 * states without hardware. They are mock controls only: nothing here models real protection.
 */
export const SCENARIOS: Readonly<Record<ScenarioId, ScenarioDefinition>> = {
  idle: {
    id: "idle",
    label: "Idle — no active run (default)",
    shortLabel: "Idle",
    description:
      "Simulated device is READY and nothing is running; the run history is demo data. All run modes can start. This is the default so a fresh launch never looks like a real simulation is in progress.",
    deviceState: "READY",
    baseTemperatureC: 41,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: null,
    seedRunningJob: false,
    failingGate: null,
  },
  "demo-run": {
    id: "demo-run",
    label: "Demo run in progress",
    shortLabel: "Demo run in progress",
    description:
      "Opens with a simulated MDX production run already in progress (104.962 / 300 ns) so live telemetry can be previewed. Nothing is executing. Native runs can start; MDX runs are blocked until the demo run stops.",
    deviceState: "RUNNING",
    baseTemperatureC: 44,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: null,
    seedRunningJob: true,
    failingGate: null,
  },
  degraded: {
    id: "degraded",
    label: "Degraded - WARN checks",
    shortLabel: "Degraded device",
    description:
      "Simulated device is READY but hot with a degraded link. Pre-flight reports WARN and start stays permitted.",
    deviceState: "READY",
    baseTemperatureC: 78,
    clockMHz: 280,
    link: { status: "degraded", generation: 3, lanes: 4 },
    lastError: null,
    seedRunningJob: false,
    failingGate: null,
  },
  "device-missing": {
    id: "device-missing",
    label: "Device missing - critical FAIL",
    shortLabel: "Device missing",
    description:
      "Simulated device is DISCONNECTED. MDX and validation runs are blocked by a critical FAIL; native runs still work.",
    deviceState: "DISCONNECTED",
    baseTemperatureC: 0,
    clockMHz: 0,
    link: { status: "down", generation: 1, lanes: 1 },
    lastError: null,
    seedRunningJob: false,
    failingGate: null,
  },
  "device-fault": {
    id: "device-fault",
    label: "Device fault - critical FAIL",
    shortLabel: "Device fault",
    description:
      "Simulated device is in ERROR with a recorded simulated fault. MDX and validation runs are blocked.",
    deviceState: "ERROR",
    baseTemperatureC: 52,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: { code: "MDX_SIM_FAULT", message: "Simulated device fault (demo scenario)" },
    seedRunningJob: false,
    failingGate: null,
  },
  "validation-mismatch": {
    id: "validation-mismatch",
    label: "Validation mismatch",
    shortLabel: "Validation mismatch",
    description:
      "Device is READY; simulated validation runs report the virial gate as exceeded so FAIL rendering can be reviewed.",
    deviceState: "READY",
    baseTemperatureC: 41,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: null,
    seedRunningJob: false,
    failingGate: "virial",
  },
};
