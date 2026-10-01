import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mdxRequestFor, nativeRequestFor } from "./requests";
import { renderApp } from "./render";

describe("Monitor — demo run in progress", () => {
  it("shows the reference run in the Simulation hero, marked simulated at first glance", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    const hero = await screen.findByRole("region", { name: "Simulation" });
    await within(hero).findByText(/104\.962/);
    expect(within(hero).getByText(/\/ 300\.000 ns/)).toBeInTheDocument();
    expect(within(hero).getByText(/34\.99 %/)).toBeInTheDocument();
    expect(within(hero).getByText("Simulated run")).toBeInTheDocument();
    expect(within(hero).getByRole("progressbar", { name: "Simulation progress" })).toHaveAttribute(
      "aria-valuenow",
      "34.99",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Simulated");
  });

  it("derives wall-clock elapsed time from runtime timestamps only", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    const hero = await screen.findByRole("region", { name: "Simulation" });
    // 104.962 ns at 1700 ns/day since the runtime's start record ≈ 1 h 28 min.
    expect(await within(hero).findByText("1 h 28 min")).toBeInTheDocument();
    expect(within(hero).getByText("Elapsed (wall)")).toBeInTheDocument();
  });

  it("composes the instrument panels, each carrying its simulated origin", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    for (const name of [
      "Throughput",
      "Thermodynamics",
      "MDX pipeline",
      "Accelerator hardware",
      "Host",
    ]) {
      const region = await screen.findByRole("region", { name });
      expect((await within(region).findAllByText("Simulated")).length, name).toBeGreaterThan(0);
    }
    const thermo = screen.getByRole("region", { name: "Thermodynamics" });
    for (const tile of ["Temperature", "Pressure", "Potential energy", "Total energy"]) {
      expect(within(thermo).getByRole("region", { name: tile })).toBeInTheDocument();
    }
    expect(within(thermo).getByText(/Neighbor-list rebuilds/)).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /history: latest/ }).length).toBeGreaterThanOrEqual(
      9,
    );
  });

  it("labels client-side window statistics as such", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    const temperature = await screen.findByRole("region", { name: "Temperature" });
    expect(within(temperature).getByText(/^window mean .* · σ /)).toBeInTheDocument();
    const throughput = screen.getByRole("region", { name: "Throughput" });
    expect(within(throughput).getByLabelText("Throughput window range")).toBeInTheDocument();
  });

  it("renders bounded MDX fractions as meters on neutral scales", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    const mdx = await screen.findByRole("region", { name: "MDX pipeline" });
    const dial = within(mdx).getByRole("meter", { name: "Utilization" });
    expect(Number(dial.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    expect(within(mdx).getByRole("meter", { name: "Queue occupancy" })).toBeInTheDocument();
    expect(within(mdx).getByRole("meter", { name: "Backpressure" })).toBeInTheDocument();
    expect(within(mdx).getByText("Gpairs/s", { selector: ".mon-unit" })).toBeInTheDocument();
    expect(within(mdx).getByText("ARMED")).toBeInTheDocument();
  });

  it("shows host load and states that GPU telemetry is not reported", async () => {
    renderApp("/monitor", { scenario: "demo-run" });
    const host = await screen.findByRole("region", { name: "Host" });
    expect(within(host).getByRole("meter", { name: "CPU" })).toBeInTheDocument();
    expect(within(host).getByRole("meter", { name: "Memory" })).toHaveAttribute(
      "aria-valuetext",
      "21.5 GiB",
    );
    expect(within(host).getByText(/Not reported by the runtime yet/)).toBeInTheDocument();
  });

  it("advances with live telemetry", async () => {
    const { tick } = renderApp("/monitor", { scenario: "demo-run" });
    const hero = await screen.findByRole("region", { name: "Simulation" });
    await within(hero).findByText(/104\.962/);
    await tick(5);
    await waitFor(() => {
      expect(within(hero).queryByText(/104\.962/)).not.toBeInTheDocument();
    });
    expect(within(hero).getByText(/105\.0\d\d/)).toBeInTheDocument();
  });

  it("offers Stop only when the runtime allows it, with a confirmation step", async () => {
    const user = userEvent.setup();
    renderApp("/monitor", { scenario: "demo-run" });
    await user.click(await screen.findByRole("button", { name: "Stop run" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Stop run" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop run" }));
    await user.click(screen.getByRole("button", { name: "Confirm stop" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("ABORTED").length).toBeGreaterThan(0);
    const log = screen.getByRole("list", { name: "Job events" });
    expect(await within(log).findByText(/Run aborted by request/)).toBeInTheDocument();
  });

  it("shows a runtime-reported failure after a simulated device fault", async () => {
    const { runtime, tick } = renderApp("/monitor", { scenario: "demo-run" });
    await screen.findByRole("button", { name: "Stop run" });
    runtime.injectDeviceFault();
    await tick(1);
    const alert = await screen.findByText("Run failed");
    expect(alert.closest("[role='alert']")).toHaveTextContent(/Device fault/);
    expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
  });
});

describe("Monitor — honest idle and history", () => {
  it("does not present a finished run as current when nothing is live", async () => {
    renderApp("/monitor");
    expect(await screen.findByText("No run in progress.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Run" })).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Simulation" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Preview a demo run in progress/ })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("lets a past run be inspected from the picker, with its recorded events", async () => {
    const user = userEvent.setup();
    renderApp("/monitor");
    await user.selectOptions(await screen.findByRole("combobox", { name: "Run" }), "job-demo-0002");
    const log = await screen.findByRole("list", { name: "Job events" });
    expect(within(log).getByText(/CREATED → VALIDATING/)).toBeInTheDocument();
    expect(within(log).getByText(/RUNNING → COMPLETED/)).toBeInTheDocument();
  });

  it("says no telemetry was recorded for a finished run instead of waiting for it", async () => {
    renderApp("/monitor?job=job-demo-0001");
    const hero = await screen.findByRole("region", { name: "Simulation" });
    expect(within(hero).getByText(/No telemetry was recorded/)).toBeInTheDocument();
    expect(within(hero).getByText("COMPLETED", { selector: "li" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
  });

  it("shows the job lifecycle while a new run spins up", async () => {
    const { runtime } = renderApp("/monitor");
    const job = await runtime.submitJob(mdxRequestFor("spin-up"));
    const hero = await screen.findByRole("region", { name: "Simulation" });
    expect(within(hero).getByText(`Waiting for telemetry (${job.state}).`)).toBeInTheDocument();
    expect(within(hero).getByRole("list", { name: "Job lifecycle" })).toBeInTheDocument();
  });

  it("omits MDX and hardware instruments for a native run and says why", async () => {
    const { runtime, tick } = renderApp("/monitor");
    await runtime.submitJob(nativeRequestFor("native-monitor"));
    await tick(6);
    expect(await screen.findByText(/Native GROMACS run/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Thermodynamics" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "MDX pipeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Accelerator hardware" })).not.toBeInTheDocument();
  });
});
