import type { RunMode, SimulationStage } from "@mdx-studio/protocol";
import {
  mdpForStage,
  stageSlug,
  type SimulationFormState,
} from "../../services/simulation-request";
import type { ProjectDetail } from "@mdx-studio/protocol";

export type SetupAction =
  | { type: "field"; field: keyof SimulationFormState; value: string | boolean }
  | { type: "stage"; stage: SimulationStage; project: ProjectDetail }
  | { type: "mode"; mode: RunMode };

/** Predictable form state transitions; derived defaults are applied in one place. */
export function setupReducer(state: SimulationFormState, action: SetupAction): SimulationFormState {
  switch (action.type) {
    case "field":
      return { ...state, [action.field]: action.value };
    case "stage": {
      const previousDefault = `${stageSlug(state.stage)}-001`;
      return {
        ...state,
        stage: action.stage,
        mdp: mdpForStage(action.project, action.stage),
        outputName:
          state.outputName === previousDefault
            ? `${stageSlug(action.stage)}-001`
            : state.outputName,
      };
    }
    case "mode":
      return { ...state, runMode: action.mode };
  }
}
