import { Badge } from "@mdx-studio/ui";
import { useRuntime } from "../app/runtime-context";
import { useAsync } from "../hooks/use-async";

/**
 * Persistent, always-visible disclosure. It is derived from what the runtime reports about
 * itself, so it cannot be dropped by an individual view and disappears only when a runtime that
 * reports `origin: "measured"` is connected.
 */
export function TopBar() {
  const runtime = useRuntime();
  const health = useAsync(() => runtime.getHealth(), [runtime]);
  const simulated = health.data === undefined ? true : health.data.origin === "simulated";

  return (
    <header className="app-topbar" role="banner">
      {simulated ? (
        <div className="app-demo-banner" role="status">
          <Badge tone="demo">Demo</Badge>
          <span>
            <strong>Simulated runtime.</strong> MDX hardware integration is not implemented. All MDX
            telemetry, device state and run data shown here are simulated.
          </span>
        </div>
      ) : (
        <div className="app-demo-banner app-demo-banner--live" role="status">
          <Badge tone="info">Connected</Badge>
          <span>Runtime {health.data?.implementation}</span>
        </div>
      )}
      <span className="app-topbar__runtime mdx-mono mdx-muted">
        {health.data === undefined
          ? "runtime: connecting…"
          : `runtime: ${health.data.implementation} ${health.data.runtimeVersion}`}
      </span>
    </header>
  );
}
