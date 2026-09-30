import { PROTOCOL_VERSION } from "@mdx-studio/protocol";
import {
  SCENARIOS,
  SCENARIO_IDS,
  isMockRuntime,
  type ScenarioId,
} from "@mdx-studio/runtime-client";
import { Button, Callout, Field, KeyValueList, Panel, SegmentedControl } from "@mdx-studio/ui";
import { useState } from "react";
import { getAppInfo } from "../../app/bridge";
import { useRuntimeContext } from "../../app/runtime-context";
import { useTheme, type ThemePreference } from "../../app/theme-context";
import { useAsync } from "../../hooks/use-async";
import { ErrorNotice, PageHeader } from "../common";

function DemoControls() {
  const { runtime, resetDemo } = useRuntimeContext();
  const [selected, setSelected] = useState<ScenarioId | undefined>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<Error>();

  if (!isMockRuntime(runtime)) return null;
  const mock = runtime;
  const scenarioId = selected ?? mock.scenario.id;

  function run(action: () => void, success: string) {
    setError(undefined);
    setMessage(undefined);
    try {
      action();
      setMessage(success);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  }

  return (
    <Panel title="Demo runtime controls">
      <div className="stack">
        <Callout tone="demo" title="Mock controls">
          These controls exist only on the simulated runtime to exercise PASS / WARN / FAIL gating
          and fault handling. They do not affect real hardware, and a real runtime would not offer
          them.
        </Callout>
        <Field label="Scenario">
          <select
            className="mdx-select"
            value={scenarioId}
            onChange={(event) => {
              const id = SCENARIO_IDS.find((candidate) => candidate === event.target.value);
              if (id !== undefined) setSelected(id);
            }}
          >
            {SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {SCENARIOS[id].label}
              </option>
            ))}
          </select>
        </Field>
        <span className="mdx-muted">{SCENARIOS[scenarioId].description}</span>
        <div className="row">
          <Button
            variant="primary"
            onClick={() => {
              resetDemo(scenarioId);
              setSelected(undefined);
              setError(undefined);
              setMessage(`Demo runtime reset to "${SCENARIOS[scenarioId].label}".`);
            }}
          >
            Apply scenario (resets demo data)
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              run(() => {
                mock.injectDeviceFault();
              }, "Simulated device fault injected. The runtime stopped dependent runs.");
            }}
          >
            Inject device fault
          </Button>
          <Button
            onClick={() => {
              run(() => {
                mock.resetDevice();
              }, "Simulated device reset requested.");
            }}
          >
            Reset device
          </Button>
        </div>
        {message === undefined ? null : (
          <span role="status" className="mdx-muted">
            {message}
          </span>
        )}
        {error === undefined ? null : <ErrorNotice error={error} title="Control not applicable" />}
      </div>
    </Panel>
  );
}

export function SettingsView() {
  const theme = useTheme();
  const info = useAsync(() => getAppInfo(), []);

  return (
    <div className="stack">
      <PageHeader title="Settings" />

      <Panel title="Appearance">
        <SegmentedControl<ThemePreference>
          ariaLabel="Theme"
          value={theme.preference}
          onChange={theme.setPreference}
          options={[
            { id: "system", label: "System" },
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
        />
      </Panel>

      <Panel title="Runtime connection">
        <div className="stack">
          <KeyValueList
            items={[
              { label: "Current runtime", value: "In-process simulated (demo) runtime" },
              { label: "WSL runtime service", value: "Not implemented (Phase 2)" },
            ]}
          />
          <span className="mdx-muted">
            The Windows desktop will connect to a typed runtime service inside WSL2. Connection
            settings will appear here once that service exists.
          </span>
        </div>
      </Panel>

      <DemoControls />

      <Panel title="About">
        {info.error !== undefined ? (
          <ErrorNotice error={info.error} title="Could not read application info" />
        ) : info.data === undefined ? (
          <p className="mdx-muted" style={{ margin: 0 }}>
            Reading application info&hellip;
          </p>
        ) : (
          <KeyValueList
            items={[
              { label: "Application", value: `MDX Studio ${info.data.appVersion}`, mono: true },
              {
                label: "Shell",
                value: info.data.shell === "tauri" ? "Tauri desktop" : "Browser (development)",
              },
              { label: "Protocol version", value: PROTOCOL_VERSION, mono: true },
              ...(info.data.shell === "tauri"
                ? [
                    { label: "Host OS", value: info.data.os ?? "—", mono: true },
                    { label: "Architecture", value: info.data.arch ?? "—", mono: true },
                    { label: "Tauri", value: info.data.tauriVersion ?? "—", mono: true },
                  ]
                : []),
            ]}
          />
        )}
      </Panel>

      <Callout tone="demo" title="Current status">
        MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.
      </Callout>
    </div>
  );
}
