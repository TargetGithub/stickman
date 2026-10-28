// math_facts (WORKBOOK_SPEC 5): a grid of numbered problems from a math template (education/math.json):
// addition, subtraction, multiplication and division, across ("3 + 4 = ___") or stacked in columns (long
// division under a bracket), each at the top of its cell with room to work below. Missing-part templates
// ("___ + 4 = 7") are always across. The key writes answers in red.

import { makeProblems, sentence, show, answerText } from "../math_problems.js";
import { sourceIssues, tokenRow, gridCells, numberLabel } from "./qa_items.js";

export const mathFacts = {
  name: "math_facts",
  params: {
    template: { type: "string", description: "A math template from education/math.json, for example add_within_10." },
    count: { type: "integer", minimum: 1, maximum: 30, description: "How many problems (default the template's)." },
    form: { enum: ["across", "stacked"], description: "Across (3 + 4 = ___) or stacked in columns (default the template's)." },
  },
  required: ["template"],
  artPaths: () => [],
  check: (block, path, catalog, rules, grade) => sourceIssues(catalog.education?.math?.templates, block.template, `${path}.template`, "math template", grade),
  generate(block, box, env) {
    const t = env.catalog.education.math.templates[block.template];
    const n = block.count ?? t.count ?? 12;
    const form = t.missing && t.missing !== "answer" ? "across" : block.form ?? t.form ?? "across";
    const problems = makeProblems(t, n, env.rng);
    if (!problems) return { items: [], answers: [], issues: [{ code: "E_WB_FIT", path: "template", message: `The template '${block.template}' cannot make a problem.`, fix: "Fix the template's ranges." }] };
    const r = env.rules;
    const wide = Math.max(...problems.map((p) => Math.max(show(p.a, t.decimals).length, show(p.b, t.decimals).length, answerText(p, t.decimals).length)));
    const cellW = form === "stacked" ? (wide + 2) * r.body * 0.62 + r.small * 2.5 : (wide * 3 + 6) * r.body * 0.62 + r.small * 2.5;
    const cols = Math.max(1, Math.min(n, Math.floor(box.w / cellW), form === "stacked" ? 6 : 3));
    const cells = gridCells(box, n, cols);
    const need = form === "stacked" ? r.body * 4.4 : r.body * 1.8;
    const issues = cells[0].h < need ? [{ code: "E_WB_FIT", path: "count", message: `${n} problems do not fit the slot at this grade's type size.`, fix: "Use fewer problems or a bigger slot." }] : [];
    const items = [];
    const answers = [];
    problems.forEach((p, i) => {
      const c = cells[i];
      items.push(numberLabel(c, i, env));
      const x = c.x + r.small * 2.4;
      const w = c.w - r.small * 2.4 - 8;
      const out = form === "stacked" ? (p.op === "÷" ? longDivision(p, x, c.y, w, c.h, env) : stacked(p, t.decimals, x, c.y, w, c.h, env))
        : tokenRow(sentence(p, t.missing, t.decimals), x, c.y + (c.h - r.body * 1.6) / 2, r.body * 1.6, r.body, env);
      items.push(...out.items);
      answers.push(...out.answers);
    });
    return { items, answers, issues };
  },
};

/** A stacked problem: the numbers right-aligned in a column, the operator on the left, a rule, the answer below. */
function stacked(p, decimals, x, y, w, h, env) {
  const r = env.rules;
  const lh = r.body * 1.25;
  const wide = Math.max(show(p.a, decimals).length, show(p.b, decimals).length, answerText(p, decimals).length) + 1;
  const cw = Math.min(w, wide * r.body * 0.62 + 6);
  const top = y + Math.min(r.small * 1.6, Math.max(0, h - lh * 3.4)); // near the number, room to work below
  const row = (text, k, colour, answer) => ({ type: "text", x, y: top + lh * k, w: cw, h: lh, text, size: r.body, align: "right", valign: "middle", lines: 1, ...(colour ? { colour, answer } : {}) });
  const items = [row(show(p.a, decimals), 0), row(show(p.b, decimals), 1), { type: "text", x, y: top + lh, w: r.body, h: lh, text: p.op, size: r.body, align: "left", valign: "middle", lines: 1 },
    { type: "line", points: [[x, top + lh * 2.1], [x + cw, top + lh * 2.1]], width: r.weight * 0.7 }];
  return { items, answers: [row(answerText(p, decimals), 2.2, env.ink.answer, true)] };
}

/** Long division: the divisor, a bracket over the dividend, the quotient (key) above the bar. */
function longDivision(p, x, y, w, h, env) {
  const r = env.rules;
  const lh = r.body * 1.3;
  const top = y + r.small * 1.4;
  const dw = String(p.b).length * r.body * 0.62 + 6;
  const aw = Math.max(String(p.a).length, answerText(p).length) * r.body * 0.62 + 10;
  const bx = x + dw + 2;
  const by = top + lh;
  const items = [
    { type: "text", x, y: by, w: dw, h: lh, text: String(p.b), size: r.body, align: "right", valign: "middle", lines: 1 },
    { type: "text", x: bx + 6, y: by, w: aw, h: lh, text: String(p.a), size: r.body, align: "left", valign: "middle", lines: 1 },
    { type: "poly", points: [[bx, by + lh], [bx + 5, by + lh * 0.5], [bx, by], [bx + aw + 6, by]], width: r.weight * 0.7 },
  ];
  return { items, answers: [{ type: "text", x: bx + 6, y: top, w: Math.min(aw + 30, w), h: lh, text: answerText(p), size: r.body, align: "left", valign: "middle", lines: 1, colour: env.ink.answer, answer: true }] };
}
