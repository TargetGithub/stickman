// Where each character of a `letter` word sits, from catalog/font_metrics.json (glyph advances and ink extents,
// written by tools/gen_font_metrics.mjs from the same TTFLoader data the page lays text out with). The page cuts a
// word into one mesh per character and stands each at this centre; the director and validator use the same numbers
// for the pieces <id>#c1 .. #cN (every character counts, spaces too), so a finger dot, a mark or a reparent lands on
// the right letter without reading a font at run time. Pure.

/** Type size as objects.js sets it (TextGeometry size = 1.42 × size) and the bevel that widens each glyph. */
const TYPE = 1.42;
const BEVEL = 0.025;

/**
 * @param {{ text: string, size?: number, font?: string, forms?: string }} o  a letter object (forms "book": two-storey a, g)
 * @param {object} metrics  catalog.fontMetrics (font_metrics.json fonts)
 * @returns {{ n: number, ch: string, x: number, w: number, space: boolean }[]}  x: the character's centre in the
 *   word's own frame (metres, the word centred on x = 0 as the page centres it); w: its inked width
 */
export function letterLayout(o, metrics) {
  const size = o.size ?? 1;
  const f = metrics?.[o.font ?? "andika_bold"] ?? metrics?.andika_bold;
  const chars = Array.from(String(o.text ?? ""));
  if (!f) return chars.map((ch, i) => ({ n: i + 1, ch, x: (i - (chars.length - 1) / 2) * 0.8 * size, w: 0.7 * size, space: !ch.trim() }));
  const S = (size * TYPE) / f.resolution;
  const bevel = size * BEVEL;
  let x = 0;
  const raw = chars.map((ch, i) => {
    const g = (o.forms === "book" ? f.book?.[ch] : null) ?? f.g[ch] ?? f.g["?"] ?? [600, 0, 600];
    const r = ch.trim() ? { n: i + 1, ch, x0: x + g[1] * S - bevel, x1: x + g[2] * S + bevel, space: false } : { n: i + 1, ch, x0: x, x1: x + g[0] * S, space: true };
    x += g[0] * S;
    return r;
  });
  const ink = raw.filter((r) => !r.space);
  const lo = ink.length ? Math.min(...ink.map((r) => r.x0)) : 0;
  const hi = ink.length ? Math.max(...ink.map((r) => r.x1)) : x;
  const c = (lo + hi) / 2;
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  return raw.map((r) => ({ n: r.n, ch: r.ch, x: r4((r.x0 + r.x1) / 2 - c), w: r4(r.x1 - r.x0), space: r.space }));
}

/** The piece names of a letter word: c1 .. cN. */
export const letterPieces = (o) => Array.from(String(o.text ?? ""), (_, i) => `c${i + 1}`);

/** The words of a letter sentence: each word's character numbers (1-based), split on spaces. */
export function letterWords(o) {
  const out = [];
  let cur = [];
  Array.from(String(o.text ?? "")).forEach((ch, i) => {
    if (ch.trim()) cur.push(i + 1);
    else if (cur.length) (out.push(cur), (cur = []));
  });
  if (cur.length) out.push(cur);
  return out;
}
