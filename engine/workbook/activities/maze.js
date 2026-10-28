// maze (WORKBOOK_SPEC 5): a perfect maze with a picture at the entrance (left) and one at the exit (right).
// The key draws the one path in red.

import { ART_SCHEMA } from "../art.js";
import { makeMaze } from "../maze.js";

export const maze = {
  name: "maze",
  params: {
    size: { type: "array", minItems: 2, maxItems: 2, items: { type: "integer", minimum: 3, maximum: 20 }, description: "[columns, rows] (default: the grade's largest square maze)." },
    start: { ...ART_SCHEMA, description: "Who starts (left)." },
    end: { ...ART_SCHEMA, description: "What they are going to (right)." },
  },
  required: [],
  artPaths: (block) => [block.start && [block.start, "start"], block.end && [block.end, "end"]].filter(Boolean),
  limits: (block, rules) => (block.size && Math.max(...block.size) > rules.mazeMax ? [["size", Math.max(...block.size), rules.mazeMax]] : []),
  generate(block, box, env) {
    const r = env.rules;
    const [cols, rows] = block.size || [r.mazeMax, r.mazeMax];
    const artW = block.start || block.end ? Math.min(box.w * 0.15, 90) : 0;
    const cell = Math.min((box.w - 2 * artW - 16) / cols, box.h / rows);
    const issues = cell < r.minItem * 0.45 ? [{ code: "E_WB_FIT", path: "size", message: `A ${cols} x ${rows} maze is too fine for this slot at grade ${env.grade}.`, fix: "Use a smaller maze or a bigger slot." }] : [];
    const m = makeMaze(cols, rows, env.rng);
    const x0 = box.x + (box.w - cols * cell) / 2;
    const y0 = box.y + (box.h - rows * cell) / 2;
    const w = Math.max(1.5, r.weight * 0.9);
    const items = [];
    const seg = (ax, ay, bx, by) => items.push({ type: "line", points: [[x0 + ax * cell, y0 + ay * cell], [x0 + bx * cell, y0 + by * cell]], width: w });
    const sRow = Math.floor(m.start / cols);
    const eRow = Math.floor(m.end / cols);
    seg(0, 0, cols, 0);
    seg(0, rows, cols, rows);
    seg(0, 0, 0, sRow);
    seg(0, sRow + 1, 0, rows);
    seg(cols, 0, cols, eRow);
    seg(cols, eRow + 1, cols, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = y * cols + x;
        if (x < cols - 1 && m.right[c]) seg(x + 1, y, x + 1, y + 1);
        if (y < rows - 1 && m.down[c]) seg(x, y + 1, x + 1, y + 1);
      }
    }
    const artH = Math.min(cell * 2.2, artW * 1.4);
    if (block.start) items.push({ type: "art", ref: block.start, x: x0 - artW - 8, y: y0 + (sRow + 0.5) * cell - artH / 2, w: artW, h: artH, align: "center" });
    if (block.end) items.push({ type: "art", ref: block.end, x: x0 + cols * cell + 8, y: y0 + (eRow + 0.5) * cell - artH / 2, w: artW, h: artH, align: "center" });
    const centre = (c) => [x0 + (c % cols + 0.5) * cell, y0 + (Math.floor(c / cols) + 0.5) * cell];
    const path = [[x0 - cell * 0.4, centre(m.start)[1]], ...m.path.map(centre), [x0 + (cols + 0.4) * cell, centre(m.end)[1]]];
    return { items, answers: [{ type: "line", points: path, width: Math.max(2.5, cell * 0.22), colour: env.ink.answer }], issues };
  },
};
