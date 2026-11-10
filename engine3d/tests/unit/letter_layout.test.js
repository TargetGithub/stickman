import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { letterLayout, letterPieces } from "../../runtime/letter_layout.js";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";

const catalog = loadCatalog3d();
const M = catalog.fontMetrics;

test("letterLayout: characters left to right, centred, spaces counted", () => {
  const L = letterLayout({ text: "ca ble", size: 1 }, M);
  assert.deepEqual(L.map((c) => c.ch), ["c", "a", " ", "b", "l", "e"]);
  for (let i = 1; i < L.length; i++) assert.ok(L[i].x > L[i - 1].x, "increasing x");
  assert.equal(L[2].space, true);
  const ink = L.filter((c) => !c.space);
  const lo = ink[0].x - ink[0].w / 2;
  const hi = ink.at(-1).x + ink.at(-1).w / 2;
  assert.ok(Math.abs(lo + hi) < 1e-3, "the inked word is centred on 0");
});

for (const [text, size] of [["o", 1], ["mom", 0.6], ["Wi", 2]]) {
  test(`letterLayout scales with size (${text}, ${size})`, () => {
    const a = letterLayout({ text, size: 1 }, M);
    const b = letterLayout({ text, size }, M);
    a.forEach((c, i) => assert.ok(Math.abs(b[i].x - c.x * size) < 1e-3));
  });
}

test("letterPieces and the tour script: marks, glows, children and moves on characters", () => {
  assert.deepEqual(letterPieces({ text: "cab" }), ["c1", "c2", "c3"]);
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/letter_pieces.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.deepEqual(plan.timeline.valueAt("word#c3", "position", 5), [0.25, 0, 0]);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].target = "word#c9";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_PART"));
});
