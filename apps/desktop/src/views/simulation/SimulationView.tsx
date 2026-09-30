import { Tabs, panelId } from "@mdx-studio/ui";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../common";

type SimulationTab = "setup" | "mdp";

const TABS = [
  { id: "setup", label: "Setup" },
  { id: "mdp", label: "MDP editor" },
] as const;

/** Shared frame for Setup and MDP editor; the selected project travels in the query string. */
export function SimulationView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selected: SimulationTab = location.pathname.endsWith("/mdp") ? "mdp" : "setup";

  return (
    <div className="stack">
      <PageHeader
        title="Simulation"
        subtitle="Configure a structured run request, review pre-flight, and edit MDP parameters."
      />
      <Tabs<SimulationTab>
        ariaLabel="Simulation sections"
        idPrefix="sim"
        tabs={TABS}
        selected={selected}
        onSelect={(tab) => {
          const search = new URLSearchParams();
          const project = params.get("project");
          if (project !== null) search.set("project", project);
          const suffix = search.size > 0 ? `?${search.toString()}` : "";
          void navigate(`/simulation/${tab}${suffix}`);
        }}
      />
      <div role="tabpanel" id={panelId("sim", selected)} aria-labelledby={`sim-tab-${selected}`}>
        <Outlet />
      </div>
    </div>
  );
}
