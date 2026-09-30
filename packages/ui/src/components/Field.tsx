import { useId, type ReactElement, type ReactNode, cloneElement } from "react";

export interface FieldProps {
  label: string;
  help?: ReactNode;
  error?: string | undefined;
  /** A single form control; the field wires up id, described-by and invalid state. */
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
}

export function Field({ label, help, error, children }: FieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help === undefined ? null : helpId, error === undefined ? null : errorId]
    .filter((value): value is string => value !== null)
    .join(" ");
  return (
    <div className="mdx-field">
      <label className="mdx-field__label" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        ...(describedBy === "" ? {} : { "aria-describedby": describedBy }),
        ...(error === undefined ? {} : { "aria-invalid": true }),
      })}
      {help === undefined ? null : (
        <span className="mdx-field__help" id={helpId}>
          {help}
        </span>
      )}
      {error === undefined ? null : (
        <span className="mdx-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
