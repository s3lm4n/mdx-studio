# MDX Studio Product Baseline

## Primary workflow

Open project → select structure/topology → configure/load MDP → choose Native / MDX / Native-vs-MDX Validation → pre-flight → start → live monitor → results / validation / provenance.

## Phase 1 shell views

- Dashboard
- Projects / Project (stages, files, run history)
- Simulation Setup (with pre-flight and runtime-gated Start)
- MDP Editor (Basic / Advanced / Raw; Raw preserves the exact text)
- Monitor
- Validation
- Devices
- Settings
- Run detail / provenance (reached from run lists)

## Visual direction

Professional scientific/HPC workstation software. Prefer information density, clear state, provenance, and observability over decorative/gaming aesthetics.

Reference character: NVIDIA Nsight, scientific workstation tooling, modern observability dashboards.

## Mocking rule

Until runtime/hardware integration exists, realistic mock data is allowed only when clearly marked `DEMO` or `SIMULATED`. A persistent banner and per-panel badges implement this; the banner is derived from the runtime's reported `origin`.
