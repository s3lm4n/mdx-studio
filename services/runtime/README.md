# Runtime Service

WSL2/Linux-side service for GROMACS orchestration, job lifecycle, telemetry, validation, provenance,
and future MDX device integration.

**Status: contract only (Phase 2).** No service code exists yet. The Phase 1 desktop runs against an
in-process, explicitly simulated runtime (`packages/runtime-client`, `MockRuntimeClient`).

## What the service must implement

- The protocol in [`docs/RUNTIME_PROTOCOL.md`](../../docs/RUNTIME_PROTOCOL.md), validating requests and
  responses against `packages/protocol/schema/protocol.schema.json` **plus** the cross-field rules
  JSON Schema cannot express.
- The `RuntimeClient` operation set (`packages/runtime-client/src/client.ts`).
- Runtime-owned policy: `PreflightReport.startPermitted`, `JobRecord.allowedActions`, the job and
  device state machines (`packages/simulation-model`), validation tolerances and pass/fail.
- Provider boundaries: GROMACS, MDX device, telemetry, validation, provenance.
- No endpoint that accepts command lines. Commands are derived from a validated `SimulationRequest`
  and recorded as `CommandProvenance`.

Python is acceptable for the first implementation; the protocol must stay implementation-independent.
