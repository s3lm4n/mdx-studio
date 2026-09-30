import type { DeviceState, ValidationQuantity } from "@mdx-studio/protocol";

export const SCENARIO_IDS = [
  "nominal",
  "idle",
  "degraded",
  "device-missing",
  "device-fault",
  "validation-mismatch",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface ScenarioDefinition {
  readonly id: ScenarioId;
  readonly label: string;
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
  nominal: {
    id: "nominal",
    label: "Nominal - MDX run in progress",
    description:
      "Simulated device is healthy and busy with a demo MDX run (104.962 / 300 ns). Native runs can start; MDX runs are blocked until the demo run stops.",
    deviceState: "RUNNING",
    baseTemperatureC: 44,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: null,
    seedRunningJob: true,
    failingGate: null,
  },
  idle: {
    id: "idle",
    label: "Idle - device ready",
    description: "Simulated device is READY and nothing is running. All run modes can start.",
    deviceState: "READY",
    baseTemperatureC: 41,
    clockMHz: 320,
    link: NOMINAL_LINK,
    lastError: null,
    seedRunningJob: false,
    failingGate: null,
  },
  degraded: {
    id: "degraded",
    label: "Degraded - WARN checks",
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
