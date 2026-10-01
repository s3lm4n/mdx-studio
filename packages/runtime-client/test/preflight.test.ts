import { isRuntimeClientError } from "../src";
import { describe, expect, it } from "vitest";
import { createRuntime, mdxRequest, nvtRequest, validationRequest } from "./helpers";

describe("pre-flight gating is runtime-owned", () => {
  it("lets native runs start when everything is fine and skips device checks", async () => {
    const { runtime } = createRuntime("idle");
    const report = await runtime.runPreflight(nvtRequest());
    expect(report.verdict).toBe("PASS");
    expect(report.startPermitted).toBe(true);
    expect(report.blockingCheckIds).toEqual([]);
    const device = report.checks.filter((c) => c.group === "device");
    expect(device.length).toBeGreaterThan(0);
    expect(device.every((c) => c.status === "SKIPPED")).toBe(true);
    expect(report.checks.every((c) => c.origin === "simulated")).toBe(true);
  });

  it("evaluates the documented MDX checks and passes on an idle, healthy device", async () => {
    const { runtime } = createRuntime("idle");
    const report = await runtime.runPreflight(mdxRequest());
    expect(report.verdict).toBe("PASS");
    expect(report.startPermitted).toBe(true);
    const ids = report.checks.map((c) => c.id);
    for (const required of [
      "device-detected",
      "runtime-version",
      "gromacs-version",
      "binary-checksum",
      "firmware-checksum",
      "pcie-link",
      "device-temperature",
      "device-clock",
      "watchdog",
      "tpr-compatibility",
      "supported-kernel",
      "runtime-policy",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("reports WARN but still permits start for a degraded device", async () => {
    const { runtime } = createRuntime("degraded");
    const report = await runtime.runPreflight(mdxRequest());
    expect(report.verdict).toBe("WARN");
    expect(report.startPermitted).toBe(true);
    const warned = report.checks.filter((c) => c.status === "WARN").map((c) => c.id);
    expect(warned).toEqual(
      expect.arrayContaining(["pcie-link", "device-temperature", "device-clock"]),
    );
  });

  it("blocks MDX and validation runs on a critical FAIL when the device is missing", async () => {
    const { runtime } = createRuntime("device-missing");
    for (const request of [mdxRequest(), validationRequest()]) {
      const report = await runtime.runPreflight(request);
      expect(report.verdict).toBe("FAIL");
      expect(report.startPermitted).toBe(false);
      expect(report.blockingCheckIds).toContain("device-detected");
    }
    const native = await runtime.runPreflight(nvtRequest());
    expect(native.startPermitted).toBe(true);
  });

  it("blocks MDX runs while the simulated device is in ERROR", async () => {
    const { runtime } = createRuntime("device-fault");
    const report = await runtime.runPreflight(mdxRequest());
    expect(report.startPermitted).toBe(false);
    expect(report.blockingCheckIds).toEqual(expect.arrayContaining(["device-ready"]));
  });

  it("blocks a second MDX run while the device is busy, but not native runs", async () => {
    const { runtime } = createRuntime("demo-run");
    const mdx = await runtime.runPreflight(mdxRequest());
    expect(mdx.startPermitted).toBe(false);
    expect(mdx.blockingCheckIds).toContain("device-ready");
    expect((await runtime.runPreflight(nvtRequest())).startPermitted).toBe(true);
  });

  it("never trusts a client-held report: submit re-runs the gate and refuses", async () => {
    const { runtime } = createRuntime("device-missing");
    await expect(runtime.submitJob(mdxRequest())).rejects.toSatisfy(
      (error) => isRuntimeClientError(error) && error.error.code === "preflight-failed",
    );
    expect(await runtime.listJobs()).toHaveLength(5); // only seeded history, nothing new
  });

  it("fails a request that references files outside the project inventory", async () => {
    const { runtime } = createRuntime("idle");
    const report = await runtime.runPreflight(nvtRequest({ topology: "inputs/missing.top" }));
    expect(report.startPermitted).toBe(false);
    expect(report.blockingCheckIds).toContain("inputs-present");
  });

  it("fails policy for unknown profiles and excessive threads", async () => {
    const { runtime } = createRuntime("idle");
    const unknown = await runtime.runPreflight(mdxRequest({ mdxProfile: "nope" }));
    expect(unknown.blockingCheckIds).toContain("runtime-policy");
    const threads = await runtime.runPreflight(
      nvtRequest({ resources: { threads: 512, computeTarget: "cpu" } }),
    );
    expect(threads.blockingCheckIds).toContain("runtime-policy");
  });

  it("rejects malformed requests with structured field issues", async () => {
    const { runtime } = createRuntime("idle");
    const bad = { ...nvtRequest(), mdp: "../../etc/passwd" };
    await expect(runtime.runPreflight(bad)).rejects.toSatisfy(
      (error) =>
        isRuntimeClientError(error) &&
        error.error.code === "invalid-request" &&
        error.error.issues.some((i) => i.path === "mdp"),
    );
    await expect(
      runtime.runPreflight({ ...nvtRequest(), command: "gmx mdrun" } as never),
    ).rejects.toSatisfy(
      (error) => isRuntimeClientError(error) && error.error.code === "invalid-request",
    );
  });

  it("rejects unknown projects", async () => {
    const { runtime } = createRuntime("idle");
    await expect(runtime.runPreflight(nvtRequest({ projectId: "ghost" }))).rejects.toSatisfy(
      (error) => isRuntimeClientError(error) && error.error.code === "not-found",
    );
  });
});
