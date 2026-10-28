// count (WORKBOOK_SPEC 5): rows of pictures to count, each with a box for the number; the key writes it in.
// Pictures sit in the cells of the row's best grid, the cells picked by the block's random stream.

import { ART_SCHEMA } from "../art.js";

export const count = {
  name: "count",
  params: {
    item: { ...ART_SCHEMA, description: "The picture to count." },
    groups: { type: "array", minItems: 1, maxItems: 6, items: { type: "integer", minimum: 1, maximum: 20 }, description: "How many pictures in each row." },
  },
  required: ["item", "groups"],
  artPaths: (block) => [[block.item, "item"]],
  limits: (block, rules) => block.groups.map((n, i) => (n > rules.countMax ? [`groups[${i}]`, n, rules.countMax] : null)).filter(Boolean),
  generate(block, box, env) {
    const r = env.rules;
    const rowH = box.h / block.groups.length;
    const items = [];
    const answers = [];
    const issues = [];
    const ans = Math.min(rowH * 0.6, 64);
    const areaW = box.w - ans - 24;
    // One picture size for every row (the smallest row's best), so rows compare fairly.
    const size = Math.min(...block.groups.map((n) => bestGrid(n, areaW, rowH - 8).size));
    block.groups.forEach((n, gi) => {
      const y = box.y + rowH * gi;
      const area = { x: box.x, y: y + 4, w: areaW, h: rowH - 8 };
      const cell = { ...bestGrid(n, area.w, area.h), size }; // the row's grid holds the shared size too
      if (cell.size * 0.8 < r.minItem * 0.6) issues.push({ code: "E_WB_FIT", path: `groups[${gi}]`, message: `${n} pictures do not fit in the row at a readable size.`, fix: "Use fewer rows or fewer pictures, or a bigger layout slot." });
      const picks = pickCells(cell.cols * cell.rows, n, env.rng);
      const ox = area.x + (area.w - cell.cols * cell.size) / 2;
      const oy = area.y + (area.h - cell.rows * cell.size) / 2;
      const s = cell.size * 0.8;
      for (const c of picks) {
        const jx = (env.rng() - 0.5) * cell.size * 0.12;
        const jy = (env.rng() - 0.5) * cell.size * 0.12;
        const cx = ox + (c % cell.cols + 0.5) * cell.size + jx;
        const cy = oy + (Math.floor(c / cell.cols) + 0.5) * cell.size + jy;
        items.push({ type: "art", ref: block.item, x: cx - s / 2, y: cy - s / 2, w: s, h: s, align: "center" });
      }
      const bx = box.x + box.w - ans - 4;
      const by = y + (rowH - ans) / 2;
      items.push({ type: "rect", x: bx, y: by, w: ans, h: ans, width: r.weight * 0.7, radius: 6 });
      answers.push({ type: "text", x: bx, y: by, w: ans, h: ans, text: String(n), size: ans * 0.7, align: "center", valign: "middle", weight: "bold", colour: env.ink.answer, answer: true });
      if (gi > 0) items.push({ type: "line", points: [[box.x, y], [box.x + box.w, y]], width: 1, colour: env.ink.guide, dash: [4, 4] });
    });
    return { items, answers, issues };
  },
};

/** The grid (cols x rows, square cells) that holds n pictures in a w x h area with the largest cells. */
export function bestGrid(n, w, h) {
  let best = { cols: 1, rows: n, size: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min(w / cols, h / rows);
    if (size > best.size + 1e-9) best = { cols, rows, size };
  }
  return best;
}

/** n distinct cell indices out of total, in ascending order (a seeded partial shuffle). */
export function pickCells(total, n, rng) {
  const cells = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (total - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, n).sort((a, b) => a - b);
}
