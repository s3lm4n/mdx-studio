# Claude Working Contract — MDX Studio

This is a **new, separate repository** for the user-facing MDX Studio application. It is not the frozen MDX RTL/scientific-validation repository.

## Source of truth

Read `docs/CLAUDE_IMPLEMENTATION_BRIEF.md` before making architectural or implementation changes.

## Non-negotiable architecture rules

1. Windows 11 is the primary desktop host; WSL2/Linux is the compute/runtime environment.
2. Use Tauri 2 + React + TypeScript + Vite for the desktop unless a concrete repository constraint justifies a change.
3. GUI and future CLI must share one runtime/backend API.
4. The frontend must never construct or execute arbitrary `gmx ...` or shell command strings.
5. Simulation requests are typed/structured objects validated before execution.
6. MDX hardware is not production-integrated. Use explicit mock providers and label simulated telemetry.
7. Safety-critical behavior is modeled with state machines and backend-owned policy, not ad-hoc UI booleans.
8. Validation tolerances/profiles come from the runtime/backend; do not freeze experimental MDX tolerances in the GUI.
9. Preserve provenance: expert users must eventually be able to inspect exact generated command provenance, hashes, logs, runtime configuration, validation data, and telemetry.
10. Do not copy or reinterpret frozen validation evidence from another MDX repository.

## Change discipline

Before major edits, inspect the repository. Make coherent changes. After changes, run the checks that exist: formatting, linting, type checking, tests, and build where practical. Never silently overwrite user work.

At each milestone summarize files changed, architecture decisions, commands/checks run, limitations, and next milestone.
