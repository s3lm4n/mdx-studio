import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const variantClass = variant === "secondary" ? "" : ` mdx-button--${variant}`;
  return (
    <button
      type={type}
      className={`mdx-button${variantClass}${className === undefined ? "" : ` ${className}`}`}
      {...rest}
    />
  );
}
