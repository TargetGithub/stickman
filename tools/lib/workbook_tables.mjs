// Workbook tables for the AI (WORKBOOK_SPEC 11): the activities, grade rules, shapes, pictures, words and
// print-approved art as compact Markdown. The workbook prompt and the context pack file 09_workbooks.md both use
// these, so they always agree. Pure: wb is the workbook catalog (engine catalog + presets + education).

import { GRADE_RULES, LAYOUTS, PAGE_SIZES } from "../../engine/workbook/grades.js";

const cell = (v) => String(v).replace(/\|/g, "/").replace(/\n/g, " ");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
const ok = (list = {}) => Object.keys(list).filter((k) => list[k].status === "ok");
// Fight gear stays printable for people who ask for it, but the AI is not offered it for children's books.
const gentle = (entry) => !(entry?.tags || []).some((t) => t === "fight" || t === "weapon");

export function activityTable(docs) {
  return table(["activity", "what the child does", "params", "answer key", "example block"], Object.entries(docs).map(([n, d]) => [n, d.description, d.params, d.answers, `\`${JSON.stringify(d.example)}\``]));
}

export function gradeTable() {
  const g = GRADE_RULES;
  const row = (label, f) => [label, ...["prek", "k", "1", "2"].map((k) => f(g[k], k))];
  return table(["rule", "prek", "k", "1", "2"], [
    row("blocks per page (more: warning)", (r) => r.maxBlocks),
    row("instruction length (characters)", (r) => r.instructions),
    row("count / find: most per group", (r) => r.countMax),
    row("maze: largest side", (r) => r.mazeMax),
    row("dot-to-dot: most dots", (r) => r.dotsMax),
    row("word search grid", (r) => (r.wordGrid ? `${r.wordGrid} x ${r.wordGrid}` : "none")),
  ]);
}

export function shapeTable(ed) {
  return table(["shape", "sides", "corners", "grade", "examples"], Object.entries(ed.shapes).map(([n, s]) => [n, s.sides, s.corners, s.grade, s.examples.join(", ")]));
}

export function listsMarkdown(wb) {
  const ed = wb.education;
  const words = Object.entries(ed.words.topics).map(([t, d]) => `- ${t}: ${Object.entries(d.words).map(([w, g]) => `${w} (${g})`).join(", ")}`).join("\n");
  const presets = ok(ed.lineArt.presets).map((id) => `${id} (${wb.presets[id]?.cast?.body === "dog_small" ? "dog" : "person"})`);
  const humanPoses = ["stand", "waveA", "victory", "pointPose", "sit", "flexPose", "laughA", "danceA1", "cheer"].filter((p) => wb.poses[p]);
  return [
    `**Shape pictures** (colour_by_shape \`picture\`): ${Object.entries(ed.pictures).map(([n, p]) => `${n} (${[...new Set(p.parts.map((q) => q.shape))].join(", ")})`).join("; ")}.`,
    `**Dot pictures** (dot_to_dot \`{"picture"}\`): ${Object.entries(ed.dotPictures).map(([n, p]) => `${n} (${p.points.length} dots, grade ${p.grade})`).join(", ")}.`,
    `**Crayon colours**: ${Object.keys(ed.colours).join(", ")}.`,
    `**Characters** (\`{"preset"}\`, print-approved): ${presets.join(", ")}. Poses for people: ${humanPoses.join(", ")} (default stand); dogs: dog_stand, dog_sit, dog_beg. Faces: ${Object.keys(wb.faces).slice(0, 10).join(", ")} (default happy).`,
    `**Objects** (\`{"object"}\`): ${ok(ed.lineArt.objects).filter((n) => gentle(wb.objects[n])).join(", ")}.`,
    `**Word lists** (word_search and tracing; any family-friendly word works, letters only):\n${words}`,
  ].join("\n\n");
}

export function formatMarkdown() {
  return [
    "```",
    "{",
    '  "kind": "workbook", "version": 1,',
    '  "title": str<=60, "seed": int, "grade": "prek"|"k"|"1"|"2",',
    `  "page": { "size": ${Object.keys(PAGE_SIZES).map((s) => `"${s}"`).join("|")} (default letter), "margin": 27-72, "orientation": "portrait"|"landscape" },`,
    '  "style": { "cast": [preset ids], "nameLine": true, "pageNumbers": true },',
    '  "documents": [',
    '    { "id": "student", "title": str, "cover": { "subtitle": str, "art": [1-4 art refs] },',
    '      "pages": [ { "id": "lowercase_id", "title": str<=40, "instructions": str, "layout": layout,',
    '                   "art": { "preset", "pose", "face" } (beside the title, optional),',
    '                   "blocks": [ { "activity": name, "slot": 0 | [first, last], "instructions": str, ...params } ] } ] },',
    '    { "id": "answers", "answersFor": "student", "title": str, "cover": { "subtitle": "Answer Key" } }',
    "  ]",
    "}",
    "```",
    "",
    `Layouts (slots in reading order): ${Object.entries(LAYOUTS).map(([n, l]) => `${n} (${l.slots.length})`).join(", ")}. A block's \`slot\` picks one; a span \`[0, 1]\` covers both. One block per slot.`,
    "",
    'Art references: `{"preset": id, "pose": p, "face": f, "facing": 1|-1}`, `{"prop": name}`, `{"object": name}`, `{"shape": name, "rotate": deg}`.',
  ].join("\n");
}

/** The workbook codes (WORKBOOK_SPEC 10) with meaning and fix. */
export function codesMarkdown(codes) {
  const wb = (c) => c === "E_KIND" || /^[EW]_WB_/.test(c);
  const general = ["E_SCHEMA_REQUIRED", "E_SCHEMA_UNKNOWN_FIELD", "E_SCHEMA_ENUM", "E_TEXT_BLOCKED", "W_TEXT_SOFT"];
  return Object.entries(codes).filter(([c]) => wb(c) || general.includes(c)).map(([c, d]) => `- ${c}: ${d.meaning} → ${d.fix}`).join("\n");
}

/**
 * Everything a model needs to write a workbook: the prose (catalog/docs/workbook.md), the format, the tables, the
 * codes and one example. The prompt and 09_workbooks.md are this text.
 */
export function workbookBody({ wb, docs, codes, prose, example }) {
  return [
    prose.trim(),
    "## Script format",
    formatMarkdown(),
    "## Activities",
    activityTable(docs),
    "## Grade rules",
    gradeTable(),
    "## Shapes",
    shapeTable(wb.education),
    "## Names you can use",
    listsMarkdown(wb),
    "## Validator codes",
    codesMarkdown(codes),
    "## Example",
    `A K workbook (student book and answer key):\n\`\`\`json\n${JSON.stringify(example)}\n\`\`\``,
  ].join("\n\n");
}

/** The workbook catalog view of readCatalogDir() output (for the build and the pack). */
export function workbookCatalogOf(src) {
  const f = src.files;
  return {
    ...src.catalog,
    presets: Object.fromEntries(src.presets.map(({ file, ...p }) => [p.id, p])),
    education: { shapes: f["education/shapes.json"], pictures: f["education/shape_pictures.json"], colours: f["education/colours.json"], lineArt: f["education/line_art.json"], letters: f["education/letters.json"], dotPictures: f["education/dot_pictures.json"], words: f["education/words.json"] },
  };
}
