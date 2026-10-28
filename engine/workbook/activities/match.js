// match (WORKBOOK_SPEC 5): two columns, the right one shuffled (never left in place); the child draws a line
// from each dot on the left to its partner. Sides are pictures or words. The key draws the lines in red.

import { ART_SCHEMA } from "../art.js";

const SIDE = { oneOf: [...ART_SCHEMA.oneOf, { type: "object", required: ["text"], additionalProperties: false, properties: { text: { type: "string", minLength: 1, maxLength: 16 } } }],
  "x-formMessage": 'A picture ({"shape": "star"}, {"preset": "doopi"}, ...) or a word ({"text": "star"}).' };

/** A shuffle that moves every item when there are two or more (a derangement, by seeded retries). */
export function shuffleAway(n, rng) {
  for (let t = 0; t < 50; t++) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    if (n < 2 || p.every((v, i) => v !== i)) return p;
  }
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

export const match = {
  name: "match",
  params: {
    pairs: { type: "array", minItems: 2, maxItems: 6, items: { type: "array", minItems: 2, maxItems: 2, items: SIDE }, description: "[left, right] pairs: pictures or words." },
  },
  required: ["pairs"],
  artPaths: (block) => block.pairs.flatMap(([a, b], i) => [[a, `pairs[${i}][0]`], [b, `pairs[${i}][1]`]]).filter(([ref]) => !("text" in ref)),
  generate(block, box, env) {
    const r = env.rules;
    const n = block.pairs.length;
    const rowH = box.h / n;
    const colW = box.w * 0.34;
    const size = Math.min(rowH * 0.8, colW);
    const order = shuffleAway(n, env.rng);
    const items = [];
    const answers = [];
    const side = (ref, x, y) => ("text" in ref
      ? { type: "text", x, y: y - rowH * 0.4, w: colW, h: rowH * 0.8, text: ref.text, size: Math.min(r.title, rowH * 0.45), align: "center", valign: "middle", weight: "bold", lines: 1 }
      : { type: "art", ref, x: x + (colW - size) / 2, y: y - size / 2, w: size, h: size, align: "center" });
    const dot = (x, y) => ({ type: "circle", x, y, r: Math.max(3.5, r.weight * 1.4), width: 0, fill: "#000000" });
    const lx = box.x;
    const rx = box.x + box.w - colW;
    const dl = lx + colW + 10;
    const dr = rx - 10;
    block.pairs.forEach(([a], i) => {
      const y = box.y + rowH * (i + 0.5);
      items.push(side(a, lx, y), dot(dl, y));
    });
    order.forEach((src, i) => {
      const y = box.y + rowH * (i + 0.5);
      items.push(side(block.pairs[src][1], rx, y), dot(dr, y));
      answers.push({ type: "line", points: [[dl, box.y + rowH * (src + 0.5)], [dr, y]], width: 3, colour: env.ink.answer });
    });
    return { items, answers, issues: [] };
  },
};
