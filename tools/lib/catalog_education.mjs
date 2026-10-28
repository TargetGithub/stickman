// Catalog checks for the education files (WORKBOOK_SPEC 8): shape facts agree with the drawings, pictures use
// catalog shapes, print approvals name real presets, props and objects. Pure: src is readCatalogDir().

import { cornerPoints, straightSides } from "../../engine/workbook/shape_facts.js";
import { validate } from "../../engine/index.js";
import { GRADE_RULES } from "../../engine/workbook/grades.js";
import { ACTIVITY_NAMES } from "../../engine/workbook/activities/index.js";
import { checkText } from "../../engine/validator/semantic.js";
import { workbookCatalogOf } from "./workbook_tables.mjs";
import { PROMPT_EXAMPLE } from "./workbook_prompts.mjs";

const CURVED_KINDS = ["ellipse", "sector", "crescent", "ring", "path"];

/** @returns {{ file, path, message }[]} */
export function educationIssues(src) {
  const out = [];
  const bad = (file, path, message) => out.push({ file, path, message });
  const shapes = src.files["education/shapes.json"];
  for (const [name, s] of Object.entries(shapes)) {
    const g = s.geometry;
    const f = "education/shapes.json";
    if (s.curved !== CURVED_KINDS.includes(g.kind)) bad(f, `${name}.curved`, `a ${g.kind} geometry is ${CURVED_KINDS.includes(g.kind) ? "" : "not "}curved`);
    const corners = cornerPoints(g).length;
    if ((corners || !s.curved) && corners !== s.corners) bad(f, `${name}.corners`, `the drawing has ${corners} corners, the facts say ${s.corners}`);
    const sides = straightSides(g);
    if (sides !== null && sides !== s.sides) bad(f, `${name}.sides`, `the drawing has ${sides} sides, the facts say ${s.sides}`);
    if (s.rightAngles > s.corners) bad(f, `${name}.rightAngles`, "more square corners than corners");
  }
  for (const [name, p] of Object.entries(src.files["education/shape_pictures.json"])) {
    p.parts.forEach((q, i) => {
      if (!shapes[q.shape]) bad("education/shape_pictures.json", `${name}.parts[${i}].shape`, `unknown shape "${q.shape}"`);
    });
  }
  // Tracing letters: every capital, lowercase letter and digit, each stroke starting with M and staying in the
  // em box (descenders reach 1.45).
  const glyphs = src.files["education/letters.json"].glyphs;
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") if (!glyphs[ch]) bad("education/letters.json", `glyphs.${ch}`, `no tracing letter for "${ch}"`);
  for (const [ch, g] of Object.entries(glyphs)) {
    g.strokes.forEach((s, i) => {
      if (s[0]?.[0] !== "M" || s.length < 2) bad("education/letters.json", `glyphs.${ch}.strokes[${i}]`, "a stroke starts with M and draws at least one segment");
      const nums = s.flatMap((c) => c.slice(1));
      if (nums.some((v, k) => (k % 2 ? v < -0.15 || v > 1.55 : v < -0.15 || v > g.w + 0.15))) bad("education/letters.json", `glyphs.${ch}.strokes[${i}]`, "a point lies outside the em box");
    });
  }

  // Dot pictures: the grade's dot limit holds; word lists: no blocked word.
  for (const [name, p] of Object.entries(src.files["education/dot_pictures.json"])) {
    const max = GRADE_RULES[p.grade].dotsMax;
    if (p.points.length > max) bad("education/dot_pictures.json", `${name}.points`, `${p.points.length} dots is over the grade ${p.grade} limit of ${max}`);
  }
  const blocked = new Set((src.catalog.blocklist || []).map((w) => w.toLowerCase()));
  for (const [topic, t] of Object.entries(src.files["education/words.json"].topics)) {
    for (const w of Object.keys(t.words)) if (blocked.has(w)) bad("education/words.json", `topics.${topic}.${w}`, "a blocked word");
  }

  const known = {
    presets: new Set(src.presets.map((p) => p.id)),
    props: new Set(Object.keys(src.catalog.props)),
    objects: new Set(Object.keys(src.catalog.objects)),
  };
  const art = src.files["education/line_art.json"];
  for (const group of ["presets", "props", "objects"]) {
    for (const [id, e] of Object.entries(art[group])) {
      if (!known[group].has(id)) bad("education/line_art.json", `${group}.${id}`, `no ${group.slice(0, -1)} "${id}" in the catalog`);
      for (const pose of e.poses || []) if (!src.catalog.poses[pose]) bad("education/line_art.json", `${group}.${id}.poses`, `unknown pose "${pose}"`);
    }
  }
  // Activity examples (docs/workbook_activities.json) and example workbooks validate with no issues.
  const wb = workbookCatalogOf(src);
  const issuesOf = (script) => { const r = validate(script, wb); return [...r.errors, ...r.warnings]; };
  for (const [name, d] of Object.entries(src.files["docs/workbook_activities.json"])) {
    const book = { kind: "workbook", version: 1, title: "Example", seed: 1, grade: "k", documents: [{ id: "d", pages: [{ id: "p", blocks: [d.example] }] }] };
    for (const i of issuesOf(book)) bad("docs/workbook_activities.json", name, `example: ${i.code} ${i.message}`);
  }
  out.push(...sourceIssues(src, wb, issuesOf));
  if (!src.workbooks?.[PROMPT_EXAMPLE]) bad(`examples/workbooks/${PROMPT_EXAMPLE}.json`, "", "the prompt's example workbook is missing");
  for (const [name, script] of Object.entries(src.workbooks || {})) {
    for (const i of issuesOf(script)) bad(`examples/workbooks/${name}.json`, i.path, `${i.code} ${i.message}`);
  }
  return out;
}

/** A one-page book with one full-page block at a grade (for checking catalog sources and examples). */
const bookOf = (block, grade) => ({ kind: "workbook", version: 1, title: "Check", seed: 1, grade, documents: [{ id: "d", pages: [{ id: "p", blocks: [block] }] }] });

/**
 * The question, passage, math and skills files (WORKBOOK_SPEC 8.4-8.6): strands are known, answers point at an
 * option, text is family-friendly and drawable, and every source makes a page at its own grade with no issues.
 */
function sourceIssues(src, wb, issuesOf) {
  const out = [];
  const bad = (file, path, message) => out.push({ file, path, message });
  const ed = wb.education;
  const strands = ed.skills.strands;
  const blocklist = src.catalog.blocklist || [];
  const textOk = (file, path, text) => {
    const found = [];
    checkText(text.replace(/[\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u00d7\u00f7]/g, "-"), path, blocklist, found);
    for (const i of found) bad(file, path, `${i.code} ${i.message}`);
  };
  const questionsOk = (file, path, qs) => qs.forEach((q, i) => {
    const qp = `${path}.questions[${i}]`;
    textOk(file, `${qp}.q`, q.q);
    (q.options || []).forEach((o, k) => textOk(file, `${qp}.options[${k}]`, o));
    if (q.options && (typeof q.answer !== "number" || q.answer >= q.options.length)) bad(file, `${qp}.answer`, "the answer is not one of the options");
    if (q.options && new Set(q.options).size !== q.options.length) bad(file, `${qp}.options`, "two options are the same");
    if (!q.options && typeof q.answer !== "string") bad(file, `${qp}.answer`, "an open question needs its answer as text");
  });
  const strandOk = (file, path, s) => { if (s && !strands[s]) bad(file, `${path}.strand`, `unknown strand "${s}"`); };
  const pageOk = (file, path, block, grade) => { for (const i of issuesOf(bookOf(block, grade))) bad(file, path, `at grade ${grade}: ${i.code} ${i.message}`); };

  const F = { q: "education/questions.json", p: "education/passages.json", m: "education/math.json", s: "education/skills.json" };
  for (const [name, set] of Object.entries(ed.questions.sets)) {
    strandOk(F.q, `sets.${name}`, set.strand);
    questionsOk(F.q, `sets.${name}`, set.questions);
    pageOk(F.q, `sets.${name}`, { activity: "choose", set: name, count: Math.min(6, set.questions.length) }, set.grade);
  }
  for (const [name, p] of Object.entries(ed.passages.passages)) {
    strandOk(F.p, `passages.${name}`, p.strand);
    textOk(F.p, `passages.${name}.text`, p.text);
    questionsOk(F.p, `passages.${name}`, p.questions);
    pageOk(F.p, `passages.${name}`, { activity: "read_passage", passage: name }, p.grade);
  }
  for (const [name, t] of Object.entries(ed.math.templates)) {
    strandOk(F.m, `templates.${name}`, t.strand);
    if (t.op !== "÷" && !t.a && !t.aSet) bad(F.m, `templates.${name}`, "a template needs a or aSet");
    if (t.op !== "÷" && !t.b && !t.bSet) bad(F.m, `templates.${name}`, "a template needs b or bSet");
    if (t.op === "÷" && !t.b && !t.bSet) bad(F.m, `templates.${name}`, "a division template needs b (the divisor)");
    pageOk(F.m, `templates.${name}`, { activity: "math_facts", template: name }, t.grade);
  }
  for (const [name, k] of Object.entries(ed.skills.skills)) {
    strandOk(F.s, `skills.${name}`, k.strand);
    for (const a of k.activities) if (!ACTIVITY_NAMES.includes(a)) bad(F.s, `skills.${name}.activities`, `unknown activity "${a}"`);
    if (!k.activities.includes(k.example.activity)) bad(F.s, `skills.${name}.example`, "the example's activity is not in activities");
    pageOk(F.s, `skills.${name}.example`, k.example, k.grade);
  }
  return out;
}
