import type { CSSProperties, ReactNode } from "react";
import { cutoffNeighbours, filaments, particleField, rdfPath, rdfUnityY } from "./generators";

/**
 * Decorative molecular-dynamics motifs (DESIGN_LANGUAGE.md §8). Static SVG, `currentColor`,
 * faint, `aria-hidden`. Place them through `Panel`'s `motif` slot (or an equivalent aria-hidden
 * layer), never behind tables, plots, forms or numbers that must be read precisely.
 */

export type MotifFade = "none" | "left" | "right" | "radial" | "bottom";
export type MotifStrength = "subtle" | "strong";

export interface MotifProps {
  className?: string;
  style?: CSSProperties;
  /** Which edge fades out (towards the content). */
  fade?: MotifFade;
  strength?: MotifStrength;
}

function MotifSvg({
  viewBox,
  className,
  style,
  fade = "none",
  strength = "subtle",
  children,
}: MotifProps & { viewBox: string; children: ReactNode }) {
  const classes = ["mdx-motif", `mdx-motif--fade-${fade}`, `mdx-motif--${strength}`];
  if (className !== undefined) classes.push(className);
  return (
    <svg
      className={classes.join(" ")}
      style={style}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  );
}

type Vec3 = readonly [number, number, number];

/** Oblique projection of a triclinic box (GROMACS box vectors a, b, c). */
function project([x, y, z]: Vec3): { x: number; y: number } {
  return { x: (x - y) * 0.866, y: (x + y) * 0.5 - z };
}

const BOX_A: Vec3 = [150, 0, 0];
const BOX_B: Vec3 = [28, 140, 0];
const BOX_C: Vec3 = [22, 18, 150];
const add = (...vs: Vec3[]): Vec3 =>
  vs.reduce<Vec3>((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);

const CORNERS: Vec3[] = [
  [0, 0, 0],
  BOX_A,
  BOX_B,
  BOX_C,
  add(BOX_A, BOX_B),
  add(BOX_A, BOX_C),
  add(BOX_B, BOX_C),
  add(BOX_A, BOX_B, BOX_C),
];
// Edges as corner-index pairs; the three meeting at the origin are the far (dashed) edges.
const FAR_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
];
const NEAR_EDGES: [number, number][] = [
  [1, 4],
  [1, 5],
  [2, 4],
  [2, 6],
  [3, 5],
  [3, 6],
  [4, 7],
  [5, 7],
  [6, 7],
];

/** Hairline periodic unit cell (triclinic box) with corner sites and one enclosed particle. */
export function UnitCellMotif(props: MotifProps) {
  const pts = CORNERS.map(project);
  const centre = project([100, 79, 75]);
  const edge = ([i, j]: [number, number]) => {
    const p = pts[i];
    const q = pts[j];
    return p === undefined || q === undefined
      ? ""
      : `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  return (
    <MotifSvg viewBox="-150 -175 320 330" {...props}>
      <g strokeWidth={1}>
        <path d={NEAR_EDGES.map(edge).join(" ")} />
        <path d={FAR_EDGES.map(edge).join(" ")} strokeDasharray="3 5" opacity={0.6} />
      </g>
      {/* Periodic image, offset along a: a fainter echo of the cell. */}
      <g transform="translate(130 75)" strokeWidth={0.8} opacity={0.35}>
        <path d={NEAR_EDGES.map(edge).join(" ")} strokeDasharray="2 6" />
      </g>
      <g fill="currentColor" stroke="none">
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.2} />
        ))}
        <circle cx={centre.x} cy={centre.y} r={4} />
      </g>
      <circle cx={centre.x} cy={centre.y} r={16} strokeWidth={0.8} strokeDasharray="1.5 3" />
    </MotifSvg>
  );
}

/** Thermalised particle lattice with a soft density ridge. */
export function ParticleFieldMotif({ seed = 7, ...props }: MotifProps & { seed?: number }) {
  const particles = particleField(seed, { width: 560, height: 300 });
  return (
    <MotifSvg viewBox="0 0 560 300" {...props}>
      <g fill="currentColor" stroke="none">
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={p.o} />
        ))}
      </g>
    </MotifSvg>
  );
}

/** Cutoff spheres (rc solid, rlist dashed) around one site, with pair lines inside the cutoff. */
export function CutoffRingsMotif({ seed = 11, ...props }: MotifProps & { seed?: number }) {
  const cutoff = 78;
  const sites = cutoffNeighbours(seed, 190, cutoff);
  return (
    <MotifSvg viewBox="-200 -200 400 400" {...props}>
      {[118, 150, 182].map((r) => (
        <circle key={r} r={r} strokeWidth={0.7} opacity={0.5} />
      ))}
      <circle r={cutoff} strokeWidth={1} />
      <circle r={cutoff + 16} strokeWidth={0.8} strokeDasharray="3 5" />
      <g strokeWidth={0.6} opacity={0.7}>
        {sites
          .filter((s) => s.inside)
          .map((s, i) => (
            <line key={i} x1={0} y1={0} x2={s.x} y2={s.y} />
          ))}
      </g>
      <g fill="currentColor" stroke="none">
        {sites.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.inside ? 2.6 : 1.8} opacity={s.inside ? 1 : 0.6} />
        ))}
        <circle r={4.5} />
      </g>
    </MotifSvg>
  );
}

/** Radial distribution function g(r): excluded core, first shell, damped oscillation to 1. */
export function RdfCurveMotif(props: MotifProps) {
  const width = 480;
  const height = 150;
  const unity = rdfUnityY(height);
  return (
    <MotifSvg viewBox={`0 -6 ${width} ${height + 18}`} {...props}>
      <line x1={0} x2={width} y1={unity} y2={unity} strokeWidth={0.8} strokeDasharray="2 5" />
      <line x1={0} x2={width} y1={height} y2={height} strokeWidth={0.8} opacity={0.6} />
      {Array.from({ length: 9 }, (_, i) => (
        <line
          key={i}
          x1={(i * width) / 8}
          x2={(i * width) / 8}
          y1={height}
          y2={height + (i % 2 === 0 ? 7 : 4)}
          strokeWidth={0.8}
          opacity={0.6}
        />
      ))}
      <path d={rdfPath(width, height)} strokeWidth={1.3} strokeLinejoin="round" />
    </MotifSvg>
  );
}

/** A bundle of faint trajectory streamlines. */
export function FilamentsMotif({ seed = 5, ...props }: MotifProps & { seed?: number }) {
  const paths = filaments(seed, 520, 220);
  return (
    <MotifSvg viewBox="0 0 520 220" {...props}>
      <g strokeWidth={0.8}>
        {paths.map((d, i) => (
          <path key={i} d={d} opacity={0.35 + (i % 4) * 0.18} />
        ))}
      </g>
    </MotifSvg>
  );
}
