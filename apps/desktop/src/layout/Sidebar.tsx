import { OriginBadge } from "@mdx-studio/ui";
import { NavLink } from "react-router-dom";
import { useRuntime } from "../app/runtime-context";
import { useAsync } from "../hooks/use-async";
import { useJobs } from "../hooks/use-live";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "../services/navigation";
import { BrandMark } from "../brand/BrandMark";
import { NavIcon } from "./icons";

const TERMINAL = ["COMPLETED", "FAILED", "ABORTED"];

function NavEntry({ item, activeRuns }: { item: NavItem; activeRuns: number }) {
  // The live marker is a CSS pseudo-element so the link's accessible text stays the label alone;
  // the run count is exposed through `title`.
  const live = item.icon === "monitor" && activeRuns > 0;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end ?? false}
        className={({ isActive }) => `app-nav__link${isActive ? " app-nav__link--active" : ""}`}
        data-live={live ? "true" : undefined}
        title={live ? `${activeRuns} run${activeRuns === 1 ? "" : "s"} in progress` : undefined}
      >
        <NavIcon name={item.icon} />
        <span className="app-nav__label">{item.label}</span>
      </NavLink>
    </li>
  );
}

function RuntimeFooter() {
  const runtime = useRuntime();
  const health = useAsync(() => runtime.getHealth(), [runtime]);
  return (
    <div className="app-runtime">
      <span className="app-runtime__label">Runtime</span>
      {health.data === undefined ? (
        <span className="app-runtime__value mdx-mono">connecting…</span>
      ) : (
        <>
          <span className="app-runtime__value mdx-mono">
            {health.data.implementation} {health.data.runtimeVersion}
          </span>
          <OriginBadge origin={health.data.origin} />
        </>
      )}
    </div>
  );
}

export function Sidebar() {
  const { jobs } = useJobs();
  const activeRuns = jobs.filter((job) => !TERMINAL.includes(job.state)).length;
  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <BrandMark className="app-brand__mark" />
        <span className="app-brand__name">MDX Studio</span>
      </div>
      <nav aria-label="Primary" className="app-nav">
        <p className="app-nav__group" aria-hidden="true">
          Workflow
        </p>
        <ul className="app-nav__list">
          {PRIMARY_NAV.map((item) => (
            <NavEntry key={item.to} item={item} activeRuns={activeRuns} />
          ))}
        </ul>
      </nav>
      <nav aria-label="Secondary" className="app-nav app-nav--bottom">
        <p className="app-nav__group" aria-hidden="true">
          System
        </p>
        <ul className="app-nav__list">
          {SECONDARY_NAV.map((item) => (
            <NavEntry key={item.to} item={item} activeRuns={activeRuns} />
          ))}
        </ul>
      </nav>
      <RuntimeFooter />
    </aside>
  );
}
