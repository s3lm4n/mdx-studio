import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("Run detail / provenance", () => {
  it("displays runtime-generated command provenance as read-only text", async () => {
    renderApp("/runs/run-demo-0006", { scenario: "demo-run" });
    const command = await screen.findByLabelText("Command: Run the simulation");
    expect(command.tagName).toBe("PRE");
    expect(command).toHaveTextContent(/^gmx mdrun -s outputs\/prod-001\/prod-001\.tpr/);
    expect(
      screen.getByLabelText("Command: Pre-process inputs into a run input file"),
    ).toHaveTextContent(/gmx grompp/);
    expect(screen.getByText(/shown for inspection only/)).toBeInTheDocument();
    // No editing affordance exists for provenance.
    expect(within(command).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run|execute|re-?run/i })).not.toBeInTheDocument();
  });

  it("shows versions, hashes, configuration and logs", async () => {
    renderApp("/runs/run-demo-0006", { scenario: "demo-run" });
    await screen.findByText("Versions and hashes");
    expect(screen.getByText("2025.0-demo")).toBeInTheDocument();
    expect(screen.getByText("mdx-fw-demo-0.0.1")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Binary hashes" })).toBeInTheDocument();
    expect(screen.getAllByText(/\(simulated\)/).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: "Logs" })).toBeInTheDocument();
    expect(screen.getByText("mdxProfile")).toBeInTheDocument();
    expect(screen.getAllByText("Simulated").length).toBeGreaterThanOrEqual(2);
  });

  it("reports unknown runs as an error", async () => {
    renderApp("/runs/run-nope");
    expect(await screen.findByRole("alert")).toHaveTextContent(/does not exist/);
  });

  it("is reachable from the dashboard's run list", async () => {
    const { router } = renderApp("/");
    const table = await screen.findByRole("table", { name: "Recent runs" });
    const link = await within(table).findByRole("link", { name: "run-demo-0005" });
    link.click();
    await screen.findByRole("heading", { level: 1, name: /^Run run-demo-0005/ });
    expect(router.state.location.pathname).toBe("/runs/run-demo-0005");
  });
});
