import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Card-level navigation link: ink rather than bronze at rest (bronze stays reserved for brand and
 * selection), bronze underline on hover. The arrow is decorative and hidden from assistive tech.
 */
export function DashLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="dash-link" to={to}>
      {children}
      <span className="dash-link__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
