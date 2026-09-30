import type { ReactNode } from "react";

export type CalloutTone = "info" | "warn" | "fail" | "demo";

export interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children?: ReactNode;
  /** Use `alert` only for errors that need immediate attention. */
  role?: "status" | "alert" | "note";
}

export function Callout({ tone = "info", title, children, role = "note" }: CalloutProps) {
  return (
    <div className={`mdx-callout mdx-callout--${tone}`} role={role}>
      <div>
        {title === undefined ? null : <p className="mdx-callout__title">{title}</p>}
        {children === undefined ? null : <div className="mdx-callout__body">{children}</div>}
      </div>
    </div>
  );
}
