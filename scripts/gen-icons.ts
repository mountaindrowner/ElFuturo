/**
 * Generates PWA icons (navy field, gold cross) as PNGs with no image dependencies.
 * Writes public/icons/icon-192.png, icon-512.png, apple-touch-icon.png (180).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const NAVY = [0x0f, 0x1e, 0x3d];
const GOLD = [0xc8, 0xa0, 0x4b];

function crc32(buf: Uint8Array): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, Buffer.from(data)])));
  return Buffer.concat([len, typeBuf, Buffer.from(data), crcBuf]);
}

function png(size: number): Buffer {
  // raw RGB rows, each prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const cx = size / 2;
  // cross geometry: vertical bar and horizontal bar, centered slightly high
  const barW = Math.round(size * 0.14);
  const vTop = Math.round(size * 0.18);
  const vBot = Math.round(size * 0.84);
  const hY = Math.round(size * 0.40);
  const hHalf = Math.round(size * 0.22);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      let [r, g, b] = NAVY;
      const inV = Math.abs(x - cx) <= barW / 2 && y >= vTop && y <= vBot;
      const inH = Math.abs(y - hY) <= barW / 2 && Math.abs(x - cx) <= hHalf;
      if (inV || inH) [r, g, b] = GOLD;
      const o = rowStart + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const outDir = path.resolve(import.meta.dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), png(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), png(512));
fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), png(180));
console.log("[gen-icons] wrote icon-192.png, icon-512.png, apple-touch-icon.png");
