import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("Devices", () => {
  it("states plainly that no physical hardware exists and labels the device simulated", async () => {
    renderApp("/devices");
    expect(await screen.findByText("No physical MDX hardware")).toBeInTheDocument();
    const status = await screen.findByRole("region", { name: "Status" });
    expect(within(status).getByText("Simulated")).toBeInTheDocument();
    expect(within(status).getAllByText("RUNNING").length).toBeGreaterThan(0);
  });

  it("highlights the current device state in the lifecycle strip", async () => {
    renderApp("/devices", { scenario: "idle" });
    const strip = await screen.findByRole("list", { name: "Device lifecycle" });
    await waitFor(() => {
      expect(within(strip).getByText("READY")).toHaveAttribute("aria-current", "true");
    });
    expect(within(strip).getByText("ERROR")).not.toHaveAttribute("aria-current");
  });

  it("shows a disconnected device without inventing identity or telemetry", async () => {
    renderApp("/devices", { scenario: "device-missing" });
    expect(await screen.findByText("No device connected.")).toBeInTheDocument();
    const snapshot = screen.getByRole("region", { name: "Telemetry snapshot" });
    expect(within(snapshot).getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("shows a recorded simulated fault", async () => {
    renderApp("/devices", { scenario: "device-fault" });
    expect(await screen.findByText(/Last error: MDX_SIM_FAULT/)).toBeInTheDocument();
  });

  it("documents the lifecycle table from the runtime state machine", async () => {
    renderApp("/devices");
    const table = await screen.findByRole("table", { name: "Device state transitions" });
    expect(within(table).getByText(/job-started → RUNNING/)).toBeInTheDocument();
    expect(within(table).getByText(/abort-complete → READY/)).toBeInTheDocument();
  });
});

describe("Settings", () => {
  it("states the honest project status", async () => {
    renderApp("/settings");
    expect(
      await screen.findByText(
        "MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Not implemented (Phase 2)")).toBeInTheDocument();
  });

  it("applies and persists the theme preference", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    await user.click(await screen.findByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset["theme"]).toBe("light");
    expect(window.localStorage.getItem("mdx-studio.theme")).toBe("light");
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset["theme"]).toBe("dark");
  });

  it("reports browser-shell app info outside Tauri", async () => {
    renderApp("/settings");
    expect(await screen.findByText("Browser (development)")).toBeInTheDocument();
    expect(screen.getByText("MDX Studio 0.0.0-test")).toBeInTheDocument();
  });

  it("labels demo controls as mock-only", async () => {
    renderApp("/settings");
    const controls = await screen.findByRole("region", { name: "Demo runtime controls" });
    expect(within(controls).getByText("Mock controls")).toBeInTheDocument();
  });

  it("switches scenario by resetting the demo runtime", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    const controls = await screen.findByRole("region", { name: "Demo runtime controls" });
    await user.selectOptions(
      within(controls).getByRole("combobox", { name: "Scenario" }),
      "device-missing",
    );
    await user.click(within(controls).getByRole("button", { name: /Apply scenario/ }));
    expect(await within(controls).findByText(/reset to "Device missing/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Devices" }));
    await waitFor(() => {
      expect(screen.getAllByText("DISCONNECTED").length).toBeGreaterThan(0);
    });
    expect(await screen.findByText("No device connected.")).toBeInTheDocument();
  });

  it("injects a simulated fault, then reports that reset applies only in ERROR/DISCONNECTED", async () => {
    const user = userEvent.setup();
    renderApp("/settings", { scenario: "idle" });
    const controls = await screen.findByRole("region", { name: "Demo runtime controls" });

    await user.click(within(controls).getByRole("button", { name: "Reset device" }));
    expect(await within(controls).findByText("Control not applicable")).toBeInTheDocument();

    await user.click(within(controls).getByRole("button", { name: "Inject device fault" }));
    expect(
      await within(controls).findByText(/Simulated device fault injected/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Devices" }));
    await waitFor(() => {
      expect(screen.getAllByText("ERROR").length).toBeGreaterThan(0);
    });
  });
});
