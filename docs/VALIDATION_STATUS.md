# Validation Status

This page records what has actually been verified, where, and what has **not**. Windows 11 + WSL2 is
the authoritative target platform; everything below was verified on **Linux only**.

> **No Windows build, run or test has been performed.** Linux results are not proof of Windows,
> WebView2 or WSL2 compatibility.

## Environment of the Linux validation

| Item                       | Value                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| OS                         | Linux (cloud sandbox, x86-64)                                              |
| Node / pnpm                | 22.22.2 / 12.8.1 (repo declares `node >=22`, `pnpm >=10`; CI uses pnpm 10) |
| TypeScript / Vite / Vitest | 6.0.3 / 8.3.1 / 5.0.2                                                      |
| React                      | 19.3.0                                                                     |
| Rust / Tauri crate         | rustc 1.98.1 / tauri 2.12.1                                                |
| Tauri webview              | WebKitGTK 4.1 under Xvfb (**not** WebView2)                                |

## Verified on Linux

| Check                                                              | Result                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `pnpm format:check` (Prettier)                                     | pass                                                                                                   |
| `pnpm lint` (ESLint, type-aware strict + project guard rules)      | 0 problems                                                                                             |
| `pnpm typecheck` (`tsc` strict, all workspaces)                    | 0 errors                                                                                               |
| `pnpm test` — protocol                                             | 20 tests pass                                                                                          |
| `pnpm test` — simulation-model                                     | 50 tests pass                                                                                          |
| `pnpm test` — runtime-client                                       | 54 tests pass                                                                                          |
| `pnpm test` — ui                                                   | 26 tests pass                                                                                          |
| `pnpm test` — desktop (views, services, bridge; jsdom)             | 88 tests pass                                                                                          |
| `pnpm test` — `tests/architecture` guards                          | 31 tests pass                                                                                          |
| `pnpm build` (tsc + Vite production build)                         | pass (bundle ≈ 524 kB, 158 kB gzip)                                                                    |
| Protocol JSON Schema up to date (`emit-schema.ts --check`)         | pass                                                                                                   |
| CI path-sanity grep (no machine-specific absolute paths)           | clean                                                                                                  |
| `cargo fmt --check`                                                | pass                                                                                                   |
| `cargo clippy --locked --all-targets -- -D warnings`               | pass                                                                                                   |
| `cargo test --locked` (2 tests)                                    | pass                                                                                                   |
| `cargo check --locked`                                             | pass (capability permission `allow-get-app-info` accepted by `build.rs`)                               |
| `pnpm tauri build --no-bundle` (release binary, frontend embedded) | pass                                                                                                   |
| Launch smoke test of the release binary under Xvfb                 | ran for 25 s with no panic; window captured showing the rendered Dashboard (Tauri webview, CSP active) |
| Browser rendering of every main route (Chromium)                   | visually reviewed (light OS theme)                                                                     |

Total TypeScript tests: **269**; Rust tests: **2**.

Bugs found by these tests and fixed during development (kept here because they are the kind of issue
that would otherwise only appear on a user's machine): `noise()` range; protocol/mock mismatch for the
project-root working directory; Basic-editor labels not associated with controls; enum `<select>` not
matching GROMACS' case-insensitive values; whitespace re-flow when clearing a value; **CRLF line
endings silently rewritten by the Raw editor** (textareas normalise to LF).

## What the tests do and do not show

- They show the UI, state machines, MDP model, protocol contract and mock runtime behave as specified
  against the **simulated** runtime, and that the architecture rules hold statically.
- They do **not** exercise a real runtime, GROMACS, WSL2, a device, or any real telemetry — none exist
  yet. Mock numbers (including validation tolerances) are placeholders.
- jsdom is not a browser: layout, focus rings and visual regressions are only spot-checked manually.
- No accessibility audit beyond semantic roles/labels asserted in tests.

## Not verified — requires Windows 11 (owner action)

The `windows-desktop` job in `.github/workflows/foundation.yml` is **defined but has never run**.

Checklist to close the gap:

1. [ ] `pnpm install --frozen-lockfile` with a stock Windows Node/pnpm.
2. [ ] `pnpm check` (format, lint, typecheck, tests, build) — watch for CRLF/`autocrlf` effects.
3. [ ] `cargo fmt --check`, `cargo clippy`, `cargo test` in `apps/desktop/src-tauri` (MSVC toolchain).
4. [ ] `pnpm tauri:dev`: window opens, UI renders under **WebView2**, dev CSP permits HMR.
5. [ ] `pnpm --filter @mdx-studio/desktop tauri build --no-bundle`: binary runs; production CSP
       (`http://tauri.localhost` origin) permits the app; `get_app_info` reports `windows`.
6. [ ] Settings → About shows "Tauri desktop" with the Windows host details.
7. [ ] Decide installer targets (bundling is disabled), replace the placeholder identifier/icon.
8. [ ] WSL2 connectivity is Phase 2 and entirely untested.

## Other known gaps

- Mixed line endings inside one MDP resolve to the dominant style after a **Raw** edit (Basic/Advanced
  edits preserve them exactly).
- No unsaved-changes guard when navigating away from the MDP editor.
- Timestamps are displayed in UTC only.
- Project creation, pause, GPU selection and preset diff are not implemented.
