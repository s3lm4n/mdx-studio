PROJECT: MDX Studio
ROLE: Principal Software Architect + Senior Full-Stack/Desktop Engineer
MODE: Architecture-first, production-minded implementation
THINKING: High

I am creating a NEW and SEPARATE GitHub repository for MDX Studio.

This repository is NOT the MDX RTL/scientific-validation repository.
Do not modify, duplicate, reinterpret, or depend directly on frozen MDX validation
evidence. MDX Studio is the user-facing control plane that will eventually launch
and monitor qualified GROMACS + MDX workloads.

============================================================
1. PRODUCT VISION
============================================================

MDX Studio should eventually provide a graphical interface for running molecular
dynamics simulations accelerated by MDX hardware.

The intended user experience is:

    Open project
        ↓
    Select structure/topology
        ↓
    Configure or load MDP
        ↓
    Select Native / MDX / Native-vs-MDX Validation
        ↓
    Pre-flight checks
        ↓
    Start simulation
        ↓
    Live monitoring
        ↓
    Results / validation / provenance

The normal user should not need to manually type long GROMACS commands or remember
MDX environment variables.

The CLI and GUI must ultimately share the SAME backend/runtime API. Do not create
independent simulation logic for GUI and CLI.

============================================================
2. TARGET ENVIRONMENT
============================================================

Primary development environment:

HOST:
- Windows 11

COMPUTE:
- WSL2 / Linux
- GROMACS
- future MDX runtime/device
- eventually FPGA / PCIe hardware

Desired high-level topology:

Windows
┌──────────────────────────────┐
│ MDX Studio Desktop GUI       │
│                              │
│ Projects                     │
│ MDP editor                   │
│ Live monitor                 │
│ Hardware status              │
│ Validation                   │
└──────────────┬───────────────┘
               │ structured IPC/API
               ▼
WSL / Linux
┌──────────────────────────────┐
│ MDX Runtime Service          │
│                              │
│ GROMACS orchestration        │
│ job state                    │
│ telemetry                    │
│ provenance                   │
│ watchdog                     │
│ future MDX device interface  │
└──────────────┬───────────────┘
               │
        ┌──────▼──────┐
        │ GROMACS     │
        │ + MDX       │
        └─────────────┘

============================================================
3. PROPOSED TECHNOLOGY STACK
============================================================

Unless repository/tooling constraints strongly justify another choice, start with:

DESKTOP:
- Tauri 2
- React
- TypeScript
- Vite

UI:
- clean professional scientific/HPC interface
- component architecture suitable for long-term maintenance
- responsive desktop layout
- dark/light theme support later

BACKEND / DESKTOP BRIDGE:
- Rust through Tauri

WSL RUNTIME SERVICE:
For the first implementation, design an explicit service abstraction.
Do NOT tightly couple the frontend directly to shell commands.

A lightweight Python service is acceptable initially because GROMACS tooling and
scientific orchestration are Python-friendly, but architect the protocol so that
the implementation can later move to Rust/Go without changing the GUI.

Communication should use a typed/local protocol such as:
- localhost API
or
- another well-defined local IPC mechanism

Do not permit arbitrary shell strings from the frontend.

============================================================
4. CORE ARCHITECTURAL RULE
============================================================

Use this separation:

UI
    ↓
Application services
    ↓
MDX Runtime Client
    ↓
Runtime API
    ↓
GROMACS Provider
MDX Device Provider
Telemetry Provider
Validation Provider
Provenance Provider

The frontend must NEVER construct raw `gmx mdrun ...` shell commands itself.

Simulation requests should be structured objects.

Example concept:

SimulationRequest {
    projectId
    inputStructure
    topology
    mdp
    runMode
    resources
    mdxProfile
    outputDirectory
}

The backend translates validated structured inputs into commands.

============================================================
5. FIRST MAJOR UI AREAS
============================================================

Design the application around these major views.

A. DASHBOARD

Recent projects
Recent simulations
Connected MDX device
GROMACS status
Runtime service status

B. PROJECT

Inputs:
- GRO
- TPR
- TOP
- ITP
- MDP
- checkpoint files

Simulation stages:
- EM
- NVT
- NPT
- Production

Project history and runs.

C. SIMULATION SETUP

Modes:

Native GROMACS
MDX
Native vs MDX Validation

Inputs:
- structure
- topology
- MDP
- optional checkpoint

Runtime settings:
- threads
- GPU/CPU selection later
- output name
- continuation
- MDX profile

D. MDP EDITOR

Three modes:

Basic
Advanced
Raw

Example structured fields:

Integrator
dt
nsteps

Temperature coupling
tcoupl
tc-grps
tau_t
ref_t

Pressure coupling

Neighbor searching
cutoff-scheme
nstlist
rlist

PME
coulombtype
fourierspacing

The Raw view must preserve the actual MDP text.

Eventually:
- validation
- warnings
- documentation/tooltips
- presets
- diff between presets

E. PRE-FLIGHT

Before MDX execution, display checks such as:

Device detected
Runtime version
GROMACS version
Binary checksum
Firmware/bitstream checksum
PCIe/link status
Temperature
Clock
Watchdog
TPR compatibility
Supported kernel
Runtime-policy compatibility

Use PASS / WARN / FAIL.

Start must remain disabled on critical FAIL.

F. LIVE MONITOR

Show:

Simulation:
- step
- simulation time
- target time
- progress
- ns/day
- ETA

GROMACS:
- temperature
- pressure
- potential energy
- total energy
- neighbor-list rebuilds

MDX:
- device state
- utilization
- pair throughput
- queue occupancy
- backpressure
- errors
- watchdog

Hardware:
- temperature
- power
- clock
- PCIe/link

Host:
- CPU
- RAM
- GPU later

Provide charts with rolling history.

G. VALIDATION

Modes:

Native reference
MDX
Compare Native vs MDX

Results eventually include:

Force max error
Energy max error
Virial max error
Position max error
Shift-force max error
Pass/fail per registered gate

Do not hard-code current experimental MDX tolerances into the GUI.
Validation profiles must come from the runtime/backend.

H. RUN HISTORY / PROVENANCE

Store/display:

run ID
start/end
GROMACS version
runtime version
MDX firmware/bitstream
binary hashes
TPR hash
MDP hash
command provenance
result status
validation status
logs

============================================================
6. SAFETY DESIGN
============================================================

The GUI must never directly expose unsafe arbitrary hardware operations.

Future MDX runs should use:

PRE-FLIGHT
    ↓
DEVICE READY
    ↓
WATCHDOG ARMED
    ↓
SIMULATION START

Design state machines, not ad-hoc booleans.

Example device states:

DISCONNECTED
CONNECTING
READY
RUNNING
THROTTLED
ERROR
ABORTING

Example job states:

CREATED
VALIDATING
READY
STARTING
RUNNING
PAUSED
COMPLETED
FAILED
ABORTED

Critical errors must be able to stop a run.

Future hardware controls may include:

temperature limit
power limit
watchdog timeout
PCIe timeout
invalid packet
retirement timeout
ECC/device errors

Do not implement fake physical protection logic yet.
Design the interfaces and mock state only.

============================================================
7. IMPORTANT: CURRENT HARDWARE STATUS
============================================================

There is currently NO production MDX physical device integration to implement.

Therefore:

- use a Mock MDX Device Provider
- use a Mock Telemetry Provider
- do NOT pretend real hardware exists
- label simulated telemetry clearly

Likewise, the first GUI version must be able to run entirely without MDX hardware.

============================================================
8. DEVELOPMENT PHASES
============================================================

Do NOT attempt to implement the entire final product in one uncontrolled pass.

Use milestones.

PHASE 0 — Repository foundation

Create:
- repository structure
- architecture documents
- development conventions
- frontend scaffold
- backend/runtime interfaces
- mock data
- test infrastructure

PHASE 1 — UI prototype

Implement functional navigation for:
- Dashboard
- Project
- Simulation Setup
- MDP Editor
- Live Monitor
- Validation
- Settings

Use mock data.

PHASE 2 — Local runtime service

Implement:
- health endpoint
- runtime version
- GROMACS detection
- structured command builder
- process lifecycle abstraction
- log/event streaming

No MDX hardware yet.

PHASE 3 — Native GROMACS integration

Support:
- grompp
- mdrun
- status
- stop
- logs
- basic parsed progress

PHASE 4 — Validation framework

Native vs candidate execution
Structured comparison results

PHASE 5 — MDX runtime integration

ONLY after a stable MDX runtime/API exists.

PHASE 6 — Device telemetry / hardware

Future FPGA/ASIC.

============================================================
9. FIRST TASK
============================================================

For THIS session, focus on PHASE 0 + a high-quality PHASE 1 foundation.

First inspect the repository.

Then create a concise architecture proposal before implementation.

After that, implement the initial project scaffold.

Required repository structure should be approximately:

/
├── apps/
│   └── desktop/
├── services/
│   └── runtime/
├── packages/
│   ├── protocol/
│   ├── simulation-model/
│   └── ui/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRODUCT_SPEC.md
│   ├── RUNTIME_PROTOCOL.md
│   ├── SAFETY_MODEL.md
│   └── DEVELOPMENT_ROADMAP.md
├── tests/
├── README.md
└── ...

You may improve the structure if justified.

============================================================
10. INITIAL UI
============================================================

Create a polished first-pass UI with:

LEFT SIDEBAR

MDX Studio

Dashboard
Projects
Simulation
Monitor
Validation

bottom:
Devices
Settings

MAIN DASHBOARD

Runtime Status
    GROMACS
    MDX Runtime
    MDX Device

Recent Runs

Device panel

Quick actions:
    New Project
    New Simulation
    Validation Run

MONITOR MOCK

Use realistic mock data, clearly marked DEMO:

Simulation:
104.962 / 300 ns
34.99 %
~1700 ns/day

MDX:
utilization
pair throughput
queue
backpressure
temperature
power

Use charts where useful.

Do not use flashy gaming aesthetics.
This should look like scientific/HPC workstation software.

Think:
- NVIDIA Nsight
- scientific workstation software
- modern observability dashboard
- professional engineering tooling

============================================================
11. SOFTWARE QUALITY
============================================================

Requirements:

- TypeScript strict mode
- clear domain types
- no `any` unless justified
- no gigantic components
- proper component boundaries
- predictable state management
- reusable protocol/model types
- meaningful tests
- linting
- formatting
- no secrets
- no absolute user-specific filesystem paths committed
- no arbitrary shell execution from UI
- no mock code pretending to be production hardware

============================================================
12. DOCUMENTATION
============================================================

README should explain:

What MDX Studio is
Current status
Architecture
How to run development mode
Project structure
Current limitations
Roadmap

Clearly state:

"MDX hardware integration is not yet implemented. Current MDX telemetry is
simulated."

============================================================
13. GIT / CHANGE DISCIPLINE
============================================================

Work in coherent changes.

Before major edits:
- inspect existing repository state

After changes:
- run available tests
- run type checking
- run linting
- run build where practical

Do not silently overwrite user work.

Summarize:
- files created
- architecture decisions
- commands run
- tests
- known limitations
- next recommended milestone

============================================================
14. DESIGN PRINCIPLE
============================================================

MDX Studio should eventually make the normal workflow:

    Open project
    → select MDP
    → Validate
    → Run on MDX
    → Monitor
    → Review results

while retaining enough transparency that an expert can inspect:

- exact GROMACS command
- runtime configuration
- hashes
- logs
- validation data
- hardware telemetry

The GUI simplifies the workflow; it must never hide provenance.

============================================================
15. BEGIN
============================================================

Start by:

1. inspecting the repository,
2. proposing the exact architecture/stack you will use,
3. showing the planned directory tree,
4. identifying any assumptions,
5. then implementing Phase 0 and the Phase 1 shell.

Do not ask me broad design questions unless a decision genuinely blocks
implementation. Use the specification above as the default source of truth.