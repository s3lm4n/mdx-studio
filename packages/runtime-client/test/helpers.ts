import type { SimulationRequest } from "@mdx-studio/protocol";
import { ManualClock, MockRuntimeClient, type ScenarioId } from "../src";

export function nvtRequest(overrides: Partial<SimulationRequest> = {}): SimulationRequest {
  return {
    projectId: "lysozyme-demo",
    stage: "NVT",
    runMode: "native",
    inputStructure: "inputs/system.gro",
    topology: "inputs/system.top",
    mdp: "mdp/nvt.mdp",
    continuation: false,
    resources: { threads: 4, computeTarget: "cpu" },
    outputName: "nvt-test",
    outputDirectory: "outputs/nvt-test",
    ...overrides,
  };
}

export function mdxRequest(overrides: Partial<SimulationRequest> = {}): SimulationRequest {
  return nvtRequest({ runMode: "mdx", mdxProfile: "mdx-default", ...overrides });
}

export function validationRequest(overrides: Partial<SimulationRequest> = {}): SimulationRequest {
  return mdxRequest({
    runMode: "validation",
    validationProfile: "demo-placeholder",
    ...overrides,
  });
}

export function createRuntime(scenario: ScenarioId) {
  const clock = new ManualClock();
  const runtime = new MockRuntimeClient({ scenario, clock });
  return { clock, runtime };
}

/** Advance simulated time one tick at a time so the job manager sees every step. */
export function advanceSeconds(clock: ManualClock, seconds: number): void {
  for (let i = 0; i < seconds; i++) clock.advance(1000);
}
