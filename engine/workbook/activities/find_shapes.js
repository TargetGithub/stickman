// find_shapes (WORKBOOK_SPEC 5): target shapes scattered among other shapes, none touching; the child colours
// or circles every target and writes how many. The key circles them in red and writes the count.
// Placement: seeded rejection sampling of circles (each shape's unit box fits radius 1) with a clear gap.

import { atLeast } from "../grades.js";

const GAP = 10; // pt between shapes
const TRIES = 400;
const plural = (w) => (/(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`);

/** Place n circles of the given radii in a box without overlap; null when one does not fit. */
export function scatter(radii, box, rng) {
  const placed = [];
  for (const r of radii) {
    let spot = null;
    for (let t = 0; t < TRIES && !spot; t++) {
      const x = box.x + r + rng() * Math.max(0, box.w - 2 * r);
      const y = box.y + r + rng() * Math.max(0, box.h - 2 * r);
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + GAP)) spot = { x, y, r };
    }
    if (!spot) return null;
    placed.push(spot);
  }
  return placed;
}

export const findShapes = {
  name: "find_shapes",
  params: {
    target: { type: "string", description: "The shape to find." },
    count: { type: "integer", minimum: 1, maximum: 20, description: "How many targets." },
    distractors: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" }, description: "Other shapes mixed in." },
    others: { type: "integer", minimum: 0, maximum: 30, description: "How many other shapes (default: count + 2)." },
    askCount: { type: "boolean", description: "Ask how many (default true)." },
  },
  required: ["target", "count", "distractors"],
  artPaths: (block) => [[{ shape: block.target }, "target"], ...block.distractors.map((s, i) => [{ shape: s }, `distractors[${i}]`])],
  limits: (block, rules) => (block.count > rules.countMax ? [["count", block.count, rules.countMax]] : []),
  check(block, path) {
    return block.distractors.includes(block.target) ? [{ code: "E_WB_SHAPE", path: `${path}.distractors`, message: `The target '${block.target}' is also a distractor.`, fix: "List only other shapes as distractors." }] : [];
  },
  generate(block, box, env) {
    const r = env.rules;
    const ask = block.askCount !== false;
    const stripH = ask ? Math.max(r.body * 2.4, 54) : 0;
    const area = { x: box.x, y: box.y, w: box.w, h: box.h - stripH - (ask ? 8 : 0) };
    const others = block.others ?? block.count + 2;
    // Targets first, then the others round-robin; sizes between the grade's smallest item and 1.5 times it.
    const list = [...Array(block.count).fill(block.target), ...Array.from({ length: others }, (_, i) => block.distractors[i % block.distractors.length])];
    const sizes = list.map(() => r.minItem * (1 + env.rng() * 0.5));
    const order = list.map((_, i) => i).sort((a, b) => sizes[b] - sizes[a] || a - b); // big ones first place best
    const spots = scatter(order.map((i) => sizes[i] / 2), area, env.rng);
    if (!spots) return { items: [], answers: [], issues: [{ code: "E_WB_FIT", path: "count", message: `${list.length} shapes do not fit in the slot at this grade's size.`, fix: "Use fewer shapes, or a bigger slot." }] };
    const turn = atLeast(env.grade, "1");
    const items = [];
    const answers = [];
    order.forEach((i, k) => {
      const { x, y } = spots[k];
      const rotate = turn ? [0, 90, 180, 270][Math.floor(env.rng() * 4)] : 0;
      items.push({ type: "shape", name: list[i], x, y, size: sizes[i], rotate, style: "outline", width: Math.max(1.5, r.weight * 0.8) });
      if (list[i] === block.target) answers.push({ type: "circle", x, y, r: sizes[i] / 2 + 6, width: 3, colour: env.ink.answer });
    });
    if (ask) {
      const y = box.y + box.h - stripH;
      const bs = Math.min(stripH, 54);
      items.push({ type: "text", x: box.x, y: y + (stripH - r.body * 1.3) / 2, w: box.w - bs - 12, h: r.body * 1.3, text: `How many ${plural(env.catalog.education.shapes[block.target].label)}?`, size: r.body, weight: "bold", align: "right", lines: 1 });
      items.push({ type: "rect", x: box.x + box.w - bs, y: y + (stripH - bs) / 2, w: bs, h: bs, width: r.weight * 0.7, radius: 6 });
      answers.push({ type: "text", x: box.x + box.w - bs, y: y + (stripH - bs) / 2, w: bs, h: bs, text: String(block.count), size: bs * 0.7, align: "center", valign: "middle", weight: "bold", colour: env.ink.answer });
    }
    return { items, answers, issues: [] };
  },
};
