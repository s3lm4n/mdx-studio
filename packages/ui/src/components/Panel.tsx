import { useId, type ReactNode } from "react";

export type PanelVariant = "default" | "hero";

export interface PanelProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Remove body padding (for tables). */
  flush?: boolean;
  className?: string;
  /** `hero` gets more generous padding; use once per view for the focal card. */
  variant?: PanelVariant;
  /** Short descriptor under the title (model, version, scope). */
  description?: ReactNode;
  /**
   * Decorative background layer (a motif). Rendered behind content, `aria-hidden` and
   * non-interactive. Never use behind tables, charts or forms.
   */
  motif?: ReactNode;
}

export function Panel({
  title,
  actions,
  children,
  flush = false,
  className,
  variant = "default",
  description,
  motif,
}: PanelProps) {
  const headingId = useId();
  const classes = ["mdx-panel"];
  if (variant !== "default") classes.push(`mdx-panel--${variant}`);
  if (className !== undefined) classes.push(className);
  return (
    <section className={classes.join(" ")} aria-labelledby={headingId}>
      {motif === undefined ? null : (
        <div className="mdx-panel__motif" aria-hidden="true">
          {motif}
        </div>
      )}
      <div className="mdx-panel__header">
        <div className="mdx-panel__heading">
          <h2 className="mdx-panel__title" id={headingId}>
            {title}
          </h2>
          {description === undefined ? null : (
            <p className="mdx-panel__description">{description}</p>
          )}
        </div>
        {actions === undefined ? null : <div className="mdx-panel__actions">{actions}</div>}
      </div>
      <div className={`mdx-panel__body${flush ? " mdx-panel__body--flush" : ""}`}>{children}</div>
    </section>
  );
}
