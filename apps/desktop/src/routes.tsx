import type { RouteObject } from "react-router-dom";
import { Shell } from "./layout/Shell";
import { DashboardView } from "./views/dashboard/DashboardView";
import { DevicesView } from "./views/devices/DevicesView";
import { MdpEditorView } from "./views/mdp-editor/MdpEditorView";
import { MonitorView } from "./views/monitor/MonitorView";
import { ProjectDetailView } from "./views/projects/ProjectDetailView";
import { ProjectsView } from "./views/projects/ProjectsView";
import { RunDetailView } from "./views/run-detail/RunDetailView";
import { SettingsView } from "./views/settings/SettingsView";
import { SetupView } from "./views/simulation/SetupView";
import { SimulationView } from "./views/simulation/SimulationView";
import { ValidationView } from "./views/validation/ValidationView";
import { Navigate } from "react-router-dom";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <DashboardView /> },
      { path: "projects", element: <ProjectsView /> },
      { path: "projects/:projectId", element: <ProjectDetailView /> },
      {
        path: "simulation",
        element: <SimulationView />,
        children: [
          { index: true, element: <Navigate to="setup" replace /> },
          { path: "setup", element: <SetupView /> },
          { path: "mdp", element: <MdpEditorView /> },
        ],
      },
      { path: "monitor", element: <MonitorView /> },
      { path: "validation", element: <ValidationView /> },
      { path: "devices", element: <DevicesView /> },
      { path: "settings", element: <SettingsView /> },
      { path: "runs/:runId", element: <RunDetailView /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];
