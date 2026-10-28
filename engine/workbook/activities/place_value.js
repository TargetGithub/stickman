// place_value (WORKBOOK_SPEC 5): "blocks": base-ten blocks (hundred flats, ten rods, ones) and the child writes
// the number; "expand": a number and the child writes it in expanded form (3,405 = 3000 + 400 + 5). Numbers are
// given or drawn from the stream under the grade's limit. The key writes the answers in red.

import { gridCells, numberLabel } from "./qa_items.js";

const MAX_BY_GRADE = { prek: 10, k: 20, 1: 99, 2: 999, 3: 9999, 4: 99999, 5: 999999 };

/** 3405 → "3000 + 400 + 5" (zero places left out). */
export function expanded(n) {
  const d = String(n).split("");
  const parts = d.map((c, i) => (c === "0" ? null : c + "0".repeat(d.length - 1 - i))).filter(Boolean);
  return parts.length ? parts.join(" + ") : "0";
}

/** Thousands separators as children write them: 12345 → "12,345". */
export const withCommas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const placeValue = {
  name: "place_value",
  params: {
    numbers: { type: "array", minItems: 1, maxItems: 8, items: { type: "integer", minimum: 1, maximum: 999999 }, description: "The numbers (default: drawn from the stream)." },
    count: { type: "integer", minimum: 1, maximum: 8, description: "How many when numbers are not given (default 4)." },
    task: { enum: ["blocks", "expand"], description: "blocks: count base-ten blocks; expand: write the expanded form (default blocks)." },
    max: { type: "integer", minimum: 2, maximum: 999999, description: "The largest drawn number (default by grade)." },
  },
  required: [],
  artPaths: () => [],
  check(block, path) {
    if (block.task === "expand") return [];
    return (block.numbers || []).flatMap((v, i) => (v > 999 ? [{ code: "E_WB_VALUE", path: `${path}.numbers[${i}]`, message: `${v} needs too many blocks to draw.`, fix: 'Use numbers up to 999 for blocks, or "task": "expand".' }] : []));
  },
  generate(block, box, env) {
    const r = env.rules;
    const task = block.task ?? "blocks";
    const max = Math.min(block.max ?? MAX_BY_GRADE[env.grade], task === "blocks" ? 999 : 999999);
    const lo = Math.min(max, task === "expand" ? Math.ceil(max / 10) + 1 : 11);
    const nums = block.numbers ?? Array.from({ length: block.count ?? 4 }, () => lo + Math.floor(env.rng() * (max - lo + 1)));
    const cells = gridCells(box, nums.length, 1);
    const items = [];
    const answers = [];
    const issues = [];
    nums.forEach((v, i) => {
      const c = cells[i];
      items.push(numberLabel(c, i, env));
      const x = c.x + r.small * 2.4;
      const w = c.w - r.small * 2.4;
      if (i > 0) items.push({ type: "line", points: [[c.x, c.y], [c.x + c.w, c.y]], width: 1, colour: env.ink.guide, dash: [4, 4] });
      if (task === "expand") {
        const h = Math.min(c.h, r.body * 2);
        const y = c.y + (c.h - h) / 2;
        const nw = (withCommas(v).length + 2) * r.body * 0.62;
        items.push({ type: "text", x, y, w: nw, h, text: `${withCommas(v)} =`, size: r.body, align: "left", valign: "middle", weight: "bold", lines: 1 },
          { type: "line", points: [[x + nw + 6, y + h * 0.85], [x + w - 6, y + h * 0.85]], width: r.weight * 0.6 });
        answers.push({ type: "text", x: x + nw + 10, y, w: w - nw - 20, h: h * 0.82, text: expanded(v), size: r.body, align: "left", valign: "middle", colour: env.ink.answer, lines: 1 });
        return;
      }
      const ansW = Math.min(w * 0.22, r.body * 4);
      const out = blocks(v, x, c.y + 4, w - ansW - 16, c.h - 8, env);
      if (out.unit < 3) issues.push({ code: "E_WB_FIT", path: "numbers", message: `${v} needs too many blocks for this slot.`, fix: "Use smaller numbers, fewer rows or a bigger slot." });
      items.push(...out.items);
      const bx = c.x + c.w - ansW;
      const by = c.y + c.h / 2 - r.body;
      items.push({ type: "rect", x: bx, y: by, w: ansW, h: r.body * 2, radius: 6, width: r.weight * 0.6 });
      answers.push({ type: "text", x: bx, y: by, w: ansW, h: r.body * 2, text: String(v), size: r.body, align: "center", valign: "middle", weight: "bold", colour: env.ink.answer, lines: 1 });
    });
    return { items, answers, issues: issues.slice(0, 1) };
  },
};

/** Hundreds as 10 x 10 flats, tens as rods of 10, ones as single cubes, left to right, sized to fit. */
function blocks(v, x, y, w, h, env) {
  const H = Math.floor(v / 100);
  const T = Math.floor((v % 100) / 10);
  const O = v % 10;
  const oneCols = Math.ceil(O / 5) || 0;
  // Width in units: each flat 10 + gap 1.5, each rod 1 + gap 0.8, ones in columns of 5 (1.4 each).
  const units = H * 11.5 + T * 1.8 + oneCols * 1.4 + 1;
  const unit = Math.min(w / units, h / 10.5, 14);
  const items = [];
  const lw = Math.max(0.6, env.rules.weight * 0.35);
  let cx = x;
  const top = y + (h - unit * 10) / 2;
  for (let k = 0; k < H; k++) {
    items.push({ type: "rect", x: cx, y: top, w: unit * 10, h: unit * 10, width: lw * 1.6 });
    for (let j = 1; j < 10; j++) {
      items.push({ type: "line", points: [[cx + unit * j, top], [cx + unit * j, top + unit * 10]], width: lw * 0.6 }, { type: "line", points: [[cx, top + unit * j], [cx + unit * 10, top + unit * j]], width: lw * 0.6 });
    }
    cx += unit * 11.5;
  }
  for (let k = 0; k < T; k++) {
    items.push({ type: "rect", x: cx, y: top, w: unit, h: unit * 10, width: lw * 1.6 });
    for (let j = 1; j < 10; j++) items.push({ type: "line", points: [[cx, top + unit * j], [cx + unit, top + unit * j]], width: lw * 0.6 });
    cx += unit * 1.8;
  }
  for (let k = 0; k < O; k++) {
    const col = Math.floor(k / 5);
    items.push({ type: "rect", x: cx + col * unit * 1.4, y: top + unit * 10 - unit * 1.25 * ((k % 5) + 1), w: unit, h: unit, width: lw * 1.6 });
  }
  return { items, unit };
}
