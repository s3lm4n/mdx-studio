# MDX Studio Architecture

## System boundary

```text
Windows 11
┌─────────────────────────────────────┐
│ MDX Studio Desktop                  │
│ Tauri 2 + React + TypeScript        │
│                                     │
│ UI views                            │
│   ↓                                 │
│ Application services (pure, typed)  │
│   ↓                                 │
│ RuntimeClient (interface)           │
└───────────────┬─────────────────────┘
                │ typed local API / IPC   (Phase 2; mock in-process today)
                ▼
WSL2 / Linux
┌─────────────────────────────────────┐
│ MDX Runtime Service                 │
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

## Packages and what they own

| Package                        | Responsibility                                                         | May depend on              |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------- |
| `@mdx-studio/protocol`         | Typed contracts (zod), state vocabularies, emitted JSON Schema         | —                          |
| `@mdx-studio/simulation-model` | Job/device state machines, lossless MDP model, lint, run-mode metadata | protocol                   |
| `@mdx-studio/runtime-client`   | `RuntimeClient` interface, `MockRuntimeClient` and mock providers      | protocol, simulation-model |
| `@mdx-studio/ui`               | Presentational components, design tokens                               | react                      |
| `@mdx-studio/desktop`          | App shell, views, application services, Tauri bridge                   | all of the above           |

Domain packages (`protocol`, `simulation-model`, `runtime-client`) are environment-agnostic:
no React, no Node built-ins, no Tauri. ESLint and `tests/architecture` enforce this.

## Ownership rules

### Desktop / UI owns

- navigation and presentation;
- forms and editors for structured simulation configuration;
- non-authoritative, ergonomic validation (same protocol schema, for field-level feedback only);
- rendering runtime state, telemetry, provenance and validation results — including the
  SIMULATED/DEMO disclosure for anything the runtime marks `origin: "simulated"`.

### Runtime service owns

- authoritative input validation, including path mapping between Windows and WSL;
- GROMACS discovery and capability detection;
- safe command construction from structured inputs;
- process lifecycle, log/event streaming;
- job and device state machines, `allowedActions`, and the pre-flight `startPermitted` gate;
- validation profiles, tolerances and pass/fail decisions;
- provenance capture; future MDX device integration and safety policy.

## Prohibited coupling (and how it is enforced)

| Rule                                                    | Enforcement                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| No arbitrary shell strings from UI/Tauri to WSL         | No such API exists; `SimulationRequest` is a closed, strict schema with no free-form strings (`tests/architecture/protocol-surface`)    |
| Frontend never builds `gmx …` commands                  | ESLint `no-restricted-syntax` + AST scan for `gmx`/`mdrun`/`grompp` in string/template/JSX text (`tests/architecture/boundary`)         |
| No process/shell modules in frontend or domain code     | ESLint `no-restricted-imports` + AST scan                                                                                               |
| Only `bridge.ts` touches Tauri, and only `get_app_info` | ESLint + architecture test; Rust capability allow-list test                                                                             |
| UI never recomputes gating/lifecycle policy             | ESLint forbids importing `transition`, `allowedJobActions`, … into UI code                                                              |
| Mock never claims measured data                         | Architecture test forbids the literal `"measured"` in `runtime-client/src/mock`; contract tests assert `origin: "simulated"` everywhere |
| No fake hardware claims                                 | Persistent banner derived from `RuntimeHealth.origin`; README/Settings/Devices disclosures                                              |

## The Runtime Client

`RuntimeClient` (`packages/runtime-client/src/client.ts`) is the only way the desktop talks to a
runtime. It exposes typed operations (`runPreflight`, `submitJob`, `stopJob`, `getProvenance`,
`subscribeTelemetry`, …). There is no method that accepts a command line, flags, environment
variables, or a path outside a project. Every operation can reject with a `RuntimeClientError`
wrapping the protocol's structured `RuntimeError`.

Phase 1 provides `MockRuntimeClient`: an in-process implementation composed from mock providers
(device, telemetry, validation, provenance) driven by an injectable clock. It executes nothing:
no processes, no file-system or network access. Phase 2 adds a service-backed implementation of the
same interface; the GUI, and later a CLI, both use it.

## Data flow for a run

1. The Setup view turns form state into a `SimulationRequest` (application service,
   `services/simulation-request.ts`).
2. `runPreflight` returns a `PreflightReport`; the UI renders the checks and binds **Start** to
   `report.startPermitted`.
3. `submitJob` re-runs the gate inside the runtime (a client-held report is never trusted), creates
   a job, and the runtime advances it through `CREATED → VALIDATING → READY → STARTING → RUNNING →
COMPLETED/FAILED/ABORTED`, arming the device watchdog before the simulation starts.
4. The Monitor subscribes to job events and telemetry; **Stop** is offered only when
   `job.allowedActions` includes `stop`.
5. Provenance (generated commands, hashes, versions, logs) is available per run and is read-only.

## Technology notes

- TypeScript is pinned to the 6.0 line because `typescript-eslint` does not yet support 7.x.
- Hash routing (`createHashRouter`) works under Tauri's custom protocol without rewrites.
- Charts are small SVG components (no chart dependency); history is a bounded rolling buffer.
- See [`DECISIONS.md`](DECISIONS.md) for the decision record.
