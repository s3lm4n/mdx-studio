import { z } from "zod";
import { IdSchema, ProjectPathSchema, SafeNameSchema, projectPathWithExtension } from "./common";

/** What to run: stock GROMACS, the MDX-accelerated path, or both with comparison. */
export const RUN_MODES = ["native", "mdx", "validation"] as const;
export const RunModeSchema = z.enum(RUN_MODES);
export type RunMode = z.infer<typeof RunModeSchema>;

export const SIMULATION_STAGES = ["EM", "NVT", "NPT", "PRODUCTION"] as const;
export const SimulationStageSchema = z.enum(SIMULATION_STAGES);
export type SimulationStage = z.infer<typeof SimulationStageSchema>;

export const ResourcesSchema = z.strictObject({
  threads: z.number().int().min(1).max(1024),
  /** GPU selection is a later milestone; the contract is CPU-only for now. */
  computeTarget: z.enum(["cpu"]),
});
export type Resources = z.infer<typeof ResourcesSchema>;

/**
 * Structured description of a simulation. This is the ONLY way to ask the runtime to run
 * something: the runtime validates it and derives any tool invocation itself. There is no
 * field that carries a command line, flags or environment variables.
 */
export const SimulationRequestSchema = z
  .strictObject({
    projectId: IdSchema,
    stage: SimulationStageSchema,
    runMode: RunModeSchema,
    inputStructure: projectPathWithExtension(["gro"]),
    topology: projectPathWithExtension(["top"]),
    mdp: projectPathWithExtension(["mdp"]),
    checkpoint: projectPathWithExtension(["cpt"]).optional(),
    continuation: z.boolean(),
    resources: ResourcesSchema,
    /** Runtime-defined MDX profile id. Required for `mdx` and `validation` modes. */
    mdxProfile: IdSchema.optional(),
    /** Runtime-defined validation profile id. Required for `validation` mode. */
    validationProfile: IdSchema.optional(),
    outputName: SafeNameSchema,
    outputDirectory: ProjectPathSchema,
  })
  .superRefine((value, ctx) => {
    if (value.runMode !== "native" && value.mdxProfile === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["mdxProfile"],
        message: "an MDX profile is required for MDX and validation runs",
      });
    }
    if (value.runMode === "validation" && value.validationProfile === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["validationProfile"],
        message: "a validation profile is required for validation runs",
      });
    }
    if (value.continuation && value.checkpoint === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["checkpoint"],
        message: "continuation requires a checkpoint file",
      });
    }
  });
export type SimulationRequest = z.infer<typeof SimulationRequestSchema>;
