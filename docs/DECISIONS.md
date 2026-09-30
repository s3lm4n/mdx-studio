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

## ADR-007 — pnpm workspace, TypeScript pinned to 6.0

Packages export TypeScript source directly (no per-package build step); the desktop app's Vite build
compiles them. TypeScript is pinned to `~6.0` because `typescript-eslint` (needed for type-aware lint)
declares `typescript <6.1`. Revisit when typescript-eslint supports TypeScript 7.

## ADR-008 — zod as the contract source, JSON Schema as the interchange artifact

Contracts are written once in zod (runtime validation + inferred types) and emitted to a committed JSON
Schema so a Python/Rust/Go runtime can conform. A test fails when the artifact is stale. Cross-field
rules that JSON Schema cannot express are documented and must be enforced by runtimes.

## ADR-009 — Strict, closed `SimulationRequest`

Unknown properties are rejected, paths are project-relative with a restrictive charset, and there is no
free-form string field. This is an executable guard (architecture test) rather than a convention.

## ADR-010 — `RuntimeClient` interface with an in-process simulated implementation

Phase 1 has no service, but views are written against the interface the real runtime will implement.
The mock composes explicit mock providers, is deterministic under an injected clock, tags every record
`origin: "simulated"`, and exposes scenario/fault controls only on the mock class (not the interface).

## ADR-011 — Runtime-owned gating surfaced as data

`PreflightReport.startPermitted` and `JobRecord.allowedActions` are computed by the runtime. The UI binds
to them and is lint-blocked from importing the policy functions. `submitJob` re-checks the gate.

## ADR-012 — Lossless MDP document; document is the editor state

The Raw view must preserve the user's text, so MDP parsing keeps every line's bytes and line ending
(`serialize(parse(x)) === x`). The editor's state is the parsed document: structured edits transform it
directly (no text round-trip, which re-flowed whitespace around empty values). Browsers normalise
`<textarea>` values to LF, so Raw edits re-apply the file's own line-ending style (important for
Windows-authored CRLF files); mixed endings resolve to the dominant style on a Raw edit.

## ADR-013 — Least-privilege Tauri shell

One read-only command (`get_app_info`), declared in `build.rs` (`AppManifest`) and granted explicitly in
the capability; no plugins; strict CSP; `withGlobalTauri: false`. Architecture tests pin the allow-list
so widening it is a deliberate, reviewed change.

## ADR-014 — Hash routing, hand-rolled SVG charts, CSS variable tokens

Hash routing avoids server rewrites under Tauri's custom protocol. Charts are small SVG components to
avoid a dependency and keep rendering testable. Design tokens support dark/light themes (system default).

## ADR-015 — Placeholders

The Tauri identifier `com.mdxstudio.desktop` and the app icon are placeholders pending a real domain and
brand assets. Bundling is disabled (`bundle.active=false`) until Windows packaging is validated.
Validation-profile numbers in the mock are placeholders and labelled as such.
