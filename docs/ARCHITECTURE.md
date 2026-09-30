# MDX Studio Architecture Baseline

## System boundary

```text
Windows 11
┌─────────────────────────────────────┐
│ MDX Studio Desktop                  │
│ Tauri 2 + React + TypeScript        │
│                                     │
│ UI                                  │
│   ↓                                 │
│ Application services                │
│   ↓                                 │
│ MDX Runtime Client                  │
└───────────────┬─────────────────────┘
                │ typed local API / IPC
                ▼
WSL2 / Linux
┌─────────────────────────────────────┐
│ MDX Runtime Service                 │
│                                     │
│ Runtime API                         │
│   ├─ GROMACS Provider               │
│   ├─ MDX Device Provider (mock now) │
│   ├─ Telemetry Provider (mock now)  │
│   ├─ Validation Provider            │
│   └─ Provenance Provider            │
└───────────────┬─────────────────────┘
                │ controlled process/device adapters
                ▼
           GROMACS + future MDX
```

## Ownership rules

### Desktop/UI owns
- navigation and presentation
- forms/editors for structured simulation configuration
- client-side ergonomics and non-authoritative validation
- rendering runtime state, telemetry, provenance, and validation results

### Runtime service owns
- authoritative input validation
- GROMACS discovery and capability detection
- safe command construction from structured inputs
- process lifecycle
- log/event streaming
- job/device state machines
- validation profile retrieval/execution
- provenance capture
- future MDX device integration and safety policy

## Prohibited coupling

- No arbitrary shell strings from React/Tauri UI to WSL.
- No frontend construction of `gmx grompp` or `gmx mdrun` command lines.
- No UI-owned hardware safety decisions.
- No fake claims of physical MDX hardware integration.

## Initial protocol direction

Use a versioned, typed localhost protocol or equivalently explicit local IPC. The transport may evolve; public request/response/event contracts should remain stable enough that the runtime implementation can move from Python to Rust/Go without rewriting the GUI.

Recommended initial resource model:

- `RuntimeHealth`
- `RuntimeCapabilities`
- `SimulationRequest`
- `PreflightReport`
- `JobRecord`
- `JobEvent`
- `TelemetrySnapshot`
- `ValidationProfile`
- `ValidationResult`
- `ProvenanceRecord`

Exact schemas belong in `packages/protocol` and must be backend-authoritative for execution semantics.
