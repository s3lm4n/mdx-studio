export interface NavItem {
  to: string;
  label: string;
  icon: "dashboard" | "projects" | "simulation" | "monitor" | "validation" | "devices" | "settings";
  /** Match nested routes (e.g. /projects/abc highlights Projects). */
  end?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/projects", label: "Projects", icon: "projects" },
  { to: "/simulation", label: "Simulation", icon: "simulation" },
  { to: "/monitor", label: "Monitor", icon: "monitor" },
  { to: "/validation", label: "Validation", icon: "validation" },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { to: "/devices", label: "Devices", icon: "devices" },
  { to: "/settings", label: "Settings", icon: "settings" },
];
