// Workbook puzzles W4 (WORKBOOK_SPEC 5): mazes, word grids, matching, patterns, dot-to-dot and lowercase
// tracing. Generators and display lists only; no canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate, buildWorkbook } from "../../engine/index.js";
import { deriveRng } from "../../engine/math.js";
import { carve, solve, makeMaze } from "../../engine/workbook/maze.js";
import { makeWordGrid, blockedIn, WORD_DIRS, gradeDirections } from "../../engine/workbook/word_grid.js";
import { shuffleAway } from "../../engine/workbook/activities/match.js";
import { patternRow } from "../../engine/workbook/activities/pattern.js";
import { outlineOf, resample, clockwiseFromTop } from "../../engine/workbook/outline.js";
import { cornerPoints } from "../../engine/workbook/shape_facts.js";

const catalog = workbookCatalogSync();
const ed = catalog.education;
const flat = (items) => items.flatMap((it) => (it.type === "group" ? flat(it.items) : [it]));
const load = (f) => JSON.parse(readFileSync(new URL(`../fixtures/workbooks/${f}`, import.meta.url), "utf8"));

test("mazes are perfect: every cell reached, one fewer opening than cells, a path end to end", () => {
  for (const [cols, rows, seed] of [[5, 5, 1], [7, 7, 2], [14, 14, 3], [10, 6, 4]]) {
    const m = carve(cols, rows, deriveRng(seed, "m"));
    const open = m.right.filter((w, i) => !w && i % cols < cols - 1).length + m.down.filter((w, i) => !w && i < cols * (rows - 1)).length;
    assert.equal(open, cols * rows - 1, `${cols}x${rows} is a tree`);
    const path = solve(m, 0, cols * rows - 1);
    assert.equal(path[0], 0);
    assert.equal(path[path.length - 1], cols * rows - 1);
  }
  const best = makeMaze(7, 7, deriveRng(5, "m"));
  assert.equal(best.start % 7, 0, "the entrance is on the left");
  assert.equal(best.end % 7, 6, "the exit is on the right");
  assert.ok(best.path.length >= 7 * 1.5, `path ${best.path.length}`);
});

test("word grids hold every word where they say, in the grade's directions", () => {
  const words = ["ZEBRA", "MONKEY", "LION", "TIGER", "HORSE"];
  for (const grade of ["k", "2"]) {
    const g = makeWordGrid(words, 10, gradeDirections(grade), deriveRng(9, grade), []);
    for (const p of g.placed) {
      const [dx, dy] = WORD_DIRS[p.dir];
      assert.ok(gradeDirections(grade).includes(p.dir));
      assert.equal([...p.word].map((_, k) => g.grid[(p.y + dy * k) * 10 + p.x + dx * k]).join(""), p.word);
    }
    assert.ok(g.grid.every((c) => /^[A-Z]$/.test(c)));
  }
  assert.equal(makeWordGrid(["ABCDEFG"], 5, ["right"], deriveRng(1, "x")), null, "a word longer than the grid does not fit");
  assert.deepEqual(blockedIn([..."KILLAAAAAAAAAAAA"], 4, ["kill"]), ["KILL"]);
});

test("match shuffles move every item; pattern rows repeat their unit", () => {
  for (let n = 2; n <= 6; n++) {
    const p = shuffleAway(n, deriveRng(n, "match"));
    assert.deepEqual([...p].sort(), Array.from({ length: n }, (_, i) => i));
    assert.ok(p.every((v, i) => v !== i));
  }
  assert.deepEqual(patternRow("AB", 5), [0, 1, 0, 1, 0]);
  assert.deepEqual(patternRow("AAB", 6), [0, 0, 1, 0, 0, 1]);
  assert.deepEqual(patternRow("ABC", 4), [0, 1, 2, 0]);
});

test("dot-to-dot outlines: the asked number of dots, every corner kept, clockwise from the top", () => {
  for (const name of Object.keys(ed.shapes)) {
    const g = ed.shapes[name].geometry;
    const corners = cornerPoints(g);
    const dots = clockwiseFromTop(resample(outlineOf(g), 12, corners));
    assert.equal(dots.length, Math.max(12, corners.length), name);
    for (const c of corners) assert.ok(dots.some((d) => Math.hypot(d[0] - c[0], d[1] - c[1]) < 1e-6), `${name} keeps its corners`);
    assert.ok(dots.every((d) => d[1] >= dots[0][1] - 1e-9), `${name} starts at the top`);
  }
  const tri = clockwiseFromTop(resample(outlineOf(ed.shapes.triangle.geometry), 6, cornerPoints(ed.shapes.triangle.geometry)));
  assert.ok(tri[1][0] > tri[0][0], "clockwise: the second dot is to the right of the top");
});

test("the 24-page K book: every activity at least twice, a key for each puzzle", () => {
  const script = load("w4_sample.json");
  const r = validate(script, catalog);
  assert.deepEqual([...r.errors, ...r.warnings], []);
  const pages = script.documents[0].pages;
  assert.equal(pages.length, 25);
  const counts = {};
  for (const b of pages.flatMap((p) => p.blocks)) counts[b.activity] = (counts[b.activity] || 0) + 1;
  assert.equal(Object.keys(counts).length, 13);
  assert.ok(Object.values(counts).every((n) => n >= 2), JSON.stringify(counts));
  const { documents } = buildWorkbook(script, catalog);
  const key = (id) => flat(documents[1].pages.find((p) => p.ref.page === id).items).filter((i) => i.answer && !String(i.text ?? "").startsWith("Answer Key"));
  assert.equal(key("maze_home").filter((i) => i.type === "line").length, 1);
  assert.equal(key("words_animals").length, 5, "one band per word");
  assert.equal(key("match_shapes").length, 4);
  assert.equal(key("patterns").filter((i) => i.type === "art").length, 3);
  assert.equal(key("dots_fish").length, 1);
});

test("each grade's puzzle book validates and grows harder", () => {
  const sizes = {};
  for (const g of ["prek", "k", "1", "2"]) {
    const script = load(`w4_grade_${g}.json`);
    const r = validate(script, catalog);
    assert.deepEqual([...r.errors, ...r.warnings], [], g);
    const maze = flat(buildWorkbook(script, catalog).documents[0].pages[0].items).filter((i) => i.type === "line");
    sizes[g] = maze.length;
  }
  assert.ok(sizes.prek < sizes.k && sizes.k < sizes["1"] && sizes["1"] < sizes["2"], JSON.stringify(sizes));
});

test("lowercase letters trace with descenders below the baseline", () => {
  const g = ed.letters.glyphs;
  assert.ok([..."abcdefghijklmnopqrstuvwxyz"].every((c) => g[c]));
  const lowest = (c) => Math.max(...g[c].strokes.flat().flatMap((cmd) => cmd.filter((_, k) => k > 0 && k % 2 === 0)));
  for (const c of "gjpqy") assert.ok(lowest(c) > 1.2, `${c} has a descender`);
  for (const c of "acemnorsuvwxz") assert.ok(lowest(c) <= 1.05, `${c} sits on the baseline`);
});
