// The compositor and post effects (ENGINE_V3_SPEC 6, ADR-026): compiling motion blocks, element lifetimes,
// in/out animations, tracks on nodes, parents, masks, layer order, post settings, the grade filter, the
// v3 schema blocks and the motion checks; the sample renders deterministically through the public API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasMotion, compileMotion, composeAt, postAt, motionValuesAt, animState, lifeOf, BLENDS, DEFAULT_LAYER, POST_DEFAULTS } from "../../engine/compositor.js";
import { gradeFilter, gammaGrey, postActive } from "../../engine/renderer/post.js";
import { textLook } from "../../engine/renderer/motion.js";
import { normalize } from "../../engine/story/normalize.js";
import { jsonSchemaV3 } from "../../engine/validator/schema_v3.js";
import { checkValue } from "../../engine/validator/schema.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const SPANS = [{ id: "s1", t0: 0, t1: 10 }, { id: "s2", t0: 11, t1: 20 }];
const story = (extra) => normalize({ version: 3, meta: {}, cast: [], scenes: [{ id: "s1" }, { id: "s2", post: { bloom: 0.5 } }], ...extra });

test("hasMotion: only v3 stories with a block or a scene post", () => {
  assert.equal(hasMotion(normalize({ version: 2, meta: {}, cast: [], scenes: [{ id: "s" }], text: [{ id: "t", text: "x" }] })), false);
  assert.equal(hasMotion(normalize({ version: 3, meta: {}, cast: [], scenes: [{ id: "s" }] })), false);
  assert.equal(hasMotion(story({})), true, "a scene post counts");
  assert.equal(hasMotion(normalize({ version: 3, meta: {}, cast: [], scenes: [{ id: "s" }], text: [{ id: "t", text: "x" }] })), true);
});

test("lifetimes: from/to, scene bases, in and out progress", () => {
  const m = compileMotion(story({}), SPANS);
  const e = { from: 1, to: 3, in: { type: "fade", dur: 0.5 }, out: { type: "fade", dur: 1 } };
  assert.equal(lifeOf(m, e, 0.5).on, false);
  near(lifeOf(m, e, 1.25).pIn, 0.5);
  near(lifeOf(m, e, 2.5).pOut, 0.5);
  assert.equal(lifeOf(m, e, 3).on, false);
  const inScene = { scene: "s2", from: 1 };
  assert.equal(lifeOf(m, inScene, 11.5).on, false);
  assert.deepEqual([lifeOf(m, inScene, 12.5).on, lifeOf(m, inScene, 12.5).local], [true, 1.5]);
  assert.equal(lifeOf(m, inScene, 25).on, false, "outside its scene");
});

test("in/out animations", () => {
  assert.deepEqual(animState(null, 0.3), { opacity: 1, scale: 1, dx: 0, dy: 0, clip: null, reveal: 1 });
  near(animState({ type: "fade" }, 0.3).opacity, 0.3);
  assert.ok(animState({ type: "pop" }, 0.5).scale > 0.5);
  assert.ok(animState({ type: "slide_up" }, 0).dy > 0 && animState({ type: "slide_left" }, 0).dx > 0 && animState({ type: "slide_right" }, 0).dx < 0);
  assert.deepEqual(animState({ type: "wipe_left" }, 1).clip, null, "settled: no clip");
  assert.equal(animState({ type: "wipe_up" }, 0.5).clip.wipe, "up");
  assert.ok(animState({ type: "iris" }, 0.5).clip.iris);
  near(animState({ type: "typewriter" }, 0.4).reveal, 0.4);
});

test("composeAt: layers in order with their items, tracks applied, mask shapes kept out, parents followed", () => {
  const s = story({
    layers: [
      { id: "back1", place: "back", blend: "multiply" },
      { id: "top", z: 5, from: 0, to: 9, opacity: 0.8 },
      { id: "kid", parent: { layer: "top" }, x: 10 },
      { id: "masked", mask: { shape: "m" } },
      { id: "follow", space: "world", parent: { char: "kai", joint: "head" } },
    ],
    shapes: [{ id: "bg", type: "rect", layer: "back1" }, { id: "m", type: "circle", r: 50 }, { id: "ring", type: "circle", layer: "masked" }, { id: "dot", type: "circle", layer: "follow" }],
    text: [{ id: "t1", text: "Hi", layer: "top", x: 100, in: { type: "fade", dur: 1 } }, { id: "t2", text: "Child", layer: "kid" }, { id: "loose", text: "Default" }],
    tracks: [{ target: "text.t1.y", keys: [{ t: 0, v: 0 }, { t: 2, v: 200 }] }, { target: "layer.top.x", keys: [{ t: 0, v: 50 }] }, { target: "post.grain", keys: [{ t: 0, v: 0.3 }] }],
  });
  const m = compileMotion(s, SPANS);
  assert.deepEqual(m.layers.map((l) => l.id), [DEFAULT_LAYER, "back1", "kid", "masked", "follow", "top"], "z sorts, then listing order");
  assert.ok(!m.items.some((e) => e.id === "m"), "the mask shape is not drawn");
  const c = composeAt(m, 1, (p, space) => (p.char === "kai" ? { x: 500, y: 300, space } : null));
  assert.deepEqual(c.back.map((l) => [l.id, l.blend]), [["back1", BLENDS.multiply]]);
  assert.deepEqual(c.over.map((l) => l.id), [DEFAULT_LAYER, "kid", "masked", "follow", "top"]);
  const top = c.over.find((l) => l.id === "top");
  assert.equal(top.x, 50);
  const t1 = top.items[0];
  assert.deepEqual([t1.id, t1.y], ["t1", 100]);
  near(t1.opacity, 1);
  const kid = c.over.find((l) => l.id === "kid");
  assert.deepEqual([kid.x, kid.opacity], [60, 0.8], "a child layer inherits offset and opacity");
  assert.deepEqual(c.over.find((l) => l.id === "follow").x, 500);
  assert.equal(c.over.find((l) => l.id === "masked").mask.shape, "m");
  assert.equal(composeAt(m, 1, () => null).over.find((l) => l.id === "follow"), undefined, "a missing character hides the layer");
  assert.equal(composeAt(m, 9.5).over.find((l) => l.id === "top"), undefined, "after `to`");
  near(composeAt(m, 0.5).over.find((l) => l.id === "top").items[0].opacity, 0.5);
  assert.equal(c.values.post.grain, 0.3);
});

test("post settings: defaults, the script, the scene, then tracks; the grade filter and gamma grey", () => {
  const m = compileMotion(story({ post: { grain: 0.2, vignette: 0.4 }, tracks: [{ target: "post.vignette", scene: "s2", keys: [{ t: 0, v: 0.9 }] }] }), SPANS);
  assert.deepEqual(postAt(m, 5, motionValuesAt(m, 5)), { ...POST_DEFAULTS, grain: 0.2, vignette: 0.4 });
  assert.deepEqual(postAt(m, 12, motionValuesAt(m, 12)), { ...POST_DEFAULTS, grain: 0.2, vignette: 0.9, bloom: 0.5 });
  assert.equal(gradeFilter(POST_DEFAULTS), null);
  assert.equal(gradeFilter({ ...POST_DEFAULTS, exposure: 1, saturation: 1.2 }), "brightness(2.000) saturate(1.200)");
  assert.equal(gammaGrey(1), 128);
  assert.ok(gammaGrey(1.5) > 128 && gammaGrey(0.6) < 128);
  assert.equal(postActive(POST_DEFAULTS), false);
  assert.equal(postActive({ ...POST_DEFAULTS, chroma: 0.2 }), true);
});

test("text looks: catalog style, then the element's fields", () => {
  const look = textLook({ style: "title", size: 90 }, catalog.textStyles);
  assert.deepEqual([look.font, look.size, look.color, look.align], ["Bangers", 90, catalog.textStyles.title.color, "center"]);
  assert.deepEqual(textLook({}, catalog.textStyles).font, "Inter");
});

test("the v3 schema accepts the motion blocks and v2 does not", () => {
  const sample = JSON.parse(readFileSync(new URL("../../scripts/samples/v3_5_motion.json", import.meta.url), "utf8"));
  assert.deepEqual(checkValue(sample, jsonSchemaV3), []);
  assert.ok(validate({ ...sample, version: 2 }, catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"));
  const bad = { ...sample, layers: [{ id: "x", blend: "dodge" }] };
  assert.ok(checkValue(bad, jsonSchemaV3).some((i) => i.code === "E_SCHEMA_ENUM"));
});

test("motion checks: duplicates, parent loops and order, lines and paths, blocked text", () => {
  const base = JSON.parse(readFileSync(new URL("../../scripts/samples/v3_5_motion.json", import.meta.url), "utf8"));
  const codes = (patch) => validate({ ...base, ...patch }, catalog).errors.map((e) => `${e.code} ${e.path}`);
  assert.deepEqual(codes({}), []);
  assert.deepEqual(codes({ text: [...base.text, { id: "title", text: "again" }] }), ["E_REF_DUPLICATE text[5].id"]);
  assert.deepEqual(codes({ layers: [{ id: "a", parent: { layer: "b" } }, { id: "b", parent: { layer: "a" } }], shapes: [], text: [], tracks: [] }).filter((c) => c.includes("loop") || c.startsWith("E_LAYER_REF")).length >= 2, true);
  assert.deepEqual(codes({ shapes: [{ id: "l", type: "line" }], text: [], layers: [], tracks: [] }), ["E_TRACK_KEYS shapes[0]"]);
  assert.deepEqual(codes({ text: [{ id: "bad", text: `oh ${catalog.blocklist[0]}` }], layers: [], tracks: [], shapes: [] }), ["E_TEXT_BLOCKED text[0].text"]);
  assert.deepEqual(codes({ layers: [{ id: "f", parent: { char: "zed" } }], text: [], tracks: [], shapes: [] }), ["E_REF_CHARACTER layers[0].parent.char"]);
});
