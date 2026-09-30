import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render";

const ROUTE = "/simulation/mdp?project=lysozyme-demo&path=mdp%2Fnvt.mdp";

async function openRaw(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("tab", { name: "Raw" }));
  return screen.findByRole<HTMLTextAreaElement>("textbox", { name: "Raw MDP text" });
}

describe("MDP editor", () => {
  it("shows the stored MDP text byte-for-byte in the Raw view", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp(ROUTE);
    const stored = await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp");
    const raw = await openRaw(user);
    expect(raw.value).toBe(stored.text);
  });

  it("offers Basic, Advanced and Raw modes with Basic first", async () => {
    renderApp(ROUTE);
    await screen.findByRole("tab", { name: "Basic" });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Setup",
      "MDP editor",
      "Basic",
      "Advanced",
      "Raw",
    ]);
    expect(screen.getByRole("tab", { name: "Basic" })).toHaveAttribute("aria-selected", "true");
  });

  it("Basic edits change only the edited line and keep comments and spacing", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp(ROUTE);
    const original = (await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp")).text;

    const dt = await screen.findByLabelText("Time step (dt)");
    await user.clear(dt);
    await user.type(dt, "0.004");

    const raw = await openRaw(user);
    expect(raw.value).toBe(
      original.replace(
        "dt                      = 0.002          ; 2 fs",
        "dt                      = 0.004          ; 2 fs",
      ),
    );
  });

  it("Basic enum edits set and clear values", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    const thermostat = await screen.findByLabelText("Thermostat (tcoupl)");
    expect(thermostat).toHaveValue("v-rescale"); // matched case-insensitively
    await user.selectOptions(thermostat, "berendsen");
    const raw = await openRaw(user);
    expect(raw.value).toContain("tcoupl                  = berendsen");
    await user.click(screen.getByRole("tab", { name: "Basic" }));
    await user.selectOptions(await screen.findByLabelText("Thermostat (tcoupl)"), "");
    await user.click(screen.getByRole("tab", { name: "Raw" }));
    expect(
      (await screen.findByRole<HTMLTextAreaElement>("textbox", { name: "Raw MDP text" })).value,
    ).not.toMatch(/^tcoupl/m);
  });

  it("keeps an unknown enum value visible instead of dropping it", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    const raw = await openRaw(user);
    fireEvent.change(raw, {
      target: { value: raw.value.replace("V-rescale", "Exotic-thermostat") },
    });
    await user.click(screen.getByRole("tab", { name: "Basic" }));
    const thermostat = await screen.findByLabelText("Thermostat (tcoupl)");
    expect(thermostat).toHaveValue("Exotic-thermostat");
    expect(within(thermostat).getByText("Exotic-thermostat (custom)")).toBeInTheDocument();
  });

  it("preserves arbitrary raw text exactly when saved unchanged through Basic/Advanced", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp(ROUTE);
    const custom = "; keep me\r\n  dt=0.002   ;c\r\nnot valid\r\n\tnsteps\t=\t10";
    await runtime.writeMdp("lysozyme-demo", "mdp/nvt.mdp", custom);
    // Re-open so the editor loads the CRLF text.
    await user.click(await screen.findByRole("tab", { name: "Advanced" }));
    const table = await screen.findByRole("table", { name: "MDP parameters" });
    const dt = within(table).getByLabelText(/Value of dt/);
    await user.clear(dt);
    await user.type(dt, "0.004");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      expect((await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp")).text).toBe(
        "; keep me\r\n  dt=0.004   ;c\r\nnot valid\r\n\tnsteps\t=\t10",
      );
    });
  });

  it("keeps CRLF line endings when editing a Windows-authored file in the Raw view", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp("/simulation/mdp?project=lysozyme-demo&path=mdp%2Fnpt.mdp");
    const original = (await runtime.readMdp("lysozyme-demo", "mdp/npt.mdp")).text;
    const crlf = original.replaceAll("\n", "\r\n");
    await runtime.writeMdp("lysozyme-demo", "mdp/npt.mdp", crlf);
    // Switch files away and back so the editor re-reads the CRLF version.
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "MDP file" }),
      "mdp/nvt.mdp",
    );
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "MDP file" }),
      "mdp/npt.mdp",
    );

    const raw = await openRaw(user);
    // The DOM reports LF-only text; the editor must restore CRLF when state is updated.
    fireEvent.change(raw, {
      target: {
        value: raw.value.replace(
          "nsteps                  = 50000",
          "nsteps                  = 60000",
        ),
      },
    });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      const saved = (await runtime.readMdp("lysozyme-demo", "mdp/npt.mdp")).text;
      expect(saved).toBe(
        crlf.replace("nsteps                  = 50000", "nsteps                  = 60000"),
      );
      expect(saved.includes("\r\n")).toBe(true);
      expect(/(?<!\r)\n/.test(saved)).toBe(false);
    });
  });

  it("reports structural problems with line numbers while editing", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    const raw = await openRaw(user);
    fireEvent.change(raw, { target: { value: "dt = fast\ndt = 0.002\nbroken line\n" } });
    const problems = await screen.findByRole("list", { name: "MDP problems" });
    expect(within(problems).getByText(/'dt' expects a number/)).toBeInTheDocument();
    expect(within(problems).getByText(/'dt' is defined more than once/)).toBeInTheDocument();
    expect(within(problems).getByText(/Line is not a 'key = value'/)).toBeInTheDocument();
    expect(screen.getByText(/authoritative/i)).toBeInTheDocument();
  });

  it("tracks unsaved changes, saves through the runtime, and reverts", async () => {
    const user = userEvent.setup();
    const { runtime } = renderApp(ROUTE);
    const before = await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp");
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    const nsteps = await screen.findByLabelText("Number of steps (nsteps)");
    await user.clear(nsteps);
    await user.type(nsteps, "12345");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Revert" }));
    expect(screen.getByLabelText("Number of steps (nsteps)")).toHaveValue("50000");
    expect(screen.getByText("Saved")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Number of steps (nsteps)"));
    await user.type(screen.getByLabelText("Number of steps (nsteps)"), "12345");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      const after = await runtime.readMdp("lysozyme-demo", "mdp/nvt.mdp");
      expect(after.sha256).not.toBe(before.sha256);
      expect(after.text).toContain("nsteps                  = 12345");
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("Advanced mode lists every parameter, edits by line, adds and removes", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    await user.click(await screen.findByRole("tab", { name: "Advanced" }));
    const table = await screen.findByRole("table", { name: "MDP parameters" });
    expect(within(table).getByLabelText(/Value of integrator/)).toHaveValue("md");

    await user.type(screen.getByRole("textbox", { name: "Name" }), "nstcalcenergy");
    await user.type(screen.getByRole("textbox", { name: "Value" }), "100");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(within(table).getByLabelText(/Value of nstcalcenergy/)).toHaveValue("100");

    await user.click(within(table).getByRole("button", { name: /Remove nstcalcenergy/ }));
    expect(within(table).queryByLabelText(/Value of nstcalcenergy/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Raw" }));
    const raw = await screen.findByRole<HTMLTextAreaElement>("textbox", { name: "Raw MDP text" });
    expect(raw.value).not.toContain("nstcalcenergy");
  });

  it("rejects invalid parameter names in the Add form", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    await user.click(await screen.findByRole("tab", { name: "Advanced" }));
    await user.type(await screen.findByRole("textbox", { name: "Name" }), "bad name!");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(screen.getByText(/Use letters, digits/)).toBeInTheDocument();
  });

  it("lets the user pick another MDP file in the project", async () => {
    const user = userEvent.setup();
    renderApp(ROUTE);
    const file = await screen.findByRole("combobox", { name: "MDP file" });
    await user.selectOptions(file, "mdp/production.mdp");
    expect(await screen.findByLabelText("Number of steps (nsteps)")).toHaveValue("150000000");
  });
});
