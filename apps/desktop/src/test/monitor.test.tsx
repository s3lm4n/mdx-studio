import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

describe("Live monitor", () => {
  it("shows the documented demo reference run, clearly marked simulated", async () => {
    renderApp("/monitor");
    const simulation = await screen.findByRole("region", { name: "Simulation" });
    await within(simulation).findByText(/104\.962 \/ 300\.000 ns/);
    expect(within(simulation).getByText(/34\.99 %/)).toBeInTheDocument();
    expect(within(simulation).getByText("ns/day")).toBeInTheDocument();
    expect(within(simulation).getByText("Simulated")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Simulated");
  });

  it("renders GROMACS, MDX, hardware and host sections with rolling charts", async () => {
    renderApp("/monitor");
    for (const name of ["GROMACS", "MDX", "Hardware", "Host"]) {
      const region = await screen.findByRole("region", { name });
      expect(within(region).getByText("Simulated")).toBeInTheDocument();
    }
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("Utilization")).toBeInTheDocument();
    expect(screen.getByText("Pair throughput")).toBeInTheDocument();
    expect(screen.getByText("Queue occupancy")).toBeInTheDocument();
    expect(screen.getByText("Backpressure")).toBeInTheDocument();
    expect(screen.getByText("Device temperature")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /history$/ }).length).toBeGreaterThanOrEqual(8);
  });

  it("advances with live telemetry", async () => {
    const { tick } = renderApp("/monitor");
    const simulation = await screen.findByRole("region", { name: "Simulation" });
    await within(simulation).findByText(/104\.962 \/ 300\.000 ns/);
    await tick(5);
    await waitFor(() => {
      expect(within(simulation).queryByText(/104\.962 \/ 300\.000 ns/)).not.toBeInTheDocument();
    });
    expect(within(simulation).getByText(/105\.0\d\d \/ 300\.000 ns/)).toBeInTheDocument();
  });

  it("offers Stop only when the runtime allows it, with a confirmation step", async () => {
    const user = userEvent.setup();
    renderApp("/monitor");
    const stop = await screen.findByRole("button", { name: "Stop run" });
    await user.click(stop);
    expect(screen.getByRole("button", { name: "Confirm stop" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Stop run" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop run" }));
    await user.click(screen.getByRole("button", { name: "Confirm stop" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("ABORTED").length).toBeGreaterThan(0);
    expect(await screen.findByText(/Run aborted by request/)).toBeInTheDocument();
  });

  it("does not offer Stop for a finished run", async () => {
    renderApp("/monitor?job=job-demo-0001", { scenario: "idle" });
    await screen.findByRole("heading", { level: 1, name: /^Monitor/ });
    await waitFor(() => {
      expect(screen.getAllByText("COMPLETED").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
  });

  it("shows a runtime-reported failure after a simulated device fault", async () => {
    const { runtime, tick } = renderApp("/monitor");
    await screen.findByRole("button", { name: "Stop run" });
    runtime.injectDeviceFault();
    await tick(1);
    const alert = await screen.findByText("Run failed");
    expect(alert.closest("[role='alert']")).toHaveTextContent(/Device fault/);
    expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
  });

  it("switches between runs and lists recorded events", async () => {
    const user = userEvent.setup();
    renderApp("/monitor", { scenario: "idle" });
    const select = await screen.findByRole("combobox", { name: "Run" });
    await user.selectOptions(select, "job-demo-0002");
    const log = await screen.findByRole("list", { name: "Job events" });
    expect(within(log).getByText(/CREATED → VALIDATING/)).toBeInTheDocument();
    expect(within(log).getByText(/RUNNING → COMPLETED/)).toBeInTheDocument();
  });

  it("hides MDX and hardware sections for native runs", async () => {
    renderApp("/monitor?job=job-demo-0002", { scenario: "idle" });
    await screen.findByRole("region", { name: "GROMACS" }).catch(() => undefined);
    await screen.findByRole("heading", { level: 1, name: /^Monitor/ });
    await waitFor(() => {
      expect(screen.getByText(/Waiting for telemetry/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("region", { name: "MDX" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Hardware" })).not.toBeInTheDocument();
  });
});
