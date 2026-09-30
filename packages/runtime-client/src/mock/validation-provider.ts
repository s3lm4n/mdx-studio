import type {
  GateResult,
  ValidationProfile,
  ValidationQuantity,
  ValidationResult,
} from "@mdx-studio/protocol";
import { noise } from "./hash";

/**
 * Mock Validation Provider. The profile numbers below are PLACEHOLDER demo values chosen only so
 * the UI has something to render. They are NOT qualified MDX tolerances and are not derived from
 * any validation evidence. The desktop renders whatever profile the runtime supplies and never
 * defines or alters a tolerance.
 */
export const DEMO_VALIDATION_PROFILES: readonly ValidationProfile[] = [
  {
    id: "demo-placeholder",
    version: "0.0.1-placeholder",
    title: "Demo placeholder profile",
    description:
      "Placeholder gates for UI prototyping. Not a qualified profile; replace with runtime-provided profiles.",
    origin: "simulated",
    status: "placeholder",
    gates: [
      {
        id: "force-max",
        quantity: "force",
        description: "Maximum absolute force error, native vs candidate",
        maxAbsoluteError: 0.001,
        unit: "kJ/mol/nm",
      },
      {
        id: "energy-max",
        quantity: "energy",
        description: "Maximum absolute potential-energy error",
        maxAbsoluteError: 0.001,
        unit: "kJ/mol",
      },
      {
        id: "virial-max",
        quantity: "virial",
        description: "Maximum absolute virial error",
        maxAbsoluteError: 0.001,
        unit: "kJ/mol",
      },
      {
        id: "position-max",
        quantity: "position",
        description: "Maximum absolute position error after the comparison window",
        maxAbsoluteError: 0.001,
        unit: "nm",
      },
      {
        id: "shift-force-max",
        quantity: "shift-force",
        description: "Maximum absolute shift-force error",
        maxAbsoluteError: 0.001,
        unit: "kJ/mol/nm",
      },
    ],
  },
];

function buildGates(
  profile: ValidationProfile,
  evaluated: boolean,
  failingGate: ValidationQuantity | null,
  seed: number,
): GateResult[] {
  return profile.gates.map((gate, index) => {
    if (!evaluated) {
      return {
        gateId: gate.id,
        quantity: gate.quantity,
        observedMaxError: null,
        maxAbsoluteError: gate.maxAbsoluteError,
        unit: gate.unit,
        passed: null,
      };
    }
    const fraction =
      gate.quantity === failingGate ? 1.8 : 0.1 + 0.35 * Math.abs(noise(seed, index + 1));
    const observed = Number((gate.maxAbsoluteError * fraction).toPrecision(3));
    return {
      gateId: gate.id,
      quantity: gate.quantity,
      observedMaxError: observed,
      maxAbsoluteError: gate.maxAbsoluteError,
      unit: gate.unit,
      // Decided here, by the runtime. The UI only displays `passed`.
      passed: observed <= gate.maxAbsoluteError,
    };
  });
}

export function buildValidationResult(args: {
  id: string;
  jobId: string;
  projectId: string;
  profile: ValidationProfile;
  completedAt: string | null;
  failingGate: ValidationQuantity | null;
}): ValidationResult {
  const evaluated = args.completedAt !== null;
  const gates = buildGates(args.profile, evaluated, args.failingGate, 7);
  return {
    id: args.id,
    jobId: args.jobId,
    projectId: args.projectId,
    profileId: args.profile.id,
    profileVersion: args.profile.version,
    origin: "simulated",
    status: !evaluated ? "pending" : gates.every((g) => g.passed === true) ? "passed" : "failed",
    completedAt: args.completedAt,
    gates,
  };
}
