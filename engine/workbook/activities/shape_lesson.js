// shape_lesson (WORKBOOK_SPEC 5): one shape big with its corners marked, its name and facts, a row of dashed
// copies to trace, and three things in real life that have the shape. No answers.

import { cornerPoints } from "../shape_facts.js";
import { atLeast } from "../grades.js";

const RAD = Math.PI / 180;
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const article = (word) => (/^[aeiou]/.test(word) ? "an" : "a");

/** The lesson's fact lines for a shape at a grade (square corners from grade 1). */
export function shapeFacts(def, grade) {
  const lines = [];
  if (def.curved && def.sides === 0) lines.push("No straight sides");
  else lines.push(count(def.sides, "side", "sides"));
  lines.push(count(def.corners, "corner", "corners"));
  if (def.rightAngles && atLeast(grade, "1")) lines.push(count(def.rightAngles, "square corner", "square corners"));
  if (atLeast(grade, "2") && def.symmetry > 0) lines.push(count(def.symmetry, "line of symmetry", "lines of symmetry"));
  return lines;
}

export const shapeLesson = {
  name: "shape_lesson",
  params: {
    shape: { type: "string", description: "A shape from the education catalog." },
  },
  required: ["shape"],
  artPaths: (block) => [[{ shape: block.shape }, "shape"]],
  generate(block, box, env) {
    const r = env.rules;
    const def = env.catalog.education.shapes[block.shape];
    const items = [];
    // Top: the shape big (left) with its corners dotted, the name and facts (right).
    const topH = box.h * 0.56;
    const size = Math.min(box.w * 0.5, topH) * 0.86;
    const cx = box.x + box.w * 0.28;
    const cy = box.y + topH / 2;
    items.push({ type: "shape", name: block.shape, x: cx, y: cy, size, style: "outline", width: r.weight * 1.4 });
    for (const [px, py] of cornerPoints(def.geometry)) items.push({ type: "circle", x: cx + (px * size) / 2, y: cy + (py * size) / 2, r: r.weight * 1.6, width: 0, fill: "#000000" });
    const fx = box.x + box.w * 0.58;
    const fw = box.w * 0.42;
    items.push({ type: "text", x: fx, y: box.y + topH * 0.12, w: fw, h: r.title * 1.6, text: def.label[0].toUpperCase() + def.label.slice(1), size: r.title * 1.25, weight: "bold", lines: 1 });
    const facts = [...shapeFacts(def, env.grade), ...(def.note && env.grade !== "prek" ? [def.note] : [])];
    let y = box.y + topH * 0.12 + r.title * 1.9;
    for (const f of facts) {
      const lines = f.length > 22 ? 2 : 1;
      items.push({ type: "text", x: fx, y, w: fw, h: r.body * 1.25 * lines, text: f, size: r.body, lines });
      y += r.body * 1.35 * lines + 4;
    }
    // Middle: trace it (three dashed copies, a start dot on the first corner or the top).
    const midY = box.y + topH + 8;
    const midH = box.h * 0.26;
    items.push({ type: "text", x: box.x, y: midY, w: box.w, h: r.body * 1.3, text: "Trace it:", size: r.body, weight: "bold", lines: 1 });
    const ts = Math.min(midH - r.body * 1.6, box.w / 3.6);
    const ty = midY + r.body * 1.4 + ts / 2 + 2;
    for (let i = 0; i < 3; i++) {
      const tx = box.x + (box.w * (i + 0.5)) / 3;
      items.push({ type: "shape", name: block.shape, x: tx, y: ty, size: ts, style: "trace", width: r.weight });
      const [sx, sy] = cornerPoints(def.geometry)[0] || [Math.cos(-90 * RAD), Math.sin(-90 * RAD) * (def.geometry.ry ?? 1)];
      items.push({ type: "circle", x: tx + (sx * ts) / 2, y: ty + (sy * ts) / 2, r: r.weight * 1.5, width: 0, fill: env.ink.start });
    }
    // Bottom: where you can see it.
    const botY = box.y + topH + midH + 16;
    items.push({ type: "text", x: box.x, y: botY, w: box.w, h: r.body * 1.3, text: `Find ${article(def.label)} ${def.label} in real life:`, size: r.body, weight: "bold", lines: 1 });
    const chipW = (box.w - 24) / 3;
    const chipH = Math.min(r.body * 2.4, box.y + box.h - botY - r.body * 1.6);
    def.examples.slice(0, 3).forEach((ex, i) => {
      const x = box.x + i * (chipW + 12);
      items.push({ type: "rect", x, y: botY + r.body * 1.6, w: chipW, h: chipH, width: r.weight * 0.6, radius: 10 });
      items.push({ type: "text", x: x + 6, y: botY + r.body * 1.6, w: chipW - 12, h: chipH, text: ex, size: r.body, align: "center", valign: "middle", lines: 1 });
    });
    return { items, answers: [], issues: [] };
  },
};
