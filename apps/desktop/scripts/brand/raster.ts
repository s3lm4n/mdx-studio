/**
 * Minimal, dependency-free rasteriser for the brand mark. Each pixel is supersampled; at every
 * sample the layer stack (plate, faces, edges, particle) is composited exactly, and samples are
 * averaged in premultiplied space. Output is deterministic on every platform: pure IEEE
 * arithmetic, no native image libraries.
 */
import type { MarkGeometry, Point } from "../../src/brand/mark";

export interface Rgba {
  width: number;
  height: number;
  /** Straight (non-premultiplied) RGBA, row-major. */
  data: Uint8Array;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (match?.[1] === undefined) throw new Error(`Unsupported colour: ${value}`);
  const n = Number.parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function insidePolygon(polygon: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a === undefined || b === undefined) continue;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segmentDistance(x: number, y: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}

function insideRoundedSquare(x: number, y: number, lo: number, hi: number, r: number): boolean {
  if (x < lo || x > hi || y < lo || y > hi) return false;
  const cx = Math.min(Math.max(x, lo + r), hi - r);
  const cy = Math.min(Math.max(y, lo + r), hi - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Premultiplied accumulator for one sample: composite `color` at `alpha` over what is there. */
class Sample {
  r = 0;
  g = 0;
  b = 0;
  a = 0;
  over(color: Rgb, alpha: number): void {
    this.r = color.r * alpha + this.r * (1 - alpha);
    this.g = color.g * alpha + this.g * (1 - alpha);
    this.b = color.b * alpha + this.b * (1 - alpha);
    this.a = alpha + this.a * (1 - alpha);
  }
}

export function rasterize(
  g: MarkGeometry,
  samples = g.size <= 64 ? 16 : g.size <= 256 ? 8 : 4,
): Rgba {
  const n = g.size;
  const out = new Uint8Array(n * n * 4);
  const step = 1 / samples;
  const total = samples * samples;
  const edge = parseHex(g.edgeColor);
  const faceColors = g.faces.map((face) => parseHex(face.fill));
  const particle = g.particle;
  const particleColor = particle === null ? null : parseHex(particle.fill);
  const plate = g.plate;
  const plateTop = plate === null ? null : parseHex(plate.fillTop);
  const plateBottom = plate === null ? null : parseHex(plate.fillBottom);
  const plateBorder = plate === null ? null : parseHex(plate.border);
  const halfLeg = g.legWidth / 2;
  const sample = new Sample();

  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      let r = 0;
      let gg = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        const y = py + (sy + 0.5) * step;
        for (let sx = 0; sx < samples; sx++) {
          const x = px + (sx + 0.5) * step;
          sample.r = sample.g = sample.b = sample.a = 0;

          if (plate !== null && plateTop !== null && plateBottom !== null && plateBorder !== null) {
            const lo = plate.inset;
            const hi = n - plate.inset;
            if (insideRoundedSquare(x, y, lo, hi, plate.radius)) {
              const t = (y - lo) / (hi - lo);
              sample.over(
                {
                  r: plateTop.r + (plateBottom.r - plateTop.r) * t,
                  g: plateTop.g + (plateBottom.g - plateTop.g) * t,
                  b: plateTop.b + (plateBottom.b - plateTop.b) * t,
                },
                1,
              );
              const w = plate.borderWidth;
              if (!insideRoundedSquare(x, y, lo + w, hi - w, plate.radius - w)) {
                sample.over(plateBorder, plate.borderOpacity);
              }
            }
          }

          const distance = Math.hypot(x - g.center.x, y - g.center.y);
          if (particle !== null && particleColor !== null && distance <= particle.radius) {
            sample.over(particleColor, 1);
          } else if (particle === null || distance > particle.clearance) {
            if (insidePolygon(g.hexagon, x, y)) {
              const face = g.faces.findIndex((f) => insidePolygon(f.polygon, x, y));
              const faceColor = faceColors[face];
              const faceInfo = g.faces[face];
              if (faceColor !== undefined && faceInfo !== undefined) {
                sample.over(faceColor, faceInfo.opacity);
              }
              const onRim = !insidePolygon(g.innerHexagon, x, y);
              const onLeg = g.legs.some(([p, q]) => segmentDistance(x, y, p, q) <= halfLeg);
              if (onRim || onLeg) sample.over(edge, 1);
            }
          }

          r += sample.r;
          gg += sample.g;
          b += sample.b;
          a += sample.a;
        }
      }
      const i = (py * n + px) * 4;
      const alpha = a / total;
      out[i] = alpha > 0 ? Math.round(r / a) : 0;
      out[i + 1] = alpha > 0 ? Math.round(gg / a) : 0;
      out[i + 2] = alpha > 0 ? Math.round(b / a) : 0;
      out[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: n, height: n, data: out };
}
