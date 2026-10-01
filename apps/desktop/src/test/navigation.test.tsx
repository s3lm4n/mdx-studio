import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

const ROUTE_HEADINGS: [string, RegExp][] = [
  ["/", /^Dashboard/],
  ["/projects", /^Projects/],
  ["/projects/lysozyme-demo", /^Lysozyme in water/],
  ["/simulation/setup", /^Simulation/],
  ["/simulation/mdp", /^Simulation/],
  ["/monitor", /^Monitor/],
  ["/validation", /^Validation/],
  ["/devices", /^Devices/],
  ["/settings", /^Settings/],
  ["/runs/run-demo-0001", /^Run run-demo-0001/],
];

describe("navigation shell", () => {
  it("offers the documented primary and secondary navigation", () => {
    renderApp("/");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(primary)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Dashboard", "Projects", "Simulation", "Monitor", "Validation"]);
    const secondary = screen.getByRole("navigation", { name: "Secondary" });
    expect(
      within(secondary)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Devices", "Settings"]);
    expect(screen.getByText("MDX Studio")).toBeInTheDocument();
  });

  it.each(ROUTE_HEADINGS)(
    "renders %s with the simulated-runtime disclosure",
    async (route, heading) => {
      renderApp(route);
      expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
      const banner = screen.getByRole("banner");
      expect(within(banner).getByText(/Simulated runtime\./)).toBeInTheDocument();
      expect(
        within(banner).getByText(/hardware integration is not implemented/i),
      ).toBeInTheDocument();
    },
  );

  it("navigates between views and marks the current one", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByRole("heading", { level: 1, name: /^Dashboard/ });
    await user.click(screen.getByRole("link", { name: "Validation" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: /^Validation/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Validation" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("heading", { level: 1, name: /^Settings/ })).toBeInTheDocument();
  });

  it("marks Monitor while a run is in progress and clears it when the demo runtime is reset", async () => {
    const user = userEvent.setup();
    renderApp("/settings", { scenario: "demo-run" });
    const monitor = screen.getByRole("link", { name: "Monitor" });
    await waitFor(() => {
      expect(monitor).toHaveAttribute("data-live", "true");
    });
    expect(monitor).toHaveAttribute("title", "1 run in progress");

    const controls = await screen.findByRole("region", { name: "Demo runtime controls" });
    await user.selectOptions(within(controls).getByRole("combobox", { name: "Scenario" }), "idle");
    await user.click(within(controls).getByRole("button", { name: /Apply scenario/ }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Monitor" })).not.toHaveAttribute("data-live");
    });
  });

  it("redirects unknown routes to the dashboard", async () => {
    renderApp("/does-not-exist");
    expect(
      await screen.findByRole("heading", { level: 1, name: /^Dashboard/ }),
    ).toBeInTheDocument();
  });

  it("shows an error notice for an unknown project or run instead of crashing", async () => {
    renderApp("/projects/ghost");
    expect(await screen.findByRole("alert")).toHaveTextContent(/does not exist/);
  });

  it("switches between Setup and MDP editor tabs", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup");
    await screen.findByRole("radiogroup", { name: "Run mode" });
    await user.click(screen.getByRole("tab", { name: "MDP editor" }));
    expect(await screen.findByRole("tab", { name: "Basic" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "MDP editor" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
