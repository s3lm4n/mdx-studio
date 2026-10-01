import { describe, expect, it } from "vitest";
import { getMdpValue, parseMdp } from "@mdx-studio/simulation-model";
import { isRuntimeClientError } from "../src";
import { sha256Hex } from "../src/mock/hash";
import { advanceSeconds, createRuntime, nvtRequest } from "./helpers";

describe("projects and MDP files", () => {
  it("returns the stored MDP text verbatim with its real sha256", async () => {
    const { runtime } = createRuntime("idle");
    const doc = await runtime.readMdp("lysozyme-demo", "mdp/production.mdp");
    expect(doc.sha256).toBe(sha256Hex(doc.text));
    expect(getMdpValue(parseMdp(doc.text), "nsteps")).toBe("150000000");
  });

  it("persists edits (in memory) and changes the hash", async () => {
    const { runtime } = createRuntime("idle");
    const before = await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp");
    const saved = await runtime.writeMdp(
      "lysozyme-demo",
      "mdp/nvt.mdp",
      `${before.text}; edited\n`,
    );
    expect(saved.sha256).not.toBe(before.sha256);
    expect((await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp")).text).toBe(saved.text);
  });

  it("rejects writes to unknown paths, non-MDP files and oversize text", async () => {
    const { runtime } = createRuntime("idle");
    const notFound = (error: unknown) =>
      isRuntimeClientError(error) && error.error.code === "not-found";
    await expect(runtime.writeMdp("lysozyme-demo", "mdp/new.mdp", "a = 1")).rejects.toSatisfy(
      notFound,
    );
    await expect(runtime.writeMdp("lysozyme-demo", "inputs/system.top", "a = 1")).rejects.toSatisfy(
      notFound,
    );
    await expect(runtime.writeMdp("ghost", "mdp/nvt.mdp", "a = 1")).rejects.toSatisfy(notFound);
    await expect(
      runtime.writeMdp("lysozyme-demo", "mdp/nvt.mdp", "x".repeat(300 * 1024)),
    ).rejects.toSatisfy((e) => isRuntimeClientError(e) && e.error.code === "invalid-request");
  });

  it("feeds edited MDP content into the next pre-flight", async () => {
    const { runtime } = createRuntime("idle");
    await runtime.writeMdp("lysozyme-demo", "mdp/nvt.mdp", "dt = not-a-number\n");
    const report = await runtime.runPreflight(nvtRequest());
    expect(report.startPermitted).toBe(false);
    expect(report.blockingCheckIds).toContain("mdp-valid");
  });

  it("reflects live job state in project stages", async () => {
    const { clock, runtime } = createRuntime("idle");
    const before = await runtime.getProject("membrane-demo");
    expect(before.stages.find((s) => s.stage === "NVT")?.status).toBe("not-started");
    await runtime.submitJob(
      nvtRequest({
        projectId: "membrane-demo",
        mdp: "mdp/nvt.mdp",
        outputDirectory: "outputs/nvt",
      }),
    );
    advanceSeconds(clock, 6);
    expect(
      (await runtime.getProject("membrane-demo")).stages.find((s) => s.stage === "NVT")?.status,
    ).toBe("running");
    advanceSeconds(clock, 60);
    expect(
      (await runtime.getProject("membrane-demo")).stages.find((s) => s.stage === "NVT")?.status,
    ).toBe("completed");
  });

  it("lists runs newest-first and filters by project", async () => {
    const { runtime } = createRuntime("demo-run");
    const all = await runtime.listRuns();
    const starts = all.map((r) => r.startedAt);
    expect([...starts].sort().reverse()).toEqual(starts);
    const membrane = await runtime.listRuns("membrane-demo");
    expect(membrane.length).toBeGreaterThan(0);
    expect(membrane.every((r) => r.projectId === "membrane-demo")).toBe(true);
  });
});

describe("provenance records", () => {
  it("record structured commands, hashes and versions without being an input anywhere", async () => {
    const { runtime } = createRuntime("demo-run");
    const run = (await runtime.listRuns()).find((r) => r.status === "running");
    const provenance = await runtime.getProvenance(run?.runId ?? "");
    expect(provenance.commands.length).toBeGreaterThanOrEqual(2);
    for (const command of provenance.commands) {
      expect(command.argv[0]).toBe("gmx");
      expect(command.display.startsWith("gmx ")).toBe(true);
      expect(command.workingDirectory).toBe(".");
    }
    expect(provenance.mdxFirmware?.version).toMatch(/demo/);
    expect(provenance.mdpHash).toBe(
      sha256Hex((await runtime.readMdp("lysozyme-demo", "mdp/production.mdp")).text),
    );
    expect(provenance.binaryHashes.every((h) => h.name.includes("simulated"))).toBe(true);
    expect(provenance.tprHash).not.toBeNull();
    expect(provenance.origin).toBe("simulated");
  });

  it("quotes unusual tokens for display without changing argv", async () => {
    const { runtime } = createRuntime("idle");
    const job = await runtime.submitJob(
      nvtRequest({ outputName: "o-1", outputDirectory: "outputs/a+b" }),
    );
    const provenance = await runtime.getProvenance(job.runId);
    expect(provenance.commands[0]?.argv).toContain("outputs/a+b/o-1.tpr");
  });

  it("rejects unknown runs", async () => {
    const { runtime } = createRuntime("idle");
    await expect(runtime.getProvenance("run-nope")).rejects.toSatisfy(
      (e) => isRuntimeClientError(e) && e.error.code === "not-found",
    );
  });
});
