import type { SimulationRequest } from "@mdx-studio/protocol";

/** A valid NVT request for the demo lysozyme project. */
export function nativeRequestFor(outputName: string): SimulationRequest {
  return {
    projectId: "lysozyme-demo",
    stage: "NVT",
    runMode: "native",
    inputStructure: "inputs/system.gro",
    topology: "inputs/system.top",
    mdp: "mdp/nvt.mdp",
    continuation: false,
    resources: { threads: 4, computeTarget: "cpu" },
    outputName,
    outputDirectory: `outputs/${outputName}`,
  };
}

export function mdxRequestFor(outputName: string): SimulationRequest {
  return { ...nativeRequestFor(outputName), runMode: "mdx", mdxProfile: "mdx-default" };
}
