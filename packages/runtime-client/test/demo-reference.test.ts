import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIO, ManualClock, MockRuntimeClient, SCENARIOS, SCENARIO_IDS } from "../src";
import { createRuntime } from "./helpers";

describe("demo-run scenario reference values", () => {
  it("shows the documented monitor reference run: 104.962 / 300 ns, ~34.99 %, ~1700 ns/day", async () => {
    const { runtime } = createRuntime("demo-run");
    const running = (await runtime.listJobs()).find((job) => job.state === "RUNNING");
    expect(running).toBeDefined();
    const history = await runtime.getTelemetryHistory(running?.id ?? "");
    const latest = history[history.length - 1];
    expect(latest?.simulation?.timeNs).toBeCloseTo(104.962, 3);
    expect(latest?.simulation?.targetTimeNs).toBeCloseTo(300, 6);
    expect((latest?.simulation?.progress ?? 0) * 100).toBeCloseTo(34.99, 1);
    expect(latest?.simulation?.nsPerDay).toBeGreaterThan(1650);
    expect(latest?.simulation?.nsPerDay).toBeLessThan(1750);
    expect(latest?.simulation?.etaSeconds).toBeGreaterThan(0);
    expect(latest?.origin).toBe("simulated");
    runtime.dispose();
  });

  it("pre-rolls rolling history so charts are populated at first render", async () => {
    const { runtime } = createRuntime("demo-run");
    const job = (await runtime.listJobs()).find((j) => j.state === "RUNNING");
    const history = await runtime.getTelemetryHistory(job?.id ?? "");
    expect(history.length).toBeGreaterThanOrEqual(100);
    const sequences = history.map((s) => s.sequence);
    expect([...sequences].sort((a, b) => a - b)).toEqual(sequences);
    expect(history.every((s) => s.mdx !== null && s.hardware !== null)).toBe(true);
    const limited = await runtime.getTelemetryHistory(job?.id ?? "", 10);
    expect(limited).toHaveLength(10);
    runtime.dispose();
  });

  it("is deterministic across instances", async () => {
    const a = createRuntime("demo-run");
    const b = createRuntime("demo-run");
    const jobA = (await a.runtime.listJobs()).find((j) => j.state === "RUNNING");
    const jobB = (await b.runtime.listJobs()).find((j) => j.state === "RUNNING");
    expect(await a.runtime.getTelemetryHistory(jobA?.id ?? "", 5)).toEqual(
      await b.runtime.getTelemetryHistory(jobB?.id ?? "", 5),
    );
    a.runtime.dispose();
    b.runtime.dispose();
  });
});

describe("default demo state", () => {
  it("starts idle: no queued or running job and a READY device, so nothing looks like a live run", async () => {
    const runtime = new MockRuntimeClient({ clock: new ManualClock() });
    expect(runtime.scenario.id).toBe(DEFAULT_SCENARIO);
    expect(DEFAULT_SCENARIO).toBe("idle");
    const live = (await runtime.listJobs()).filter(
      (job) => !["COMPLETED", "FAILED", "ABORTED"].includes(job.state),
    );
    expect(live).toEqual([]);
    expect((await runtime.getDeviceStatus()).state).toBe("READY");
    runtime.dispose();
  });

  it("keeps the in-progress demo run available as an explicit, opt-in scenario", async () => {
    expect(SCENARIO_IDS).toContain("demo-run");
    expect(SCENARIOS["demo-run"].label).toMatch(/demo run/i);
    const { runtime } = createRuntime("demo-run");
    expect((await runtime.listJobs()).some((job) => job.state === "RUNNING")).toBe(true);
    runtime.dispose();
  });
});
