import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { textCardLayout, textWidth, wordSpots } from "../../runtime/text_layout.js";
import { validateScript } from "../../runtime/validate.js";
import { compileScript } from "../../runtime/compile.js";

const catalog = loadCatalog3d();
const M = catalog.fontMetrics;

const cases = [
  { name: "one short line", o: { text: "a cat", width: 4, size: 0.2 }, lines: 1 },
  { name: "wraps a long sentence", o: { text: "The quick brown fox jumps over the lazy dog, and then the wind blew.", width: 4, size: 0.24 }, lines: 3 },
  { name: "keeps explicit line breaks", o: { text: "one\ntwo\nthree", width: 4, size: 0.2 }, lines: 3 },
  { name: "a fixed height shrinks the type", o: { text: "The quick brown fox jumps over the lazy dog.", width: 2, size: 0.3, height: 0.6 }, lines: 2, shrinks: true },
];
for (const c of cases) {
  test(`text layout: ${c.name}`, () => {
    const L = textCardLayout({ kind: "text_card", ...c.o }, M);
    assert.equal(L.lines.length, c.lines);
    if (c.shrinks) assert.ok(L.size < c.o.size && L.height === c.o.height);
    for (const ln of L.lines) {
      const end = ln.words.at(-1);
      assert.ok(end.x + end.w <= c.o.width - 2 * L.pad + 1e-9, "every line fits");
    }
  });
}

test("text width: Andika advances in ems (a about 0.6 em, a space about 0.27)", () => {
  assert.ok(Math.abs(textWidth("a", 1, M.andika_bold) - 0.613) < 0.01);
  assert.ok(textWidth(" ", 1, M.andika_bold) > 0.2 && textWidth(" ", 1, M.andika_bold) < 0.35);
});

test("word spots: numbered from 1, left to right then down, centred cards centre their lines", () => {
  const spots = wordSpots({ kind: "text_card", text: "big red\nbus", width: 3, size: 0.3, align: "center" }, M);
  assert.deepEqual(spots.map((s) => s.word), ["big", "red", "bus"]);
  assert.ok(spots[0].x < spots[1].x && spots[0].y === spots[1].y && spots[2].y < spots[0].y);
  assert.ok(Math.abs(spots[2].x) < 1e-3, "bus is centred");
});

test("point at a card word or a letter piece validates and compiles; other actions on card words are refused", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/point_words.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  assert.ok(compileScript(s, { catalog }).duration > 4);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].to = "c#w40";
  bad.scenes[0].beats[1].do = [{ do: "wiggle", target: "c#w2" }];
  assert.deepEqual(validateScript(bad, catalog).errors.map((e) => e.code), ["E3D_POINT", "E3D_TARGET_KIND"]);
});
