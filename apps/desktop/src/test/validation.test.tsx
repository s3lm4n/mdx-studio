import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("Validation view", () => {
  it("renders profile gates and tolerances supplied by the runtime", async () => {
    renderApp("/validation");
    const gates = await screen.findByRole("table", { name: "Gates in Demo placeholder profile" });
    const rows = within(gates).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
      "force",
      "energy",
      "virial",
      "position",
      "shift-force",
    ]);
    expect(within(gates).getAllByText("1.00e-3")).toHaveLength(5);
    expect(screen.getByText(/Tolerances come from the runtime/)).toBeInTheDocument();
  });

  it("labels placeholder profiles so demo numbers are never mistaken for qualified tolerances", async () => {
    renderApp("/validation");
    expect(
      await screen.findByText(/Placeholder values — not qualified tolerances/),
    ).toBeInTheDocument();
    expect(screen.getByText("PLACEHOLDER")).toBeInTheDocument();
  });

  it("shows runtime-decided pass results per gate", async () => {
    renderApp("/validation");
    const table = await screen.findByRole("table", { name: /Validation gates for job-demo-0005/ });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(within(row).getByText("PASS")).toBeInTheDocument();
    const result = screen.getByRole("region", { name: /^Result/ });
    expect(within(result).getByText("Simulated")).toBeInTheDocument();
  });

  it("renders a failing gate from the runtime without recomputing it", async () => {
    renderApp("/validation", { scenario: "validation-mismatch" });
    const table = await screen.findByRole("table", { name: /Validation gates for job-demo-0005/ });
    const virial = within(table).getByRole("row", { name: /virial/ });
    expect(within(virial).getByText("FAIL")).toBeInTheDocument();
    const force = within(table).getByRole("row", { name: /^force/ });
    expect(within(force).getByText("PASS")).toBeInTheDocument();
    const region = screen.getByRole("region", { name: /^Result/ });
    expect(within(region).getAllByText("FAIL").length).toBeGreaterThanOrEqual(2); // overall + gate
  });

  it("links to a validation-mode run setup", async () => {
    renderApp("/validation");
    expect(await screen.findByRole("link", { name: "New validation run" })).toHaveAttribute(
      "href",
      "/simulation/setup?mode=validation",
    );
  });
});
