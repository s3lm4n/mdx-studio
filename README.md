# MDX Studio

MDX Studio is the Windows desktop control plane for future GROMACS + MDX molecular-dynamics workloads.

> **Current status:** repository foundation only. The desktop UI, runtime service, native GROMACS integration, validation framework, and physical MDX hardware integration are not implemented yet.
>
> **MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.**

## Target architecture

- **Host:** Windows 11
- **Desktop:** Tauri 2 + React + TypeScript + Vite
- **Desktop bridge:** Rust via Tauri
- **Compute environment:** WSL2 / Linux
- **Runtime service:** explicit typed local API/IPC boundary; initial implementation may be Python
- **Scientific runtime:** GROMACS first, MDX device/runtime later

The GUI and future CLI must share the same backend/runtime API. Frontend code must never build arbitrary shell command strings or directly control hardware.

## Repository layout

```text
apps/desktop/                 Windows desktop application (Tauri/React)
services/runtime/             WSL-side runtime service
packages/protocol/            Shared API/protocol contracts
packages/simulation-model/    Simulation/job/domain models
packages/ui/                  Reusable UI components
scripts/                      Windows/WSL developer utilities
tests/                        Cross-package/integration test home
docs/                         Architecture, product, safety, roadmap, Claude brief
```

## Start here

1. Read `docs/CLAUDE_IMPLEMENTATION_BRIEF.md`.
2. Read `CLAUDE.md` and `docs/ARCHITECTURE.md`.
3. On Windows PowerShell, run `./scripts/doctor-windows.ps1`.
4. In WSL, run `./scripts/doctor-wsl.sh`.
5. Implement Phase 0 and the Phase 1 UI shell without violating the architectural guardrails.

## Windows development principles

- Keep source code inside the Windows repository checkout unless a tool specifically requires WSL-local storage.
- Treat Windows as the desktop/UI host and WSL2 as the Linux compute/runtime boundary.
- Use structured requests across that boundary; do not pass user-authored shell strings from the UI.
- Do not commit machine-specific absolute paths, secrets, generated build output, or scientific evidence from the frozen MDX validation repository.

## Current limitations

- No production desktop application yet.
- No runtime service implementation yet.
- No GROMACS process lifecycle integration yet.
- No MDX physical device integration.
- No real telemetry; mocks must be clearly labeled as simulated/demo.

See `docs/DEVELOPMENT_ROADMAP.md` for sequencing.
