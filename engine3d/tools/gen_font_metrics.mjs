#!/usr/bin/env node
// Writes catalog/font_metrics.json: for each catalog font, the glyph advance (ha) and ink extent (x_min, x_max) of
// the printable ASCII characters and a few more, as three's TTFLoader reports them (the page lays text out with the
// same numbers). The director and validator read it to know where each character of a `letter` word is, without
// touching a font at run time (runtime/letter_layout.js). Rerun after adding a font.
//   node engine3d/tools/gen_font_metrics.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

const REPO = new URL("../../", import.meta.url);
const fonts = JSON.parse(readFileSync(new URL("../catalog/fonts.json", import.meta.url), "utf8")).fonts;
const CHARS = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), "°", "·", "’", "‘", "“", "”", "—", "–", "é", "ñ", "ü"];
const out = { description: "Glyph advance and ink extents per catalog font (tools/gen_font_metrics.mjs; do not edit). g[ch] = [ha, x_min, x_max] in font units of `resolution`.", fonts: {} };
for (const [name, f] of Object.entries(fonts)) {
  const buf = readFileSync(new URL(f.file, REPO));
  const j = new TTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const g = {};
  for (const ch of CHARS) {
    const x = j.glyphs[ch];
    if (x) g[ch] = [x.ha, x.x_min ?? 0, x.x_max ?? 0];
  }
  out.fonts[name] = { resolution: j.resolution, g };
}
writeFileSync(new URL("../catalog/font_metrics.json", import.meta.url), `${JSON.stringify(out)}\n`);
console.log(`font_metrics: ${Object.keys(out.fonts).join(", ")}`);
