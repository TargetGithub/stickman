// trace_letters (WORKBOOK_SPEC 5): rows on handwriting lines (cap line, dashed midline, baseline). Each row
// starts with a model of the text (numbered stroke starts and arrows), then dashed copies that fade, and ends
// with room to write it alone when the row holds three or more. Letters come from education/letters.json; no answers.

const SPACE = 0.45; // a space, in em
const GAP = 0.18; // between letters, in em

/** The width of a text in em (letters, gaps and spaces). */
export function textWidth(glyphs, text) {
  let w = 0;
  [...text].forEach((ch, i) => (w += (ch === " " ? SPACE : glyphs[ch].w) + (i ? GAP : 0)));
  return w;
}

export const traceLetters = {
  name: "trace_letters",
  params: {
    text: { type: "string", minLength: 1, maxLength: 16, description: "Letters, digits and spaces to trace." },
    rows: { type: "integer", minimum: 1, maximum: 8, description: "How many rows (default: as many as fit)." },
  },
  required: ["text"],
  artPaths: () => [],
  check(block, path, catalog) {
    const glyphs = catalog.education?.letters?.glyphs || {};
    const bad = [...new Set([...block.text].filter((ch) => ch !== " " && !glyphs[ch]))];
    return bad.length ? [{ code: "E_WB_LETTER", path: `${path}.text`, message: `No tracing letter for ${bad.map((c) => `'${c}'`).join(", ")}.`, fix: "Use letters A-Z and a-z, digits 0-9 and spaces." }] : [];
  },
  generate(block, box, env) {
    const r = env.rules;
    const glyphs = env.catalog.education.letters.glyphs;
    const h = r.minItem; // cap height
    const rowH = h * 1.75;
    const fit = Math.floor((box.h + h * 0.4) / rowH);
    const rows = Math.min(block.rows ?? fit, fit);
    const issues = [];
    const word = textWidth(glyphs, block.text) * h;
    const step = word + h * 0.6;
    const per = Math.floor((box.w + h * 0.6) / step);
    if (rows < (block.rows ?? 1) || per < 2) issues.push({ code: "E_WB_FIT", path: "text", message: "The text does not fit its slot at this grade's letter size.", fix: "Use a shorter text, fewer rows or a bigger slot." });
    const items = [];
    for (let i = 0; i < rows; i++) {
      const top = box.y + i * rowH + h * 0.2;
      items.push({ type: "line", points: [[box.x, top], [box.x + box.w, top]], width: 1, colour: env.ink.guide });
      items.push({ type: "line", points: [[box.x, top + h / 2], [box.x + box.w, top + h / 2]], width: 1, colour: env.ink.guide, dash: [5, 4] });
      items.push({ type: "line", points: [[box.x, top + h], [box.x + box.w, top + h]], width: 1.5, colour: "#000000" });
      // The model, then dashed copies (fading), leaving the last place empty to write alone when there are 3 or more.
      const copies = per >= 3 ? per - 1 : per;
      for (let k = 0; k < copies; k++) {
        let x = box.x + k * step + h * 0.15;
        const shade = Math.round(0x88 + (0x33 * k) / Math.max(1, copies - 1));
        const colour = k === 0 ? "#000000" : `#${shade.toString(16).repeat(3)}`;
        for (const ch of block.text) {
          if (ch !== " ") items.push({ type: "glyph", char: ch, x, y: top, h, style: k === 0 ? "model" : "trace", colour, width: Math.max(2, r.weight * 0.9) });
          x += ((ch === " " ? SPACE : glyphs[ch].w) + GAP) * h;
        }
      }
    }
    return { items, answers: [], issues };
  },
};
