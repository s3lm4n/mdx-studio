import type { DeviceState, MdxDeviceStatus, WatchdogState } from "@mdx-studio/protocol";
import { DEVICE_MACHINE, transition, type DeviceEventName } from "@mdx-studio/simulation-model";
import { Emitter } from "../emitter";
import { MOCK_MDX_FIRMWARE_VERSION } from "./fixtures";
import { simulatedDigest } from "./hash";
import type { ScenarioDefinition } from "./scenarios";

export const MOCK_WATCHDOG_TIMEOUT_MS = 5_000;

/**
 * Mock MDX Device Provider. There is NO production MDX device integration: this class only
 * walks the device state machine and reports scenario-defined values, all tagged
 * `origin: "simulated"`. It implements no physical protection logic.
 */
export class MockDeviceProvider {
  private deviceState: DeviceState;
  private watchdog: WatchdogState;
  private lastError: { code: string; message: string } | null;
  private readonly changes = new Emitter<void>();

  constructor(
    private readonly scenario: ScenarioDefinition,
    private readonly nowIso: () => string,
  ) {
    this.deviceState = scenario.deviceState;
    this.watchdog = scenario.deviceState === "RUNNING" ? "ARMED" : "DISARMED";
    this.lastError = scenario.lastError;
  }

  get state(): DeviceState {
    return this.deviceState;
  }

  get watchdogState(): WatchdogState {
    return this.watchdog;
  }

  onChange(listener: () => void): () => void {
    return this.changes.subscribe(listener);
  }

  /** Applies a device event; returns false (and changes nothing) if the machine forbids it. */
  apply(event: DeviceEventName): boolean {
    const result = transition(DEVICE_MACHINE, this.deviceState, event);
    if (!result.ok) return false;
    this.deviceState = result.state;
    this.changes.emit();
    return true;
  }

  armWatchdog(): void {
    this.watchdog = "ARMED";
    this.changes.emit();
  }

  disarmWatchdog(): void {
    this.watchdog = "DISARMED";
    this.changes.emit();
  }

  /** Mock-only: record a simulated fault and move the device to ERROR. */
  injectFault(code: string, message: string): boolean {
    const moved = this.apply("fault");
    if (moved) this.lastError = { code, message };
    this.changes.emit();
    return moved;
  }

  clearError(): void {
    this.lastError = null;
  }

  status(): MdxDeviceStatus {
    const present = this.deviceState !== "DISCONNECTED" && this.deviceState !== "CONNECTING";
    const running = this.deviceState === "RUNNING" || this.deviceState === "THROTTLED";
    return {
      origin: "simulated",
      state: this.deviceState,
      identity: present
        ? {
            model: "MDX simulated device (DEMO)",
            firmwareVersion: MOCK_MDX_FIRMWARE_VERSION,
            bitstreamChecksum: simulatedDigest("bitstream"),
          }
        : null,
      link: present ? this.scenario.link : null,
      temperatureC: present ? this.scenario.baseTemperatureC + (running ? 14 : 0) : null,
      powerW: present ? (running ? 34 : 9) : null,
      clockMHz: present ? this.scenario.clockMHz : null,
      watchdog: { state: this.watchdog, timeoutMs: MOCK_WATCHDOG_TIMEOUT_MS },
      lastError: this.lastError,
      updatedAt: this.nowIso(),
    };
  }
}
