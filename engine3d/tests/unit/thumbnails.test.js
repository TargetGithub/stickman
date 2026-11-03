// Designed thumbnails (meta.thumbnails): the validator, the one-beat scene each concept becomes, and the text
// layout of tools/thumbnail3d.mjs (measured with a fake context: no canvas backend needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { validateScript } from "../../runtime/validate.js";
import { thumbnailScript, THUMB_AT } from "../../runtime/thumbnails.js";
import { fitTitle, thumbLayout, titleLines, THUMB_W, THUMB_H } from "../../tools/thumbnail3d.mjs";

const catalog = loadCatalog3d();
const cam = { position: [0, 1.4, 6], lookAt: [0, 1, 0], fov: 35 };
const duck = { id: "duck", kind: "critter", species: "duck", at: [1.5, 0, 0], feeling: "happy" };
const concept = (extra = {}) => ({ name: "a", title: "COUNT!", camera: cam, objects: [duck], ...extra });
const script = (thumbnails) => ({ kind: "video3d", version: 1, meta: { seed: 3, thumbnails }, stage: { preset: "garden" }, objects: [], scenes: [{ id: "s", beats: [{ dur: 1, do: [] }] }] });
const codes = (s) => validateScript(s, catalog).errors.map((e) => e.code);

test("the demo script's concepts validate", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/thumb_demo.json", import.meta.url), "utf8"));
  const v = validateScript(s, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
  assert.ok(s.meta.thumbnails.length >= 2);
});

const CASES = [
  ["a plain concept", [concept()], []],
  ["every optional field", [concept({ subtitle: "Count to ten", titleColor: "yellow", side: "right", badge: "PRE-K", at: 1.5, stage: "playroom", lights: { rig: "studio" } })], []],
  ["a #hex title colour", [concept({ titleColor: "#ffcc00" })], []],
  ["four concepts", ["a", "b", "c", "d"].map((name) => concept({ name })), []],
  ["five concepts", ["a", "b", "c", "d", "e"].map((name) => concept({ name })), ["E3D_THUMBNAILS"]],
  ["not a list", { name: "a" }, ["E3D_THUMBNAILS"]],
  ["title of 19 characters", [concept({ title: "x".repeat(19) })], ["E3D_THUMB_TEXT"]],
  ["title of 18 characters", [concept({ title: "x".repeat(18) })], []],
  ["subtitle of 33 characters", [concept({ subtitle: "y".repeat(33) })], ["E3D_THUMB_TEXT"]],
  ["no title", [concept({ title: undefined })], ["E3D_THUMB_TEXT"]],
  ["name with spaces", [concept({ name: "My Thumb" })], ["E3D_THUMB_NAME"]],
  ["a side that is not one", [concept({ side: "centre" })], ["E3D_THUMB_SIDE"]],
  ["a pose time out of range", [concept({ at: 99 })], ["E3D_RANGE"]],
  ["no camera", [concept({ camera: undefined })], ["E3D_REQUIRED"]],
  ["no objects", [concept({ objects: [] })], ["E3D_REQUIRED"]],
  ["object rules: unknown colour", [concept({ objects: [{ ...duck, color: "plaid" }] })], ["E3D_COLOR"]],
  ["object rules: bad feeling", [concept({ objects: [{ ...duck, feeling: "grumpy" }] })], ["E3D_FEELING"]],
  ["object rules: dup ids", [concept({ objects: [duck, duck] })], ["E3D_DUP_ID"]],
  ["lights rig unknown", [concept({ lights: { rig: "disco" } })], ["E3D_LIGHTS"]],
];
for (const [label, thumbs, want] of CASES) {
  test(`meta.thumbnails: ${label}`, () => {
    const got = codes(script(thumbs));
    if (!want.length) assert.deepEqual(got, []);
    for (const c of want) assert.ok(got.includes(c), `wanted ${c}, got ${got.join(", ")}`);
  });
}

test("concept issues point into meta.thumbnails", () => {
  const v = validateScript(script([concept(), concept({ name: "b", stage: "moon", objects: [{ ...duck, color: "plaid" }], lights: { rig: "disco" } })]), catalog);
  const paths = v.errors.map((e) => e.path).sort();
  assert.deepEqual(paths, ["meta.thumbnails[1].lights.rig", "meta.thumbnails[1].objects[0].color", "meta.thumbnails[1].stage"]);
});

test("a concept becomes a one-beat scene that lasts past its pose time", () => {
  const s = script([]);
  const one = thumbnailScript(s, concept({ lights: { background: "blue" } }));
  assert.equal(one.scenes.length, 1);
  assert.equal(one.scenes[0].beats.length, 1);
  assert.ok(one.scenes[0].beats[0].dur > THUMB_AT);
  assert.deepEqual(one.scenes[0].beats[0].do, [{ do: "lights", background: "blue", dur: 0.1 }]);
  assert.deepEqual(one.stage, { preset: "garden" }); // the episode's stage by default
  assert.deepEqual(thumbnailScript(s, concept({ stage: "night" })).stage, { preset: "night" });
  assert.equal(one.meta.seed, 3);
  assert.ok(thumbnailScript(s, concept({ at: 5 })).scenes[0].beats[0].dur >= 6);
  assert.ok(!JSON.stringify(one).includes('"say"'));
});

test("titles split only at word breaks, most balanced first", () => {
  assert.deepEqual(titleLines("ARRAYS!"), [["ARRAYS!"]]);
  assert.deepEqual(titleLines("LIGHT OR DARK?"), [["LIGHT OR DARK?"], ["LIGHT OR", "DARK?"], ["LIGHT", "OR DARK?"]]);
});

for (const side of ["left", "right", "top", "bottom"]) {
  test(`layout ${side}: the title box is inside the frame and clear of the duration stamp`, () => {
    const { title: b } = thumbLayout(side);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= THUMB_W && b.y + b.h <= THUMB_H);
    // YouTube's length stamp covers about the bottom-right 120x50 px.
    assert.ok(b.y + b.h <= THUMB_H - 50 || b.x + b.w <= THUMB_W - 120);
  });
}

// A fake 2D context: every glyph is 0.6 em wide, caps rise 0.72 em, descenders 0.22 em.
const fake = () => {
  const ctx = { font: "", measureText(t) {
    const size = Number(/(\d+)px/.exec(ctx.font)[1]);
    return { width: t.length * size * 0.6, actualBoundingBoxLeft: 0, actualBoundingBoxRight: t.length * size * 0.6, actualBoundingBoxAscent: size * 0.72, actualBoundingBoxDescent: size * 0.22 };
  } };
  return ctx;
};
const FITS = [
  ["short title stays big on one line", "ZOO!", null, { x: 0, y: 0, w: 660, h: 500 }, 1],
  ["long title wraps to two lines", "SEED TO PLANT", "10 days", { x: 0, y: 0, w: 600, h: 500 }, 2],
  ["a wide box keeps one line", "SEED TO PLANT", "10 days in 40 seconds!", { x: 0, y: 0, w: 1200, h: 320 }, 1],
  ["a tiny box shrinks the type", "LIGHT OR DARK?", "Which plant grows best?", { x: 0, y: 0, w: 300, h: 140 }, null],
];
for (const [label, title, sub, box, lines] of FITS) {
  test(`fitTitle: ${label}, never wider or taller than its box`, () => {
    const f = fitTitle(fake(), title, sub, box);
    assert.ok(Math.max(...f.lineBoxes.map((b) => b.width), f.subBox?.width ?? 0) <= box.w);
    assert.ok(f.height <= box.h);
    if (lines) assert.equal(f.lines.length, lines);
    if (lines === 1 && !sub) assert.ok(f.size >= THUMB_H / 5, `size ${f.size}`);
  });
}
