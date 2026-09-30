import { useId, type ReactNode } from "react";

export interface PanelProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Remove body padding (for tables). */
  flush?: boolean;
  className?: string;
}

export function Panel({ title, actions, children, flush = false, className }: PanelProps) {
  const headingId = useId();
  return (
    <section
      className={`mdx-panel${className === undefined ? "" : ` ${className}`}`}
      aria-labelledby={headingId}
    >
      <div className="mdx-panel__header">
        <h2 className="mdx-panel__title" id={headingId}>
          {title}
        </h2>
        {actions === undefined ? null : <div className="mdx-panel__actions">{actions}</div>}
      </div>
      <div className={`mdx-panel__body${flush ? " mdx-panel__body--flush" : ""}`}>{children}</div>
    </section>
  );
}
