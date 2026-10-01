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

## Git attribution policy

Commits carry only the repository owner's already-configured Git identity. CI enforces this for every commit a push or pull request introduces (`scripts/check-commit-attribution.mjs`, job `commit-attribution` in `.github/workflows/foundation.yml`).

1. Never change the repository's or the machine's Git identity (`user.name`, `user.email`).
2. Never use Claude, Anthropic, or an Anthropic email address (`@anthropic.com`) as Git author or committer.
3. Never add `Co-Authored-By` trailers that identify Claude/Anthropic or use an Anthropic email address.
4. Never add `Claude-Session` trailers.
5. Do not add tool/vendor attribution trailers unless the repository owner explicitly requests them.
6. Do not commit or push unless explicitly instructed.
7. If explicitly instructed to commit, preserve the repository's already-configured Git identity; do not replace or override it with an AI/tool identity (no `--author`, `-c user.*`, or `GIT_AUTHOR_*`/`GIT_COMMITTER_*` overrides). If the configured identity is itself a Claude/Anthropic identity, do not commit; report it to the owner instead.

Only attribution metadata is rejected. Branch names such as `claude/...`, file names, and prose or merge messages that mention Claude are fine.
