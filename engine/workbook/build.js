// buildWorkbook (WORKBOOK_SPEC 3, 9): documents → pages → display lists. Pure and deterministic: each block
// draws from deriveRng(seed, "<document>/<page>/<slot>/<activity>"), so a page never depends on another.
// An answer-key document repeats the pages of its source that have answers, with those answers drawn.

import { deriveRng } from "../math.js";
import { artBounds } from "../renderer/art_draw.js";
import { ACTIVITIES } from "./activities/index.js";
import { INK } from "./grades.js";
import { pageFrame, headerItems, footer, contentArea, slotBox, coverItems, headerArt, HEADER_ART_W } from "./layout.js";

/** The first slot index of a block (its random stream's name uses it). */
export const firstSlot = (block) => (Array.isArray(block.slot) ? block.slot[0] : block.slot ?? 0);

/**
 * One authored page: its student items, its answer items, and generator issues.
 * @returns {{ items: object[], answers: object[], issues: object[] }}
 */
export function buildPage(script, catalog, doc, page, path) {
  const frame = pageFrame(script);
  const style = script.style || {};
  const items = [];
  const answers = [];
  const issues = [];
  const head = headerItems(frame, { title: page.title, instructions: page.instructions, nameLine: style.nameLine !== false, artW: page.art ? HEADER_ART_W : 0 });
  const foot = footer(frame, null);
  const area = contentArea(frame, head.top, foot.bottom);
  if (page.art) items.push(headerArt(frame, page.art, head.artTop, head.top));
  page.blocks.forEach((block, bi) => {
    const act = ACTIVITIES[block.activity];
    let box = slotBox(page.layout, area, block.slot ?? 0);
    const group = { type: "group", tag: `${doc.id}/${page.id}/${firstSlot(block)}/${block.activity}`, items: [] };
    if (block.instructions) {
      const h = frame.rules.body * 1.3 * 2;
      group.items.push({ type: "text", x: box.x, y: box.y, w: box.w, h, text: block.instructions, size: frame.rules.body, align: "left", lines: 2 });
      box = { ...box, y: box.y + h + 6, h: box.h - h - 6 };
    }
    const rng = deriveRng(script.seed, group.tag);
    // measure: an art reference's natural bounds (pure geometry from the drawing code, no canvas).
    const out = act.generate(block, box, { rules: frame.rules, grade: script.grade, rng, catalog, ink: INK, measure: (ref) => artBounds(catalog, ref) });
    group.items.push(...out.items);
    items.push(group);
    if (out.answers.length) answers.push({ type: "group", tag: group.tag, items: out.answers.map((a) => ({ ...a, answer: true })), answer: true });
    issues.push(...out.issues.map((i) => ({ ...i, path: `${path}.blocks[${bi}]${i.path ? `.${i.path}` : ""}` })));
  });
  return { items: [...head.items, ...items], answers, issues, frame };
}

/** A page of the display list. */
const pageOf = (frame, items, ref, answerKey = false) => ({ width: frame.width, height: frame.height, items, ref, answerKey });

/**
 * Build every document of a workbook script (validate it first: the builder trusts the names).
 * @returns {{ documents: { id:string, title:string, answerKey:boolean, pages: object[] }[], issues: object[] }}
 */
export function buildWorkbook(script, catalog) {
  const frame = pageFrame(script);
  const style = script.style || {};
  const issues = [];
  const built = new Map(); // authored document id → its built pages
  const authored = script.documents.map((d, di) => [d, di]).filter(([d]) => d.pages);
  for (const [doc, di] of authored) {
    built.set(doc.id, doc.pages.map((page, pi) => {
      const b = buildPage(script, catalog, doc, page, `documents[${di}].pages[${pi}]`);
      issues.push(...b.issues);
      return { page, ...b };
    }));
  }
  const documents = script.documents.map((doc) => {
    const title = doc.title || script.title;
    const pages = [];
    const key = !!doc.answersFor;
    if (doc.cover) pages.push(pageOf(frame, coverItems(frame, { title, subtitle: key ? doc.cover.subtitle || "Answer Key" : doc.cover.subtitle, art: doc.cover.art, owner: !key }), { cover: true }, key));
    const source = built.get(key ? doc.answersFor : doc.id) || [];
    source.forEach((b, i) => {
      const n = i + 1;
      if (key) {
        if (!b.answers.length) return;
        // The student page without its name line, under an "Answer Key" tag (the header keeps its height).
        const tag = headerItems(frame, { answerTag: `Answer Key: page ${n}` }).items;
        const student = b.items.filter((it) => !it.nameLine);
        pages.push(pageOf(frame, [...tag, ...student, ...b.answers], { page: b.page.id, number: n }, true));
      } else {
        const foot = style.pageNumbers === false ? [] : footer(frame, String(n)).items;
        pages.push(pageOf(frame, [...b.items, ...foot], { page: b.page.id, number: n }));
      }
    });
    return { id: doc.id, title, answerKey: key, pages };
  });
  return { documents, issues };
}
