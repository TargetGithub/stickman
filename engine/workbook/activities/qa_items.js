// Shared pieces for the question activities (WORKBOOK_SPEC 5): catalog sources by name, a seeded pick and
// shuffle, option rows the child circles, writing lines, token rows for number sentences and the grid of cells.
// Pure: display list items only, no text measuring (token widths are estimated from character counts).

import { GRADES } from "../grades.js";

/** The question schema shared by choose and read_passage: a multiple-choice or (read_passage only) open question. */
export const QUESTION = (open) => ({
  type: "object", required: ["q", "answer"], additionalProperties: false,
  properties: {
    q: { type: "string", minLength: 2, maxLength: 120, description: "The question; ___ marks a blank." },
    options: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 24 }, description: "2-4 choices to circle." },
    answer: open ? { oneOf: [{ type: "integer", minimum: 0, maximum: 3 }, { type: "string", minLength: 1, maxLength: 60 }], "x-formMessage": "The index of the right option, or (open question) the answer text." }
      : { type: "integer", minimum: 0, maximum: 3, description: "The index of the right option (0 = first)." },
    lines: { type: "integer", minimum: 1, maximum: 4, description: "Writing lines for an open question (default 1)." },
  },
});

/** E_WB_SOURCE when a named catalog entry is missing, W_WB_LEVEL when it is for a higher grade than the book. */
export function sourceIssues(table, name, path, what, grade) {
  if (!table?.[name]) {
    const names = Object.keys(table || {});
    return [{ code: "E_WB_SOURCE", path, message: `No ${what} named '${name}'.`, fix: `Use one of: ${names.slice(0, 12).join(", ")}${names.length > 12 ? " ..." : ""}.` }];
  }
  const g = table[name].grade;
  if (grade && g && GRADES.indexOf(g) > GRADES.indexOf(grade)) return [{ code: "W_WB_LEVEL", path, message: `'${name}' is meant for grade ${g}, above this book's grade ${grade}.`, fix: "Pick an entry for this grade or lower, or raise the book's grade." }];
  return [];
}

/** E_WB_VALUE when a multiple-choice answer index is not one of the options, or an open answer is missing. */
export function questionIssues(questions, path, open) {
  const out = [];
  questions.forEach((q, i) => {
    if (q.options && (typeof q.answer !== "number" || q.answer >= q.options.length)) out.push({ code: "E_WB_VALUE", path: `${path}[${i}].answer`, message: `Answer ${JSON.stringify(q.answer)} is not one of the ${q.options.length} options.`, fix: "Give the index of the right option: 0 for the first." });
    if (!q.options && (!open || typeof q.answer !== "string")) out.push({ code: "E_WB_VALUE", path: `${path}[${i}]`, message: open ? "An open question needs its answer as text." : "A question needs 2-4 options.", fix: open ? 'Add "answer": "the right answer".' : 'Add "options" and the index of the right one in "answer".' });
  });
  return out;
}

/** A seeded permutation of 0..n-1 (Fisher-Yates). */
export function permute(n, rng) {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/** k items of list in their original order, chosen by the stream (all of them when k >= length). */
export function pickInOrder(list, k, rng) {
  if (k >= list.length) return list.slice();
  return permute(list.length, rng).slice(0, k).sort((a, b) => a - b).map((i) => list[i]);
}

/** A question with its options shuffled (the answer index follows its option). */
export function shuffleOptions(q, rng) {
  if (!q.options) return q;
  const p = permute(q.options.length, rng);
  return { ...q, options: p.map((i) => q.options[i]), answer: p.indexOf(q.answer) };
}

/**
 * A row of options spread across w, each in its own box; the key rings the right one.
 * @returns {{ items: object[], answers: object[] }}
 */
export function optionRow(options, answer, x, y, w, h, env) {
  const items = [];
  const answers = [];
  const cw = w / options.length;
  const size = Math.min(env.rules.body, h * 0.62);
  options.forEach((o, i) => {
    const ox = x + cw * i;
    items.push({ type: "text", x: ox + 4, y, w: cw - 8, h, text: o, size, align: "center", valign: "middle", lines: 1 });
    if (i === answer) answers.push({ type: "rect", x: ox + 2, y: y + 1, w: cw - 4, h: h - 2, radius: h / 2, width: 2.5, colour: env.ink.answer });
  });
  return { items, answers };
}

/** Writing lines in a box: solid grey lines (one per `lines`), the answer (key) on the first. */
export function writeLines(x, y, w, h, lines, answer, env) {
  const items = [];
  const answers = [];
  const step = h / lines;
  for (let i = 0; i < lines; i++) {
    const ly = y + step * (i + 1) - 2;
    items.push({ type: "line", points: [[x, ly], [x + w, ly]], width: 1, colour: env.ink.guide });
  }
  if (answer != null) answers.push({ type: "text", x: x + 4, y: y + step - Math.min(step, env.rules.body * 1.4), w: w - 8, h: Math.min(step, env.rules.body * 1.4) - 3, text: String(answer), size: env.rules.body, align: "left", valign: "middle", colour: env.ink.answer, lines: 1 });
  return { items, answers };
}

/**
 * Tokens of a number sentence laid out left to right from x, centred in h: each token is a string (printed) or
 * { blank, answer } (a line to write on, the answer in red on the key). Widths come from character counts.
 * @returns {{ items: object[], answers: object[], width: number }}
 */
export function tokenRow(tokens, x, y, h, size, env, blankChars = 3) {
  const items = [];
  const answers = [];
  const em = size * 0.62;
  let cx = x;
  for (const t of tokens) {
    if (typeof t === "string") {
      const w = Math.max(1, t.length) * em + size * 0.3;
      items.push({ type: "text", x: cx, y, w, h, text: t, size, align: "center", valign: "middle", lines: 1 });
      cx += w;
    } else {
      const w = Math.max(blankChars, String(t.answer).length) * em + size * 0.4;
      items.push({ type: "line", points: [[cx + 2, y + h * 0.82], [cx + w - 2, y + h * 0.82]], width: env.rules.weight * 0.6 });
      answers.push({ type: "text", x: cx, y, w, h: h * 0.8, text: String(t.answer), size, align: "center", valign: "middle", colour: env.ink.answer, lines: 1 });
      cx += w;
    }
  }
  return { items, answers, width: cx - x };
}

/** The cells of a cols x rows grid in a box, in reading order. */
export function gridCells(box, n, cols) {
  const rows = Math.ceil(n / cols);
  const cw = box.w / cols;
  const ch = box.h / rows;
  return Array.from({ length: n }, (_, i) => ({ x: box.x + (i % cols) * cw, y: box.y + Math.floor(i / cols) * ch, w: cw, h: ch }));
}

/** A small problem number ("1.") at the top left of a cell. */
export const numberLabel = (cell, i, env) => ({ type: "text", x: cell.x, y: cell.y + 2, w: env.rules.small * 2.2, h: env.rules.small * 1.3, text: `${i + 1}.`, size: env.rules.small, align: "left", weight: "bold", lines: 1 });
