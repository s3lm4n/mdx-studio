# Desktop Application

**Tauri 2 + React 19 + TypeScript + Vite**, targeting Windows 11 (validated on Linux only so far).

```text
src/
  app/        runtime + theme providers, Tauri bridge (the only Tauri touchpoint)
  layout/     shell, sidebar, top bar (persistent simulated-runtime disclosure)
  hooks/      useAsync, live job / device / telemetry subscriptions
  services/   application services: typed request builder, formatting, navigation
  views/      dashboard, projects, simulation (setup + mdp-editor), monitor, validation,
              devices, settings, run-detail
  test/       view and service tests against the simulated runtime
src-tauri/    Rust shell: one read-only command, least-privilege capability, strict CSP
```

Do not place GROMACS command construction or hardware-control logic here. Views display what the
runtime reports (`startPermitted`, `allowedActions`, `origin`, validation `passed`) and never
recompute it; ESLint and `tests/architecture` enforce this.
