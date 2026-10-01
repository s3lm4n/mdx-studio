/**
 * Deterministic generators for the decorative motifs (DESIGN_LANGUAGE.md §8). Same seed, same
 * output, on every host and every render: the motifs are part of the layout, not noise.
 */

/** Mulberry32: tiny, fast, deterministic PRNG in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Particle {
  x: number;
  y: number;
  r: number;
  /** Relative opacity in [0, 1]. */
  o: number;
}

export interface ParticleFieldOptions {
  width: number;
  height: number;
  spacing?: number;
}

/**
 * A thermalised lattice: a hexagonal grid displaced by a smooth flow field plus seeded jitter,
 * with dot size and opacity following a soft density ridge. Reads as a dotted mesh at a distance
 * and as a solvated particle system up close.
 */
export function particleField(seed: number, options: ParticleFieldOptions): Particle[] {
  const { width, height, spacing = 11 } = options;
  const random = seededRandom(seed);
  const phase = random() * Math.PI * 2;
  const rowHeight = spacing * 0.866;
  const particles: Particle[] = [];
  for (let row = 0; row * rowHeight <= height + rowHeight; row++) {
    for (let col = 0; col * spacing <= width + spacing; col++) {
      const bx = col * spacing + (row % 2 === 0 ? 0 : spacing / 2);
      const by = row * rowHeight;
      const u = bx / width;
      const v = by / height;
      // Smooth flow: a travelling wave bending the lattice.
      const wave = Math.sin(u * 5.2 + phase) * 0.5 + Math.sin(u * 2.3 - v * 3.1 + phase) * 0.5;
      const x = bx + (random() - 0.5) * spacing * 0.5;
      const y = by + wave * height * 0.09 + (random() - 0.5) * spacing * 0.5;
      // Density ridge following the wave; fades toward the edges.
      const ridge = Math.exp(-(((y / height - 0.5 - wave * 0.16) / 0.2) ** 2));
      const edge = Math.min(1, u * 4, (1 - u) * 4, v * 5, (1 - v) * 5);
      const density = ridge * Math.max(0, edge);
      if (density < 0.04 || random() > 0.35 + density * 0.65) continue;
      particles.push({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        r: Number((0.55 + density * 0.95).toFixed(2)),
        o: Number((0.25 + density * 0.75).toFixed(3)),
      });
    }
  }
  return particles;
}

export interface Neighbour {
  x: number;
  y: number;
  /** Inside the interaction cutoff. */
  inside: boolean;
}

/** Neighbour sites scattered around a central particle for the cutoff-sphere motif. */
export function cutoffNeighbours(
  seed: number,
  radius: number,
  cutoff: number,
  count = 26,
): Neighbour[] {
  const random = seededRandom(seed);
  const sites: Neighbour[] = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.32 + random() * 0.68);
    sites.push({
      x: Number((Math.cos(angle) * distance).toFixed(2)),
      y: Number((Math.sin(angle) * distance).toFixed(2)),
      inside: distance <= cutoff,
    });
  }
  return sites;
}

/**
 * Radial distribution function shape: excluded core, a sharp first coordination shell, then
 * damped oscillation towards 1. Illustrative only — never plotted as data.
 */
export function rdfPath(width: number, height: number, samples = 180): string {
  const rMax = 4;
  const g = (r: number) =>
    r < 0.92
      ? 0
      : 1 +
        2.1 * Math.exp(-(r - 1.02) * 1.9) * Math.cos(((r - 1.02) * Math.PI * 2) / 1.02) -
        (r < 1.02 ? (1.02 - r) * 30 : 0);
  const gMax = 3.3;
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const r = (i / samples) * rMax;
    const value = Math.max(0, g(r));
    const x = (r / rMax) * width;
    const y = height - (value / gMax) * height;
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${points.join(" L")}`;
}

/** Height of g(r) = 1 inside an `rdfPath` of the given height (for the reference line). */
export function rdfUnityY(height: number): number {
  return height - (1 / 3.3) * height;
}

/** A bundle of gently curving trajectory filaments across a width × height box. */
export function filaments(seed: number, width: number, height: number, count = 14): string[] {
  const random = seededRandom(seed);
  const paths: string[] = [];
  const bend = (random() - 0.5) * height * 0.5;
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const y0 = height * (0.25 + t * 0.5) + (random() - 0.5) * 8;
    const y3 = height * (0.1 + t * 0.8) + (random() - 0.5) * 12;
    const c1 = { x: width * 0.3, y: y0 + bend * (0.6 + random() * 0.4) };
    const c2 = { x: width * 0.68, y: y3 - bend * (0.5 + random() * 0.5) };
    paths.push(
      `M0 ${y0.toFixed(2)} C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${width} ${y3.toFixed(2)}`,
    );
  }
  return paths;
}
