// colour_by_shape (WORKBOOK_SPEC 5): a shape picture in outline with a key below ("triangle = red"); the answer
// key fills each shape with its colour. Without a key, the picture's shapes take crayon colours in catalog order.

const LIGHT = ["yellow", "pink", "orange"]; // colours whose word reads poorly on its own swatch

/** The key { shape: colour } a block uses: its own, or the picture's shapes in order with crayon colours. */
export function colourKey(block, education) {
  if (block.key) return block.key;
  const shapes = [...new Set(education.pictures[block.picture].parts.map((p) => p.shape))];
  const colours = Object.keys(education.colours).filter((c) => c !== "black");
  return Object.fromEntries(shapes.map((s, i) => [s, colours[i % colours.length]]));
}

export const colourByShape = {
  name: "colour_by_shape",
  params: {
    picture: { type: "string", description: "A shape picture from the education catalog." },
    key: { type: "object", minProperties: 1, maxProperties: 6, additionalProperties: { type: "string" }, description: "Shape name → crayon colour (default: one colour per shape in the picture)." },
  },
  required: ["picture"],
  artPaths: () => [],
  check(block, path, catalog) {
    const ed = catalog.education || {};
    const pic = ed.pictures?.[block.picture];
    if (!pic) return [{ code: "E_WB_PICTURE", path: `${path}.picture`, message: `Unknown shape picture '${block.picture}'.`, fix: `Use one of: ${Object.keys(ed.pictures || {}).join(", ")}.` }];
    const used = new Set(pic.parts.map((p) => p.shape));
    const out = [];
    for (const [shape, colour] of Object.entries(block.key || {})) {
      if (!used.has(shape)) out.push({ code: "E_WB_SHAPE", path: `${path}.key.${shape}`, message: `The ${block.picture} picture has no ${shape}.`, fix: `Its shapes: ${[...used].join(", ")}.` });
      if (!ed.colours[colour]) out.push({ code: "E_WB_COLOUR", path: `${path}.key.${shape}`, message: `Unknown colour '${colour}'.`, fix: `Use one of: ${Object.keys(ed.colours).join(", ")}.` });
    }
    return out;
  },
  generate(block, box, env) {
    const r = env.rules;
    const ed = env.catalog.education;
    const pic = ed.pictures[block.picture];
    const key = colourKey(block, ed);
    const entries = Object.entries(key);
    const legendRowH = r.body * 2.2;
    const cols = entries.length > 3 ? 2 : 1;
    const legendH = Math.ceil(entries.length / cols) * legendRowH + 8;
    const s = Math.min(box.w, box.h - legendH - 8);
    const x0 = box.x + (box.w - s) / 2;
    const items = [];
    const answers = [];
    for (const q of pic.parts) {
      const at = { name: q.shape, x: x0 + q.x * s, y: box.y + q.y * s, size: q.size * s, rotate: q.rotate ?? 0, width: Math.max(1.5, r.weight * 0.8) };
      items.push({ type: "shape", ...at, style: "outline" });
      if (key[q.shape]) answers.push({ type: "shape", ...at, style: "filled", fill: ed.colours[key[q.shape]].hex });
    }
    // The key: a small shape, "=", and the colour word in an outlined crayon.
    const ly = box.y + s + 12;
    const colW = box.w / cols;
    entries.forEach(([shape, colour], i) => {
      const cx = box.x + (i % cols) * colW + colW * 0.1;
      const cy = ly + Math.floor(i / cols) * legendRowH + legendRowH / 2;
      const sz = legendRowH * 0.75;
      items.push({ type: "shape", name: shape, x: cx + sz / 2, y: cy, size: sz, style: "outline", width: 1.5 });
      items.push({ type: "text", x: cx + sz + 6, y: cy - r.body * 0.65, w: r.body * 1.2, h: r.body * 1.3, text: "=", size: r.body, align: "center", lines: 1 });
      const cw = Math.min(colW * 0.55, r.body * 6);
      const crayon = cx + sz + 6 + r.body * 1.4;
      items.push({ type: "rect", x: crayon, y: cy - legendRowH * 0.35, w: cw, h: legendRowH * 0.7, width: 1.5, radius: legendRowH * 0.35 });
      items.push({ type: "text", x: crayon, y: cy - legendRowH * 0.35, w: cw, h: legendRowH * 0.7, text: colour, size: r.body, align: "center", valign: "middle", weight: "bold", lines: 1 });
      answers.push({ type: "rect", x: crayon, y: cy - legendRowH * 0.35, w: cw, h: legendRowH * 0.7, width: 1.5, radius: legendRowH * 0.35, fill: ed.colours[colour].hex, colour: "#000000" });
      answers.push({ type: "text", x: crayon, y: cy - legendRowH * 0.35, w: cw, h: legendRowH * 0.7, text: colour, size: r.body, align: "center", valign: "middle", weight: "bold", lines: 1, colour: LIGHT.includes(colour) ? "#000000" : "#ffffff" });
    });
    return { items, answers, issues: [] };
  },
};
