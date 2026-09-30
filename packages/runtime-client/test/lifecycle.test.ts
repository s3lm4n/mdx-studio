import { describe, expect, it } from "vitest";
import { isRuntimeClientError } from "../src";
import {
  advanceSeconds,
  createRuntime,
  mdxRequest,
  nvtRequest,
  validationRequest,
} from "./helpers";

describe("job lifecycle", () => {
  it("walks CREATED -> VALIDATING -> READY -> STARTING -> RUNNING -> COMPLETED via the state machine", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(mdxRequest());
    expect(job.state).toBe("CREATED");
    expect(job.allowedActions).toEqual(["stop"]);

    const seen: string[] = [job.state];
    runtime.subscribeJobs((updated) => {
      if (updated.id === job.id && seen[seen.length - 1] !== updated.state)
        seen.push(updated.state);
    });
    advanceSeconds(clock, 30);

    expect(seen).toEqual(["CREATED", "VALIDATING", "READY", "STARTING", "RUNNING", "COMPLETED"]);
    const done = await runtime.getJob(job.id);
    expect(done.state).toBe("COMPLETED");
    expect(done.allowedActions).toEqual([]);
    expect(done.finishedAt).not.toBeNull();
    runtime.dispose();
  });

  it("arms the watchdog before the simulation starts and releases the device afterwards", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(mdxRequest());
    expect((await runtime.getDeviceStatus()).state).toBe("READY");
    expect((await runtime.getDeviceStatus()).watchdog.state).toBe("DISARMED");

    advanceSeconds(clock, 4);
    const running = await runtime.getDeviceStatus();
    expect(running.state).toBe("RUNNING");
    expect(running.watchdog.state).toBe("ARMED");

    const messages = (await runtime.getJobEvents(job.id)).flatMap((e) =>
      e.type === "log" ? [e.message] : [],
    );
    const armed = messages.findIndex((m) => m.includes("watchdog armed"));
    const started = messages.findIndex((m) => m.includes("Simulation started"));
    expect(armed).toBeGreaterThanOrEqual(0);
    expect(started).toBeGreaterThan(armed);

    advanceSeconds(clock, 30);
    const after = await runtime.getDeviceStatus();
    expect(after.state).toBe("READY");
    expect(after.watchdog.state).toBe("DISARMED");
  });

  it("does not involve the device for native runs", async () => {
    const { clock, runtime } = createRuntime("idle");
    await runtime.submitJob(nvtRequest());
    advanceSeconds(clock, 10);
    const device = await runtime.getDeviceStatus();
    expect(device.state).toBe("READY");
    expect(device.watchdog.state).toBe("DISARMED");
  });

  it("refuses a second MDX job while one holds the device", async () => {
    const { runtime } = createRuntime("idle");
    await runtime.submitJob(mdxRequest());
    await expect(runtime.submitJob(mdxRequest({ outputName: "second" }))).rejects.toSatisfy(
      (error) => isRuntimeClientError(error) && error.error.code === "preflight-failed",
    );
  });

  it("stops a running job, aborts the device and returns to READY", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(mdxRequest({ mdp: "mdp/nvt.mdp" }));
    advanceSeconds(clock, 4);
    expect((await runtime.getJob(job.id)).state).toBe("RUNNING");

    const stopped = await runtime.stopJob(job.id);
    expect(stopped.state).toBe("ABORTED");
    expect(stopped.allowedActions).toEqual([]);
    expect((await runtime.getDeviceStatus()).state).toBe("ABORTING");
    expect((await runtime.getDeviceStatus()).watchdog.state).toBe("DISARMED");

    advanceSeconds(clock, 1);
    expect((await runtime.getDeviceStatus()).state).toBe("READY");
  });

  it("refuses to stop a job that is already finished", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(nvtRequest({ mdp: "mdp/em.mdp" }));
    advanceSeconds(clock, 40);
    expect((await runtime.getJob(job.id)).state).toBe("COMPLETED");
    await expect(runtime.stopJob(job.id)).rejects.toSatisfy(
      (error) => isRuntimeClientError(error) && error.error.code === "conflict",
    );
  });

  it("emits monotonically sequenced events and live telemetry that stops after unsubscribe", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(mdxRequest());
    const live: number[] = [];
    const unsubscribe = runtime.subscribeTelemetry(job.id, (s) => live.push(s.sequence));
    advanceSeconds(clock, 6);
    expect(live.length).toBeGreaterThan(0);
    const count = live.length;
    unsubscribe();
    advanceSeconds(clock, 3);
    expect(live).toHaveLength(count);
    expect([...live].sort((a, b) => a - b)).toEqual(live);

    const events = await runtime.getJobEvents(job.id);
    expect(events.map((e) => e.sequence)).toEqual(events.map((_, i) => i));
  });

  it("reports native telemetry without MDX or hardware sections", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(nvtRequest());
    advanceSeconds(clock, 8);
    const history = await runtime.getTelemetryHistory(job.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((s) => s.mdx === null && s.hardware === null)).toBe(true);
    expect(history.every((s) => s.gromacs !== null && s.simulation !== null)).toBe(true);
  });

  it("derives the simulated target from the project's own MDP (nsteps * dt)", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(mdxRequest()); // nvt.mdp: 50000 * 0.002 ps = 0.1 ns
    advanceSeconds(clock, 6);
    const history = await runtime.getTelemetryHistory(job.id);
    expect(history[0]?.simulation?.targetTimeNs).toBeCloseTo(0.1, 9);
  });
});

describe("critical device faults", () => {
  it("stop the dependent run, leave the device in ERROR and block new MDX starts", async () => {
    const { clock, runtime } = createRuntime("nominal");
    const job = (await runtime.listJobs()).find((j) => j.state === "RUNNING");
    expect(job).toBeDefined();

    runtime.injectDeviceFault();

    const failed = await runtime.getJob(job?.id ?? "");
    expect(failed.state).toBe("FAILED");
    expect(failed.failure?.message).toContain("Device fault");
    expect(failed.allowedActions).toEqual([]);
    const device = await runtime.getDeviceStatus();
    expect(device.state).toBe("ERROR");
    expect(device.watchdog.state).toBe("DISARMED");
    expect(device.lastError?.code).toBe("MDX_SIM_FAULT");

    const events = await runtime.getJobEvents(failed.id);
    expect(events.some((e) => e.type === "error")).toBe(true);

    const report = await runtime.runPreflight(mdxRequest());
    expect(report.startPermitted).toBe(false);

    advanceSeconds(clock, 5);
    expect((await runtime.getJob(failed.id)).state).toBe("FAILED"); // does not resurrect
  });

  it("require an explicit reset before the device can be used again", async () => {
    const { clock, runtime } = createRuntime("device-fault");
    expect((await runtime.getDeviceStatus()).state).toBe("ERROR");
    runtime.resetDevice();
    expect((await runtime.getDeviceStatus()).state).toBe("CONNECTING");
    advanceSeconds(clock, 1);
    const status = await runtime.getDeviceStatus();
    expect(status.state).toBe("READY");
    expect(status.lastError).toBeNull();
    expect((await runtime.runPreflight(mdxRequest())).startPermitted).toBe(true);
  });

  it("refuse fault injection or reset in states where they do not apply", () => {
    const { runtime } = createRuntime("idle");
    expect(() => {
      runtime.resetDevice();
    }).toThrow();
    const missing = createRuntime("device-missing").runtime;
    expect(() => {
      missing.injectDeviceFault();
    }).toThrow();
  });
});

describe("validation results are decided by the runtime", () => {
  it("passes every placeholder gate in nominal conditions", async () => {
    const { clock, runtime } = createRuntime("idle");
    const job = await runtime.submitJob(validationRequest());
    const pending = await runtime.getValidationResult(job.id);
    expect(pending?.status).toBe("pending");
    expect(pending?.gates.every((g) => g.passed === null && g.observedMaxError === null)).toBe(
      true,
    );

    advanceSeconds(clock, 30);
    const result = await runtime.getValidationResult(job.id);
    expect(result?.status).toBe("passed");
    expect(result?.gates.length).toBeGreaterThan(0);
    for (const gate of result?.gates ?? []) {
      expect(gate.passed).toBe((gate.observedMaxError ?? Infinity) <= gate.maxAbsoluteError);
    }
    const run = (await runtime.listRuns()).find((r) => r.jobId === job.id);
    expect(run?.validationStatus).toBe("passed");
  });

  it("reports a failing gate in the validation-mismatch scenario", async () => {
    const { clock, runtime } = createRuntime("validation-mismatch");
    const job = await runtime.submitJob(validationRequest());
    advanceSeconds(clock, 30);
    const result = await runtime.getValidationResult(job.id);
    expect(result?.status).toBe("failed");
    const failing = result?.gates.filter((g) => g.passed === false) ?? [];
    expect(failing.map((g) => g.quantity)).toEqual(["virial"]);
  });

  it("returns null for non-validation jobs and sources profiles from the runtime", async () => {
    const { runtime } = createRuntime("idle");
    const job = await runtime.submitJob(nvtRequest());
    expect(await runtime.getValidationResult(job.id)).toBeNull();
    const profiles = await runtime.listValidationProfiles();
    expect(profiles[0]?.status).toBe("placeholder");
    expect(profiles[0]?.gates.map((g) => g.quantity)).toEqual([
      "force",
      "energy",
      "virial",
      "position",
      "shift-force",
    ]);
  });
});
