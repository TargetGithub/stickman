// Workbooks (WORKBOOK_SPEC, W1): layout numbers, the builder's documents and determinism, and the counting
// helpers. No canvas: the display list is the unit of truth.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate, buildWorkbook } from "../../engine/index.js";
import { pageFrame, slotBox, headerItems } from "../../engine/workbook/layout.js";
import { bestGrid, pickCells } from "../../engine/workbook/activities/count.js";
import { deriveRng } from "../../engine/math.js";

const catalog = workbookCatalogSync();
const sample = () => JSON.parse(readFileSync(new URL("../fixtures/workbooks/w1_sample.json", import.meta.url), "utf8"));
const flat = (items) => items.flatMap((it) => (it.type === "group" ? flat(it.items) : [it]));

test("the W1 sample validates with no issues", () => {
  const r = validate(sample(), catalog);
  assert.deepEqual([...r.errors, ...r.warnings], []);
  assert.equal(r.stage, "build");
});

test("page frames: Letter by default, A4, landscape; grade rules", () => {
  for (const [page, w, h] of [[undefined, 612, 792], [{ size: "a4" }, 595, 842], [{ orientation: "landscape" }, 792, 612]]) {
    const f = pageFrame({ grade: "k", page });
    assert.deepEqual([f.width, f.height, f.margin], [w, h, 36]);
  }
  assert.equal(pageFrame({ grade: "prek" }).rules.title, 32);
  assert.equal(pageFrame({ grade: "2", page: { margin: 54 } }).margin, 54);
});

test("slot boxes: layouts, spans and the cells they cover", () => {
  const area = { x: 0, y: 0, w: 218, h: 318 }; // 2 columns of 100 and 3 rows of 94 with 18 pt gutters
  const cases = [
    ["full", 0, { x: 0, y: 0, w: 218, h: 318, cells: [0] }],
    ["halves", 1, { x: 0, y: 168, w: 218, h: 150, cells: [1] }],
    ["grid2x3", 3, { x: 118, y: 112, w: 100, h: 94, cells: [3] }],
    ["grid2x3", [0, 1], { x: 0, y: 0, w: 218, h: 94, cells: [0, 1] }],
    ["grid2x3", [0, 5], { x: 0, y: 0, w: 218, h: 318, cells: [0, 1, 2, 3, 4, 5] }],
    ["grid2x2", [1, 3], { x: 118, y: 0, w: 100, h: 318, cells: [1, 3] }],
  ];
  for (const [layout, slot, want] of cases) {
    const got = slotBox(layout, area, slot);
    for (const k of ["x", "y", "w", "h"]) assert.ok(Math.abs(got[k] - want[k]) < 1e-9, `${layout} ${JSON.stringify(slot)} ${k}: ${got[k]}`);
    assert.deepEqual(got.cells, want.cells);
  }
});

test("the header keeps room for page art and the name line", () => {
  const f = pageFrame({ grade: "k" });
  const plain = headerItems(f, { title: "Hi", nameLine: true });
  const withArt = headerItems(f, { title: "Hi", nameLine: true, artW: 80 });
  assert.ok(withArt.top >= withArt.artTop + 64 + 12);
  assert.equal(withArt.items.find((i) => i.text === "Hi").w, plain.items.find((i) => i.text === "Hi").w - 80);
  assert.ok(plain.items.some((i) => i.nameLine));
});

test("documents: a cover, numbered pages, and an answer key with only the pages that have answers", () => {
  const { documents, issues } = buildWorkbook(sample(), catalog);
  assert.deepEqual(issues, []);
  const [student, key] = documents;
  assert.deepEqual(student.pages.map((p) => p.ref.page ?? "cover"), ["cover", "colour_doopi", "count_balls", "count_and_draw", "colour_park"]);
  assert.deepEqual(key.pages.map((p) => p.ref.page ?? "cover"), ["cover", "count_balls", "count_and_draw"]);
  assert.ok(key.answerKey && key.pages.every((p) => p.answerKey));
  assert.ok(!student.pages.some((p) => flat(p.items).some((i) => i.answer)), "student pages carry no answers");
  const answers = flat(key.pages[1].items).filter((i) => i.answer && i.type === "text" && !i.text.startsWith("Answer"));
  assert.deepEqual(answers.map((a) => a.text), ["3", "5", "2", "4"]);
  assert.ok(!flat(key.pages[1].items).some((i) => i.nameLine), "answer pages drop the name line");
  assert.deepEqual(flat(student.pages[2].items).filter((i) => i.type === "art" && i.ref.object === "football").length, 14);
});

test("building is deterministic and each page has its own random stream", () => {
  const a = buildWorkbook(sample(), catalog);
  assert.deepEqual(buildWorkbook(sample(), catalog), a);
  const s = sample();
  s.documents[0].pages[2].blocks[0].groups = [2, 2]; // change one page
  const b = buildWorkbook(s, catalog);
  assert.deepEqual(b.documents[0].pages[2], a.documents[0].pages[2], "the counting page before it is unchanged");
  assert.notDeepEqual(b.documents[0].pages[3], a.documents[0].pages[3]);
  const c = sample();
  c.seed = 1;
  assert.notDeepEqual(buildWorkbook(c, catalog).documents[0].pages[2], a.documents[0].pages[2], "another seed scatters differently");
});

test("counting rows share one picture size and stay inside their slot", () => {
  const page = buildWorkbook(sample(), catalog).documents[0].pages[2];
  const balls = flat(page.items).filter((i) => i.type === "art" && i.ref.object === "football");
  assert.equal(new Set(balls.map((b) => b.w.toFixed(6))).size, 1);
  for (const b of balls) assert.ok(b.x >= 36 && b.x + b.w <= 612 - 36 && b.y >= 0 && b.y + b.h <= 792 - 36, JSON.stringify(b));
});

test("bestGrid picks the largest square cells; pickCells is a seeded subset", () => {
  for (const [n, w, h, cols, rows] of [[1, 100, 50, 1, 1], [4, 400, 100, 4, 1], [4, 100, 100, 2, 2], [5, 300, 100, 5, 1], [5, 150, 100, 3, 2], [7, 200, 400, 2, 4]]) {
    const g = bestGrid(n, w, h);
    assert.deepEqual([g.cols, g.rows], [cols, rows], `${n} in ${w}x${h}`);
  }
  const picks = pickCells(12, 5, deriveRng(3, "t"));
  assert.equal(new Set(picks).size, 5);
  assert.deepEqual(picks, [...picks].sort((a, b) => a - b));
  assert.deepEqual(pickCells(12, 5, deriveRng(3, "t")), picks);
  assert.deepEqual(pickCells(5, 5, deriveRng(9, "t")), [0, 1, 2, 3, 4]);
});

test("colour pages keep relative sizes but nothing under 40% of the height", () => {
  const page = buildWorkbook(sample(), catalog).documents[0].pages[1];
  const [doopi, ball] = flat(page.items).filter((i) => i.type === "art");
  assert.ok(ball.h >= doopi.h * 0.4 - 1e-9 && ball.h < doopi.h);
  assert.ok(ball.x >= doopi.x + doopi.w, "left to right");
});
