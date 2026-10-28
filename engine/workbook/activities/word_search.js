// word_search (WORKBOOK_SPEC 5): hidden words in a letter grid with the list beside (or below) it. Right and down
// up to grade 1, diagonals in grade 2. The key marks each word with a red band.

import { makeWordGrid, gradeDirections, WORD_DIRS } from "../word_grid.js";

const WORD = /^[A-Za-z]+$/;

export const wordSearch = {
  name: "word_search",
  params: {
    words: { type: "array", minItems: 3, maxItems: 12, uniqueItems: true, items: { type: "string", minLength: 2, maxLength: 14 }, description: "Words to hide (letters only)." },
    size: { type: "integer", minimum: 5, maximum: 14, description: "Grid side (default: the grade's)." },
  },
  required: ["words"],
  artPaths: () => [],
  limits: (block, rules) => (rules.wordGrid === 0 ? [["words", block.words.length, 0]] : []),
  check(block, path, catalog, rules) {
    const out = [];
    const n = block.size ?? (rules.wordGrid || 14);
    const blocked = (catalog.blocklist || []).map((w) => w.toUpperCase());
    block.words.forEach((w, i) => {
      const p = `${path}.words[${i}]`;
      if (!WORD.test(w)) out.push({ code: "E_WB_WORD", path: p, message: `'${w}' has characters other than letters.`, fix: "Use letters only: no spaces, digits or marks." });
      else if (blocked.includes(w.toUpperCase())) out.push({ code: "E_WB_WORD", path: p, message: "A blocked word.", fix: "Keep words family-friendly." });
      else if (w.length > n) out.push({ code: "E_WB_WORD", path: p, message: `'${w}' is longer than the ${n}-letter grid.`, fix: "Use a shorter word or a bigger grid." });
    });
    return out;
  },
  generate(block, box, env) {
    const r = env.rules;
    const n = block.size ?? r.wordGrid;
    const words = block.words.map((w) => w.toUpperCase());
    const g = makeWordGrid(words, n, gradeDirections(env.grade), env.rng, env.catalog.blocklist || []);
    if (!g) return { items: [], answers: [], issues: [{ code: "E_WB_FIT", path: "words", message: `The words do not all fit in a ${n} x ${n} grid.`, fix: "Use fewer or shorter words, or a bigger size." }] };
    const side = box.w > box.h * 1.25 ? "right" : "below";
    const listW = side === "right" ? Math.min(box.w * 0.32, 170) : box.w;
    const listH = side === "below" ? Math.ceil(words.length / 3) * r.body * 1.6 + 10 : 0;
    const cell = Math.min((box.w - (side === "right" ? listW + 16 : 0)) / n, (box.h - listH) / n);
    const issues = cell < r.small * 1.6 ? [{ code: "E_WB_FIT", path: "words", message: "The letters are too small to read in this slot.", fix: "Use a smaller grid or a bigger slot." }] : [];
    const x0 = box.x + (side === "right" ? 0 : (box.w - n * cell) / 2);
    const y0 = box.y;
    const items = [{ type: "rect", x: x0, y: y0, w: n * cell, h: n * cell, width: r.weight * 0.7, radius: 6 }];
    g.grid.forEach((ch, i) => items.push({ type: "text", x: x0 + (i % n) * cell, y: y0 + Math.floor(i / n) * cell, w: cell, h: cell, text: ch, size: cell * 0.62, align: "center", valign: "middle", lines: 1 }));
    // The list: two-letter boxes look like a checklist a child ticks.
    const lx = side === "right" ? x0 + n * cell + 16 : box.x;
    const ly = side === "right" ? y0 : y0 + n * cell + 10;
    const colW = side === "right" ? listW : box.w / 3;
    words.forEach((w, i) => {
      const x = lx + (side === "right" ? 0 : (i % 3) * colW);
      const y = ly + (side === "right" ? i : Math.floor(i / 3)) * r.body * 1.6;
      items.push({ type: "rect", x, y: y + r.body * 0.3, w: r.body * 0.9, h: r.body * 0.9, width: 1.2, radius: 2 });
      items.push({ type: "text", x: x + r.body * 1.3, y, w: colW - r.body * 1.4, h: r.body * 1.5, text: w, size: r.body, align: "left", valign: "middle", weight: "bold", lines: 1 });
    });
    const answers = g.placed.map((p) => {
      const [dx, dy] = WORD_DIRS[p.dir];
      const end = [p.x + dx * (p.word.length - 1), p.y + dy * (p.word.length - 1)];
      return { type: "line", points: [[x0 + (p.x + 0.5) * cell, y0 + (p.y + 0.5) * cell], [x0 + (end[0] + 0.5) * cell, y0 + (end[1] + 0.5) * cell]], width: cell * 0.72, colour: "rgba(214, 40, 40, 0.35)" };
    });
    return { items, answers, issues };
  },
};
