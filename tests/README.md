# Tests

- `tests/architecture/` — repo-wide guard tests encoding CLAUDE.md's non-negotiable rules: no shell or
  raw GROMACS command text in frontend/domain code, closed `SimulationRequest`, Tauri least-privilege,
  mock honesty, no absolute paths/secrets, required README disclosure. Run with `pnpm test`
  (`vitest --config tests/vitest.config.ts`).
- `tests/scripts/` — tests for repository scripts: the Git attribution checker
  (`scripts/check-commit-attribution.mjs`) against policy cases and a throwaway Git repository.
- Package and app tests live beside their code (`packages/*/test`, `apps/desktop/src/test`).
- Rust unit tests live in `apps/desktop/src-tauri/src`.
