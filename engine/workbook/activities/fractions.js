// fractions (WORKBOOK_SPEC 5): shapes cut into equal parts (a circle in wedges, a rectangle in a grid, a bar in
// strips). "name": some parts are shaded grey and the child writes the fraction; "shade": the fraction is printed
// and the child shades it. The key writes the fraction or shades the parts in light red.

import { gridCells, numberLabel } from "./qa_items.js";

const RAD = Math.PI / 180;
const SHADE = "#c8c8c8";
const KEY_SHADE = "#f6b0b0";

/** "3/4" → { n: 3, d: 4 }, or null (denominators 2-12, numerator 0 to the denominator). */
export function parseFraction(s) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d >= 2 && d <= 12 && n <= d ? { n, d } : null;
}

/** The parts of a shape split into d equal pieces, as closed point lists, in a square box (cx, cy, half size s). */
export function fractionParts(shape, d, cx, cy, s) {
  if (shape === "circle") {
    return Array.from({ length: d }, (_, i) => {
      const a0 = -90 + (360 / d) * i;
      const steps = Math.max(4, Math.ceil(48 / d));
      const arc = Array.from({ length: steps + 1 }, (_, k) => {
        const a = (a0 + ((360 / d) * k) / steps) * RAD;
        return [cx + Math.cos(a) * s, cy + Math.sin(a) * s];
      });
      return [[cx, cy], ...arc];
    });
  }
  const rows = shape === "rect" && d % 2 === 0 && d >= 4 ? 2 : 1;
  const cols = d / rows;
  const w = 2 * s;
  const h = shape === "bar" ? s * 0.55 : rows === 1 ? s * 1.1 : 2 * s * 0.8;
  const x0 = cx - s;
  const y0 = cy - h / 2;
  return Array.from({ length: d }, (_, i) => {
    const x = x0 + (i % cols) * (w / cols);
    const y = y0 + Math.floor(i / cols) * (h / rows);
    return [[x, y], [x + w / cols, y], [x + w / cols, y + h / rows], [x, y + h / rows]];
  });
}

export const fractions = {
  name: "fractions",
  params: {
    fractions: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", pattern: "^\\d{1,2}/\\d{1,2}$" }, description: 'Fractions such as "1/2" or "3/4" (denominators 2-12).' },
    shape: { enum: ["circle", "rect", "bar"], description: "How each whole is drawn (default circle)." },
    task: { enum: ["name", "shade"], description: "name: write the fraction shaded; shade: shade the fraction printed (default name)." },
  },
  required: ["fractions"],
  artPaths: () => [],
  check(block, path) {
    return block.fractions.flatMap((s, i) => (parseFraction(s) ? [] : [{ code: "E_WB_VALUE", path: `${path}.fractions[${i}]`, message: `'${s}' is not a fraction this activity can draw.`, fix: "Use a denominator from 2 to 12 and a numerator no bigger than it, like 3/4." }]));
  },
  generate(block, box, env) {
    const r = env.rules;
    const shape = block.shape ?? "circle";
    const list = block.fractions.map(parseFraction);
    const n = list.length;
    const cols = shape === "bar" ? (n > 4 ? 2 : 1) : n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4;
    const cells = gridCells(box, n, cols);
    const items = [];
    const answers = [];
    const issues = [];
    list.forEach((f, i) => {
      const c = cells[i];
      const labelH = r.body * 2.4;
      const s = Math.min(c.w * 0.4, (c.h - labelH - 12) / (shape === "circle" ? 2 : shape === "bar" ? 0.6 : 1.7));
      if (s * 2 < r.minItem) issues.push({ code: "E_WB_FIT", path: "fractions", message: `${n} fractions are too small to see in this slot.`, fix: "Use fewer fractions or a bigger slot." });
      const cx = c.x + c.w / 2;
      const cy = c.y + 6 + (shape === "circle" ? s : shape === "bar" ? s * 0.3 : s * 0.85);
      if (n > 1) items.push(numberLabel(c, i, env));
      const parts = fractionParts(shape, f.d, cx, cy, s);
      // Shade a run of parts starting at a seeded place, so pictures differ.
      const from = Math.floor(env.rng() * f.d);
      const shaded = new Set(Array.from({ length: f.n }, (_, k) => (from + k) % f.d));
      parts.forEach((pts, k) => {
        const part = { type: "poly", points: pts, closed: true, width: r.weight * 0.7 };
        if (shaded.has(k)) (block.task === "shade" ? answers : items).push({ ...part, fill: block.task === "shade" ? KEY_SHADE : SHADE });
        items.push(part);
      });
      const ly = cy + (shape === "circle" ? s : shape === "bar" ? s * 0.3 : s * 0.85) + 8;
      if (block.task === "shade") {
        items.push(...fractionLabel(f, cx, ly, r.body, null));
      } else {
        items.push({ type: "line", points: [[cx - r.body * 0.9, ly + r.body * 1.1], [cx + r.body * 0.9, ly + r.body * 1.1]], width: r.weight * 0.7 });
        answers.push(...fractionLabel(f, cx, ly, r.body, env.ink.answer));
      }
    });
    return { items, answers, issues: issues.slice(0, 1) };
  },
};

/** A stacked fraction: numerator, bar, denominator (in red for the key). */
function fractionLabel(f, cx, y, size, colour) {
  const box = (text, dy) => ({ type: "text", x: cx - size * 1.5, y: y + dy, w: size * 3, h: size * 1.05, text: String(text), size, align: "center", valign: "middle", weight: "bold", lines: 1, ...(colour ? { colour } : {}) });
  return [box(f.n, 0), box(f.d, size * 1.2), ...(colour ? [] : [{ type: "line", points: [[cx - size * 0.6, y + size * 1.12], [cx + size * 0.6, y + size * 1.12]], width: 1.6 }])];
}
