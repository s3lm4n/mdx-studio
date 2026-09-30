import { z } from "zod";
import { IdSchema, IsoTimestampSchema, OriginSchema } from "./common";
import { DeviceStateSchema, WatchdogStateSchema } from "./states";
import { PcieLinkSchema } from "./device";

const Fraction = z.number().min(0).max(1);

export const SimulationProgressSchema = z.object({
  step: z.number().int().nonnegative(),
  timeNs: z.number().nonnegative(),
  targetTimeNs: z.number().positive(),
  /** 0..1 */
  progress: Fraction,
  nsPerDay: z.number().nonnegative(),
  etaSeconds: z.number().nonnegative().nullable(),
});
export type SimulationProgress = z.infer<typeof SimulationProgressSchema>;

export const GromacsEnergiesSchema = z.object({
  temperatureK: z.number(),
  pressureBar: z.number(),
  potentialEnergyKJMol: z.number(),
  totalEnergyKJMol: z.number(),
  neighborListRebuilds: z.number().int().nonnegative(),
});
export type GromacsEnergies = z.infer<typeof GromacsEnergiesSchema>;

export const MdxTelemetrySchema = z.object({
  deviceState: DeviceStateSchema,
  utilization: Fraction,
  pairThroughputGPairsPerSecond: z.number().nonnegative(),
  queueOccupancy: Fraction,
  backpressure: Fraction,
  errorCount: z.number().int().nonnegative(),
  watchdog: WatchdogStateSchema,
});
export type MdxTelemetry = z.infer<typeof MdxTelemetrySchema>;

export const HardwareTelemetrySchema = z.object({
  temperatureC: z.number(),
  powerW: z.number().nonnegative(),
  clockMHz: z.number().nonnegative(),
  pcieLink: PcieLinkSchema,
});
export type HardwareTelemetry = z.infer<typeof HardwareTelemetrySchema>;

export const HostTelemetrySchema = z.object({
  cpuUtilization: Fraction,
  memoryUsedBytes: z.number().nonnegative(),
  memoryTotalBytes: z.number().positive(),
});
export type HostTelemetry = z.infer<typeof HostTelemetrySchema>;

/**
 * One telemetry sample. Whole-snapshot `origin` is authoritative: a `simulated` snapshot must
 * always be rendered with a DEMO/SIMULATED label. Sections are `null` when not applicable
 * (e.g. `mdx` and `hardware` for native runs).
 */
export const TelemetrySnapshotSchema = z.object({
  origin: OriginSchema,
  sequence: z.number().int().nonnegative(),
  timestamp: IsoTimestampSchema,
  jobId: IdSchema.nullable(),
  simulation: SimulationProgressSchema.nullable(),
  gromacs: GromacsEnergiesSchema.nullable(),
  mdx: MdxTelemetrySchema.nullable(),
  hardware: HardwareTelemetrySchema.nullable(),
  host: HostTelemetrySchema,
});
export type TelemetrySnapshot = z.infer<typeof TelemetrySnapshotSchema>;
