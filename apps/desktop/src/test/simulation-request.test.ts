import type { ProjectDetail, RuntimeCapabilities } from "@mdx-studio/protocol";
import { SimulationRequestSchema } from "@mdx-studio/protocol";
import { describe, expect, it } from "vitest";
import {
  buildSimulationRequest,
  defaultFormState,
  type SimulationFormState,
} from "../services/simulation-request";

const project: ProjectDetail = {
  id: "demo",
  name: "Demo",
  description: "",
  origin: "simulated",
  updatedAt: "2026-01-15T12:00:00.000Z",
  files: [
    { path: "inputs/system.gro", kind: "gro", sizeBytes: 1 },
    { path: "inputs/system.top", kind: "top", sizeBytes: 1 },
    { path: "mdp/nvt.mdp", kind: "mdp", sizeBytes: 1 },
  ],
  stages: [{ stage: "NVT", status: "not-started", mdp: "mdp/nvt.mdp" }],
};

const capabilities = {
  mdxProfiles: [{ id: "mdx-default", title: "t", description: "d" }],
} as unknown as RuntimeCapabilities;

function form(overrides: Partial<SimulationFormState> = {}): SimulationFormState {
  return {
    ...defaultFormState({
      project,
      stage: "NVT",
      runMode: "native",
      capabilities,
      validationProfiles: [],
    }),
    ...overrides,
  };
}

describe("buildSimulationRequest", () => {
  it("builds a schema-valid structured request from defaults", () => {
    const result = buildSimulationRequest(form());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(SimulationRequestSchema.safeParse(result.request).success).toBe(true);
      expect(result.request.outputDirectory).toBe("outputs/nvt-001");
      expect(result.request.resources).toEqual({ threads: 8, computeTarget: "cpu" });
    }
  });

  it("only ever emits protocol fields - there is no command or flag channel", () => {
    const result = buildSimulationRequest(
      form({
        runMode: "validation",
        mdxProfile: "mdx-default",
        validationProfile: "v",
        checkpoint: "outputs/a/b.cpt",
        continuation: true,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const allowed = [
        "projectId",
        "stage",
        "runMode",
        "inputStructure",
        "topology",
        "mdp",
        "checkpoint",
        "continuation",
        "resources",
        "mdxProfile",
        "validationProfile",
        "outputName",
        "outputDirectory",
      ];
      expect(Object.keys(result.request).every((key) => allowed.includes(key))).toBe(true);
      expect(JSON.stringify(result.request)).not.toMatch(/gmx|mdrun|grompp/i);
    }
  });

  it("omits MDX fields for native runs even if the form still holds them", () => {
    const result = buildSimulationRequest(form({ runMode: "native", mdxProfile: "mdx-default" }));
    expect(result.ok && "mdxProfile" in result.request).toBe(false);
  });

  it("requires an MDX profile for MDX mode", () => {
    const result = buildSimulationRequest(form({ runMode: "mdx", mdxProfile: "" }));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues["mdxProfile"]).toBeDefined();
  });

  it.each([
    ["inputStructure", "Select a structure file."],
    ["topology", "Select a topology file."],
    ["mdp", "Select an MDP file."],
    ["outputName", "Enter an output name."],
  ] as const)("reports a friendly message when %s is empty", (field, message) => {
    const result = buildSimulationRequest(form({ [field]: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[field]).toBe(message);
  });

  it.each(["", "abc", "1.5", "0", "5000"])("rejects threads=%j", (threads) => {
    const result = buildSimulationRequest(form({ threads }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues["resources.threads"]).toBeDefined();
  });

  it("surfaces protocol path rules as field issues", () => {
    const result = buildSimulationRequest(form({ topology: "../escape.top" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues["topology"]).toMatch(/relative POSIX path/);
  });

  it("rejects continuation without a checkpoint", () => {
    const result = buildSimulationRequest(form({ continuation: true }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues["checkpoint"]).toMatch(/checkpoint/);
  });
});
