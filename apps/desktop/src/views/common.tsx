import type { RuntimeError } from "@mdx-studio/protocol";
import { isRuntimeClientError } from "@mdx-studio/runtime-client";
import { Callout, OriginBadge, type OriginValue } from "@mdx-studio/ui";
import { formatTimestamp, formatTimestampShort } from "../services/format";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  origin,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  origin?: OriginValue;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">
          {title} {origin === undefined ? null : <OriginBadge origin={origin} />}
        </h1>
        {subtitle === undefined ? null : <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions === undefined ? null : <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function describeError(error: Error): { message: string; issues: RuntimeError["issues"] } {
  if (isRuntimeClientError(error)) {
    return { message: error.error.message, issues: error.error.issues };
  }
  return { message: error.message, issues: [] };
}

export function ErrorNotice({
  error,
  title = "Something went wrong",
}: {
  error: Error;
  title?: string;
}) {
  const { message, issues } = describeError(error);
  return (
    <Callout tone="fail" title={title} role="alert">
      <p style={{ margin: 0 }}>{message}</p>
      {issues.length === 0 ? null : (
        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
          {issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>
              <span className="mdx-mono">{issue.path}</span>: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </Callout>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p className="mdx-muted" role="status">
      Loading {what}&hellip;
    </p>
  );
}

/** Compact UTC timestamp for tables; the full-precision value is available on hover. */
export function Timestamp({ iso }: { iso: string | null }) {
  return (
    <span className="nowrap" title={formatTimestamp(iso)}>
      {formatTimestampShort(iso)}
    </span>
  );
}
