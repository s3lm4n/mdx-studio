import type {
  MdxDeviceStatus,
  RunMode,
  SimulationProgress,
  TelemetrySnapshot,
} from "@mdx-studio/protocol";
import { RUN_MODE_INFO } from "@mdx-studio/simulation-model";
import { MOCK_HOST } from "./fixtures";
import { noise } from "./hash";

export interface TelemetryInput {
  readonly sequence: number;
  readonly timestampMs: number;
  readonly jobId: string;
  readonly runMode: RunMode;
  readonly simulation: SimulationProgress;
  readonly device: MdxDeviceStatus;
  /** Steps between neighbor-list rebuilds for the simulated job. */
  readonly nstlist: number;
}

const SEED = 20_260_115;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Mock Telemetry Provider. Produces deterministic, plausible-looking values from
 * (sequence, job) only, so history and live samples are reproducible. Every snapshot is tagged
 * `origin: "simulated"`; none of it is measured from GROMACS, a device or the host.
 */
export function sampleTelemetry(input: TelemetryInput): TelemetrySnapshot {
  const n = input.sequence;
  const wave = Math.sin(n / 9);
  const usesMdx = RUN_MODE_INFO[input.runMode].usesMdx;
  const device = input.device;

  const kinetic = 74_000 + 120 * noise(SEED, n * 7 + 1);
  const potential = -483_000 + 350 * noise(SEED, n * 7 + 2) + 120 * wave;

  return {
    origin: "simulated",
    sequence: n,
    timestamp: new Date(input.timestampMs).toISOString(),
    jobId: input.jobId,
    simulation: input.simulation,
    gromacs: {
      temperatureK: 300 + 1.4 * noise(SEED, n * 7 + 3),
      pressureBar: 1 + 85 * noise(SEED, n * 7 + 4),
      potentialEnergyKJMol: potential,
      totalEnergyKJMol: potential + kinetic,
      neighborListRebuilds: Math.floor(input.simulation.step / Math.max(1, input.nstlist)),
    },
    mdx: usesMdx
      ? {
          deviceState: device.state,
          utilization: clamp01(0.78 + 0.05 * wave + 0.03 * noise(SEED, n * 7 + 5)),
          pairThroughputGPairsPerSecond: 92 + 4 * wave + 2 * noise(SEED, n * 7 + 6),
          queueOccupancy: clamp01(0.42 + 0.1 * Math.sin(n / 5) + 0.04 * noise(SEED, n * 7 + 7)),
          backpressure: clamp01(
            0.06 + 0.04 * Math.max(0, Math.sin(n / 13)) + 0.01 * noise(SEED, n * 11 + 1),
          ),
          errorCount: 0,
          watchdog: device.watchdog.state,
        }
      : null,
    hardware:
      usesMdx && device.link !== null
        ? {
            temperatureC: (device.temperatureC ?? 40) + 1.5 * wave + 0.4 * noise(SEED, n * 13 + 2),
            powerW: (device.powerW ?? 9) + 1.2 * noise(SEED, n * 13 + 3),
            clockMHz: device.clockMHz ?? 0,
            pcieLink: device.link,
          }
        : null,
    host: {
      cpuUtilization: clamp01(0.42 + 0.08 * Math.sin(n / 7) + 0.03 * noise(SEED, n * 17 + 1)),
      memoryUsedBytes: Math.round(21.5 * 1024 ** 3 + 2 ** 24 * noise(SEED, n * 17 + 2)),
      memoryTotalBytes: MOCK_HOST.memoryTotalBytes,
    },
  };
}
