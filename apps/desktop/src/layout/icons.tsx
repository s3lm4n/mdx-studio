import type { NavItem } from "../services/navigation";

const PATHS: Record<NavItem["icon"], string> = {
  dashboard: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v3H9zM9 7.5h4.5v6H9zM2.5 9h4.5v4.5H2.5z",
  projects: "M1.8 3.8h3.8l1.4 1.4h7.2v7.5H1.8z",
  simulation: "M4.5 2.8l8.2 5.2-8.2 5.2z",
  monitor: "M1.5 11.5l3.2-4.6 2.8 2.8 3-6 3.8 7.8",
  validation: "M2.8 8.4l3.3 3.3 7.2-7.6",
  devices: "M3.2 4.2h9.6v7.6H3.2zM6 1.8v2.4M10 1.8v2.4M6 11.8v2.4M10 11.8v2.4M6 7h4v2H6z",
  settings: "M2 4.5h12M2 8h12M2 11.5h12M5 3v3M10.5 6.5v3M6.5 10v3",
};

export function NavIcon({ name }: { name: NavItem["icon"] }) {
  return (
    <svg
      className="app-nav__icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
