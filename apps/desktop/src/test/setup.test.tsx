import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runtimeError } from "@mdx-studio/runtime-client";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "./render";

async function startButton() {
  return screen.findByRole("button", { name: /^Start (simulation|validation run)/ });
}

describe("Simulation setup and pre-flight gating", () => {
  it("permits a native run on an idle system and skips device checks", async () => {
    renderApp("/simulation/setup", { scenario: "idle" });
    const preflight = await screen.findByRole("region", { name: "Pre-flight" });
    await within(preflight).findByText("Start permitted");
    expect(within(preflight).getAllByText("PASS").length).toBeGreaterThan(0);
    expect(within(preflight).getAllByText("SKIPPED").length).toBeGreaterThan(0);
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
  });

  it("disables Start and explains why when the runtime reports a critical FAIL (device busy)", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "demo-run" });
    await screen.findByRole("radiogroup", { name: "Run mode" });
    await user.click(screen.getByRole("radio", { name: "MDX" }));

    const preflight = screen.getByRole("region", { name: "Pre-flight" });
    await within(preflight).findByText("Start blocked");
    expect(await startButton()).toBeDisabled();
    expect(
      await screen.findByText(/Start is blocked by the runtime\..*Device ready/),
    ).toBeInTheDocument();
    expect(within(preflight).getAllByText("FAIL").length).toBeGreaterThan(0);
  });

  it("blocks MDX and validation but not native when the simulated device is missing", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "device-missing" });
    await screen.findByRole("radiogroup", { name: "Run mode" });

    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
    await user.click(screen.getByRole("radio", { name: "MDX" }));
    await waitFor(async () => {
      expect(await startButton()).toBeDisabled();
    });
    expect((await screen.findAllByText(/No MDX device detected/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("radio", { name: "Native vs MDX validation" }));
    await waitFor(async () => {
      expect(await startButton()).toBeDisabled();
    });
    await user.click(screen.getByRole("radio", { name: "Native GROMACS" }));
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
  });

  it("shows WARN but still permits start for a degraded device", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "degraded" });
    await screen.findByRole("radiogroup", { name: "Run mode" });
    await user.click(screen.getByRole("radio", { name: "MDX" }));
    const preflight = screen.getByRole("region", { name: "Pre-flight" });
    await within(preflight).findByText("Start permitted");
    expect(within(preflight).getAllByText("WARN").length).toBeGreaterThan(0);
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
  });

  it("validates form fields locally and disables Start until they are fixed", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "idle" });
    const threads = await screen.findByLabelText("Threads");
    await user.clear(threads);
    await user.type(threads, "abc");
    expect(await screen.findByText("Enter a whole number of threads.")).toBeInTheDocument();
    expect(await startButton()).toBeDisabled();
    await user.clear(threads);
    await user.type(threads, "4");
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
  });

  it("reveals the MDX and validation profile selectors only when relevant", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "idle" });
    await screen.findByLabelText("Threads");
    expect(screen.queryByLabelText("MDX profile")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "MDX" }));
    expect(await screen.findByLabelText("MDX profile")).toBeInTheDocument();
    expect(screen.queryByLabelText("Validation profile")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Native vs MDX validation" }));
    expect(await screen.findByLabelText("Validation profile")).toBeInTheDocument();
  });

  it("honours project, stage and mode from the query string", async () => {
    renderApp("/simulation/setup?project=membrane-demo&stage=NVT&mode=mdx", { scenario: "idle" });
    expect(await screen.findByLabelText("Stage")).toHaveValue("NVT");
    expect(screen.getByRole("radio", { name: "MDX" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue("membrane-demo");
  });

  it("updates the default MDP and output name when the stage changes", async () => {
    const user = userEvent.setup();
    renderApp("/simulation/setup", { scenario: "idle" });
    const stage = await screen.findByLabelText("Stage");
    await user.selectOptions(stage, "PRODUCTION");
    expect(screen.getByLabelText("MDP file")).toHaveValue("mdp/production.mdp");
    expect(screen.getByLabelText("Output name")).toHaveValue("production-001");
  });

  it("starts a simulated job and opens the monitor on it", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp("/simulation/setup", { scenario: "idle" });
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
    await user.click(await startButton());

    expect(await screen.findByRole("heading", { level: 1, name: /^Monitor/ })).toBeInTheDocument();
    const jobs = await runtime.listJobs();
    const created = jobs.find((job) => job.id.startsWith("job-mock-"));
    expect(created).toBeDefined();
    expect(created?.request.runMode).toBe("native");
    expect(
      await screen.findByText(created?.id ?? "", { selector: ".page-header__subtitle span" }),
    ).toBeInTheDocument();
  });

  it("shows the runtime's refusal when submit is rejected", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp("/simulation/setup", { scenario: "idle" });
    // Simulate the race where the runtime's own re-check disagrees with the last report.
    vi.spyOn(runtime, "submitJob").mockRejectedValueOnce(
      runtimeError("preflight-failed", "Pre-flight failed: device-ready.", [
        { path: "device-ready", message: "critical check failed" },
      ]),
    );
    await waitFor(async () => {
      expect(await startButton()).toBeEnabled();
    });
    await user.click(await startButton());
    expect(await screen.findByText("Start was refused")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Pre-flight failed: device-ready.");
    expect(alert).toHaveTextContent("device-ready: critical check failed");
    // Still on the setup page; nothing was started.
    expect(screen.queryByRole("heading", { level: 1, name: /^Monitor/ })).not.toBeInTheDocument();
  });
});
