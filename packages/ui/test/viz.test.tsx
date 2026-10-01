import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CutoffRingsMotif,
  FilamentsMotif,
  Meter,
  ParticleFieldMotif,
  RadialGauge,
  RdfCurveMotif,
  StatusDot,
  TraceChart,
  TrajectoryRuler,
  UnitCellMotif,
  arcPath,
  cutoffNeighbours,
  gaugeGeometry,
  nearestIndex,
  niceTicks,
  particleField,
  rdfPath,
  rulerTicks,
  seededRandom,
  traceGeometry,
} from "../src";

describe("gauge geometry", () => {
  it("draws no value arc and no cap without a sample", () => {
    const g = gaugeGeometry(null, { size: 180 });
    expect(g.value).toBe("");
    expect(g.cap).toBeNull();
    expect(g.track).toMatch(/^M/);
  });

  it("clamps out-of-range fractions instead of overdrawing the dial", () => {
    expect(gaugeGeometry(1.7, { size: 180 }).value).toBe(gaugeGeometry(1, { size: 180 }).value);
    expect(gaugeGeometry(-0.2, { size: 180 }).value).toBe("");
  });

  it("has a neutral tick scale only: minors every 10 %, majors at 0 / 50 / 100 %", () => {
    const ticks = gaugeGeometry(0.5, { size: 180 }).ticks;
    expect(ticks).toHaveLength(11);
    expect(ticks.filter((t) => t.major).map((t) => t.fraction)).toEqual([0, 0.5, 1]);
  });

  it("returns an empty arc for a zero sweep", () => {
    expect(arcPath(0, 0, 10, 20, 20)).toBe("");
  });
});

describe("niceTicks", () => {
  it("covers the range with round steps", () => {
    expect(niceTicks(1692, 1718, 3)).toEqual([1690, 1700, 1710, 1720]);
  });

  it("handles constant and reversed ranges", () => {
    expect(niceTicks(5, 5).length).toBeGreaterThan(1);
    expect(niceTicks(10, 0, 2)).toEqual([0, 5, 10]);
    expect(niceTicks(Number.NaN, 1)).toEqual([]);
  });
});

describe("trace geometry", () => {
  it("returns null when there are no finite samples", () => {
    expect(traceGeometry([], { width: 100, height: 50 })).toBeNull();
    expect(traceGeometry([Number.NaN], { width: 100, height: 50 })).toBeNull();
  });

  it("breaks line and area at non-finite samples", () => {
    const g = traceGeometry([1, 2, Number.NaN, 3, 4], { width: 100, height: 50, yDomain: [0, 5] });
    expect(g?.line.match(/M/g)).toHaveLength(2);
    expect(g?.area.match(/Z/g)).toHaveLength(2);
    expect(g?.line).not.toContain("NaN");
  });

  it("snaps a fitted domain to nice ticks that contain the data", () => {
    const g = traceGeometry([1695, 1702, 1711], { width: 100, height: 50 });
    expect(g).not.toBeNull();
    expect(g?.min).toBeLessThanOrEqual(1695);
    expect(g?.max).toBeGreaterThanOrEqual(1711);
    expect(g?.ticks[0]).toBe(g?.min);
  });

  it("reports the latest finite sample", () => {
    const g = traceGeometry([1, 2, 3, Number.NaN], { width: 300, height: 50, yDomain: [0, 3] });
    expect(g?.last).toMatchObject({ index: 2, value: 3, x: 200, y: 0 });
  });

  it("maps pointer fractions to the nearest sample", () => {
    expect(nearestIndex(11, 0.52)).toBe(5);
    expect(nearestIndex(11, 2)).toBe(10);
    expect(nearestIndex(1, 0.5)).toBe(0);
  });

  it("lays out ruler ticks with majors", () => {
    const ticks = rulerTicks(8, 4);
    expect(ticks).toHaveLength(9);
    expect(ticks.filter((t) => t.major).map((t) => t.at)).toEqual([0, 0.5, 1]);
  });
});

describe("visualization components", () => {
  it("exposes a gauge as a meter with its value, or 'no data'", () => {
    const { rerender } = render(<RadialGauge label="Utilization" value={0.851} />);
    const meter = screen.getByRole("meter", { name: "Utilization" });
    expect(meter).toHaveAttribute("aria-valuenow", "85.1");
    rerender(<RadialGauge label="Utilization" value={null} />);
    expect(screen.getByRole("meter", { name: "Utilization" })).toHaveAttribute(
      "aria-valuetext",
      "no data",
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exposes a linear meter with its readout", () => {
    render(<Meter label="Queue occupancy" value={0.348} />);
    expect(screen.getByRole("meter", { name: "Queue occupancy" })).toHaveAttribute(
      "aria-valuenow",
      "34.8",
    );
    expect(screen.getByText("34.8 %")).toBeInTheDocument();
  });

  it("gives the trajectory ruler progressbar semantics", () => {
    render(<TrajectoryRuler label="Simulation" value={0.3499} axisLabels={["0", "300 ns"]} />);
    expect(screen.getByRole("progressbar", { name: "Simulation" })).toHaveAttribute(
      "aria-valuenow",
      "34.99",
    );
  });

  it("summarises a trace for assistive tech and marks the live edge only when live", () => {
    const { container, rerender } = render(
      <TraceChart title="Throughput" unit="ns/day" precision={0} values={[1700, 1710, 1705]} />,
    );
    expect(
      screen.getByRole("img", { name: /Throughput: latest 1705 ns\/day/ }),
    ).toBeInTheDocument();
    expect(container.querySelector(".mdx-trace__live")).toBeNull();
    rerender(<TraceChart title="Throughput" values={[1700, 1710, 1705]} live />);
    expect(container.querySelector(".mdx-trace__live")).not.toBeNull();
    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("shows an explicit empty state", () => {
    render(<TraceChart title="Throughput" values={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders a status dot as glyph plus text", () => {
    const { container } = render(<StatusDot tone="pass">Detected</StatusDot>);
    expect(screen.getByText("Detected")).toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });
});

describe("motifs", () => {
  it("are deterministic for a given seed and vary across seeds", () => {
    expect(particleField(3, { width: 200, height: 100 })).toEqual(
      particleField(3, { width: 200, height: 100 }),
    );
    expect(particleField(3, { width: 200, height: 100 })).not.toEqual(
      particleField(4, { width: 200, height: 100 }),
    );
    expect(cutoffNeighbours(9, 100, 40)).toEqual(cutoffNeighbours(9, 100, 40));
  });

  it("produce finite geometry", () => {
    const random = seededRandom(1);
    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(rdfPath(100, 50)).not.toContain("NaN");
    for (const p of particleField(1, { width: 300, height: 150 })) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });

  it("are hidden from assistive technology", () => {
    const { container } = render(
      <div>
        <UnitCellMotif />
        <ParticleFieldMotif />
        <CutoffRingsMotif />
        <RdfCurveMotif />
        <FilamentsMotif />
      </div>,
    );
    const svgs = container.querySelectorAll("svg.mdx-motif");
    expect(svgs).toHaveLength(5);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});
