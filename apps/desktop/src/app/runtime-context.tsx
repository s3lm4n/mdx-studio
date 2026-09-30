import {
  MockRuntimeClient,
  isMockRuntime,
  type RuntimeClient,
  type ScenarioId,
} from "@mdx-studio/runtime-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RuntimeContextValue {
  runtime: RuntimeClient;
  /** Replace the demo runtime with a fresh one (mock only). */
  resetDemo: (scenario: ScenarioId) => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export interface RuntimeProviderProps {
  children: ReactNode;
  /** Inject a client (tests, future real runtime). Defaults to the simulated demo runtime. */
  client?: RuntimeClient;
}

/**
 * Supplies the single RuntimeClient used by every view. Phase 1 has no service to connect to,
 * so the default is the explicitly simulated in-process runtime.
 */
export function RuntimeProvider({ children, client }: RuntimeProviderProps) {
  const [runtime, setRuntime] = useState<RuntimeClient>(
    () => client ?? new MockRuntimeClient({ scenario: "nominal", autoStart: false }),
  );

  // start()/dispose() are idempotent, so React StrictMode's mount/unmount/mount is safe.
  useEffect(() => {
    if (!isMockRuntime(runtime)) return undefined;
    runtime.start();
    return () => {
      runtime.dispose();
    };
  }, [runtime]);

  const resetDemo = useCallback((scenario: ScenarioId) => {
    setRuntime((previous) => {
      if (isMockRuntime(previous)) previous.dispose();
      return new MockRuntimeClient({ scenario, autoStart: false });
    });
  }, []);

  const value = useMemo(() => ({ runtime, resetDemo }), [runtime, resetDemo]);
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntimeContext(): RuntimeContextValue {
  const value = useContext(RuntimeContext);
  if (value === null) throw new Error("useRuntimeContext must be used inside <RuntimeProvider>");
  return value;
}

export function useRuntime(): RuntimeClient {
  return useRuntimeContext().runtime;
}
