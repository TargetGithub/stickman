// trace_shapes (WORKBOOK_SPEC 5): one row per shape, the shape repeated across the row as dashed copies that fade,
// the first with a green start dot. No answers.

import { cornerPoints } from "../shape_facts.js";

export const traceShapes = {
  name: "trace_shapes",
  params: {
    shapes: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" }, description: "Shapes to trace, one row each." },
    rows: { type: "integer", minimum: 1, maximum: 6, description: "Rows (default: one per shape; shapes repeat if there are more rows)." },
  },
  required: ["shapes"],
  artPaths: (block) => block.shapes.map((s, i) => [{ shape: s }, `shapes[${i}]`]),
  generate(block, box, env) {
    const r = env.rules;
    const rows = block.rows ?? block.shapes.length;
    const rowH = box.h / rows;
    const size = Math.min(rowH * 0.8, r.minItem * 1.6);
    const issues = size < r.minItem ? [{ code: "E_WB_FIT", path: "shapes", message: "The shapes are too small to trace at this grade.", fix: "Use fewer rows or a bigger slot." }] : [];
    const per = Math.max(1, Math.floor(box.w / (size * 1.3)));
    const items = [];
    for (let i = 0; i < rows; i++) {
      const name = block.shapes[i % block.shapes.length];
      const def = env.catalog.education.shapes[name];
      const y = box.y + rowH * (i + 0.5);
      for (let k = 0; k < per; k++) {
        const x = box.x + (box.w * (k + 0.5)) / per;
        const shade = Math.round(0x66 + (0x66 * k) / Math.max(1, per - 1));
        items.push({ type: "shape", name, x, y, size, style: "trace", width: Math.max(2, r.weight * 0.9), colour: `#${shade.toString(16).repeat(3)}` });
        if (k === 0) {
          const [sx, sy] = cornerPoints(def.geometry)[0] || [0, -(def.geometry.ry ?? 1)];
          items.push({ type: "circle", x: x + (sx * size) / 2, y: y + (sy * size) / 2, r: r.weight * 1.6, width: 0, fill: env.ink.start });
        }
      }
    }
    return { items, answers: [], issues };
  },
};
