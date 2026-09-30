# MDX Studio

> **MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.**

## What MDX Studio is

MDX Studio is the user-facing control plane for running molecular-dynamics simulations with
GROMACS and, eventually, MDX hardware acceleration. A normal user should be able to open a project,
choose an MDP, pre-flight, start a run, watch it live, and review results and provenance without
typing GROMACS commands or remembering MDX environment variables.

It is a **separate repository** from the MDX RTL / scientific-validation repository. Nothing here
copies, reinterprets or depends on that repository's frozen validation evidence.

## Current status

Phase 0 (repository foundation) and Phase 1 (UI prototype) are in place:

- Desktop app shell: Tauri 2 + React 19 + TypeScript (strict) + Vite.
- Functional navigation and mock-backed views: Dashboard, Projects / Project, Simulation Setup,
  MDP Editor (Basic / Advanced / Raw), Live Monitor, Validation, Devices, Settings, Run /
  provenance detail.
- A typed runtime protocol (`packages/protocol`) with an emitted JSON Schema.
- An in-process **simulated** runtime behind the same `RuntimeClient` interface the future WSL2
  service will implement.
- State machines for jobs and devices, runtime-owned pre-flight gating, and a lossless MDP model.
- Unit, component, contract and architecture-guard tests; ESLint; Prettier; CI definitions.

Not implemented: the WSL2 runtime service, real GROMACS detection or execution, the validation
framework, and any physical MDX device integration. See [Current limitations](#current-limitations)
and [`docs/VALIDATION_STATUS.md`](docs/VALIDATION_STATUS.md) for exactly what has and has not been
verified (notably: **Windows has not been tested yet**).

## Architecture

```text
Windows 11                                   WSL2 / Linux (Phase 2+)
┌──────────────────────────────┐             ┌──────────────────────────────┐
│ Tauri 2 desktop (React + TS) │             │ Runtime service              │
│  UI views                    │             │  Runtime API                 │
│    ↓                         │  typed API  │   ├ GROMACS provider         │
│  Application services        │ ──────────▶ │   ├ MDX device provider      │
│    ↓                         │ (not built  │   ├ Telemetry provider       │
│  RuntimeClient (interface)   │   yet)      │   ├ Validation provider      │
└──────────────────────────────┘             │   └ Provenance provider      │
        │ today                              └──────────────────────────────┘
        ▼
  MockRuntimeClient  ← every record is tagged origin: "simulated"
```

Key rules (enforced by tests and lint, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

- The frontend never builds or executes `gmx …` or any shell text. It sends a structured
  `SimulationRequest`; the runtime validates it and derives commands itself.
- GUI and a future CLI share one runtime API (`RuntimeClient`).
- Gating and lifecycle policy (pre-flight `startPermitted`, job `allowedActions`, state machines)
  is runtime-owned. The UI displays it and never recomputes it.
- Validation profiles and tolerances come from the runtime; the UI never defines them.
- Mock data is always labelled SIMULATED/DEMO, and a persistent banner says so.
- Provenance (exact generated commands, hashes, versions, logs) is surfaced, never hidden.

## Running development mode

Prerequisites: Node.js ≥ 22, pnpm ≥ 10. For the desktop shell also Rust (stable) and the
[Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2 on Windows). See
[`docs/WINDOWS_DEVELOPMENT.md`](docs/WINDOWS_DEVELOPMENT.md).

```sh
pnpm install

pnpm dev          # UI in a browser at http://127.0.0.1:1420 (simulated runtime)
pnpm tauri:dev    # the desktop shell (needs Rust + Tauri prerequisites)

pnpm check        # format:check + lint + typecheck + test + build
```

Individual scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format`,
`pnpm schema:emit` (regenerates `packages/protocol/schema/protocol.schema.json`).

Rust checks (from `apps/desktop/src-tauri`): `cargo fmt --check`, `cargo clippy --locked -- -D
warnings`, `cargo test --locked`.

The demo starts in the **Nominal** scenario: a simulated MDX run is in progress at 104.962 / 300 ns.
Use **Settings → Demo runtime controls** to switch scenarios (idle, degraded, device missing,
device fault, validation mismatch) or inject a simulated device fault.

## Project structure

```text
apps/desktop/                 Tauri + React desktop application
  src/                        app (providers, bridge), layout, hooks, services, views
  src-tauri/                  Rust shell: one read-only command, least-privilege capability
packages/protocol/            Typed contracts (zod) + emitted JSON Schema
packages/simulation-model/    State machines, lossless MDP model, run-mode metadata
packages/runtime-client/      RuntimeClient interface + simulated MockRuntimeClient
packages/ui/                  Reusable presentational components and design tokens
services/runtime/             WSL-side runtime service (contract only; Phase 2)
tests/architecture/           Repo-wide guard tests (no shell text, least privilege, hygiene)
docs/                         Architecture, protocol, safety, decisions, roadmap, status
scripts/                      Windows / WSL diagnostics
```

## Current limitations

- **MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.** The mock
  device/telemetry/validation/provenance providers fabricate plausible data, always labelled.
- No WSL2 runtime service; no real GROMACS discovery, `grompp`/`mdrun` execution or log streaming.
- Validation profile numbers in the demo are **placeholders**, not qualified tolerances.
- Creating projects, pausing jobs, GPU selection and preset diffs are not implemented.
- Installer packaging is disabled; the Tauri identifier and icon are placeholders.
- Linux-only validation so far: the Windows + WSL2 path, WebView2 rendering and the Windows Tauri
  build have **not** been tested. A `windows-latest` CI job is defined but unproven until it runs.

## Roadmap

See [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md). Next: Phase 2 — local runtime
service (health, version, capabilities, GROMACS detection, structured command builder, process
lifecycle, event/log streaming) implementing the existing protocol, plus verifying the Windows build.

## Windows development principles

- Keep source inside the Windows checkout unless a tool requires WSL-local storage.
- Treat Windows as the UI host and WSL2 as the Linux compute/runtime boundary.
- Use structured requests across that boundary; never pass user-authored shell strings from the UI.
- Do not commit machine-specific absolute paths, secrets, generated build output, or scientific
  evidence from the frozen MDX validation repository.
