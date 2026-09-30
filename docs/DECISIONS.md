# Architecture Decisions

## ADR-001 — Separate repository
MDX Studio is independent from the frozen MDX RTL/scientific-validation repository.

## ADR-002 — Windows desktop / WSL compute split
Windows hosts the Tauri desktop UX; WSL2/Linux hosts GROMACS and the runtime service.

## ADR-003 — Typed runtime boundary
GUI and future CLI share a versioned runtime API. Arbitrary shell strings are prohibited across the UI boundary.

## ADR-004 — Provider architecture
GROMACS, MDX device, telemetry, validation, and provenance are backend providers behind application/runtime interfaces.

## ADR-005 — Honest hardware status
Physical MDX hardware is not integrated. Initial MDX device and telemetry providers are mocks and must be labeled simulated.

## ADR-006 — State-machine safety
Jobs and devices use explicit state machines; critical gating is backend-owned.
