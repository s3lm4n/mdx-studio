/**
 * Minimal table-driven state machine. Safety-relevant lifecycles are modelled as explicit
 * transition tables (never ad-hoc booleans) so they can be enumerated, tested and documented.
 */
export interface StateMachineDefinition<S extends string, E extends string> {
  readonly initial: S;
  readonly terminal: readonly S[];
  readonly transitions: Readonly<Record<S, Readonly<Partial<Record<E, S>>>>>;
}

export type TransitionResult<S extends string, E extends string> =
  | { readonly ok: true; readonly state: S }
  | { readonly ok: false; readonly reason: string; readonly from: S; readonly event: E };

export function transition<S extends string, E extends string>(
  machine: StateMachineDefinition<S, E>,
  from: S,
  event: E,
): TransitionResult<S, E> {
  const next = machine.transitions[from][event];
  if (next === undefined) {
    return { ok: false, from, event, reason: `event '${event}' is not allowed in state '${from}'` };
  }
  return { ok: true, state: next };
}

export function availableEvents<S extends string, E extends string>(
  machine: StateMachineDefinition<S, E>,
  state: S,
): E[] {
  return Object.keys(machine.transitions[state]) as E[];
}

export function canTransition<S extends string, E extends string>(
  machine: StateMachineDefinition<S, E>,
  from: S,
  event: E,
): boolean {
  return machine.transitions[from][event] !== undefined;
}

export function isTerminal<S extends string, E extends string>(
  machine: StateMachineDefinition<S, E>,
  state: S,
): boolean {
  return machine.terminal.includes(state);
}

/** All states reachable from the initial state (used by tests to catch orphaned states). */
export function reachableStates<S extends string, E extends string>(
  machine: StateMachineDefinition<S, E>,
): Set<S> {
  const seen = new Set<S>([machine.initial]);
  const queue: S[] = [machine.initial];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const next of Object.values(machine.transitions[current])) {
      if (next !== undefined && !seen.has(next as S)) {
        seen.add(next as S);
        queue.push(next as S);
      }
    }
  }
  return seen;
}
