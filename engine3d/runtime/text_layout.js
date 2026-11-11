// Text card layout from font metrics (#84): how a text_card wraps its words and where each word sits, computed from
// the glyph advances in catalog/font_metrics.json (andika_bold, the font the page draws cards with). The page wraps
// with this same layout and draws each word at its spot, so the director, the validator and tools know exactly
// where a word is (a finger pointing at word 3, a highlighter sliding along a line) without reading a canvas. Pure.

import { cardParagraphs, cardWords } from "./card_words.js";
import { withDefaults } from "./teach_layout.js";

/** Width of a string in metres at font size S (the em), from glyph advances. */
export function textWidth(str, S, f) {
  if (!f) return String(str).length * 0.55 * S;
  let w = 0;
  for (const ch of String(str)) w += (f.g[ch] ?? f.g["?"] ?? [600])[0];
  // TTFLoader stores advances at 100000 / (unitsPerEm × 72) per font unit (resolution 1000): an em is 1000 / 0.72.
  return (w * S * 0.72) / f.resolution;
}

/**
 * A text card's layout in metres. Fixed-height cards shrink the font (never grow it) until the text fits.
 * @param {object} obj  a text_card ({ text, width, size, height?, pad?, align? })
 * @param {object} metrics  catalog.fontMetrics
 * @returns {{ size: number, pad: number, lineH: number, height: number, y0: number, space: number,
 *   lines: { dx: number, words: { i: number, x: number, w: number }[] }[] }}  x: from the line's start (after
 *   pad + dx); y0: the top of the first line from the card's top
 */
export function textCardLayout(obj, metrics) {
  const o = withDefaults(obj);
  const f = metrics?.andika_bold;
  const W = o.width;
  const padK = o.pad ?? 0.7;
  const words = cardWords(o.text);
  let S = o.size;
  let pad;
  let lineH;
  let space;
  let lines;
  const wrap = () => {
    pad = padK * S;
    lineH = 1.4 * S;
    const maxW = W - 2 * pad;
    space = textWidth(" ", S, f);
    lines = [];
    for (const para of cardParagraphs(o.text)) {
      let line = [];
      let x = 0;
      for (const i of para) {
        const w = textWidth(words[i], S, f);
        if (line.length && x + w > maxW + 1e-9) {
          lines.push({ words: line });
          line = [];
          x = 0;
        }
        line.push({ i, x, w });
        x += w + space;
      }
      lines.push({ words: line });
    }
    // align "center": each line centred in the card (word cards, tiles); left otherwise.
    for (const line of lines) {
      const used = line.words.length ? line.words.at(-1).x + line.words.at(-1).w : 0;
      line.dx = o.align === "center" ? (maxW - used) / 2 : 0;
    }
  };
  wrap();
  for (let k = 0; o.height && k < 12 && lines.length * lineH + 2 * pad > o.height + 1e-6; k++) {
    S *= 0.9;
    wrap();
  }
  const height = o.height ?? lines.length * lineH + 2 * pad;
  return { size: S, pad, lineH, height, y0: (height - lines.length * lineH) / 2, space, lines };
}

/**
 * Where each word of a text card is, in the card's own frame (x from its middle, y up from its foot, before
 * scale): the word's centre and its box. Word k is pieces "<id>#w<k>" (k from 1), numbered as emphasize numbers
 * words (from 0) plus one.
 * @returns {{ n: number, word: string, x: number, y: number, w: number, h: number, line: number }[]}
 */
export function wordSpots(obj, metrics) {
  const o = withDefaults(obj);
  const L = textCardLayout(o, metrics);
  const words = cardWords(o.text);
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  const out = [];
  L.lines.forEach((line, li) => {
    for (const wd of line.words) {
      out.push({ n: wd.i + 1, word: words[wd.i], x: r4(-o.width / 2 + L.pad + line.dx + wd.x + wd.w / 2), y: r4(L.height - (L.y0 + (li + 0.5) * L.lineH)), w: r4(wd.w), h: r4(L.lineH), line: li + 1 });
    }
  });
  return out.sort((a, b) => a.n - b.n);
}
