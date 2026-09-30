# Runtime Protocol

The desktop communicates with a runtime through a versioned, structured protocol. The contract lives
in `packages/protocol` (zod schemas → TypeScript types) and is emitted as JSON Schema to
`packages/protocol/schema/protocol.schema.json` so a non-TypeScript runtime (Python in Phase 2, Rust
or Go later) can validate against the same contract.

- Current protocol version: `0.1.0` (`PROTOCOL_VERSION`).
- Regenerate the schema after changing a contract: `pnpm schema:emit` (a test fails if it is stale).
- JSON Schema cannot express cross-field rules. Runtimes must additionally enforce: MDX profile
  required for `mdx`/`validation`; validation profile required for `validation`; `continuation`
  requires a `checkpoint`.

## Principles

- Typed request / response / event contracts; no arbitrary shell execution endpoint.
- Explicit protocol and runtime version reporting; capability discovery.
- Structured errors (`RuntimeError`: `code`, `message`, field `issues`, `retryable`).
- Stable IDs for projects, runs and jobs.
- Runtime-provided validation profiles, tolerances and pass/fail decisions.
- Provenance records for generated commands, hashes, versions and results.
- **Every value that could be mistaken for a measurement carries `origin`** (`simulated` |
  `measured`). Only a runtime talking to real hardware may emit `measured`.

## Resource model

| Type                                             | Purpose                                                        |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `RuntimeHealth`, `RuntimeCapabilities`           | status, versions, run modes, GROMACS/MDX profile discovery     |
| `SimulationRequest`                              | the only way to ask for a run (strict, closed, path-validated) |
| `PreflightReport`                                | checks + verdict + backend-owned `startPermitted`              |
| `JobRecord`, `JobEvent`                          | lifecycle, `allowedActions`, state-changed/log/error events    |
| `TelemetrySnapshot`                              | simulation progress, GROMACS energies, MDX, hardware, host     |
| `MdxDeviceStatus`                                | device state, identity, link, watchdog, last error             |
| `ValidationProfile`, `ValidationResult`          | runtime-supplied gates, tolerances and pass/fail               |
| `ProvenanceRecord`, `RunSummary`                 | commands, hashes, versions, logs, statuses                     |
| `ProjectSummary`, `ProjectDetail`, `MdpDocument` | project inventory and raw MDP text + sha256                    |

### `SimulationRequest`

Fields: `projectId`, `stage` (`EM|NVT|NPT|PRODUCTION`), `runMode` (`native|mdx|validation`),
`inputStructure` (`.gro`), `topology` (`.top`), `mdp` (`.mdp`), optional `checkpoint` (`.cpt`),
`continuation`, `resources {threads, computeTarget:"cpu"}`, optional `mdxProfile` /
`validationProfile` ids, `outputName`, `outputDirectory`.

- Unknown properties are rejected at every level (no smuggled `command`/`args`).
- Paths are project-relative POSIX paths: no absolute paths, drive letters, `..`, backslashes,
  whitespace or shell metacharacters (`[A-Za-z0-9._+@=-]` segments only). The runtime owns the
  Windows ↔ WSL mapping.
- There is no free-form string field: every string is an enum or pattern-constrained
  (architecture-tested).

### Command provenance

`CommandProvenance` (`argv`, runtime-rendered `display`, `workingDirectory`) is **output only**. No
request type accepts it; the desktop cannot edit or re-run recorded commands.

## Client surface (`RuntimeClient`)

The TypeScript interface maps onto the resource sketch below. The HTTP/IPC binding is **not
binding until Phase 2**; the operations and payloads are what the contract fixes.

| `RuntimeClient`                                                                   | Sketch                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `getHealth`, `getCapabilities`                                                    | `GET /health`, `GET /capabilities`                                         |
| `getDeviceStatus`, `subscribeDeviceStatus`                                        | `GET /device`, event stream                                                |
| `listProjects`, `getProject`, `readMdp`, `writeMdp`                               | `GET /projects`, `GET /projects/{id}`, `GET/PUT /projects/{id}/mdp/{path}` |
| `runPreflight`                                                                    | `POST /preflight`                                                          |
| `submitJob`, `getJob`, `listJobs`, `stopJob`                                      | `POST /jobs`, `GET /jobs[/{id}]`, `POST /jobs/{id}/stop`                   |
| `subscribeJobEvents`, `getJobEvents`, `subscribeTelemetry`, `getTelemetryHistory` | `GET /jobs/{id}/events` (stream), `GET /jobs/{id}/telemetry`               |
| `listRuns`, `getProvenance`                                                       | `GET /runs`, `GET /runs/{id}/provenance`                                   |
| `listValidationProfiles`, `listValidationResults`, `getValidationResult`          | `GET /validation/profiles`, `GET /validation/results`                      |

## Conformance plan for Phase 2

The Python service must: validate requests against the emitted JSON Schema plus the cross-field
rules above; return payloads that validate against the same schema; and pass a shared fixture set
(`tests/` will gain cross-language fixtures). The mock runtime's contract tests
(`packages/runtime-client/test/contract.test.ts`) are the TypeScript half of that suite.
