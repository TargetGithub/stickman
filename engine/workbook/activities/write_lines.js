// write_lines (WORKBOOK_SPEC 5): handwriting and writing practice. An optional model sentence to copy and an
// optional prompt to answer, then lines: handwriting lines (top line, dashed midline, baseline) up to grade 2,
// ruled lines from grade 3 (or as `ruled` says). No answers.

import { atLeast } from "../grades.js";

export const writeLinesActivity = {
  name: "write_lines",
  params: {
    model: { type: "string", minLength: 1, maxLength: 80, description: "A sentence printed big to copy (optional)." },
    prompt: { type: "string", minLength: 3, maxLength: 120, description: "What to write about (optional), for example: Tell about your best day." },
    rows: { type: "integer", minimum: 1, maximum: 16, description: "How many lines (default: as many as fit)." },
    ruled: { type: "boolean", description: "Plain ruled lines instead of handwriting lines (default: from grade 3)." },
  },
  required: [],
  artPaths: () => [],
  texts: (block) => [[block.model, "model"], [block.prompt, "prompt"]].filter(([t]) => t),
  generate(block, box, env) {
    const r = env.rules;
    const items = [];
    let y = box.y;
    if (block.prompt) {
      items.push({ type: "text", x: box.x, y, w: box.w, h: r.body * 1.3 * 2, text: block.prompt, size: r.body, align: "left", lines: 2 });
      y += r.body * 1.3 * 2 + 4;
    }
    if (block.model) {
      const size = Math.max(r.body * 1.25, r.minItem * 0.55);
      items.push({ type: "text", x: box.x, y, w: box.w, h: size * 1.4, text: block.model, size, align: "left", valign: "middle", lines: 1 });
      y += size * 1.4 + 6;
    }
    const ruled = block.ruled ?? atLeast(env.grade, "3");
    const rowH = ruled ? r.body * 2.1 : r.minItem * 1.6;
    const fit = Math.floor((box.y + box.h - y) / rowH);
    const rows = Math.min(block.rows ?? fit, fit);
    const issues = rows < 1 || rows < (block.rows ?? 1) ? [{ code: "E_WB_FIT", path: "rows", message: "The lines do not fit the slot.", fix: "Use fewer rows, a shorter prompt or a bigger slot." }] : [];
    for (let i = 0; i < rows; i++) {
      const base = y + rowH * (i + 1) - (ruled ? 4 : rowH * 0.3);
      if (ruled) {
        items.push({ type: "line", points: [[box.x, base], [box.x + box.w, base]], width: 1, colour: env.ink.guide });
        continue;
      }
      const cap = base - r.minItem;
      items.push({ type: "line", points: [[box.x, cap], [box.x + box.w, cap]], width: 1, colour: env.ink.guide },
        { type: "line", points: [[box.x, (cap + base) / 2], [box.x + box.w, (cap + base) / 2]], width: 1, colour: env.ink.guide, dash: [6, 5] },
        { type: "line", points: [[box.x, base], [box.x + box.w, base]], width: 1.4 });
    }
    return { items, answers: [], issues };
  },
};
