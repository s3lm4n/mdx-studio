import { describe, expect, it } from "vitest";
import { SimulationRequestSchema, type SimulationRequest } from "../src";

const valid: SimulationRequest = {
  projectId: "lysozyme-demo",
  stage: "PRODUCTION",
  runMode: "native",
  inputStructure: "inputs/system.gro",
  topology: "inputs/system.top",
  mdp: "mdp/production.mdp",
  continuation: false,
  resources: { threads: 8, computeTarget: "cpu" },
  outputName: "prod-001",
  outputDirectory: "outputs/prod-001",
};

function issuesFor(input: unknown): string[] {
  const result = SimulationRequestSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("SimulationRequest", () => {
  it("accepts a well-formed native request", () => {
    expect(SimulationRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["parent traversal", "../outside/system.gro"],
    ["nested traversal", "inputs/../../system.gro"],
    ["absolute POSIX path", "/etc/system.gro"],
    ["windows drive path", "C:/data/system.gro"],
    ["backslash separators", "inputs\\system.gro"],
    ["shell substitution", "inputs/$(id).gro"],
    ["command separator", "inputs/a;b.gro"],
    ["whitespace", "inputs/my system.gro"],
    ["wrong extension", "inputs/system.pdb"],
    ["empty", ""],
  ])("rejects an unsafe structure path: %s", (_label, path) => {
    expect(issuesFor({ ...valid, inputStructure: path })).toContain("inputStructure");
  });

  it("rejects unknown fields instead of silently dropping them", () => {
    expect(SimulationRequestSchema.safeParse({ ...valid, command: "gmx mdrun" }).success).toBe(
      false,
    );
    expect(
      SimulationRequestSchema.safeParse({
        ...valid,
        resources: { ...valid.resources, extraArgs: ["-nb", "gpu"] },
      }).success,
    ).toBe(false);
  });

  it("requires an MDX profile for mdx and validation runs", () => {
    expect(issuesFor({ ...valid, runMode: "mdx" })).toContain("mdxProfile");
    expect(
      SimulationRequestSchema.safeParse({ ...valid, runMode: "mdx", mdxProfile: "p" }).success,
    ).toBe(true);
  });

  it("requires a validation profile for validation runs", () => {
    const base = { ...valid, runMode: "validation", mdxProfile: "p" };
    expect(issuesFor(base)).toContain("validationProfile");
    expect(SimulationRequestSchema.safeParse({ ...base, validationProfile: "v" }).success).toBe(
      true,
    );
  });

  it("requires a checkpoint when continuing", () => {
    expect(issuesFor({ ...valid, continuation: true })).toContain("checkpoint");
    expect(
      SimulationRequestSchema.safeParse({
        ...valid,
        continuation: true,
        checkpoint: "outputs/prev/state.cpt",
      }).success,
    ).toBe(true);
  });

  it("bounds thread counts and compute target", () => {
    expect(issuesFor({ ...valid, resources: { threads: 0, computeTarget: "cpu" } })).toContain(
      "resources.threads",
    );
    expect(issuesFor({ ...valid, resources: { threads: 4, computeTarget: "gpu" } })).toContain(
      "resources.computeTarget",
    );
  });
});
