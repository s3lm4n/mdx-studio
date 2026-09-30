export type MdpFieldGroup =
  | "integrator"
  | "temperature-coupling"
  | "pressure-coupling"
  | "neighbor-searching"
  | "electrostatics"
  | "van-der-waals"
  | "constraints"
  | "output";

export type MdpFieldType = "integer" | "number" | "enum" | "text" | "list";

export interface MdpFieldDefinition {
  /** Canonical spelling used when a key must be appended to a document. */
  readonly key: string;
  readonly label: string;
  readonly group: MdpFieldGroup;
  readonly type: MdpFieldType;
  readonly unit?: string;
  readonly options?: readonly string[];
  /** Documentation shown as a tooltip. Informational, not a scientific recommendation. */
  readonly description: string;
}

export const MDP_GROUP_LABELS: Readonly<Record<MdpFieldGroup, string>> = {
  integrator: "Integrator",
  "temperature-coupling": "Temperature coupling",
  "pressure-coupling": "Pressure coupling",
  "neighbor-searching": "Neighbor searching",
  electrostatics: "Electrostatics (PME)",
  "van-der-waals": "van der Waals",
  constraints: "Constraints",
  output: "Output control",
};

/**
 * Structured fields for the Basic editor. The Raw document remains the source of truth: any
 * value not listed in `options` is shown as-is and never discarded.
 */
export const MDP_FIELDS: readonly MdpFieldDefinition[] = [
  {
    key: "integrator",
    label: "Integrator",
    group: "integrator",
    type: "enum",
    options: ["md", "md-vv", "md-vv-avek", "sd", "bd", "steep", "cg", "l-bfgs", "nm"],
    description: "Algorithm used to advance the system (or minimize energy).",
  },
  {
    key: "dt",
    label: "Time step (dt)",
    group: "integrator",
    type: "number",
    unit: "ps",
    description: "Integration time step in picoseconds.",
  },
  {
    key: "nsteps",
    label: "Number of steps (nsteps)",
    group: "integrator",
    type: "integer",
    description: "Maximum number of steps to integrate. -1 means no maximum.",
  },
  {
    key: "tcoupl",
    label: "Thermostat (tcoupl)",
    group: "temperature-coupling",
    type: "enum",
    options: ["no", "berendsen", "nose-hoover", "andersen", "andersen-massive", "v-rescale"],
    description: "Temperature coupling algorithm.",
  },
  {
    key: "tc-grps",
    label: "Coupling groups (tc-grps)",
    group: "temperature-coupling",
    type: "list",
    description: "Groups coupled separately to the thermostat, space separated.",
  },
  {
    key: "tau-t",
    label: "Time constants (tau_t)",
    group: "temperature-coupling",
    type: "list",
    unit: "ps",
    description: "Coupling time constant per tc-grps group. Count must match tc-grps.",
  },
  {
    key: "ref-t",
    label: "Reference temperatures (ref_t)",
    group: "temperature-coupling",
    type: "list",
    unit: "K",
    description: "Reference temperature per tc-grps group. Count must match tc-grps.",
  },
  {
    key: "pcoupl",
    label: "Barostat (pcoupl)",
    group: "pressure-coupling",
    type: "enum",
    options: ["no", "berendsen", "C-rescale", "Parrinello-Rahman", "MTTK"],
    description: "Pressure coupling algorithm.",
  },
  {
    key: "pcoupltype",
    label: "Coupling type (pcoupltype)",
    group: "pressure-coupling",
    type: "enum",
    options: ["isotropic", "semiisotropic", "anisotropic", "surface-tension"],
    description: "Geometry of the pressure coupling.",
  },
  {
    key: "tau-p",
    label: "Time constant (tau_p)",
    group: "pressure-coupling",
    type: "number",
    unit: "ps",
    description: "Pressure coupling time constant.",
  },
  {
    key: "ref-p",
    label: "Reference pressure (ref_p)",
    group: "pressure-coupling",
    type: "list",
    unit: "bar",
    description: "Reference pressure; the number of values depends on pcoupltype.",
  },
  {
    key: "compressibility",
    label: "Compressibility",
    group: "pressure-coupling",
    type: "list",
    unit: "bar^-1",
    description: "Isothermal compressibility; the number of values depends on pcoupltype.",
  },
  {
    key: "cutoff-scheme",
    label: "Cut-off scheme",
    group: "neighbor-searching",
    type: "enum",
    options: ["Verlet"],
    description: "Pair-list scheme. The group scheme is no longer supported by current GROMACS.",
  },
  {
    key: "nstlist",
    label: "Pair-list update interval (nstlist)",
    group: "neighbor-searching",
    type: "integer",
    unit: "steps",
    description: "Frequency for updating the neighbor list.",
  },
  {
    key: "rlist",
    label: "Pair-list cut-off (rlist)",
    group: "neighbor-searching",
    type: "number",
    unit: "nm",
    description: "Pair-list cut-off. With the Verlet scheme this may be set automatically.",
  },
  {
    key: "coulombtype",
    label: "Electrostatics (coulombtype)",
    group: "electrostatics",
    type: "enum",
    options: ["Cut-off", "Ewald", "PME", "P3M-AD", "Reaction-Field"],
    description: "Method for long-range electrostatics.",
  },
  {
    key: "rcoulomb",
    label: "Coulomb cut-off (rcoulomb)",
    group: "electrostatics",
    type: "number",
    unit: "nm",
    description: "Distance for the Coulomb cut-off.",
  },
  {
    key: "fourierspacing",
    label: "Grid spacing (fourierspacing)",
    group: "electrostatics",
    type: "number",
    unit: "nm",
    description: "Maximum grid spacing for the FFT grid when using PME.",
  },
  {
    key: "pme-order",
    label: "Interpolation order (pme_order)",
    group: "electrostatics",
    type: "integer",
    description: "Interpolation order for PME.",
  },
  {
    key: "vdwtype",
    label: "vdW type (vdwtype)",
    group: "van-der-waals",
    type: "enum",
    options: ["Cut-off", "PME", "Shift", "Switch"],
    description: "Treatment of van der Waals interactions.",
  },
  {
    key: "rvdw",
    label: "vdW cut-off (rvdw)",
    group: "van-der-waals",
    type: "number",
    unit: "nm",
    description: "Distance for the LJ or Buckingham cut-off.",
  },
  {
    key: "vdw-modifier",
    label: "vdW modifier (vdw-modifier)",
    group: "van-der-waals",
    type: "enum",
    options: ["Potential-shift", "None", "Force-switch", "Potential-switch"],
    description: "Potential modifier for van der Waals interactions.",
  },
  {
    key: "constraints",
    label: "Constraints",
    group: "constraints",
    type: "enum",
    options: ["none", "h-bonds", "all-bonds", "h-angles", "all-angles"],
    description: "Which bonds and angles are converted to holonomic constraints.",
  },
  {
    key: "constraint-algorithm",
    label: "Constraint algorithm",
    group: "constraints",
    type: "enum",
    options: ["LINCS", "SHAKE"],
    description: "Algorithm used to satisfy constraints.",
  },
  {
    key: "nstxout-compressed",
    label: "Compressed trajectory interval",
    group: "output",
    type: "integer",
    unit: "steps",
    description: "Steps between writes of the compressed trajectory. 0 disables output.",
  },
  {
    key: "nstenergy",
    label: "Energy interval (nstenergy)",
    group: "output",
    type: "integer",
    unit: "steps",
    description: "Steps between writes of energies to the energy file.",
  },
  {
    key: "nstlog",
    label: "Log interval (nstlog)",
    group: "output",
    type: "integer",
    unit: "steps",
    description: "Steps between writes of energies to the log file.",
  },
];

export function findMdpField(key: string): MdpFieldDefinition | undefined {
  const normalized = key.trim().toLowerCase().replaceAll("_", "-");
  return MDP_FIELDS.find((field) => field.key === normalized);
}
