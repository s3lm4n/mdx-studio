import type { NavItem } from "../services/navigation";

const PATHS: Record<NavItem["icon"], string> = {
  dashboard: "M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z",
  projects: "M1.5 3.5h4l1.5 1.5h7.5v8h-13z",
  simulation: "M4 2.5l9 5.5-9 5.5z",
  monitor: "M1.5 12l3.5-5 3 3 3-6 3.5 8",
  validation: "M2.5 8.5l3.5 3.5 7.5-8",
  devices: "M3 4h10v8H3zM6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5",
  settings: "M2 4.5h12M2 8h12M2 11.5h12M5 3v3M10 6.5v3M6.5 10v3",
};

export function NavIcon({ name }: { name: NavItem["icon"] }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
