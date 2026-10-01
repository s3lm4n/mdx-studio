/**
 * MDX Studio brand mark: an isometric periodic unit cell (the GROMACS simulation box) drawn as a
 * bronze lattice, faces lit from the upper left, with a single particle at its centre.
 *
 * This module is the single source of truth for the mark's geometry and colours. It is pure (no
 * DOM, no Node APIs) so the in-app React mark and the build script that renders the Windows,
 * macOS and Linux icon files (`apps/desktop/scripts/brand`) draw exactly the same shape.
 *
 * Small-size rules: edges never drop below one device pixel and are snapped to the pixel grid for
 * raster output, and the particle is drawn only where the cell is large enough to keep it legible.
 */

export interface Point {
  x: number;
  y: number;
}

export type FaceId = "top" | "left" | "right";

export interface MarkFace {
  id: FaceId;
  fill: string;
  opacity: number;
  /** Rhombus between the centre and three outer vertices. */
  polygon: readonly Point[];
}

export interface MarkPlate {
  inset: number;
  radius: number;
  /** Vertical gradient, top to bottom. */
  fillTop: string;
  fillBottom: string;
  border: string;
  borderOpacity: number;
  borderWidth: number;
}

export interface MarkGeometry {
  size: number;
  center: Point;
  /** Circumradius of the hexagonal silhouette. */
  radius: number;
  /** Outer silhouette (pointy-top hexagon, clockwise from the top vertex). */
  hexagon: readonly Point[];
  /** Silhouette inset by the rim width; the rim is the band between the two hexagons. */
  innerHexagon: readonly Point[];
  rimWidth: number;
  /** Inner cell edges ("Y") from the centre to the upper-left, upper-right and bottom vertices. */
  legs: readonly (readonly [Point, Point])[];
  legWidth: number;
  edgeColor: string;
  faces: readonly MarkFace[];
  /** `null` at sizes where a particle would not survive rasterisation. */
  particle: { radius: number; clearance: number; fill: string } | null;
  plate: MarkPlate | null;
}

/** Bronze ramp (tokens.css --p-bronze-*, --p-champagne-400) on the obsidian plate. */
export const MARK_COLORS = {
  edge: "#D9AE74",
  top: "#E3C08F",
  left: "#C1843C",
  right: "#9A6630",
  particle: "#F7E9D2",
  plateTop: "#241E19",
  plateBottom: "#0E0C0A",
  plateBorder: "#E8D0B4",
} as const;

/** Face opacities: light falls on the top face, the right face sits in shadow. */
export const MARK_FACE_OPACITY: Readonly<Record<FaceId, number>> = {
  top: 0.32,
  left: 0.15,
  right: 0.06,
};

const COS30 = Math.cos(Math.PI / 6);
/** Rim width relative to the circumradius. */
const RIM_RATIO = 0.11;
/** Inner edges are slightly lighter than the rim. */
const LEG_RATIO = 0.8;
/** Particle radius relative to the circumradius. */
const PARTICLE_RATIO = 0.22;
/** Below this circumradius (in output pixels) the particle is omitted. */
const PARTICLE_MIN_RADIUS = 9;

export interface MarkOptions {
  /** Output size in pixels (square). */
  size: number;
  /** Draw the obsidian app-icon plate behind the cell. */
  plate: boolean;
  /**
   * Snap edges to the pixel grid for raster output. Leave off for vector use (the browser
   * rasterises at the device pixel ratio).
   */
  pixelSnap?: boolean;
}

function hexagonAt(cx: number, cy: number, r: number): Point[] {
  return [
    { x: cx, y: cy - r },
    { x: cx + COS30 * r, y: cy - r / 2 },
    { x: cx + COS30 * r, y: cy + r / 2 },
    { x: cx, y: cy + r },
    { x: cx - COS30 * r, y: cy + r / 2 },
    { x: cx - COS30 * r, y: cy - r / 2 },
  ];
}

export function markGeometry({ size, plate, pixelSnap = false }: MarkOptions): MarkGeometry {
  const inset = plate ? (pixelSnap && size < 32 ? 0 : size * 0.04) : 0;
  const box = size - 2 * inset;
  let radius = (box * (plate ? 0.66 : 0.94)) / 2;
  let rimWidth = RIM_RATIO * radius;
  let legWidth = LEG_RATIO * rimWidth;
  let cx = size / 2;
  const cy = size / 2;

  if (pixelSnap) {
    rimWidth = Math.max(1, Math.round(rimWidth));
    legWidth = Math.max(1, Math.round(legWidth));
    // An odd-width vertical leg is centred on a pixel column, an even one on a pixel boundary;
    // the silhouette's vertical edges then land exactly on pixel boundaries.
    const odd = legWidth % 2 === 1;
    cx = Math.floor(size / 2) + (odd ? 0.5 : 0);
    const halfWidth = odd
      ? Math.floor(COS30 * radius) + 0.5
      : Math.max(1, Math.round(COS30 * radius));
    radius = halfWidth / COS30;
  }

  const hexagon = hexagonAt(cx, cy, radius);
  // Insetting a regular hexagon by w reduces its apothem by w, i.e. its circumradius by w/cos30.
  const innerHexagon = hexagonAt(cx, cy, radius - rimWidth / COS30);
  const c: Point = { x: cx, y: cy };
  const [top, upperRight, lowerRight, bottom, lowerLeft, upperLeft] = hexagon as [
    Point,
    Point,
    Point,
    Point,
    Point,
    Point,
  ];
  const inner = innerHexagon as [Point, Point, Point, Point, Point, Point];

  const faces: MarkFace[] = [
    {
      id: "top",
      fill: MARK_COLORS.top,
      opacity: MARK_FACE_OPACITY.top,
      polygon: [top, upperRight, c, upperLeft],
    },
    {
      id: "left",
      fill: MARK_COLORS.left,
      opacity: MARK_FACE_OPACITY.left,
      polygon: [upperLeft, c, bottom, lowerLeft],
    },
    {
      id: "right",
      fill: MARK_COLORS.right,
      opacity: MARK_FACE_OPACITY.right,
      polygon: [c, upperRight, lowerRight, bottom],
    },
  ];

  const particleRadius = PARTICLE_RATIO * radius;
  return {
    size,
    center: c,
    radius,
    hexagon,
    innerHexagon,
    rimWidth,
    legs: [
      [c, inner[5]],
      [c, inner[1]],
      [c, inner[3]],
    ],
    legWidth,
    edgeColor: MARK_COLORS.edge,
    faces,
    particle:
      radius >= PARTICLE_MIN_RADIUS
        ? {
            radius: particleRadius,
            clearance: particleRadius + 0.9 * rimWidth,
            fill: MARK_COLORS.particle,
          }
        : null,
    plate: plate
      ? {
          inset,
          radius: box * 0.225,
          fillTop: MARK_COLORS.plateTop,
          fillBottom: MARK_COLORS.plateBottom,
          border: MARK_COLORS.plateBorder,
          borderOpacity: 0.14,
          borderWidth: Math.max(1, size / 128),
        }
      : null,
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function polygonPoints(polygon: readonly Point[]): string {
  return polygon.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
}

/** Even-odd path for the rim band (outer hexagon minus inner hexagon). */
export function rimPath(g: MarkGeometry): string {
  const ring = (points: readonly Point[]) =>
    `M${points.map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}Z`;
  return `${ring(g.hexagon)}${ring(g.innerHexagon)}`;
}

/** Standalone SVG document for the mark (design reference). */
export function markSvg(options: Omit<MarkOptions, "pixelSnap">): string {
  const g = markGeometry({ ...options, pixelSnap: false });
  const s = g.size;
  const defs: string[] = [];
  const art: string[] = [];
  const body: string[] = [];
  if (g.plate !== null) {
    const p = g.plate;
    const w = s - 2 * p.inset;
    defs.push(
      `<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.fillTop}"/><stop offset="1" stop-color="${p.fillBottom}"/></linearGradient>`,
    );
    body.push(
      `<rect x="${round(p.inset)}" y="${round(p.inset)}" width="${round(w)}" height="${round(w)}" rx="${round(p.radius)}" fill="url(#plate)"/>`,
      `<rect x="${round(p.inset + p.borderWidth / 2)}" y="${round(p.inset + p.borderWidth / 2)}" width="${round(w - p.borderWidth)}" height="${round(w - p.borderWidth)}" rx="${round(p.radius - p.borderWidth / 2)}" fill="none" stroke="${p.border}" stroke-opacity="${p.borderOpacity}" stroke-width="${round(p.borderWidth)}"/>`,
    );
  }
  for (const face of g.faces) {
    art.push(
      `<polygon points="${polygonPoints(face.polygon)}" fill="${face.fill}" fill-opacity="${face.opacity}"/>`,
    );
  }
  art.push(`<path d="${rimPath(g)}" fill="${g.edgeColor}" fill-rule="evenodd"/>`);
  for (const [a, b] of g.legs) {
    art.push(
      `<line x1="${round(a.x)}" y1="${round(a.y)}" x2="${round(b.x)}" y2="${round(b.y)}" stroke="${g.edgeColor}" stroke-width="${round(g.legWidth)}" stroke-linecap="round"/>`,
    );
  }
  if (g.particle === null) {
    body.push(...art);
  } else {
    defs.push(
      `<mask id="site"><rect width="${s}" height="${s}" fill="#fff"/><circle cx="${round(g.center.x)}" cy="${round(g.center.y)}" r="${round(g.particle.clearance)}" fill="#000"/></mask>`,
    );
    body.push(
      `<g mask="url(#site)">${art.join("")}</g>`,
      `<circle cx="${round(g.center.x)}" cy="${round(g.center.y)}" r="${round(g.particle.radius)}" fill="${g.particle.fill}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs>${defs.join("")}</defs>${body.join("")}</svg>\n`;
}
