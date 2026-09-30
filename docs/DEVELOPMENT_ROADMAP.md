# Development Roadmap

## Phase 0 — Repository foundation

- repository structure
- architecture/product/safety/protocol documentation
- developer conventions
- desktop/runtime/package placeholders
- Windows + WSL environment diagnostics
- test/CI skeleton

## Phase 1 — UI prototype

Implement functional navigation and high-quality mock-backed views for Dashboard, Project, Simulation Setup, MDP Editor, Monitor, Validation, Devices, and Settings.

## Phase 2 — Local runtime service

Health/version/capabilities, GROMACS detection, structured command builder, process lifecycle abstraction, and event/log streaming. No MDX hardware.

## Phase 3 — Native GROMACS integration

`grompp`, `mdrun`, status, stop, logs, and parsed progress.

## Phase 4 — Validation framework

Native-vs-candidate execution and structured comparison results.

## Phase 5 — MDX runtime integration

Only after a stable MDX runtime/API exists.

## Phase 6 — Device telemetry / hardware

Future FPGA/ASIC integration.
