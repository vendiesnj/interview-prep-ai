/**
 * Generates Signal waveform logo PNGs for the Chrome extension.
 * Run with: node extension/icons/generate.mjs
 * No external dependencies — uses only built-in Node.js modules.
 */

import zlib from "zlib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CRC32 table ───────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG encoder ───────────────────────────────────────────────────────────────

function makePNG(width, height, getPixel) {
  // Build raw RGBA scanlines with filter byte 0 (None) at start of each row
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      scanlines.push(r & 0xff, g & 0xff, b & 0xff, a & 0xff);
    }
  }

  const raw        = Buffer.from(scanlines);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, "ascii");
    const lenBuf    = Buffer.allocUnsafe(4);
    const crcBuf    = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Is point (px, py) inside a rounded rectangle? */
function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  // Clamp to the inner rectangle (inset by r) — closest point
  const cx = Math.max(x + r, Math.min(x + w - r, px));
  const cy = Math.max(y + r, Math.min(y + h - r, py));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ── Waveform renderer ─────────────────────────────────────────────────────────

function renderSignalIcon(size) {
  const bgStart = [0x25, 0x63, 0xeb]; // #2563EB
  const bgEnd   = [0x0e, 0xa5, 0xe9]; // #0EA5E9

  const bgRadius = Math.round(size * 0.26);

  // 7 bars — symmetric heights (fraction of size), centered vertically
  const BAR_H_FRAC  = [0.22, 0.42, 0.62, 0.78, 0.62, 0.42, 0.22];
  const BAR_OPACITY = [0.55, 0.70, 0.85, 1.00, 0.85, 0.70, 0.55];

  const barW   = size * 0.094;
  const barGap = size * 0.038;
  const totalW = BAR_H_FRAC.length * barW + (BAR_H_FRAC.length - 1) * barGap;
  const startX = (size - totalW) / 2;

  const bars = BAR_H_FRAC.map((hf, i) => {
    const h  = size * hf;
    const bx = startX + i * (barW + barGap);
    const by = (size - h) / 2;
    return { x: bx, y: by, w: barW, h, r: barW / 2, opacity: BAR_OPACITY[i] };
  });

  return makePNG(size, size, (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    // Outside rounded background → transparent
    if (!inRoundedRect(px, py, 0, 0, size, size, bgRadius)) {
      return [0, 0, 0, 0];
    }

    // Diagonal gradient for background
    const t  = (px + py) / (size * 2);
    const bg = [
      Math.round(lerp(bgStart[0], bgEnd[0], t)),
      Math.round(lerp(bgStart[1], bgEnd[1], t)),
      Math.round(lerp(bgStart[2], bgEnd[2], t)),
      255,
    ];

    // Check each waveform bar
    for (const bar of bars) {
      if (inRoundedRect(px, py, bar.x, bar.y, bar.w, bar.h, bar.r)) {
        const a = Math.round(bar.opacity * 255);
        // Alpha-composite white over gradient
        const af = bar.opacity;
        return [
          Math.round(255 * af + bg[0] * (1 - af)),
          Math.round(255 * af + bg[1] * (1 - af)),
          Math.round(255 * af + bg[2] * (1 - af)),
          255,
        ];
      }
    }

    return bg;
  });
}

// ── Generate files ────────────────────────────────────────────────────────────

const SIZES = [16, 48, 128];

for (const size of SIZES) {
  const buf  = renderSignalIcon(size);
  const dest = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✓ icon${size}.png (${buf.length} bytes)`);
}

console.log("\nDone! Icons written to extension/icons/");
