#!/usr/bin/env node
// Writes catalog/font_metrics.json: for each catalog font, the glyph advance (ha) and ink extent (x_min, x_max) of
// the printable ASCII characters and a few more, as three's TTFLoader reports them (the page lays text out with the
// same numbers). The director and validator read it to know where each character of a `letter` word is, without
// touching a font at run time (runtime/letter_layout.js). Rerun after adding a font.
//   node engine3d/tools/gen_font_metrics.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import opentypeModule from "three/examples/jsm/libs/opentype.module.js";

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;
/** Book (two-storey) forms of a and g: Andika maps a and g to its single-storey glyphs; the two-storey ones stay unmapped. */
const BOOK = { a: "a", g: "g" };

/** One glyph as TTFLoader writes it ({ ha, x_min, x_max, o }), so the page can swap it into a loaded font. */
function token(glyph, unitsPerEm) {
  const round = Math.round;
  const scale = 100000 / ((unitsPerEm || 2048) * 72);
  let o = "";
  for (const c of glyph.path.commands) {
    o += `${(c.type.toLowerCase() === "c" ? "b" : c.type.toLowerCase())} `;
    for (const [x, y] of [["x", "y"], ["x1", "y1"], ["x2", "y2"]]) if (c[x] !== undefined && c[y] !== undefined) o += `${round(c[x] * scale)} ${round(c[y] * scale)} `;
  }
  return { ha: round(glyph.advanceWidth * scale), x_min: round(glyph.xMin * scale), x_max: round(glyph.xMax * scale), o };
}

const REPO = new URL("../../", import.meta.url);
const fonts = JSON.parse(readFileSync(new URL("../catalog/fonts.json", import.meta.url), "utf8")).fonts;
const CHARS = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), "°", "·", "’", "‘", "“", "”", "—", "–", "é", "ñ", "ü"];
const book = { description: "Two-storey (book) a and g glyphs per catalog font, in TTFLoader's format, swapped in for letter words with forms: \"book\" (tools/gen_font_metrics.mjs; do not edit).", fonts: {} };
const out = { description: "Glyph advance and ink extents per catalog font (tools/gen_font_metrics.mjs; do not edit). g[ch] = [ha, x_min, x_max] in font units of `resolution`. In metres for a letter word: value × 1.42 × size / resolution (a lowercase letter is about 1.0 × size wide, i 0.4, m 1.5, capitals 1.3); for text cards: value × 0.72 × font size / resolution. Use letterLayout (runtime/letter_layout.js) or wordSpots (runtime/text_layout.js) rather than adding these up by hand.", fonts: {} };
for (const [name, f] of Object.entries(fonts)) {
  const buf = readFileSync(new URL(f.file, REPO));
  const j = new TTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const g = {};
  for (const ch of CHARS) {
    const x = j.glyphs[ch];
    if (x) g[ch] = [x.ha, x.x_min ?? 0, x.x_max ?? 0];
  }
  out.fonts[name] = { resolution: j.resolution, g };
  // Two-storey a and g when the font has them under the plain names but maps the letters elsewhere (Andika).
  const ot = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const named = new Map();
  for (let i = 0; i < ot.glyphs.length; i++) named.set(ot.glyphs.get(i).name, ot.glyphs.get(i));
  const forms = {};
  for (const [ch, gname] of Object.entries(BOOK)) {
    const glyph = named.get(gname);
    if (glyph && ot.charToGlyph(ch).name !== gname) forms[ch] = token(glyph, ot.unitsPerEm);
  }
  if (Object.keys(forms).length) {
    book.fonts[name] = forms;
    out.fonts[name].book = Object.fromEntries(Object.entries(forms).map(([ch, t]) => [ch, [t.ha, t.x_min, t.x_max]]));
  }
}
writeFileSync(new URL("../catalog/font_book_forms.json", import.meta.url), `${JSON.stringify(book)}\n`);
writeFileSync(new URL("../catalog/font_metrics.json", import.meta.url), `${JSON.stringify(out)}\n`);
console.log(`font_metrics: ${Object.keys(out.fonts).join(", ")}; book forms: ${Object.keys(book.fonts).join(", ") || "none"}`);
