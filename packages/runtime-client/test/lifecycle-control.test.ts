import { describe, expect, it } from "vitest";
import { ManualClock, MockRuntimeClient } from "../src";
import { mdxRequest } from "./helpers";

describe("mock runtime start/dispose", () => {
  it("does not tick until started when autoStart is false", async () => {
    const clock = new ManualClock();
    const runtime = new MockRuntimeClient({ scenario: "idle", clock, autoStart: false });
    const job = await runtime.submitJob(mdxRequest());
    clock.advance(10_000);
    expect((await runtime.getJob(job.id)).state).toBe("CREATED");
    runtime.start();
    clock.advance(10_000);
    expect((await runtime.getJob(job.id)).state).not.toBe("CREATED");
    runtime.dispose();
  });

  it("start() is idempotent: repeated calls do not double the simulation speed", async () => {
    const clock = new ManualClock();
    const once = new MockRuntimeClient({ scenario: "nominal", clock, autoStart: false });
    once.start();
    const many = new MockRuntimeClient({ scenario: "nominal", clock, autoStart: false });
    many.start();
    many.start();
    many.start();
    clock.advance(30_000);
    const timeOf = async (runtime: MockRuntimeClient) => {
      const job = (await runtime.listJobs()).find((j) => j.state === "RUNNING");
      const history = await runtime.getTelemetryHistory(job?.id ?? "", 1);
      return history[0]?.simulation?.timeNs;
    };
    expect(await timeOf(many)).toBe(await timeOf(once));
  });

  it("survives a StrictMode-style start/dispose/start cycle and stops when disposed", async () => {
    const clock = new ManualClock();
    const runtime = new MockRuntimeClient({ scenario: "nominal", clock, autoStart: false });
    runtime.start();
    runtime.dispose();
    runtime.start();
    const job = (await runtime.listJobs()).find((j) => j.state === "RUNNING");
    const before =
      (await runtime.getTelemetryHistory(job?.id ?? "", 1))[0]?.simulation?.timeNs ?? 0;
    clock.advance(5_000);
    const after = (await runtime.getTelemetryHistory(job?.id ?? "", 1))[0]?.simulation?.timeNs ?? 0;
    expect(after).toBeGreaterThan(before);

    runtime.dispose();
    runtime.dispose(); // safe to repeat
    clock.advance(5_000);
    const frozen =
      (await runtime.getTelemetryHistory(job?.id ?? "", 1))[0]?.simulation?.timeNs ?? 0;
    expect(frozen).toBe(after);
  });

  it("does not skip simulated time across a pause: resuming resets the tick baseline", async () => {
    const clock = new ManualClock();
    const runtime = new MockRuntimeClient({ scenario: "nominal", clock });
    const job = (await runtime.listJobs()).find((j) => j.state === "RUNNING");
    clock.advance(1_000);
    const t1 = (await runtime.getTelemetryHistory(job?.id ?? "", 1))[0]?.simulation?.timeNs ?? 0;
    runtime.dispose();
    clock.advance(3_600_000); // an hour passes while stopped
    runtime.start();
    clock.advance(1_000);
    const t2 = (await runtime.getTelemetryHistory(job?.id ?? "", 1))[0]?.simulation?.timeNs ?? 0;
    expect(t2 - t1).toBeLessThan(0.05); // ~1 s of progress at 1700 ns/day, not an hour's worth
  });
});
