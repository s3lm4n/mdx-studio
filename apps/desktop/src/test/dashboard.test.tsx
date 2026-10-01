import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("Dashboard", () => {
  it("reports GROMACS, MDX runtime and MDX device status, each labelled simulated", async () => {
    renderApp("/");
    const status = await screen.findByRole("region", { name: "Runtime status" });
    await within(status).findByText("2025.0-demo");
    expect(within(status).getByText("GROMACS")).toBeInTheDocument();
    expect(within(status).getByText("MDX runtime")).toBeInTheDocument();
    expect(within(status).getByText("MDX device")).toBeInTheDocument();
    expect(within(status).getAllByText("Simulated")).toHaveLength(3);
    expect(within(status).getAllByText("mock", { selector: "dd" })).toHaveLength(2); // implementation + device integration
  });

  it("lists recent runs with links to provenance", async () => {
    renderApp("/", { scenario: "demo-run" });
    const table = await screen.findByRole("table", { name: "Recent runs" });
    const links = await within(table).findAllByRole("link", { name: /^run-demo-/ });
    expect(links.length).toBeGreaterThanOrEqual(5);
    expect(links[0]).toHaveAttribute("href", "/runs/run-demo-0006");
  });

  it("shows the active demo run progress", async () => {
    renderApp("/", { scenario: "demo-run" });
    const active = await screen.findByRole("region", { name: "Active run" });
    const bar = await within(active).findByRole("progressbar", { name: "Simulation" });
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeCloseTo(34.99, 1);
    expect(within(active).getByText(/ns\/day/)).toBeInTheDocument();
  });

  it("offers the quick actions, with project creation clearly unavailable", async () => {
    renderApp("/");
    await screen.findByRole("region", { name: "Runtime status" });
    expect(screen.getByRole("button", { name: "New project" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "New simulation" })).toHaveAttribute(
      "href",
      "/simulation/setup",
    );
    expect(screen.getByRole("link", { name: "Validation run" })).toHaveAttribute(
      "href",
      "/simulation/setup?mode=validation",
    );
  });

  it("shows no active run when the simulated device is idle", async () => {
    renderApp("/", { scenario: "idle" });
    const active = await screen.findByRole("region", { name: "Active run" });
    expect(await within(active).findByText("No run in progress.")).toBeInTheDocument();
  });
});
