// Workbook shapes (WORKBOOK_SPEC 8, W2): geometry, corner points against the facts, the education catalog
// checks, shape art and the shape lesson. No canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate, buildWorkbook } from "../../engine/index.js";
import { regularPoints, starPoints } from "../../engine/renderer/shapes_draw.js";
import { cornerPoints, straightSides } from "../../engine/workbook/shape_facts.js";
import { shapeFacts } from "../../engine/workbook/activities/shape_lesson.js";
import { artBounds } from "../../engine/renderer/art_draw.js";
import { readCatalogDir } from "../../tools/lib/catalog_files.mjs";
import { educationIssues } from "../../tools/lib/catalog_education.mjs";

const catalog = workbookCatalogSync();
const shapes = catalog.education.shapes;
const close = (a, b) => Math.abs(a - b) < 1e-9;
const flat = (items) => items.flatMap((it) => (it.type === "group" ? flat(it.items) : [it]));

test("regular polygons point up when odd and stand on a side when even; stars alternate", () => {
  const tri = regularPoints(3);
  assert.ok(close(tri[0][0], 0) && close(tri[0][1], -1), "a triangle's first corner is at the top");
  const sq = regularPoints(4);
  assert.ok(close(sq[1][1], sq[2][1]) && sq[1][1] > 0, "a regular square has a flat bottom");
  const hex = regularPoints(6);
  assert.equal(new Set(hex.map(([, y]) => y.toFixed(9))).size, 3);
  const star = starPoints(5, 0.4);
  assert.equal(star.length, 10);
  assert.ok(close(Math.hypot(...star[0]), 1) && close(Math.hypot(...star[1]), 0.4));
});

test("every catalog shape's drawing agrees with its facts", () => {
  for (const [name, s] of Object.entries(shapes)) {
    const corners = cornerPoints(s.geometry).length;
    if (corners || !s.curved) assert.equal(corners, s.corners, `${name} corners`);
    const sides = straightSides(s.geometry);
    if (sides !== null) assert.equal(sides, s.sides, `${name} sides`);
  }
  assert.deepEqual(cornerPoints(shapes.semicircle.geometry).length, 2, "a half circle's centre is not a corner");
  assert.deepEqual(cornerPoints(shapes.quarter_circle.geometry).length, 3);
});

test("the education checks catch wrong facts, unknown shapes and unknown approvals", () => {
  const src = readCatalogDir();
  assert.deepEqual(educationIssues(src), []);
  const cases = [
    [(f) => (f["education/shapes.json"].hexagon.corners = 5), "hexagon.corners"],
    [(f) => (f["education/shapes.json"].square.sides = 3), "square.sides"],
    [(f) => (f["education/shapes.json"].oval.curved = false), "oval.curved"],
    [(f) => (f["education/shape_pictures.json"].house.parts[0].shape = "cube"), "house.parts[0].shape"],
    [(f) => (f["education/line_art.json"].objects.spaceship = { status: "ok" }), "objects.spaceship"],
    [(f) => (f["education/line_art.json"].presets.doopi.poses = ["moonwalk"]), "presets.doopi.poses"],
  ];
  for (const [edit, path] of cases) {
    const files = structuredClone(src.files);
    edit(files);
    assert.deepEqual(educationIssues({ ...src, files }).map((i) => i.path), [path]);
  }
});

test("shape facts by grade: square corners from grade 1, symmetry in grade 2", () => {
  assert.deepEqual(shapeFacts(shapes.square, "k"), ["4 sides", "4 corners"]);
  assert.deepEqual(shapeFacts(shapes.square, "1"), ["4 sides", "4 corners", "4 square corners"]);
  assert.deepEqual(shapeFacts(shapes.square, "2"), ["4 sides", "4 corners", "4 square corners", "4 lines of symmetry"]);
  assert.deepEqual(shapeFacts(shapes.circle, "2"), ["No straight sides", "0 corners"]);
  assert.deepEqual(shapeFacts(shapes.quarter_circle, "1"), ["3 sides", "3 corners", "1 square corner"]);
});

test("shape art fits by its real extent: a semicircle is half as tall as it is wide", () => {
  const b = artBounds(catalog, { shape: "semicircle" });
  assert.ok(Math.abs((b.x1 - b.x0) / (b.y1 - b.y0) - 2) < 0.1, JSON.stringify(b));
  const r = artBounds(catalog, { shape: "rectangle" });
  assert.ok(Math.abs((r.x1 - r.x0) / (r.y1 - r.y0) - 1.6) < 0.1);
});

test("the shape lesson book builds a page per shape with corners, tracing and examples", () => {
  const script = JSON.parse(readFileSync(new URL("../fixtures/workbooks/w2_shape_lessons.json", import.meta.url), "utf8"));
  const r = validate(script, catalog);
  assert.deepEqual([...r.errors, ...r.warnings], []);
  const { documents } = buildWorkbook(script, catalog);
  assert.equal(documents[0].pages.length, Object.keys(shapes).length + 1);
  const page = (id) => flat(documents[0].pages.find((p) => p.ref.page === id).items);
  const hex = page("hexagon");
  assert.equal(hex.filter((i) => i.type === "shape" && i.style === "trace").length, 3);
  assert.equal(hex.filter((i) => i.type === "circle" && i.fill === "#000000").length, 6, "six corner dots");
  assert.ok(hex.some((i) => i.text === "Find a hexagon in real life:"));
  assert.ok(page("oval").some((i) => i.text === "Find an oval in real life:"));
  assert.ok(page("square").some((i) => i.text === "4 square corners"));
});

test("art approval: redraw entries are refused, shapes are known", () => {
  const book = (item) => ({ kind: "workbook", version: 1, title: "T", seed: 1, grade: "k", documents: [{ id: "d", pages: [{ id: "p", blocks: [{ activity: "count", item, groups: [2] }] }] }] });
  for (const [item, ok] of [[{ object: "apple" }, false], [{ object: "football" }, true], [{ shape: "star" }, true], [{ shape: "stra" }, false], [{ preset: "doopi" }, true]]) {
    assert.equal(validate(book(item), catalog).ok, ok, JSON.stringify(item));
  }
});
