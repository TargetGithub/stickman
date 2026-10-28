// read_passage (WORKBOOK_SPEC 5): a short reading passage in a frame, then questions about it: multiple choice
// (circle the answer) or open (write on the lines). The passage and its questions come from
// education/passages.json or are written in the block. The key rings the right options and writes open answers.

import { QUESTION, sourceIssues, questionIssues, shuffleOptions, optionRow, writeLines } from "./qa_items.js";

/** Rough line count of a text in a width at a size (Andika averages about half an em per character). */
export const linesFor = (text, w, size) => text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil((para.length * size * 0.5) / w)), 0);

export const readPassage = {
  name: "read_passage",
  params: {
    passage: { type: "string", description: "A passage from education/passages.json (its questions come with it)." },
    title: { type: "string", minLength: 1, maxLength: 40, description: "The title of a passage written in the block." },
    text: { type: "string", minLength: 20, maxLength: 900, description: "A passage written in the block (instead of passage)." },
    questions: { type: "array", minItems: 1, maxItems: 5, items: QUESTION(true), description: "Questions about a written passage; with a catalog passage they replace its own." },
  },
  required: [],
  artPaths: () => [],
  texts: (block) => [[block.title, "title"], [block.text, "text"], ...(block.questions || []).flatMap((q, i) => [[q.q, `questions[${i}].q`], ...(q.options || []).map((o, k) => [o, `questions[${i}].options[${k}]`])])].filter(([t]) => t),
  check(block, path, catalog, rules, grade) {
    if (!block.passage === !block.text) return [{ code: "E_WB_SOURCE", path, message: "read_passage needs either a catalog passage or its own text, not both.", fix: 'Name a "passage", or write "text" and "questions".' }];
    if (block.passage) return [...sourceIssues(catalog.education?.passages?.passages, block.passage, `${path}.passage`, "passage", grade), ...questionIssues(block.questions || [], `${path}.questions`, true)];
    if (!block.questions) return [{ code: "E_WB_SOURCE", path: `${path}.questions`, message: "A written passage needs its questions.", fix: 'Add "questions": [...].' }];
    return questionIssues(block.questions, `${path}.questions`, true);
  },
  generate(block, box, env) {
    const r = env.rules;
    const src = block.passage ? env.catalog.education.passages.passages[block.passage] : { title: block.title, text: block.text, questions: block.questions };
    const qs = (block.questions ?? src.questions).map((q) => shuffleOptions(q, env.rng));
    const size = r.body;
    const pad = 10;
    const titleH = src.title ? size * 1.5 : 0;
    const lines = linesFor(src.text, box.w - 2 * pad, size) + 1;
    const qUnits = qs.reduce((n, q) => n + (q.options ? 2.6 : 1.5 + (q.lines ?? 1) * 1.6), 0);
    const natural = titleH + lines * size * 1.2 + 2 * pad;
    const passH = Math.min(natural, box.h - qUnits * size * 1.25);
    const items = [];
    const answers = [];
    const issues = [];
    // The renderer shrinks text a little to fit; much less room than the passage needs is too small to read.
    if (passH < natural * 0.75) issues.push({ code: "E_WB_FIT", path: "text", message: "The passage and its questions do not fit the slot at this grade's type size.", fix: "Use a shorter passage, fewer questions or a full page." });
    items.push({ type: "rect", x: box.x, y: box.y, w: box.w, h: passH, radius: 8, width: r.weight * 0.6 });
    if (src.title) items.push({ type: "text", x: box.x + pad, y: box.y + pad * 0.6, w: box.w - 2 * pad, h: titleH, text: src.title, size: size * 1.1, weight: "bold", align: "center", valign: "middle", lines: 1 });
    const textH = passH - titleH - 2 * pad;
    items.push({ type: "text", x: box.x + pad, y: box.y + pad + titleH, w: box.w - 2 * pad, h: textH, text: src.text.replace(/\n/g, " "), size, align: "left", lines: Math.max(1, Math.floor((textH + size * 0.3) / (size * 1.2))) });
    let y = box.y + passH + 10;
    const unit = (box.y + box.h - y) / Math.max(1, qUnits);
    qs.forEach((q, i) => {
      const qh = Math.min(unit * 1.5, size * 2.5);
      items.push({ type: "text", x: box.x, y, w: size * 1.6, h: size * 1.25, text: `${i + 1}.`, size, weight: "bold", align: "left", lines: 1 },
        { type: "text", x: box.x + size * 1.6, y, w: box.w - size * 1.6, h: qh, text: q.q, size, align: "left", lines: 2 });
      if (q.options) {
        const oh = Math.min(unit * 1.1, size * 1.8);
        const row = optionRow(q.options, q.answer, box.x + size * 1.6, y + qh, box.w - size * 1.6, oh, env);
        items.push(...row.items);
        answers.push(...row.answers);
        y += unit * 2.6;
      } else {
        const n = q.lines ?? 1;
        const lh = unit * 1.6 * n;
        const row = writeLines(box.x + size * 1.6, y + qh - size * 0.2, box.w - size * 1.6, lh, n, q.answer, env);
        items.push(...row.items);
        answers.push(...row.answers);
        y += unit * (1.5 + 1.6 * n);
      }
    });
    return { items, answers, issues };
  },
};
