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

test("split pulls chunks apart after characters and joins them again", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/syllable_split.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const x = (n, t) => plan.timeline.valueAt(`word#c${n}`, "position", t)[0];
  assert.equal(x(3, 1.2), 0);
  assert.ok(Math.abs(x(4, 1.2) - 0.245) < 1e-6, "ble moves one gap (0.35 x 0.7)");
  assert.equal(x(4, 4.3), 0, "joined again");
  assert.ok(plan.objects.some((o) => o.id.startsWith("word~blade")));
  for (const after of [[0], [6], ["a"]]) {
    const bad = structuredClone(s);
    bad.scenes[0].beats[0].do[0].after = after;
    assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_SPLIT"), JSON.stringify(after));
  }
});

test("#47 retext changes a word, a card's text or a text card in place", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/retext.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const word = plan.objects.find((o) => o.id === "word");
  assert.deepEqual(word.texts, ["go", "got"]);
  assert.equal(plan.timeline.valueAt("word", "textIdx", 0.5), 0);
  assert.equal(plan.timeline.valueAt("word", "textIdx", 2), 1);
  assert.deepEqual(plan.objects.find((o) => o.id === "tile_text").texts, ["hop", "hope"]);
  const bad = structuredClone(s);
  bad.scenes[0].beats[1].do[0].text = "x".repeat(30);
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_TEXT"));
});

test("#46 vowel_mark draws a bar or cup over a vowel or vowel team; it clears an i's dot", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/vowel_marks.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const m = (w) => plan.objects.find((o) => o.id.startsWith(`${w}~vowel`));
  assert.equal(m("w1").points.length, 2, "long: a bar");
  assert.equal(m("w3").points.length, 9, "short: a cup");
  assert.ok(m("w2").at[1] > m("w1").at[1], "the bar over ai sits above the i's dot");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].chars = [9];
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_CHARS"));
});
