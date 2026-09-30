export interface StateStripProps {
  states: readonly string[];
  current: string;
  ariaLabel: string;
}

/** Read-only view of a lifecycle with the current state highlighted. */
export function StateStrip({ states, current, ariaLabel }: StateStripProps) {
  return (
    <ol className="mdx-state-strip" aria-label={ariaLabel}>
      {states.map((state) => (
        <li
          key={state}
          className="mdx-state-strip__item"
          aria-current={state === current ? "true" : undefined}
        >
          {state}
        </li>
      ))}
    </ol>
  );
}
