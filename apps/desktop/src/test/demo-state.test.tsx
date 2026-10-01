import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("demo state clarity", () => {
  it("a fresh launch is idle: no run in progress and no live marker", async () => {
    renderApp("/");
    const active = await screen.findByRole("region", { name: "Active run" });
    expect(await within(active).findByText("No run in progress.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Monitor" })).not.toHaveAttribute("data-live");
    expect(within(active).queryByText("Simulated run")).not.toBeInTheDocument();
  });

  it("names the active demo scenario in the always-visible ribbon, with a way to change it", () => {
    renderApp("/");
    const banner = screen.getByRole("banner");
    const scenario = within(banner).getByLabelText("Demo scenario");
    expect(scenario).toHaveTextContent("Idle");
    expect(within(scenario).getByTitle("Idle — no active run (default)")).toBeInTheDocument();
    expect(within(scenario).getByRole("link", { name: "Change" })).toHaveAttribute(
      "href",
      "/settings",
    );
    // The original disclosure text is unchanged.
    expect(within(banner).getByText(/Simulated runtime\./)).toBeInTheDocument();
  });

  it("offers the in-progress demo run from the idle Active-run card", async () => {
    renderApp("/");
    const active = await screen.findByRole("region", { name: "Active run" });
    expect(
      await within(active).findByRole("link", { name: /Preview a demo run in progress/ }),
    ).toHaveAttribute("href", "/settings");
  });

  it("marks a seeded demo run as simulated wherever it appears as a live run", async () => {
    renderApp("/", { scenario: "demo-run" });
    const active = await screen.findByRole("region", { name: "Active run" });
    expect(await within(active).findByText("Simulated run")).toBeInTheDocument();
    expect(within(active).getByText(/Nothing is executing/)).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByLabelText("Demo scenario")).toHaveTextContent(
      "Demo run in progress",
    );
  });

  it("switching to the demo-run scenario starts the seeded run; switching back returns to idle", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    const controls = await screen.findByRole("region", { name: "Demo runtime controls" });
    await user.selectOptions(
      within(controls).getByRole("combobox", { name: "Scenario" }),
      "demo-run",
    );
    await user.click(within(controls).getByRole("button", { name: /Apply scenario/ }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Monitor" })).toHaveAttribute("data-live", "true");
    });
    expect(within(screen.getByRole("banner")).getByLabelText("Demo scenario")).toHaveTextContent(
      "Demo run in progress",
    );

    await user.selectOptions(within(controls).getByRole("combobox", { name: "Scenario" }), "idle");
    await user.click(within(controls).getByRole("button", { name: /Apply scenario/ }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Monitor" })).not.toHaveAttribute("data-live");
    });
  });
});
