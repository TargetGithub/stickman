// colour_page (WORKBOOK_SPEC 5): one to four large line-art pictures side by side on an optional ground line.

import { ART_SCHEMA } from "../art.js";

export const colourPage = {
  name: "colour_page",
  params: {
    art: { type: "array", minItems: 1, maxItems: 4, items: ART_SCHEMA, description: "What to colour, left to right." },
    ground: { type: "boolean", description: "A ground line under the pictures (default true)." },
  },
  required: ["art"],
  artPaths: (block) => block.art.map((ref, i) => [ref, `art[${i}]`]),
  generate(block, box, env) {
    const ground = block.ground !== false;
    const floor = box.y + box.h - (ground ? env.rules.weight * 2 : 0);
    const h = floor - box.y;
    // Pictures keep their sizes relative to each other (one scale for all), but none is under 40% of the
    // height, so small things stay big enough to colour; widths follow, then everything shrinks to fit.
    const sizes = block.art.map((ref) => env.measure(ref) || { x0: 0, y0: 0, x1: 1, y1: 1 }).map((b) => ({ w: b.x1 - b.x0, h: b.y1 - b.y0 }));
    const tallest = Math.max(...sizes.map((z) => z.h));
    const heights = sizes.map((z) => h * Math.max(0.4, z.h / tallest));
    const widths = sizes.map((z, i) => (heights[i] * z.w) / z.h);
    const gap = box.w * 0.04;
    const k = Math.min(1, (box.w - gap * (sizes.length - 1)) / widths.reduce((a, b) => a + b, 0));
    let x = box.x + (box.w - widths.reduce((a, b) => a + b * k, 0) - gap * (sizes.length - 1)) / 2;
    const items = block.art.map((ref, i) => {
      const it = { type: "art", ref, x, y: floor - heights[i] * k, w: widths[i] * k, h: heights[i] * k, align: "bottom" };
      x += widths[i] * k + gap;
      return it;
    });
    if (ground) items.push({ type: "line", points: [[box.x, floor], [box.x + box.w, floor]], width: env.rules.weight });
    return { items, answers: [], issues: [] };
  },
};
