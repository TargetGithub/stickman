// number_line (WORKBOOK_SPEC 5): number lines counting on by a step (1s, 2s, 5s, 10s, 100s, back by a step,
// through zero) with some labels left as empty boxes; the child writes the missing numbers. The first two labels
// always show, so the step can be seen. The key writes the missing numbers in red.

import { pickInOrder } from "./qa_items.js";

/** Indices of the blanks: never the first two, picked by the stream. */
export function blankPlaces(length, blanks, rng) {
  const free = Array.from({ length: length - 2 }, (_, i) => i + 2);
  return new Set(pickInOrder(free, Math.min(blanks, free.length), rng));
}

export const numberLine = {
  name: "number_line",
  params: {
    rows: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", required: ["start", "step"], additionalProperties: false, properties: {
      start: { type: "integer", minimum: -1000, maximum: 100000 }, step: { type: "integer", minimum: -1000, maximum: 1000 },
    } }, description: "Lines as {start, step} (default: drawn from the stream with `step`)." },
    count: { type: "integer", minimum: 1, maximum: 6, description: "How many lines when rows are not given (default 3)." },
    step: { type: "integer", minimum: -1000, maximum: 1000, description: "The step for drawn lines (default 1)." },
    length: { type: "integer", minimum: 4, maximum: 12, description: "Ticks per line (default 8)." },
    blanks: { type: "integer", minimum: 1, maximum: 8, description: "Missing numbers per line (default 3)." },
  },
  required: [],
  artPaths: () => [],
  check(block, path) {
    const zero = [...(block.rows || []).map((r, i) => [r.step, `rows[${i}].step`]), [block.step, "step"]].filter(([s]) => s === 0);
    return zero.map(([, p]) => ({ code: "E_WB_VALUE", path: `${path}.${p}`, message: "A step of 0 never moves along the line.", fix: "Use a step such as 1, 2, 5, 10 or -1." }));
  },
  generate(block, box, env) {
    const r = env.rules;
    const len = block.length ?? 8;
    const step = block.step ?? 1;
    const rows = block.rows ?? Array.from({ length: block.count ?? 3 }, () => {
      const start = Math.abs(step) * Math.floor(env.rng() * 11) + (step < 0 ? Math.abs(step) * (len - 1) : 0);
      return { start, step };
    });
    const rowH = box.h / rows.length;
    const items = [];
    const answers = [];
    const issues = [];
    rows.forEach((row, i) => {
      const values = Array.from({ length: len }, (_, k) => row.start + row.step * k);
      const wide = Math.max(...values.map((v) => String(v).length));
      const gap = (box.w - 24) / (len - 1);
      const size = Math.min(r.body, gap / (wide * 0.62 + 0.4), rowH * 0.3);
      if (size < r.small * 0.8) issues.push({ code: "E_WB_FIT", path: "length", message: "The numbers are too long for this many ticks in the slot.", fix: "Use fewer ticks or a wider slot." });
      const ly = box.y + rowH * i + rowH * 0.35;
      const x0 = box.x + 12;
      items.push({ type: "line", points: [[box.x, ly], [box.x + box.w, ly]], width: r.weight * 0.8 });
      for (const [tip, d] of [[box.x, 1], [box.x + box.w, -1]]) items.push({ type: "line", points: [[tip + d * 9, ly - 6], [tip, ly], [tip + d * 9, ly + 6]], width: r.weight * 0.8 });
      const blanks = blankPlaces(len, block.blanks ?? 3, env.rng);
      values.forEach((v, k) => {
        const x = x0 + gap * k;
        items.push({ type: "line", points: [[x, ly - 8], [x, ly + 8]], width: r.weight * 0.7 });
        const lb = { x: x - gap / 2 + 2, y: ly + 12, w: gap - 4, h: size * 1.5 };
        if (blanks.has(k)) {
          const bw = Math.min(gap - 6, (wide * 0.62 + 0.8) * size);
          items.push({ type: "rect", x: x - bw / 2, y: lb.y, w: bw, h: lb.h, radius: 4, width: r.weight * 0.5 });
          answers.push({ type: "text", ...lb, text: String(v), size, align: "center", valign: "middle", colour: env.ink.answer, lines: 1 });
        } else {
          items.push({ type: "text", ...lb, text: String(v), size, align: "center", valign: "middle", lines: 1 });
        }
      });
    });
    return { items, answers, issues: issues.slice(0, 1) };
  },
};
