# Development Roadmap

## Phase 0 — Repository foundation — **done (Linux-validated)**

Repository structure, architecture/product/safety/protocol documentation, conventions, workspace
tooling (pnpm, TypeScript strict, ESLint, Prettier, Vitest), typed protocol + JSON Schema, runtime
interfaces and mocks, test infrastructure, architecture guard tests, CI definitions.

## Phase 1 — UI prototype — **done (Linux-validated; Windows pending)**

Functional navigation and mock-backed views: Dashboard, Projects/Project, Simulation Setup,
MDP Editor (Basic/Advanced/Raw), Monitor, Validation, Devices, Settings, Run/provenance detail.

## Next: Milestone 1.5 — Windows verification (before Phase 2 depends on it)

- Run the `windows-latest` CI job and `pnpm tauri:dev` / `pnpm tauri build --no-bundle` on Windows 11.
- Confirm WebView2 rendering, CSP under `tauri.localhost`, and dev-server CSP.
- Replace the placeholder identifier/icon; decide on installer targets.

## Phase 2 — Local runtime service

Python service in WSL2 implementing the existing protocol: health/version/capabilities, GROMACS
detection, structured command builder, process lifecycle abstraction, event/log streaming, and a
service-backed `RuntimeClient`. Windows↔WSL discovery/connection in the Tauri shell (typed, not shell
text). Cross-language conformance fixtures. No MDX hardware.

## Phase 3 — Native GROMACS integration

`grompp`, `mdrun`, status, stop, logs, and parsed progress.

## Phase 4 — Validation framework

Native-vs-candidate execution and structured comparison results; runtime-supplied qualified profiles.

## Phase 5 — MDX runtime integration

Only after a stable MDX runtime/API exists.

## Phase 6 — Device telemetry / hardware

Future FPGA/ASIC integration; real watchdog/thermal/power policy in the runtime.

## Backlog (UI)

Project creation, preset library and preset diff, MDP tooltips/docs from runtime, unsaved-changes
guard on navigation, telemetry export, run comparison, accessibility audit, CLI over `RuntimeClient`.
