/** PNG / ICO / ICNS writers (and a PNG reader for tests). Node built-ins only. */
import { deflateSync, inflateSync } from "node:zlib";
import type { Rgba } from "./raster";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

export function encodePng(image: Rgba): Buffer {
  const { width, height, data } = image;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * (width * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/** Decodes PNGs written by `encodePng` (8-bit RGBA, filter type 0). */
export function decodePng(png: Buffer): Rgba {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 6) throw new Error("Only 8-bit RGBA PNGs are supported");
    } else if (type === "IDAT") {
      idat.push(body);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    if (raw[y * (width * 4 + 1)] !== 0) throw new Error("Unsupported PNG filter");
    raw.copy(data, y * width * 4, y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1));
  }
  return { width, height, data };
}

/** 32-bit BMP (DIB) icon entry: BGRA bottom-up plus an all-zero AND mask (alpha is authoritative). */
function bmpEntry(image: Rgba): Buffer {
  const { width, height, data } = image;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(width * height * 4, 20);
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = ((height - 1 - y) * width + x) * 4;
      pixels[d] = data[s + 2] ?? 0;
      pixels[d + 1] = data[s + 1] ?? 0;
      pixels[d + 2] = data[s] ?? 0;
      pixels[d + 3] = data[s + 3] ?? 0;
    }
  }
  const maskRow = Math.ceil(width / 32) * 4;
  return Buffer.concat([header, pixels, Buffer.alloc(maskRow * height)]);
}

/**
 * Windows .ico. Sizes below 256 are stored as 32-bit BMP for the widest compatibility (resource
 * compilers, shell, older tooling); 256 is stored as PNG, as Windows expects.
 */
export function encodeIco(images: readonly Rgba[]): Buffer {
  const entries = images.map((image) => (image.width >= 256 ? encodePng(image) : bmpEntry(image)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(16 * images.length);
  let offset = 6 + directory.length;
  images.forEach((image, index) => {
    const entry = entries[index] ?? Buffer.alloc(0);
    const base = index * 16;
    directory[base] = image.width >= 256 ? 0 : image.width;
    directory[base + 1] = image.height >= 256 ? 0 : image.height;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(entry.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.length;
  });
  return Buffer.concat([header, directory, ...entries]);
}

/** Reads the directory of an .ico (sizes and payload kind) for tests. */
export function readIcoDirectory(ico: Buffer): { size: number; kind: "png" | "bmp" }[] {
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const base = 6 + index * 16;
    const offset = ico.readUInt32LE(base + 12);
    const isPng = ico.readUInt32BE(offset) === 0x89504e47;
    return { size: ico[base] === 0 ? 256 : (ico[base] ?? 0), kind: isPng ? "png" : "bmp" };
  });
}

/** macOS .icns with PNG payloads. */
export function encodeIcns(entries: readonly { type: string; png: Buffer }[]): Buffer {
  const parts = entries.map(({ type, png }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}
