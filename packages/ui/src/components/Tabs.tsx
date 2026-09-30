import { useRef, type KeyboardEvent } from "react";

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
}

export interface TabsProps<Id extends string> {
  tabs: readonly TabItem<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
  ariaLabel: string;
  /** Prefix used to link each tab to its panel: `${idPrefix}-tab-x` / `${idPrefix}-panel-x`. */
  idPrefix: string;
}

export function tabId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}
export function panelId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`;
}

export function Tabs<Id extends string>({
  tabs,
  selected,
  onSelect,
  ariaLabel,
  idPrefix,
}: TabsProps<Id>) {
  const refs = useRef(new Map<Id, HTMLButtonElement>());

  function move(event: KeyboardEvent, delta: number) {
    const index = tabs.findIndex((tab) => tab.id === selected);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(next.id);
    refs.current.get(next.id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") move(event, 1);
    else if (event.key === "ArrowLeft") move(event, -1);
    else if (event.key === "Home" || event.key === "End") {
      const target = event.key === "Home" ? tabs[0] : tabs[tabs.length - 1];
      if (target !== undefined) {
        event.preventDefault();
        onSelect(target.id);
        refs.current.get(target.id)?.focus();
      }
    }
  }

  return (
    <div className="mdx-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(node) => {
            if (node === null) refs.current.delete(tab.id);
            else refs.current.set(tab.id, node);
          }}
          type="button"
          role="tab"
          id={tabId(idPrefix, tab.id)}
          aria-selected={tab.id === selected}
          aria-controls={panelId(idPrefix, tab.id)}
          tabIndex={tab.id === selected ? 0 : -1}
          className="mdx-tab"
          onClick={() => {
            onSelect(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
