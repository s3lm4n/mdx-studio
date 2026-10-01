import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ICNS_ENTRIES,
  ICO_SIZES,
  PNG_OUTPUTS,
  renderIcon,
} from "../../scripts/brand/build-brand-assets";
import { decodePng, readIcoDirectory } from "../../scripts/brand/encode";
import { insidePolygon, type Rgba } from "../../scripts/brand/raster";
import { BrandMark } from "../brand/BrandMark";
import { markGeometry, markSvg } from "../brand/mark";

const APP = resolve(__dirname, "../..");
const ICONS = resolve(APP, "src-tauri/icons");
const ASSET_TIMEOUT = 120_000;

/** Decodes a 32-bit BMP icon entry (BGRA bottom-up) written by encodeIco. */
function decodeBmpEntry(entry: Buffer, size: number): Rgba {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = 40 + ((size - 1 - y) * size + x) * 4;
      const d = (y * size + x) * 4;
      data[d] = entry[s + 2] ?? 0;
      data[d + 1] = entry[s + 1] ?? 0;
      data[d + 2] = entry[s] ?? 0;
      data[d + 3] = entry[s + 3] ?? 0;
    }
  }
  return { width: size, height: size, data };
}

function icoEntries(ico: Buffer): Map<number, Rgba> {
  const entries = new Map<number, Rgba>();
  const count = ico.readUInt16LE(4);
  for (let index = 0; index < count; index++) {
    const base = 6 + index * 16;
    const size = ico[base] === 0 ? 256 : (ico[base] ?? 0);
    const length = ico.readUInt32LE(base + 8);
    const offset = ico.readUInt32LE(base + 12);
    const payload = ico.subarray(offset, offset + length);
    entries.set(
      size,
      payload.readUInt32BE(0) === 0x89504e47 ? decodePng(payload) : decodeBmpEntry(payload, size),
    );
  }
  return entries;
}

function samePixels(actual: Rgba, expected: Rgba): boolean {
  return (
    actual.width === expected.width &&
    actual.height === expected.height &&
    Buffer.compare(Buffer.from(actual.data), Buffer.from(expected.data)) === 0
  );
}

describe("brand mark geometry", () => {
  it.each(ICO_SIZES)("snaps edges to whole pixels at %i px", (size) => {
    const g = markGeometry({ size, plate: true, pixelSnap: true });
    expect(Number.isInteger(g.rimWidth) && g.rimWidth >= 1).toBe(true);
    expect(Number.isInteger(g.legWidth) && g.legWidth >= 1).toBe(true);
    const right = g.hexagon[1]?.x ?? Number.NaN;
    const left = g.hexagon[5]?.x ?? Number.NaN;
    // Vertical silhouette edges sit on pixel boundaries, so 1 px rims render crisp.
    expect(Math.abs(right - Math.round(right))).toBeLessThan(1e-9);
    expect(Math.abs(left - Math.round(left))).toBeLessThan(1e-9);
    // The vertical leg is centred on a pixel column (odd width) or a pixel boundary (even width).
    const legLeft = g.center.x - g.legWidth / 2;
    expect(Math.abs(legLeft - Math.round(legLeft))).toBeLessThan(1e-9);
  });

  it("keeps the particle out of taskbar-sized icons, where it would blur into the edges", () => {
    for (const size of [16, 20, 24]) {
      expect(markGeometry({ size, plate: true, pixelSnap: true }).particle).toBeNull();
    }
    for (const size of [32, 48, 256]) {
      expect(markGeometry({ size, plate: true, pixelSnap: true }).particle).not.toBeNull();
    }
  });

  it("keeps faces inside the silhouette and the particle clear of the edges", () => {
    const g = markGeometry({ size: 256, plate: true });
    for (const face of g.faces) {
      for (const point of face.polygon) {
        expect(point.x).toBeGreaterThanOrEqual((g.hexagon[5]?.x ?? 0) - 1e-9);
        expect(point.x).toBeLessThanOrEqual((g.hexagon[1]?.x ?? 0) + 1e-9);
      }
    }
    expect(g.particle?.clearance).toBeGreaterThan(g.particle?.radius ?? Infinity);
    expect(insidePolygon(g.innerHexagon, g.center.x, g.center.y)).toBe(true);
  });

  it("draws a plate only for the app icon", () => {
    expect(markGeometry({ size: 64, plate: true }).plate).not.toBeNull();
    expect(markGeometry({ size: 26, plate: false }).plate).toBeNull();
  });
});

describe("generated brand assets are in sync with the geometry (run `pnpm --filter @mdx-studio/desktop brand:icons`)", () => {
  it(
    "Windows .ico carries every shell size and each entry matches a fresh render",
    () => {
      const ico = readFileSync(resolve(ICONS, "icon.ico"));
      expect(readIcoDirectory(ico)).toEqual(
        ICO_SIZES.map((size) => ({ size, kind: size >= 256 ? "png" : "bmp" })),
      );
      const entries = icoEntries(ico);
      for (const size of ICO_SIZES) {
        const entry = entries.get(size);
        expect(entry, `ico ${size}`).toBeDefined();
        if (entry !== undefined)
          expect(samePixels(entry, renderIcon(size)), `ico ${size}`).toBe(true);
      }
    },
    ASSET_TIMEOUT,
  );

  it(
    "PNG icons and the favicon match a fresh render",
    () => {
      for (const { file, size } of PNG_OUTPUTS) {
        const png = decodePng(readFileSync(resolve(ICONS, file)));
        expect(samePixels(png, renderIcon(size)), file).toBe(true);
      }
      const favicon = decodePng(readFileSync(resolve(APP, "public/favicon.png")));
      expect(samePixels(favicon, renderIcon(32)), "favicon").toBe(true);
    },
    ASSET_TIMEOUT,
  );

  it("macOS .icns carries the expected entries", () => {
    const icns = readFileSync(resolve(ICONS, "icon.icns"));
    expect(icns.toString("ascii", 0, 4)).toBe("icns");
    const types: string[] = [];
    for (let offset = 8; offset < icns.length; offset += icns.readUInt32BE(offset + 4)) {
      types.push(icns.toString("ascii", offset, offset + 4));
    }
    expect(types).toEqual(ICNS_ENTRIES.map((entry) => entry.type));
  });

  it("vector references match the geometry", () => {
    // A Windows checkout (core.autocrlf) may turn LF into CRLF; only line endings are normalised.
    const readSvg = (file: string) =>
      readFileSync(resolve(ICONS, file), "utf8").replace(/\r\n?/g, "\n");
    expect(readSvg("source/app-icon.svg")).toBe(markSvg({ size: 1024, plate: true }));
    expect(readSvg("source/mark.svg")).toBe(markSvg({ size: 256, plate: false }));
  });
});

describe("desktop shell icon wiring", () => {
  const conf = JSON.parse(readFileSync(resolve(APP, "src-tauri/tauri.conf.json"), "utf8")) as {
    bundle: { icon: string[] };
  };

  it("uses a window icon X11 will accept: the first PNG in bundle.icon is at most 256 px", () => {
    // Tauri uses the first PNG as the Linux window icon. GTK's X11 backend silently drops icons
    // larger than its property limit (262144 values), so a 512 px icon would show a generic one.
    const first = conf.bundle.icon.find((icon) => icon.endsWith(".png"));
    expect(first).toBe("icons/128x128@2x.png");
    const png = decodePng(readFileSync(resolve(APP, "src-tauri", first ?? "")));
    expect(png.width * png.height + 2).toBeLessThan(262_144);
    expect(png.width).toBeGreaterThanOrEqual(128);
  });

  it("ships the multi-size .ico that tauri-build embeds as the Windows app/taskbar icon", () => {
    expect(conf.bundle.icon.find((icon) => icon.endsWith(".ico"))).toBe("icons/icon.ico");
  });

  it("every referenced icon file exists", () => {
    for (const icon of conf.bundle.icon) {
      expect(() => readFileSync(resolve(APP, "src-tauri", icon)), icon).not.toThrow();
    }
  });
});

describe("in-app BrandMark", () => {
  it("renders the shared geometry as a decorative SVG", () => {
    const { getByTestId } = render(<BrandMark size={26} />);
    const svg = getByTestId("brand-mark");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll("polygon")).toHaveLength(3);
    expect(svg.querySelectorAll("line")).toHaveLength(3);
    expect(svg.querySelector("path")?.getAttribute("fill-rule")).toBe("evenodd");
    expect(svg.querySelectorAll("circle").length).toBeGreaterThanOrEqual(1);
  });

  it("gives each instance its own mask id", () => {
    const { getAllByTestId } = render(
      <>
        <BrandMark size={26} />
        <BrandMark size={52} />
      </>,
    );
    const ids = getAllByTestId("brand-mark").map((svg) => svg.querySelector("mask")?.id);
    expect(new Set(ids).size).toBe(2);
  });
});
