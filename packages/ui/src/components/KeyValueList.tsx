import type { ReactNode } from "react";

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export function KeyValueList({ items }: { items: readonly KeyValueItem[] }) {
  return (
    <dl className="mdx-kv">
      {items.map((item) => (
        <div key={item.label} style={{ display: "contents" }}>
          <dt>{item.label}</dt>
          <dd className={item.mono === true ? "mdx-mono" : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
