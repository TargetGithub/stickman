// dot_to_dot (WORKBOOK_SPEC 5): numbered dots round a shape's outline or a dot picture; the child joins them in
// order. Shapes are resampled to `points` dots keeping every corner, clockwise from the top; dot pictures keep
// their authored dots and show their details. Numbers sit outside the outline. The key draws the outline.

import { outlineOf, clockwiseFromTop, resample } from "../outline.js";
import { cornerPoints } from "../shape_facts.js";

export const dotToDot = {
  name: "dot_to_dot",
  params: {
    subject: { oneOf: [
      { type: "object", required: ["shape"], additionalProperties: false, properties: { shape: { type: "string" } } },
      { type: "object", required: ["picture"], additionalProperties: false, properties: { picture: { type: "string" } } },
    ], "x-formMessage": '{"shape": "star"} or {"picture": "fish"} (a dot picture).' },
    points: { type: "integer", minimum: 3, maximum: 40, description: "Dots for a shape (default: its corners, at least 8, at most the grade's)." },
  },
  required: ["subject"],
  artPaths: (block) => (block.subject.shape ? [[{ shape: block.subject.shape }, "subject"]] : []),
  check(block, path, catalog) {
    const pics = catalog.education?.dotPictures || {};
    if (block.subject.picture && !pics[block.subject.picture]) return [{ code: "E_WB_PICTURE", path: `${path}.subject.picture`, message: `Unknown dot picture '${block.subject.picture}'.`, fix: `Use one of: ${Object.keys(pics).join(", ")}.` }];
    return [];
  },
  limits(block, rules) {
    return block.points > rules.dotsMax ? [["points", block.points, rules.dotsMax]] : [];
  },
  generate(block, box, env) {
    const r = env.rules;
    const ed = env.catalog.education;
    const pic = block.subject.picture ? ed.dotPictures[block.subject.picture] : null;
    let dots;
    if (pic) dots = pic.points;
    else {
      const g = ed.shapes[block.subject.shape].geometry;
      const corners = cornerPoints(g);
      dots = clockwiseFromTop(resample(outlineOf(g), Math.min(r.dotsMax, block.points ?? Math.max(8, corners.length)), corners));
    }
    const issues = dots.length > r.dotsMax ? [{ code: "E_WB_GRADE", path: "subject", message: `${dots.length} dots is over the grade ${env.grade} limit.`, fix: `Use at most ${r.dotsMax} dots (a simpler picture).` }] : [];
    const s = Math.min(box.w, box.h) * 0.42;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const at = ([x, y]) => [cx + x * s, cy + y * s];
    const mx = dots.reduce((a, d) => a + d[0], 0) / dots.length;
    const my = dots.reduce((a, d) => a + d[1], 0) / dots.length;
    const items = [];
    for (const d of pic?.details || []) items.push({ type: "poly", points: d.map(at), width: Math.max(1.5, r.weight * 0.7) });
    dots.forEach(([x, y], i) => {
      const [px, py] = at([x, y]);
      const len = Math.hypot(x - mx, y - my) || 1;
      const size = r.small * 1.2;
      const off = size * 1.1;
      items.push({ type: "circle", x: px, y: py, r: r.weight * (i === 0 ? 2 : 1.4), width: 0, fill: i === 0 ? env.ink.start : "#000000" });
      items.push({ type: "text", x: px + ((x - mx) / len) * off - size, y: py + ((y - my) / len) * off - size * 0.7, w: size * 2, h: size * 1.4, text: String(i + 1), size, align: "center", valign: "middle", weight: "bold", lines: 1 });
    });
    const closed = [...dots.map(at), at(dots[0])];
    return { items, answers: [{ type: "poly", points: closed, width: Math.max(2, r.weight * 0.8), colour: env.ink.answer }], issues };
  },
};
