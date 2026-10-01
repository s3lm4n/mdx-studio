import { isMockRuntime } from "@mdx-studio/runtime-client";
import { Badge } from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { useRuntime } from "../app/runtime-context";
import { useAsync } from "../hooks/use-async";

/**
 * Persistent, always-visible disclosure ribbon. It is derived from what the runtime reports about
 * itself, so it cannot be dropped by an individual view and disappears only when a runtime that
 * reports `origin: "measured"` is connected. On the demo runtime it also names the active demo
 * scenario, so a seeded "run in progress" is never mistaken for a real one.
 */
export function TopBar() {
  const runtime = useRuntime();
  const health = useAsync(() => runtime.getHealth(), [runtime]);
  const simulated = health.data === undefined ? true : health.data.origin === "simulated";
  const scenario = isMockRuntime(runtime) ? runtime.scenario : null;

  return (
    <header className={`app-topbar${simulated ? " app-topbar--simulated" : ""}`} role="banner">
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
      {scenario === null ? null : (
        <div className="app-demo-scenario" aria-label="Demo scenario">
          <span className="app-demo-scenario__label">Demo scenario</span>
          <span className="app-demo-scenario__value" title={scenario.label}>
            {scenario.shortLabel}
          </span>
          <Link className="app-demo-scenario__change" to="/settings">
            Change
          </Link>
        </div>
      )}
    </header>
  );
}
