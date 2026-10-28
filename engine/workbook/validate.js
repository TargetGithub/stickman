// validateWorkbook (WORKBOOK_SPEC 10): the schema, then names, ids, slots, grade limits and text, then the
// generators (E_WB_FIT needs them). The report has the same shape as validate() for video scripts.

import { checkValue } from "../validator/check_value.js";
import { checkText } from "../validator/semantic.js";
import { softWordIssues } from "../validator/story.js";
import { workbookSchema } from "./schema.js";
import { ACTIVITIES } from "./activities/index.js";
import { artIssues } from "./art.js";
import { GRADE_RULES, LAYOUTS } from "./grades.js";
import { slotBox } from "./layout.js";
import { buildWorkbook } from "./build.js";

const isWarning = (i) => i.code.startsWith("W_");

function report(stage, issues) {
  return { ok: !issues.some((i) => !isWarning(i)), errors: issues.filter((i) => !isWarning(i)), warnings: issues.filter(isWarning), timeline: "", durationSec: null, stage };
}

// Workbook text is set in Andika, which also has these (the video fonts do not): dashes, curly quotes, the
// ellipsis, the bullet, times and divide.
const ANDIKA_EXTRA = /[\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u2022\u00d7\u00f7]/g;

/** Text checks: blocked words and glyphs (errors), soft words, and the grade's instruction length. */
function textIssues(text, path, catalog, maxLen, out) {
  if (typeof text !== "string") return;
  checkText(text.replace(ANDIKA_EXTRA, "-"), path, catalog.blocklist || [], out);
  out.push(...softWordIssues(text, path, catalog, "kids"));
  if (maxLen && text.length > maxLen) out.push({ code: "W_WB_TEXT", path, message: `${text.length} characters is long for this grade.`, fix: `Keep it under ${maxLen} characters: a grown-up reads it aloud.` });
}

function slotIssues(page, path) {
  const out = [];
  const L = LAYOUTS[page.layout || "full"];
  const taken = new Map();
  page.blocks.forEach((b, bi) => {
    const p = `${path}.blocks[${bi}].slot`;
    const ends = Array.isArray(b.slot) ? b.slot : [b.slot ?? 0];
    if (ends.some((s) => s >= L.slots.length)) {
      out.push({ code: "E_WB_SLOT", path: p, message: `Layout '${page.layout || "full"}' has ${L.slots.length} slot(s).`, fix: `Use slots 0 to ${L.slots.length - 1}, or another layout.` });
      return;
    }
    for (const c of slotBox(page.layout, { x: 0, y: 0, w: 100, h: 100 }, b.slot ?? 0).cells) {
      if (taken.has(c)) out.push({ code: "E_WB_SLOT", path: p, message: `Slot ${c} is already used by block ${taken.get(c)}.`, fix: "Give each block its own slot." });
      else taken.set(c, bi);
    }
  });
  return out;
}

function pageIssues(script, catalog, page, path, rules) {
  const out = [...slotIssues(page, path)];
  textIssues(page.title, `${path}.title`, catalog, 0, out);
  textIssues(page.instructions, `${path}.instructions`, catalog, rules.instructions, out);
  if (page.art) out.push(...artIssues(page.art, `${path}.art`, catalog));
  if (page.blocks.length > rules.maxBlocks) out.push({ code: "W_WB_DENSE", path: `${path}.blocks`, message: `${page.blocks.length} blocks on one page is a lot for grade ${script.grade}.`, fix: `Use at most ${rules.maxBlocks} per page.` });
  page.blocks.forEach((b, bi) => {
    const bp = `${path}.blocks[${bi}]`;
    const act = ACTIVITIES[b.activity];
    textIssues(b.instructions, `${bp}.instructions`, catalog, rules.instructions, out);
    if (b.prompt) textIssues(b.prompt, `${bp}.prompt`, catalog, 0, out);
    for (const [ref, p] of act.artPaths(b)) out.push(...artIssues(ref, `${bp}.${p}`, catalog));
    out.push(...(act.check?.(b, bp, catalog, rules) || []));
    for (const [p, v, max] of act.limits?.(b, rules) || []) {
      out.push({ code: "E_WB_GRADE", path: `${bp}.${p}`, message: `${v} is over the grade ${script.grade} limit.`, fix: `Use at most ${max}, or a higher grade.` });
    }
  });
  return out;
}

/** Validate a workbook script against the workbook catalog (the engine catalog plus `presets`). */
export function validateWorkbook(script, catalog) {
  const schema = checkValue(script, workbookSchema());
  if (schema.length) return report("schema", schema);
  const rules = GRADE_RULES[script.grade];
  const out = [];
  textIssues(script.title, "title", catalog, 0, out);
  (script.style?.cast || []).forEach((id, i) => out.push(...artIssues({ preset: id }, `style.cast[${i}]`, catalog)));
  const docIds = new Map();
  script.documents.forEach((doc, di) => {
    const dp = `documents[${di}]`;
    if (docIds.has(doc.id)) out.push({ code: "E_WB_ID", path: `${dp}.id`, message: `Document id '${doc.id}' is used twice.`, fix: "Give each document its own id." });
    docIds.set(doc.id, doc);
    textIssues(doc.title, `${dp}.title`, catalog, 0, out);
    (doc.cover?.art || []).forEach((ref, i) => out.push(...artIssues(ref, `${dp}.cover.art[${i}]`, catalog)));
    if (!doc.pages) return;
    const pageIds = new Set();
    const seen = new Map();
    doc.pages.forEach((page, pi) => {
      const pp = `${dp}.pages[${pi}]`;
      if (pageIds.has(page.id)) out.push({ code: "E_WB_ID", path: `${pp}.id`, message: `Page id '${page.id}' is used twice in '${doc.id}'.`, fix: "Give each page its own id." });
      pageIds.add(page.id);
      out.push(...pageIssues(script, catalog, page, pp, rules));
      page.blocks.forEach((b, bi) => {
        const { slot, instructions, ...params } = b;
        const key = JSON.stringify(params);
        if (seen.has(key)) out.push({ code: "W_WB_REPEAT", path: `${pp}.blocks[${bi}]`, message: `The same ${b.activity} is already on ${seen.get(key)}.`, fix: "Change its params so the page is new." });
        else seen.set(key, page.id);
      });
    });
  });
  script.documents.forEach((doc, di) => {
    if (!doc.answersFor) return;
    const src = docIds.get(doc.answersFor);
    if (!src || !src.pages) out.push({ code: "E_WB_ANSWERS_FOR", path: `documents[${di}].answersFor`, message: `'${doc.answersFor}' is not a document with pages.`, fix: `Use one of: ${script.documents.filter((d) => d.pages).map((d) => d.id).join(", ")}.` });
  });
  if (out.some((i) => !isWarning(i))) return report("semantic", out);
  const built = buildWorkbook(script, catalog);
  return report("build", [...out, ...built.issues]);
}
