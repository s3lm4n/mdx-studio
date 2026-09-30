/**
 * DEMO DATA. Everything here is invented for the Phase 1 prototype: the projects do not exist on
 * disk, the parameters are illustrative (not recommendations), and nothing is copied from any
 * MDX validation evidence.
 */
import type { ProjectFile, ProjectStage, ProjectSummary } from "@mdx-studio/protocol";

export const DEMO_EPOCH_ISO = "2026-01-15T12:00:00.000Z";

const EM_MDP = `; Energy minimisation - DEMO parameters
integrator              = steep
emtol                   = 1000.0
emstep                  = 0.01
nsteps                  = 50000
cutoff-scheme           = Verlet
nstlist                 = 10
coulombtype             = PME
rcoulomb                = 1.0
vdwtype                 = Cut-off
rvdw                    = 1.0
constraints             = none
`;

const NVT_MDP = `; NVT equilibration - DEMO parameters
define                  = -DPOSRES
integrator              = md
dt                      = 0.002          ; 2 fs
nsteps                  = 50000          ; 100 ps
nstxout-compressed      = 5000
nstenergy               = 1000
nstlog                  = 1000
continuation            = no
constraint-algorithm    = LINCS
constraints             = h-bonds
cutoff-scheme           = Verlet
nstlist                 = 20
rlist                   = 1.0
coulombtype             = PME
rcoulomb                = 1.0
fourierspacing          = 0.16
vdwtype                 = Cut-off
rvdw                    = 1.0
tcoupl                  = V-rescale
tc-grps                 = Protein Non-Protein
tau-t                   = 0.1    0.1
ref-t                   = 300    300
pcoupl                  = no
gen-vel                 = yes
gen-temp                = 300
`;

const NPT_MDP = `; NPT equilibration - DEMO parameters
define                  = -DPOSRES
integrator              = md
dt                      = 0.002          ; 2 fs
nsteps                  = 50000          ; 100 ps
nstxout-compressed      = 5000
nstenergy               = 1000
nstlog                  = 1000
continuation            = yes
constraint-algorithm    = LINCS
constraints             = h-bonds
cutoff-scheme           = Verlet
nstlist                 = 20
rlist                   = 1.0
coulombtype             = PME
rcoulomb                = 1.0
fourierspacing          = 0.16
vdwtype                 = Cut-off
rvdw                    = 1.0
tcoupl                  = V-rescale
tc-grps                 = Protein Non-Protein
tau-t                   = 0.1    0.1
ref-t                   = 300    300
pcoupl                  = C-rescale
pcoupltype              = isotropic
tau-p                   = 2.0
ref-p                   = 1.0
compressibility         = 4.5e-5
gen-vel                 = no
`;

const PRODUCTION_MDP = `; Production MD - DEMO parameters (not a recommendation)
integrator              = md
dt                      = 0.002          ; 2 fs
nsteps                  = 150000000      ; 300 ns
nstxout-compressed      = 50000
nstenergy               = 5000
nstlog                  = 5000
continuation            = yes
constraint-algorithm    = LINCS
constraints             = h-bonds
cutoff-scheme           = Verlet
nstlist                 = 20
rlist                   = 1.0
coulombtype             = PME
rcoulomb                = 1.0
fourierspacing          = 0.16
pme-order               = 4
vdwtype                 = Cut-off
rvdw                    = 1.0
vdw-modifier            = Potential-shift
tcoupl                  = V-rescale
tc-grps                 = Protein Non-Protein
tau-t                   = 0.1    0.1
ref-t                   = 300    300
pcoupl                  = C-rescale
pcoupltype              = isotropic
tau-p                   = 2.0
ref-p                   = 1.0
compressibility         = 4.5e-5
`;

const MEMBRANE_NVT_MDP = `; NVT equilibration, membrane patch - DEMO parameters
integrator              = md
dt                      = 0.002
nsteps                  = 25000
cutoff-scheme           = Verlet
nstlist                 = 20
coulombtype             = PME
rcoulomb                = 1.2
fourierspacing          = 0.12
tcoupl                  = V-rescale
tc-grps                 = Membrane Solvent
tau-t                   = 1.0    1.0
ref-t                   = 310    310
pcoupl                  = no
`;

export interface DemoProject {
  readonly summary: ProjectSummary;
  readonly files: readonly ProjectFile[];
  readonly stages: readonly ProjectStage[];
  /** Initial MDP text keyed by project-relative path. */
  readonly mdps: Readonly<Record<string, string>>;
}

export const DEMO_PROJECTS: readonly DemoProject[] = [
  {
    summary: {
      id: "lysozyme-demo",
      name: "Lysozyme in water (DEMO)",
      description: "Invented demo project: solvated globular protein, staged EM -> production.",
      origin: "simulated",
      updatedAt: DEMO_EPOCH_ISO,
    },
    files: [
      { path: "inputs/system.gro", kind: "gro", sizeBytes: 1_048_576 },
      { path: "inputs/system.top", kind: "top", sizeBytes: 22_016 },
      { path: "inputs/posre.itp", kind: "itp", sizeBytes: 9_472 },
      { path: "mdp/em.mdp", kind: "mdp", sizeBytes: EM_MDP.length },
      { path: "mdp/nvt.mdp", kind: "mdp", sizeBytes: NVT_MDP.length },
      { path: "mdp/npt.mdp", kind: "mdp", sizeBytes: NPT_MDP.length },
      { path: "mdp/production.mdp", kind: "mdp", sizeBytes: PRODUCTION_MDP.length },
      { path: "outputs/npt/npt.cpt", kind: "cpt", sizeBytes: 2_359_296 },
      { path: "outputs/npt/topol.tpr", kind: "tpr", sizeBytes: 4_718_592 },
    ],
    stages: [
      { stage: "EM", status: "completed", mdp: "mdp/em.mdp" },
      { stage: "NVT", status: "completed", mdp: "mdp/nvt.mdp" },
      { stage: "NPT", status: "completed", mdp: "mdp/npt.mdp" },
      { stage: "PRODUCTION", status: "not-started", mdp: "mdp/production.mdp" },
    ],
    mdps: {
      "mdp/em.mdp": EM_MDP,
      "mdp/nvt.mdp": NVT_MDP,
      "mdp/npt.mdp": NPT_MDP,
      "mdp/production.mdp": PRODUCTION_MDP,
    },
  },
  {
    summary: {
      id: "membrane-demo",
      name: "Lipid bilayer patch (DEMO)",
      description: "Invented demo project: small membrane patch, equilibration not finished.",
      origin: "simulated",
      updatedAt: DEMO_EPOCH_ISO,
    },
    files: [
      { path: "inputs/system.gro", kind: "gro", sizeBytes: 3_145_728 },
      { path: "inputs/system.top", kind: "top", sizeBytes: 64_512 },
      { path: "mdp/em.mdp", kind: "mdp", sizeBytes: EM_MDP.length },
      { path: "mdp/nvt.mdp", kind: "mdp", sizeBytes: MEMBRANE_NVT_MDP.length },
    ],
    stages: [
      { stage: "EM", status: "completed", mdp: "mdp/em.mdp" },
      { stage: "NVT", status: "not-started", mdp: "mdp/nvt.mdp" },
      { stage: "NPT", status: "not-started", mdp: null },
      { stage: "PRODUCTION", status: "not-started", mdp: null },
    ],
    mdps: {
      "mdp/em.mdp": EM_MDP,
      "mdp/nvt.mdp": MEMBRANE_NVT_MDP,
    },
  },
];

export const MOCK_HOST = {
  cpuCores: 16,
  memoryTotalBytes: 64 * 1024 ** 3,
} as const;

export const MOCK_RUNTIME_VERSION = "0.1.0-mock";
export const MOCK_GROMACS_VERSION = "2025.0-demo";
export const MOCK_MDX_FIRMWARE_VERSION = "mdx-fw-demo-0.0.1";
