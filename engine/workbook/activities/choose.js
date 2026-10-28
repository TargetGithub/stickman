// choose (WORKBOOK_SPEC 5): numbered multiple-choice questions; the child circles the right option. Questions
// are written in the block or taken from a question set (education/questions.json): phonics, sight words,
// grammar, vocabulary, science, social studies, logic. Options are shuffled by the stream unless `shuffle` is
// false. A question may carry a picture (an art reference) at its left. The key rings the right option in red.

import { ART_SCHEMA } from "../art.js";
import { QUESTION, sourceIssues, questionIssues, pickInOrder, shuffleOptions, optionRow } from "./qa_items.js";

const PICTURED = { ...QUESTION(false), properties: { ...QUESTION(false).properties, picture: { ...ART_SCHEMA, description: "A picture shown with the question (optional)." } } };

/** The questions a block asks: its own, or `count` from its set (in the set's order), options shuffled. */
export function questionsOf(block, catalog, rng) {
  const list = block.questions ?? pickInOrder(catalog.education.questions.sets[block.set].questions, block.count ?? 6, rng);
  return block.shuffle === false ? list : list.map((q) => shuffleOptions(q, rng));
}

export const choose = {
  name: "choose",
  params: {
    questions: { type: "array", minItems: 1, maxItems: 8, items: PICTURED, description: "Questions with 2-4 options and the index of the right one." },
    set: { type: "string", description: "A question set from education/questions.json (instead of questions)." },
    count: { type: "integer", minimum: 1, maximum: 8, description: "How many questions from the set (default 6)." },
    shuffle: { type: "boolean", description: "Shuffle the options (default true)." },
  },
  required: [],
  artPaths: (block) => (block.questions || []).map((q, i) => [q.picture, `questions[${i}].picture`]).filter(([ref]) => ref),
  texts: (block) => (block.questions || []).flatMap((q, i) => [[q.q, `questions[${i}].q`], ...(q.options || []).map((o, k) => [o, `questions[${i}].options[${k}]`])]),
  check(block, path, catalog, rules, grade) {
    if (!block.questions === !block.set) return [{ code: "E_WB_SOURCE", path, message: "choose needs either questions or a set, not both.", fix: 'Write "questions": [...] or name a "set".' }];
    if (block.set) return sourceIssues(catalog.education?.questions?.sets, block.set, `${path}.set`, "question set", grade);
    return questionIssues(block.questions, `${path}.questions`, false);
  },
  generate(block, box, env) {
    const r = env.rules;
    const qs = questionsOf(block, env.catalog, env.rng);
    const rowH = box.h / qs.length;
    const items = [];
    const answers = [];
    const issues = [];
    const need = r.body * 3.2;
    if (rowH < need) issues.push({ code: "E_WB_FIT", path: block.set ? "count" : "questions", message: `${qs.length} questions do not fit the slot at this grade's type size.`, fix: "Ask fewer questions or use a bigger slot." });
    qs.forEach((q, i) => {
      const y = box.y + rowH * i;
      const pic = q.picture ? Math.min(rowH - 8, box.w * 0.2) : 0;
      const x = box.x + (pic ? pic + 12 : 0);
      const w = box.w - (pic ? pic + 12 : 0);
      if (pic) items.push({ type: "art", ref: q.picture, x: box.x, y: y + (rowH - pic) / 2, w: pic, h: pic, align: "center" });
      const qh = Math.min(rowH * 0.5, r.body * 1.25 * 2);
      items.push({ type: "text", x, y: y + 2, w: r.body * 1.6, h: r.body * 1.25, text: `${i + 1}.`, size: r.body, weight: "bold", align: "left", lines: 1 },
        { type: "text", x: x + r.body * 1.6, y: y + 2, w: w - r.body * 1.6, h: qh, text: q.q, size: r.body, align: "left", lines: 2 });
      const oh = Math.min(rowH - qh - 6, r.body * 1.8);
      const row = optionRow(q.options, q.answer, x + r.body * 1.6, y + qh + 4, w - r.body * 1.6, oh, env);
      items.push(...row.items);
      answers.push(...row.answers);
      if (i > 0) items.push({ type: "line", points: [[box.x, y], [box.x + box.w, y]], width: 1, colour: env.ink.guide, dash: [4, 4] });
    });
    return { items, answers, issues };
  },
};
