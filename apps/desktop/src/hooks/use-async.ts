import { useEffect, useState, type DependencyList } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

export interface AsyncOptions {
  /**
   * Keep showing the previous result while a refresh is in flight. Use for "same thing, newer
   * data" reloads; leave off when the deps identify a different thing (e.g. another project).
   */
  keepPrevious?: boolean;
}

interface Settled<T> {
  token: object;
  data: T | undefined;
  error: Error | undefined;
}

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * A token whose identity changes exactly when `deps` change (or on demand). Uses the documented
 * "adjust state while rendering" pattern instead of an effect, so nothing cascades.
 */
function useChangeToken(deps: DependencyList): [object, () => void] {
  const [tracked, setTracked] = useState(() => ({ deps, token: {} }));
  if (!sameDeps(tracked.deps, deps)) setTracked({ deps, token: {} });
  return [
    tracked.token,
    () => {
      setTracked((previous) => ({ deps: previous.deps, token: {} }));
    },
  ];
}

/**
 * Runs an async loader whenever `deps` change. Results belonging to superseded inputs are
 * ignored, and `loading` is derived (token mismatch) rather than set inside the effect.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  options: AsyncOptions = {},
): AsyncState<T> {
  const [settled, setSettled] = useState<Settled<T>>();
  // The token identifies "this exact set of inputs"; caller-supplied deps define it.
  const [token, reload] = useChangeToken(deps);

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => {
        if (!cancelled) setSettled({ token, data, error: undefined });
      },
      (error: unknown) => {
        if (!cancelled) {
          setSettled({
            token,
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `loader` is intentionally excluded: callers pass a fresh closure every render and `token`
    // (derived from their deps) is what decides when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const current = settled?.token === token;
  const visible = current || options.keepPrevious === true ? settled : undefined;
  return {
    data: visible?.data,
    error: current ? settled.error : undefined,
    loading: !current,
    reload,
  };
}
