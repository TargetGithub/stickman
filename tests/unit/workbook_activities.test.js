// Workbook activities W3 (WORKBOOK_SPEC 5): tracing shapes and letters, colour-by-shape and find-the-shapes.
// Display lists only; no canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate, buildWorkbook } from "../../engine/index.js";
import { deriveRng } from "../../engine/math.js";
import { scatter } from "../../engine/workbook/activities/find_shapes.js";
import { colourKey } from "../../engine/workbook/activities/colour_by_shape.js";
import { textWidth } from "../../engine/workbook/activities/trace_letters.js";
import { firstStep } from "../../engine/renderer/letters_draw.js";

const catalog = workbookCatalogSync();
const ed = catalog.education;
const flat = (items) => items.flatMap((it) => (it.type === "group" ? flat(it.items) : [it]));
const sample = () => JSON.parse(readFileSync(new URL("../fixtures/workbooks/w3_sample.json", import.meta.url), "utf8"));
const built = buildWorkbook(sample(), catalog);
const page = (doc, id) => flat(built.documents[doc].pages.find((p) => p.ref.page === id).items);

test("the W3 sample validates cleanly and has an answer page for every page with answers", () => {
  const r = validate(sample(), catalog);
  assert.deepEqual([...r.errors, ...r.warnings], []);
  assert.deepEqual(built.documents[1].pages.map((p) => p.ref.page ?? "cover"), ["cover", "find_triangles", "colour_house", "count_stars", "colour_rocket", "find_circles"]);
});

test("scatter places circles inside the box with a clear gap, or gives up", () => {
  const box = { x: 0, y: 0, w: 300, h: 200 };
  const spots = scatter([30, 25, 20, 20, 15], box, deriveRng(1, "s"));
  for (const [i, a] of spots.entries()) {
    assert.ok(a.x - a.r >= 0 && a.x + a.r <= 300 && a.y - a.r >= 0 && a.y + a.r <= 200);
    for (const b of spots.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 10 - 1e-9);
  }
  assert.equal(scatter(Array(40).fill(30), box, deriveRng(1, "s")), null);
});

test("find_shapes: exactly count targets, each circled in the key, and the count answered", () => {
  const student = page(0, "find_triangles");
  const key = page(1, "find_triangles");
  assert.equal(student.filter((i) => i.type === "shape" && i.name === "triangle").length, 6);
  assert.equal(student.filter((i) => i.type === "shape" && i.name !== "triangle").length, 8, "others default to count + 2");
  assert.equal(key.filter((i) => i.answer && i.type === "circle").length, 6);
  assert.ok(key.some((i) => i.answer && i.text === "6"));
  assert.ok(student.some((i) => i.text === "How many triangles?"));
  assert.ok(student.filter((i) => i.type === "shape").every((i) => i.rotate === 0), "no turning at K");
});

test("colour_by_shape: the key fills each picture part with its colour; a default key covers every shape", () => {
  const key = page(1, "colour_house").filter((i) => i.answer && i.type === "shape");
  assert.equal(key.length, ed.pictures.house.parts.length);
  assert.ok(key.filter((i) => i.name === "triangle").every((i) => i.fill === ed.colours.blue.hex));
  const auto = colourKey({ picture: "rocket" }, ed);
  assert.deepEqual(Object.keys(auto), ["rectangle", "triangle", "circle", "right_triangle", "star"]);
  assert.equal(new Set(Object.values(auto)).size, 5);
  assert.ok(!Object.values(auto).includes("black"));
});

test("trace_shapes: a row per shape, dashed and fading, with one start dot per row", () => {
  const items = page(0, "trace_shapes");
  const shapes = items.filter((i) => i.type === "shape");
  assert.deepEqual([...new Set(shapes.map((s) => s.name))], ["circle", "square", "triangle", "star"]);
  assert.ok(shapes.every((s) => s.style === "trace"));
  assert.equal(items.filter((i) => i.type === "circle" && i.fill).length, 4);
  const row = shapes.filter((s) => s.name === "square");
  assert.ok(row[0].colour < row[row.length - 1].colour, "later copies are lighter");
});

test("trace_letters: handwriting lines, a model then dashed copies, room left to write alone", () => {
  const items = page(0, "trace_abc");
  const a = items.filter((i) => i.type === "glyph" && i.char === "A");
  assert.equal(a.filter((g) => g.style === "model").length, 2, "one model per row, two rows");
  assert.ok(a.filter((g) => g.style === "trace").length >= 6);
  const lines = items.filter((i) => i.type === "line");
  assert.ok(lines.some((l) => l.dash), "a dashed midline");
  const word = page(0, "trace_name").filter((i) => i.type === "glyph");
  assert.deepEqual(word.slice(0, 5).map((g) => g.char), [..."DOOPI"]);
  assert.ok(word.some((g) => g.style === "trace"), "a long word still gets a copy to trace");
});

test("letters: widths, and each stroke's first step points the way it is written", () => {
  assert.ok(Math.abs(textWidth(ed.letters.glyphs, "A B") - (0.8 + 0.45 + 0.68 + 2 * 0.18)) < 1e-9);
  const [dx, dy] = firstStep(ed.letters.glyphs.L.strokes[0]);
  assert.deepEqual([dx, dy], [0, 1], "L starts with a pull down");
  const [ex] = firstStep(ed.letters.glyphs.E.strokes[1]);
  assert.equal(ex, 1, "E's second stroke goes right");
});

test("grade 1 and 2 find-the-shapes turn the shapes; the same seed gives the same page", () => {
  const s = sample();
  s.grade = "1";
  const a = buildWorkbook(s, catalog);
  const turned = flat(a.documents[0].pages.find((p) => p.ref.page === "find_triangles").items).filter((i) => i.type === "shape");
  assert.ok(turned.some((i) => i.rotate !== 0));
  assert.deepEqual(buildWorkbook(s, catalog), a);
});
