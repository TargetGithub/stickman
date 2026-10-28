// pattern (WORKBOOK_SPEC 5): a repeating row of pictures (AB, AAB, ABB or ABC) whose last places are empty; the
// child draws what comes next. The key draws the missing pictures.

import { ART_SCHEMA } from "../art.js";

const REPEATS = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2] };

/** The item index at each place of a pattern row. */
export const patternRow = (repeat, length) => Array.from({ length }, (_, i) => REPEATS[repeat][i % REPEATS[repeat].length]);

export const pattern = {
  name: "pattern",
  params: {
    sequence: { type: "array", minItems: 2, maxItems: 3, items: ART_SCHEMA, description: "The pictures A, B (and C)." },
    repeat: { enum: Object.keys(REPEATS), description: "The pattern (default AB, or ABC with three pictures)." },
    length: { type: "integer", minimum: 4, maximum: 10, description: "Places in the row (default 8)." },
    blanks: { type: "integer", minimum: 1, maximum: 3, description: "Empty places at the end (default 2)." },
  },
  required: ["sequence"],
  artPaths: (block) => block.sequence.map((ref, i) => [ref, `sequence[${i}]`]),
  check(block, path) {
    const repeat = block.repeat ?? (block.sequence.length === 3 ? "ABC" : "AB");
    const need = Math.max(...REPEATS[repeat]) + 1;
    return need !== block.sequence.length ? [{ code: "E_WB_PATTERN", path: `${path}.sequence`, message: `A ${repeat} pattern needs ${need} pictures, not ${block.sequence.length}.`, fix: `Give ${need} pictures, or another repeat.` }] : [];
  },
  generate(block, box, env) {
    const r = env.rules;
    const repeat = block.repeat ?? (block.sequence.length === 3 ? "ABC" : "AB");
    const length = block.length ?? 8;
    const blanks = block.blanks ?? 2;
    const row = patternRow(repeat, length);
    const cell = Math.min(box.w / length, box.h);
    const issues = cell < r.minItem * 0.8 ? [{ code: "E_WB_FIT", path: "length", message: `${length} pictures are too small in this slot.`, fix: "Use a shorter row or a bigger slot." }] : [];
    const x0 = box.x + (box.w - cell * length) / 2;
    const y0 = box.y + (box.h - cell) / 2;
    const items = [];
    const answers = [];
    row.forEach((k, i) => {
      const at = { x: x0 + i * cell + cell * 0.12, y: y0 + cell * 0.12, w: cell * 0.76, h: cell * 0.76, align: "center" };
      const blank = i >= length - blanks;
      items.push({ type: "rect", x: x0 + i * cell + 3, y: y0 + 3, w: cell - 6, h: cell - 6, width: blank ? r.weight * 0.7 : 1, radius: 8, colour: blank ? "#000000" : env.ink.guide, dash: blank ? [6, 4] : undefined });
      (blank ? answers : items).push({ type: "art", ref: block.sequence[k], ...at });
    });
    return { items, answers, issues };
  },
};
