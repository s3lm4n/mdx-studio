import { z } from "zod";
import { IdSchema, IsoTimestampSchema, OriginSchema, ProjectPathSchema } from "./common";
import { SimulationStageSchema } from "./simulation";

export const PROJECT_FILE_KINDS = ["gro", "tpr", "top", "itp", "mdp", "cpt"] as const;
export const ProjectFileKindSchema = z.enum(PROJECT_FILE_KINDS);
export type ProjectFileKind = z.infer<typeof ProjectFileKindSchema>;

export const ProjectFileSchema = z.object({
  path: ProjectPathSchema,
  kind: ProjectFileKindSchema,
  sizeBytes: z.number().int().nonnegative(),
});
export type ProjectFile = z.infer<typeof ProjectFileSchema>;

export const StageStatusSchema = z.enum(["not-started", "running", "completed", "failed"]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const ProjectStageSchema = z.object({
  stage: SimulationStageSchema,
  status: StageStatusSchema,
  /** Project-relative MDP used for this stage, if one is assigned. */
  mdp: ProjectPathSchema.nullable(),
});
export type ProjectStage = z.infer<typeof ProjectStageSchema>;

export const ProjectSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string(),
  origin: OriginSchema,
  updatedAt: IsoTimestampSchema,
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  files: z.array(ProjectFileSchema),
  stages: z.array(ProjectStageSchema),
});
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

/** Raw MDP text exactly as stored, with its content hash. */
export const MdpDocumentSchema = z.object({
  projectId: IdSchema,
  path: ProjectPathSchema,
  text: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type MdpDocument = z.infer<typeof MdpDocumentSchema>;
