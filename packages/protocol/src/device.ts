import { z } from "zod";
import { IsoTimestampSchema, OriginSchema } from "./common";
import { DeviceStateSchema, WatchdogStateSchema } from "./states";

export const PcieLinkSchema = z.object({
  status: z.enum(["up", "degraded", "down"]),
  generation: z.number().int().min(1).max(6),
  lanes: z.number().int().min(1).max(32),
});
export type PcieLink = z.infer<typeof PcieLinkSchema>;

export const DeviceIdentitySchema = z.object({
  model: z.string(),
  firmwareVersion: z.string(),
  bitstreamChecksum: z.string(),
});
export type DeviceIdentity = z.infer<typeof DeviceIdentitySchema>;

export const MdxDeviceStatusSchema = z.object({
  origin: OriginSchema,
  state: DeviceStateSchema,
  identity: DeviceIdentitySchema.nullable(),
  link: PcieLinkSchema.nullable(),
  temperatureC: z.number().nullable(),
  powerW: z.number().nullable(),
  clockMHz: z.number().nullable(),
  watchdog: z.object({
    state: WatchdogStateSchema,
    timeoutMs: z.number().int().positive(),
  }),
  lastError: z.object({ code: z.string(), message: z.string() }).nullable(),
  updatedAt: IsoTimestampSchema,
});
export type MdxDeviceStatus = z.infer<typeof MdxDeviceStatusSchema>;
