import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  DataTable,
  Field,
  LineChart,
  MetricTile,
  OriginBadge,
  Panel,
  ProgressBar,
  SegmentedControl,
  StateStrip,
  StatusPill,
  Tabs,
  clampFraction,
  computeChartGeometry,
} from "../src";

describe("status and origin badges", () => {
  it.each(["PASS", "WARN", "FAIL", "SKIPPED"] as const)(
    "renders the %s label as text, not just colour",
    (status) => {
      render(<StatusPill status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it("labels simulated data explicitly", () => {
    render(<OriginBadge origin="simulated" />);
    const badge = screen.getByText("Simulated");
    expect(badge).toBeInTheDocument();
    expect(badge.closest(".mdx-badge")).toHaveAttribute("title", expect.stringContaining("mock"));
  });

  it("labels measured data distinctly", () => {
    render(<OriginBadge origin="measured" />);
    expect(screen.getByText("Measured")).toBeInTheDocument();
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
  });

  it("hides decorative glyphs from assistive tech", () => {
    const { container } = render(<Badge tone="pass">OK</Badge>);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});

describe("ProgressBar", () => {
  it("exposes progressbar semantics", () => {
    render(<ProgressBar value={0.3499} label="Simulation progress" />);
    const bar = screen.getByRole("progressbar", { name: "Simulation progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "34.99");
    expect(screen.getByText("34.99 %")).toBeInTheDocument();
  });

  it.each([
    [-1, 0],
    [2, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampFraction(input)).toBe(expected);
  });
});

describe("LineChart", () => {
  it("renders a path per series with the latest value", () => {
    const { container } = render(
      <LineChart title="Temperature" unit="K" series={[{ label: "T", values: [299, 300, 301] }]} />,
    );
    expect(screen.getByText("301.0")).toBeInTheDocument();
    expect(container.querySelectorAll("path")).toHaveLength(1);
    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/^M0\.00 /);
  });

  it("shows an explicit empty state rather than an empty plot", () => {
    render(<LineChart title="Empty" series={[{ label: "x", values: [] }]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("handles constant series without dividing by zero", () => {
    const geometry = computeChartGeometry([{ label: "c", values: [5, 5, 5] }], 100);
    expect(geometry).not.toBeNull();
    expect(geometry?.max).toBeGreaterThan(geometry?.min ?? 0);
    expect(geometry?.paths[0]).not.toContain("NaN");
  });

  it("breaks the line at non-finite samples instead of emitting NaN", () => {
    const geometry = computeChartGeometry(
      [{ label: "g", values: [1, Number.NaN, 3, 4] }],
      100,
      [0, 10],
    );
    const d = geometry?.paths[0] ?? "";
    expect(d).not.toContain("NaN");
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it("honours a fixed y-domain", () => {
    const geometry = computeChartGeometry([{ label: "u", values: [0.2, 0.4] }], 100, [0, 1]);
    expect(geometry).toMatchObject({ min: 0, max: 1 });
  });

  it("renders a legend for multi-series charts", () => {
    render(
      <LineChart
        title="Energies"
        series={[
          { label: "Potential", values: [1, 2] },
          { label: "Total", values: [2, 3] },
        ]}
      />,
    );
    expect(screen.getByText("Potential")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});

describe("Tabs", () => {
  function Harness() {
    const [selected, setSelected] = useState<"a" | "b" | "c">("a");
    return (
      <Tabs
        ariaLabel="Modes"
        idPrefix="t"
        selected={selected}
        onSelect={setSelected}
        tabs={[
          { id: "a", label: "Basic" },
          { id: "b", label: "Advanced" },
          { id: "c", label: "Raw" },
        ]}
      />
    );
  }

  it("selects with click and supports arrow/Home/End keys with roving tabindex", () => {
    render(<Harness />);
    const basic = screen.getByRole("tab", { name: "Basic" });
    const advanced = screen.getByRole("tab", { name: "Advanced" });
    const raw = screen.getByRole("tab", { name: "Raw" });
    expect(basic).toHaveAttribute("aria-selected", "true");
    expect(advanced).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(basic, { key: "ArrowRight" });
    expect(advanced).toHaveAttribute("aria-selected", "true");
    expect(advanced).toHaveFocus();

    fireEvent.keyDown(advanced, { key: "End" });
    expect(raw).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(raw, { key: "ArrowRight" });
    expect(basic).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(basic, { key: "ArrowLeft" });
    expect(raw).toHaveAttribute("aria-selected", "true");
    fireEvent.click(advanced);
    expect(advanced).toHaveAttribute("aria-selected", "true");
  });
});

describe("SegmentedControl", () => {
  it("reports selection and respects disabled options", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        ariaLabel="Run mode"
        value="native"
        onChange={onChange}
        options={[
          { id: "native", label: "Native" },
          { id: "mdx", label: "MDX", disabled: true },
          { id: "validation", label: "Validation" },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Native" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "MDX" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Validation" }));
    expect(onChange).toHaveBeenCalledWith("validation");
  });
});

describe("Field", () => {
  it("associates label, help and error with the control", () => {
    render(
      <Field label="Threads" help="CPU threads" error="must be at least 1">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Threads");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("must be at least 1");
  });
});

describe("Panel, MetricTile, DataTable, StateStrip, Button", () => {
  it("names a panel region by its title", () => {
    render(
      <Panel title="Runtime status">
        <p>body</p>
      </Panel>,
    );
    expect(screen.getByRole("region", { name: "Runtime status" })).toBeInTheDocument();
  });

  it("renders a metric with its unit", () => {
    render(<MetricTile label="Throughput" value="1700" unit="ns/day" />);
    expect(screen.getByText("Throughput")).toBeInTheDocument();
    expect(screen.getByText("ns/day")).toBeInTheDocument();
  });

  it("renders table rows and an empty message", () => {
    const columns = [{ key: "n", header: "Name", render: (row: { n: string }) => row.n }];
    const { rerender } = render(
      <DataTable
        caption="Things"
        columns={columns}
        rows={[{ n: "alpha" }]}
        getRowKey={(r) => r.n}
      />,
    );
    expect(screen.getByRole("table", { name: "Things" })).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    rerender(
      <DataTable
        caption="Things"
        columns={columns}
        rows={[]}
        getRowKey={(r: { n: string }) => r.n}
        emptyMessage="No things"
      />,
    );
    expect(screen.getByText("No things")).toBeInTheDocument();
  });

  it("marks the current state in a lifecycle strip", () => {
    render(
      <StateStrip ariaLabel="Job lifecycle" states={["CREATED", "RUNNING"]} current="RUNNING" />,
    );
    expect(screen.getByText("RUNNING")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("CREATED")).not.toHaveAttribute("aria-current");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Start
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
