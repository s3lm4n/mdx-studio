# Desktop Application

**Tauri 2 + React 19 + TypeScript + Vite**, targeting Windows 11 (CI builds on `windows-latest`; see `docs/VALIDATION_STATUS.md`).

```text
src/
  app/        runtime + theme providers, Tauri bridge (the only Tauri touchpoint)
  brand/      brand mark geometry (single source for the in-app mark and every app icon)
  layout/     shell, sidebar, top bar (persistent simulated-runtime disclosure)
  hooks/      useAsync, live job / device / telemetry subscriptions
  services/   application services: typed request builder, formatting, navigation
  views/      dashboard, projects, simulation (setup + mdp-editor), monitor, validation,
              devices, settings, run-detail
  test/       view and service tests against the simulated runtime
scripts/brand Node script that rasterises the mark into src-tauri/icons and public/favicon.png
src-tauri/    Rust shell: one read-only command, least-privilege capability, strict CSP
```

App icons are generated, not hand-edited: `pnpm --filter @mdx-studio/desktop brand:icons` writes
`icon.ico` (14 sizes, 16–256 px; the Windows exe, taskbar and title-bar icon), the PNGs and
`icon.icns`, plus reference SVGs in `src-tauri/icons/source/`. The renderer is deterministic and
pixel-snaps edges at small sizes; `src/test/brand.test.tsx` fails if the committed files drift from
the geometry. `bundle.icon` lists `128x128@2x.png` first because Linux/macOS take the first PNG as
the window icon and X11 drops icons larger than 256 px.

Do not place GROMACS command construction or hardware-control logic here. Views display what the
runtime reports (`startPermitted`, `allowedActions`, `origin`, validation `passed`) and never
recompute it; ESLint and `tests/architecture` enforce this.
