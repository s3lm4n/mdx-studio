import type { RunMode } from "@mdx-studio/protocol";

export interface RunModeInfo {
  readonly mode: RunMode;
  readonly label: string;
  readonly description: string;
  /** Whether the mode needs an MDX profile (and therefore MDX pre-flight checks). */
  readonly usesMdx: boolean;
  readonly usesValidationProfile: boolean;
}

export const RUN_MODE_INFO: Readonly<Record<RunMode, RunModeInfo>> = {
  native: {
    mode: "native",
    label: "Native GROMACS",
    description: "Reference run with stock GROMACS. No MDX device involved.",
    usesMdx: false,
    usesValidationProfile: false,
  },
  mdx: {
    mode: "mdx",
    label: "MDX",
    description: "Run with MDX acceleration using a runtime-defined MDX profile.",
    usesMdx: true,
    usesValidationProfile: false,
  },
  validation: {
    mode: "validation",
    label: "Native vs MDX validation",
    description: "Run both paths and compare them against a runtime-supplied validation profile.",
    usesMdx: true,
    usesValidationProfile: true,
  },
};
