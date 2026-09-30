# Windows 11 + WSL2 Development Notes

MDX Studio deliberately spans two execution domains:

- Windows 11: Tauri desktop application, GUI, user interaction.
- WSL2/Linux: GROMACS and the MDX runtime service (Phase 2+).

## Prerequisites

Windows:

- Git, Node.js ≥ 22 (LTS), pnpm ≥ 10
- Rust toolchain (`rustup`, stable) with the MSVC target
- Tauri 2 prerequisites: Microsoft C++ Build Tools and WebView2 (preinstalled on Windows 11)
- WSL2 (needed from Phase 2)

WSL:

- Python 3 (initial runtime-service option), GROMACS when Phase 3 begins.

Run `./scripts/doctor-windows.ps1` and `./scripts/doctor-wsl.sh` to check your machine.

## Everyday commands

```powershell
pnpm install
pnpm dev          # UI in a browser (simulated runtime), http://127.0.0.1:1420
pnpm tauri:dev    # desktop shell
pnpm check        # format:check, lint, typecheck, test, build
```

Rust (from `apps/desktop/src-tauri`): `cargo fmt --check`, `cargo clippy --locked -- -D warnings`,
`cargo test --locked`.

Line endings: the repo uses LF (`.gitattributes`, `.editorconfig`, Prettier `endOfLine: lf`); only
`*.ps1`/`*.bat`/`*.cmd` are CRLF. If `git config core.autocrlf` is `true`, Prettier may report
differences on checkout; prefer `core.autocrlf=false` or `input`.

## Boundary rule

Do not make the desktop application invoke arbitrary WSL shell text supplied by React. Desktop code
calls typed application services, which call a `RuntimeClient`, which talks to the WSL runtime
service. The Tauri shell exposes exactly one read-only command today.

## Paths

Never commit absolute paths such as `C:\Users\...` or `/home/<user>/...` (CI and an architecture
test reject them). Project files are referenced by project-relative POSIX paths; the runtime owns the
Windows↔WSL mapping.

## Verification status

What has and has not been verified on Windows is tracked in
[`VALIDATION_STATUS.md`](VALIDATION_STATUS.md). As of this writing, nothing has been run on Windows.
