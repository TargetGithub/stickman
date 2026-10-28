// The workbook AI pipeline (WORKBOOK_SPEC 11): the writer prompt and pack file name everything a model may use,
// pasted replies are checked with fix prompts, and the mock pipeline repairs a first draft. No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { workbookCatalogSync } from "../../catalog/index.js";
import { ACTIVITY_NAMES } from "../../engine/workbook/activities/index.js";
import { workbookSystem, workbookRequest, workbookRepair, workbookPrompt, workbookExamples, REPLY_RULE, PROMPT_EXAMPLE } from "../../tools/lib/workbook_prompts.mjs";
import { checkWorkbookReply } from "../../tools/lib/manual_workbook.mjs";
import { writeWorkbook } from "../../tools/lib/workbook_pipeline.mjs";
import { createLlm } from "../../tools/lib/llm/index.mjs";
import { createMockAdapter } from "../../tools/lib/llm/mock.mjs";
import { readCatalogDir } from "../../tools/lib/catalog_files.mjs";
import { buildPack } from "../../tools/lib/context_pack.mjs";
import { validate } from "../../engine/index.js";

const wb = workbookCatalogSync();
const system = workbookSystem(wb);
const has = (text, name) => new RegExp(`(^|[^a-z_])${name}([^a-z_]|$)`, "m").test(text);

test("the writer prompt names every activity, shape, shape picture, dot picture and workbook code", () => {
  const ed = wb.education;
  for (const n of [...ACTIVITY_NAMES, ...Object.keys(ed.shapes), ...Object.keys(ed.pictures), ...Object.keys(ed.dotPictures), ...Object.keys(ed.colours)]) assert.ok(has(system, n), `${n} is missing`);
  for (const code of ["E_KIND", "E_WB_SLOT", "E_WB_ART", "E_WB_FIT", "E_WB_GRADE", "E_WB_WORD", "E_WB_PATTERN", "W_WB_DENSE"]) assert.ok(system.includes(code), code);
  assert.ok(system.startsWith("You write printable activity workbooks"));
  assert.ok(system.length < 20000, `${system.length} characters`);
});

test("fight gear and unapproved art are not offered", () => {
  const objects = /\*\*Objects\*\* \(`\{"object"\}`\): ([^\n]*)/.exec(system)[1];
  for (const n of ["sword", "blaster", "club_big", "apple", "throne", "crate", "trapdoor"]) assert.ok(!has(objects, n), `${n} is offered`);
  assert.ok(!/\*\*Props\*\*/.test(system));
  assert.ok(has(objects, "flower") && has(objects, "haystack"));
});

test("the pack file 09 holds the same body as the prompt, and every example workbook validates", () => {
  const src = readCatalogDir();
  const pack = buildPack({ ...src, facts: { goodThemes: {} } }, "test")["09_workbooks.md"];
  const body = system.slice(system.indexOf("A **workbook**"));
  assert.ok(pack.includes(body.slice(0, 2000)), "09 starts with the same text as the prompt body");
  for (const [name, script] of Object.entries(workbookExamples())) {
    const r = validate(script, wb);
    assert.deepEqual([...r.errors, ...r.warnings], [], name);
  }
});

test("the task and repair messages carry the request and every issue", () => {
  const req = workbookRequest({ topic: "pond life", grade: "1", pages: 7, cast: ["doopi"], seed: 42 });
  for (const s of ["pond life", "Grade: 1", "about 7", "doopi", '"seed": 42']) assert.ok(req.includes(s), s);
  const fix = workbookRepair({ errors: [{ code: "E_WB_GRADE", path: "documents[0]", message: "too big", fix: "smaller" }], warnings: [] });
  assert.ok(fix.includes("error E_WB_GRADE at documents[0]: too big") && fix.includes("fix: smaller"));
  const prompt = workbookPrompt(wb, { topic: "pond life", seed: 1 });
  assert.ok(prompt.endsWith(`${REPLY_RULE}\n`));
  assert.equal(workbookPrompt(wb, { topic: "pond life", seed: 1 }), prompt, "byte-stable");
});

test("pasted replies: no JSON, not a workbook, invalid (with a fix prompt), valid", () => {
  const good = JSON.stringify(workbookExamples()[PROMPT_EXAMPLE]);
  const cases = [
    ["Sorry, here you go!", false, /did not contain a JSON object/],
    ['```json\n{"version": 2, "meta": {}}\n```', false, /"kind": "workbook"/],
    [good.replace('"grade":"k"', '"grade":"prek"'), false, /E_WB_GRADE|W_WB_DENSE/],
    [`Here it is:\n\`\`\`json\n${good}\n\`\`\``, true, null],
  ];
  for (const [text, ok, fix] of cases) {
    const r = checkWorkbookReply(text, wb);
    assert.equal(r.ok, ok, text.slice(0, 40));
    if (fix) assert.match(r.fixPrompt, fix);
  }
});

test("the mock pipeline writes a draft, repairs it from the validator and returns a valid workbook", async () => {
  const lines = [];
  const llm = createLlm(createMockAdapter(), { log: () => {} });
  const out = await writeWorkbook({ llm, wb, cfg: { models: { write: "m", repair: "m" }, maxAttempts: 3 }, log: (l) => lines.push(l) }, { topic: "ponds", grade: "k", seed: 9 });
  assert.equal(out.attempts.length, 2);
  assert.deepEqual(out.attempts[0].errors, ["E_WB_GRADE"]);
  assert.ok(out.attempts[1].ok);
  assert.equal(out.script.title, "Mock Workbook: ponds");
  assert.equal(out.script.seed, 9);
});

test("the prompt shows the pinned shapes example, not another example book", () => {
  assert.ok(system.includes('"title":"Shapes with Doopi"'));
  for (const [name, book] of Object.entries(workbookExamples())) if (name !== PROMPT_EXAMPLE) assert.ok(!system.includes(`"title":"${book.title}"`), name);
});

test("the prompt pasted back as a reply is named as such, not as a JSON error", () => {
  const r = checkWorkbookReply(workbookPrompt(wb, { topic: "farm", seed: 3 }), wb);
  assert.equal(r.ok, false);
  assert.equal(r.prompt, true);
  assert.match(r.message, /the workbook prompt, not the model's reply/);
  assert.equal(r.fixPrompt, undefined, "no fix prompt to paste into a chat");
});

test("workbook text may use Andika's dashes, curly quotes and ellipsis; other glyphs still fail", () => {
  const book = (title) => ({ ...structuredClone(workbookExamples()[PROMPT_EXAMPLE]), title });
  for (const [title, ok] of [["Farm Day — Answer Key", true], ["Doopi’s “Big” Day…", true], ["Count 3 × 2", true], ["Farm 🐄 Day", false]]) {
    const r = validate(book(title), wb);
    assert.equal(r.ok, ok, title);
    if (!ok) assert.deepEqual(r.errors.map((e) => e.code), ["E_TEXT_GLYPH"]);
  }
});
