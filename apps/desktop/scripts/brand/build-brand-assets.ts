/**
 * Renders every brand asset from the single geometry in `src/brand/mark.ts`.
 *
 *   pnpm --filter @mdx-studio/desktop brand:icons
 *
 * Writes the Tauri icon set (Windows .ico with per-DPI sizes, macOS .icns, Linux/window PNGs),
 * the web favicon, and vector SVG references. Each raster size is rendered directly (not
 * downscaled from a large master) so small sizes stay crisp.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { markGeometry, markSvg } from "../../src/brand/mark";
import { encodeIcns, encodeIco, encodePng } from "./encode";
import { rasterize, type Rgba } from "./raster";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const iconsDir = resolve(appRoot, "src-tauri/icons");

/** Windows shell sizes: 16/24/32 base sizes at 100, 125, 150 and 200 % scaling, plus 256. */
export const ICO_SIZES = [16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256] as const;

export const PNG_OUTPUTS = [
  { file: "32x32.png", size: 32 },
  { file: "128x128.png", size: 128 },
  { file: "128x128@2x.png", size: 256 },
  { file: "icon.png", size: 512 },
] as const;

export const ICNS_ENTRIES = [
  { type: "icp4", size: 16 },
  { type: "icp5", size: 32 },
  { type: "icp6", size: 64 },
  { type: "ic07", size: 128 },
  { type: "ic08", size: 256 },
  { type: "ic09", size: 512 },
  { type: "ic10", size: 1024 },
] as const;

export function renderIcon(size: number): Rgba {
  return rasterize(markGeometry({ size, plate: true, pixelSnap: true }));
}

function write(path: string, bytes: Buffer | string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  console.log(`wrote ${path.slice(appRoot.length + 1)}`);
}

function main(): void {
  const cache = new Map<number, Rgba>();
  const icon = (size: number): Rgba => {
    let image = cache.get(size);
    if (image === undefined) {
      image = renderIcon(size);
      cache.set(size, image);
    }
    return image;
  };

  write(resolve(iconsDir, "icon.ico"), encodeIco(ICO_SIZES.map(icon)));
  for (const { file, size } of PNG_OUTPUTS) write(resolve(iconsDir, file), encodePng(icon(size)));
  write(
    resolve(iconsDir, "icon.icns"),
    encodeIcns(ICNS_ENTRIES.map(({ type, size }) => ({ type, png: encodePng(icon(size)) }))),
  );
  write(resolve(appRoot, "public/favicon.png"), encodePng(icon(32)));
  write(resolve(iconsDir, "source/app-icon.svg"), markSvg({ size: 1024, plate: true }));
  write(resolve(iconsDir, "source/mark.svg"), markSvg({ size: 256, plate: false }));
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
