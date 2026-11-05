// Round 3: shot framing with children, teaching-kit labels, pad and fit exact; paint on teaching kinds and
// many-coloured letters; the hoop shape; letter lift; character voices (meta.cast, say pitch/speed/at after)
// down to the TTS cache key; stage changes; clear; shade rect; reparent right after show; inherit size;
// caption pos; music cues; the dusk rig; validation codes; the round 3 tour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createDirector } from "../../runtime/director.js";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { buildPlan } from "../../runtime/plan.js";
import { buildObject, createMaterials } from "../../runtime/objects.js";
import { shapeGeometry } from "../../runtime/geometry.js";
import { localBounds, worldBounds } from "../../runtime/bounds.js";
import { descendants, padBox, shotBounds, teachBox } from "../../runtime/bounds_teach.js";
import { MAX_TICKS, rectCells } from "../../runtime/teach_layout.js";
import { findWords } from "../../runtime/card_words.js";
import { laterSetPieces, stagePresets } from "../../runtime/stage_change.js";
import { cueGainAt } from "../../tools/lib/music3d.mjs";
import { resolveVoice } from "../../../tools/lib/tts/lines.mjs";
import { loadVoiceTable } from "../../../tools/lib/tts/index.mjs";
import { cacheKey } from "../../../tools/lib/tts/synth.mjs";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const same = (a, b) => (assert.equal(a.length, b.length), a.forEach((x, i) => near(x, b[i])));
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const script = (objects, actions, extra = {}) => ({ kind: "video3d", version: 1, ...extra, objects, scenes: [{ id: "s", beats: [{ dur: 3, do: actions }] }] });

/** Director with objects placed; returns { d, now, get, list }. */
function placed(specs) {
  const d = createDirector({ catalog });
  for (const s of specs) d.add(s);
  const plan = d.plan();
  const get = (id) => plan.objects.find((o) => o.id === id);
  return { d, plan, get, now: (id, prop, t) => d.timeline.valueAt(id, prop, t), list: plan.objects };
}

test("shot boxes: children count, groups use only their children, plain targets are unchanged", () => {
  const { get, now, list } = placed([
    { id: "g", kind: "group", at: [1, 0, 0] },
    { id: "card", kind: "shape", shape: "plate", parent: "g", at: [0, 0.5, 0], scale: [1.5, 1, 1] },
    { id: "word", kind: "letter", text: "cat", size: 0.4, parent: "g", at: [0, 1.6, 0] },
    { id: "deep", kind: "shape", shape: "cube", parent: "word", at: [0, 1, 0], size: 0.2 },
    { id: "lone", kind: "critter", species: "cat", at: [-2, 0, 0], rotation: [0, 30, 0] },
  ]);
  assert.deepEqual(descendants("g", list).map((o) => o.id), ["card", "word", "deep"]);
  const b = shotBounds(get("g"), catalog, now, get, 0, list);
  near(b.max[1], 1 + 1.6 + 0.2); // the cube riding on the word, 1 m above it
  near(b.min[0], 1 - 0.75); // the card, not the group's 0.6 m stand-in box
  assert.deepEqual(shotBounds(get("lone"), catalog, now, get, 0, list), worldBounds(get("lone"), catalog, now, get, 0));
});

test("teaching-kit boxes include labels; pad grows a box about its centre", () => {
  for (const [o, check] of [
    [{ kind: "number_line", length: 8 }, (b) => near(b.max[0], 4.6)],
    [{ kind: "fraction_bar", length: 3, height: 0.5, label: true }, (b) => assert.ok(b.max[1] > 0.9)],
    [{ kind: "fraction_circle", radius: 1 }, (b) => near(b.max[1], 2.06)],
    [{ kind: "callout", text: "here", point: [0, 0, 0], offset: [2, 1, 0] }, (b) => assert.ok(b.max[0] > 2.3 && b.max[1] > 1.2)],
    [{ kind: "pointer", from: [0, 0, 0], to: [2, 0, 0], bend: 0.5, width: 0.1 }, (b) => near(b.max[1], 0.64)],
    [{ kind: "grid", rows: 2, cols: 2, cell: 0.5, upright: true }, (b) => assert.ok(b.max[1] > 1.5)],
    [{ kind: "cubes", l: 2, w: 2, h: 3, cell: 0.4 }, (b) => near(b.max[1], 1.25)],
    [{ kind: "shape", shape: "cube" }, (b) => assert.equal(b, null)],
  ]) check(teachBox(o));
  const p = padBox({ min: [0, 0, 0], max: [2, 2, 2] }, 0.5);
  assert.deepEqual(p, { min: [-0.5, -0.5, -0.5], max: [2.5, 2.5, 2.5] });
});

test("fit exact: thin shapes at their height, turns applied (a stood-up sign)", () => {
  const { get, now, list } = placed([
    { id: "sign", kind: "shape", shape: "plate", at: [0, 1, 0], rotation: [90, 0, 0], scale: [2, 1, 1] },
    { id: "mat", kind: "shape", shape: "plate", at: [0, 0, 0], scale: [3, 1, 3] },
  ]);
  const sign = shotBounds(get("sign"), catalog, now, get, 0, list, true);
  near(sign.max[1] - sign.min[1], 1); // its 1 m depth stands up
  assert.ok(sign.max[2] - sign.min[2] < 0.05);
  const mat = shotBounds(get("mat"), catalog, now, get, 0, list, true);
  near(mat.max[1], 0.04);
  near(shotBounds(get("mat"), catalog, now, get, 0, list).max[1], 1); // approx keeps the old box
});

test("shot uses children and pad; fit exact moves the camera closer to a plate", () => {
  const base = [{ id: "g", kind: "group", at: [0, 0, 0] }, { id: "w", kind: "letter", text: "hi", parent: "g", at: [0, 2, 0] }];
  const at = (actions) => compileScript(script(base, actions), { catalog }).timeline.valueAt("camera", "lookAt", 5);
  assert.ok(at([{ do: "shot", target: "g", dur: 0 }])[1] > 1.5); // looks up at the word, not the empty group
  const dist = (actions, objs) => {
    const tl = compileScript(script(objs, actions), { catalog }).timeline;
    const [p, l] = [tl.valueAt("camera", "position", 5), tl.valueAt("camera", "lookAt", 5)];
    return Math.hypot(p[0] - l[0], p[1] - l[1], p[2] - l[2]);
  };
  const plate = [{ id: "p", kind: "shape", shape: "plate", scale: [2, 1, 2] }];
  assert.ok(dist([{ do: "shot", target: "p", fit: "exact", dur: 0 }], plate) < dist([{ do: "shot", target: "p", dur: 0 }], plate));
  assert.ok(dist([{ do: "shot", target: "g", pad: 0.5, dur: 0 }], base) > dist([{ do: "shot", target: "g", dur: 0 }], base));
});

test("paint: strokes, pointers and number lines tint; fractions shade and empty colours; letters paint every character", () => {
  const { d } = placed([
    { id: "s", kind: "stroke", points: [[0, 0, 0], [1, 0, 0]] },
    { id: "p", kind: "pointer", from: [0, 0, 0], to: [1, 0, 0] },
    { id: "n", kind: "number_line" },
    { id: "b", kind: "fraction_bar", parts: 2 },
    { id: "w", kind: "letter", text: "a b", colors: ["red", null, "blue"] },
  ]);
  for (const id of ["s", "p", "n"]) d.paint(id, { at: 0, color: "green", dur: 1 });
  d.paint("b", { at: 0, color: "green", dur: 1 }).paint("b", { at: 0, from: "cream", color: "sky", dur: 1 }).paint("w", { at: 0, color: "pink", dur: 1 });
  const v = (id, prop, t) => d.timeline.valueAt(id, prop, t);
  const hex = (c) => [0, 2, 4].map((i) => parseInt(catalog.colors[c].hex.slice(1 + i, 3 + i), 16) / 255);
  for (const id of ["s", "p", "n"]) same(v(id, "tint", 2), hex("green"));
  same(v("s", "tint", 0), hex("blue")); // starts from its own colour
  same(v("b", "shadeColor", 2), hex("green"));
  same(v("b", "emptyColor", 0), hex("cream"));
  same(v("b", "emptyColor", 2), hex("sky"));
  same(v("w", "tint@0", 0), hex("red"));
  same(v("w", "tint@2", 0), hex("blue"));
  assert.equal(v("w", "tint@1", 0), undefined); // the space
  same(v("w", "tint@2", 2), hex("pink"));
  assert.throws(() => d.paint("b", { from: "red", color: "sky" }));
});

test("hoop, letter lift and painted letters build in Node", () => {
  const g = shapeGeometry("hoop");
  near(g.boundingBox.max.x, 0.5, 1e-3);
  near(g.boundingBox.max.y - g.boundingBox.min.y, 0.03, 1e-3);
  near(localBounds({ kind: "shape", shape: "hoop", size: 2 }, catalog).max[1], 0.06);
  const ttf = readFileSync(new URL("../../../assets/fonts/Andika-Bold.ttf", import.meta.url));
  const font = new Font(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length)));
  const assets = { fonts: new Map([["andika_bold", font]]), characters: new Map() };
  const material = createMaterials(catalog);
  const low = (o) => {
    const h = buildObject({ id: "x", ...o }, { catalog, assets, material, seed: 1 });
    return new THREE.Box3().setFromObject(h.group).min.y;
  };
  assert.ok(low({ kind: "letter", text: "Qg", size: 1 }) < -0.2); // tails below the floor
  near(low({ kind: "letter", text: "Qg", size: 1, lift: "descender" }), 0, 1e-6);
  near(low({ kind: "letter", text: "Qg", size: 1, colors: ["red", "blue"], lift: "descender" }), 0, 1e-6);
  const h = buildObject({ id: "w", kind: "letter", text: "ab", colors: ["red", "blue"], paintChars: true }, { catalog, assets, material, seed: 1 });
  h.update(0, { "tint@0": [0, 1, 0], "tint@1": [0, 0, 1] });
  const mats = h.group.children.map((m) => m.material);
  assert.notEqual(mats[0], mats[1]);
  near(mats[1].color.b, 1);
});

test("character voices: Robo's catalog voice, meta.cast, say overrides, the host", () => {
  const objs = [{ id: "robo", kind: "character", character: "robot" }, { id: "bun", kind: "critter", species: "bunny" }];
  const s = script(objs, [
    { do: "say", text: "Low.", who: "robo" },
    { do: "say", text: "High!", who: "bun", at: "after" },
    { do: "say", text: "Higher!", who: "bun", pitch: 1.2, at: "after" },
    { do: "say", text: "Narrator here." },
  ], { meta: { cast: { robo: { voice: "soft", pitch: 0.85 }, bun: { voice: "squeaky", pitch: 1.3, speed: 1.1 } } } });
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const p = compileScript(s, { catalog, speech: { "s.1.1": { dur: 1 }, "s.1.2": { dur: 2 } } });
  const [a, b, c, n] = p.lines;
  // Robo always speaks in his own catalog voice (the toddler timbre), even where an old cast entry names another.
  assert.deepEqual([a.voice, a.pitch, a.speed], ["toddler", 1.1, undefined]);
  assert.deepEqual([b.voice, b.pitch, b.speed], ["squeaky", 1.3, 1.1]);
  assert.equal(c.pitch, 1.2);
  // A line without who is the host's (Robo, the episode's one voiced character): his voice, no lip-sync.
  assert.deepEqual([n.voice, n.pitch, n.who], ["toddler", 1.1, undefined]);
  // meta.host: null keeps those lines in meta.voice with the default pitch, as before.
  const q = compileScript({ ...s, meta: { ...s.meta, host: null } }, { catalog });
  assert.ok(!("pitch" in q.lines[3]) && q.lines[3].voice === "soft");
  // A say's own voice still wins over Robo's.
  const r = compileScript(script(objs, [{ do: "say", text: "Hm.", who: "robo", voice: "deep", pitch: 0.9 }]), { catalog });
  assert.deepEqual([r.lines[0].voice, r.lines[0].pitch], ["deep", 0.9]);
  near(b.t, 1 + 0.25); // queued after Robo's 1 s clip
  near(c.t, 1 + 0.25 + 2 + 0.25);
});

test("pitch and speed reach the TTS voice and the clip cache key", () => {
  const table = loadVoiceTable();
  const voice = (pitch, speed = 1) => resolveVoice({ timbre: "soft", pitch, speed: 0.95 * speed }, table);
  assert.deepEqual(voice(1.1), resolveVoice({ timbre: "soft", pitch: 1.1, speed: 0.95 }, table)); // the old default
  assert.deepEqual([0.8, 0.85, 1.1, 1.3].map((p) => voice(p).pitch), [-2, -2, 1, 3]);
  const key = (v) => cacheKey({ id: "piper", version: "1" }, { voice: v, spoken: "Hello.", bubble: "speech" });
  assert.notEqual(key(voice(0.85)), key(voice(1.3)));
  assert.notEqual(key(voice(1.1, 1.2)), key(voice(1.1)));
});

test("stage changes: set pieces of every preset, crossfaded props, closed form", () => {
  const s = script([], [{ do: "stage", preset: "forest", dur: 2 }, { do: "stage", preset: "classroom", at: 2.5, dur: 1 }], { stage: { preset: "classroom" } });
  assert.deepEqual(stagePresets(s), ["forest", "classroom"]);
  assert.ok(laterSetPieces(s, catalog).every((o) => o.id.startsWith("set_forest_")));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const p = compileScript(s, { catalog });
  const v = (id, prop, t) => p.timeline.valueAt(id, prop, t);
  assert.deepEqual(p.stage.presets, ["classroom", "forest"]);
  assert.ok(p.objects.some((o) => o.id === "set_forest_tree1") && p.objects.some((o) => o.id === "set_board"));
  assert.equal(v("set_forest_tree1", "visible", 0), true); // shown at the start of the fade
  near(v("set_forest_tree1", "fade", 1), 0.5);
  near(v("set_board", "fade", 1), 0.5);
  assert.equal(v("set_board", "visible", 2.2), false);
  assert.equal(v("set_board", "visible", 2.6), true); // back to the classroom
  assert.deepEqual(v("stage", "fog", 2), catalog.stages.forest.fog);
  assert.deepEqual(v("stage", "sunDir", 2), catalog.lights.forest.sun.dir);
  const plain = compileScript(script([], [{ do: "say", text: "Hi" }]), { catalog });
  assert.equal(plain.stage.presets, undefined);
});

test("clear wipes the arcs drawn so far; later leaps draw new ones", () => {
  const { d, plan } = placed([{ id: "n", kind: "number_line" }, { id: "b", kind: "shape", shape: "sphere", on: { line: "n", value: 0 } }]);
  d.leap("b", { at: 0, line: "n", values: [2, 4], dur: 0.5 }).clear("n", { at: 2, dur: 0.4 }).leap("b", { at: 3, line: "n", values: [6], dur: 0.5 });
  const arcs = d.plan().objects.filter((o) => o.internal && o.parent === "n").map((o) => o.id);
  assert.equal(arcs.length, 3);
  const vis = (id, t) => d.timeline.valueAt(id, "visible", t);
  assert.deepEqual(arcs.map((id) => vis(id, 2.5)), [false, false, false]);
  assert.deepEqual(arcs.map((id) => vis(id, 3.6)), [false, false, true]);
  assert.ok(plan);
  assert.throws(() => d.clear("b"));
});

test("shade rect, reparent right after show, inherit size, caption pos, music cues, dusk", () => {
  assert.deepEqual(rectCells({ rows: 4, cols: 5 }, [2, 2, 2, 3]), [7, 8, 9, 12, 13, 14]);
  assert.equal(rectCells({ rows: 4, cols: 5 }, [4, 4, 2, 1]), null);
  assert.equal(MAX_TICKS, 201);
  const { d } = placed([
    { id: "g", kind: "grid", rows: 4, cols: 5 },
    { id: "turtle", kind: "critter", species: "turtle" },
    { id: "hat", kind: "prop", model: "hat", at: [2, 0, 0], hidden: true },
    { id: "card", kind: "prop", model: "story_card", size: 0.5 },
    { id: "duck", kind: "critter", species: "duck", parent: "card", inherit: "size", at: [0, 1, 0], scale: 2 },
  ]);
  d.shade("g", { at: 0, rect: [1, 1, 1, 2], dur: 0.2 });
  assert.equal(d.timeline.valueAt("g#c2", "shade", 1), 1);
  d.show("hat", { at: 1 }).reparent("hat", { at: 1, parent: "turtle", part: "head", to: [0, 0.28, 0] });
  assert.ok(d.timeline.valueAt("hat", "scale", 2).every((x) => x > 0.5));
  const duck = d.plan().objects.find((o) => o.id === "duck");
  assert.deepEqual([duck.at, duck.scale], [[0, 0.5, 0], [1, 1, 1]]);
  d.caption("6", { at: 0, style: "count", pos: "left" }).music({ at: 1, gain: 0.2, dur: 1 }).music({ at: 3, gain: 1, dur: 0 });
  const p = d.plan();
  assert.equal(p.captions[0].pos, "left");
  near(cueGainAt(p.musicCues, 0.5), 1);
  near(cueGainAt(p.musicCues, 1.5), 0.6);
  near(cueGainAt(p.musicCues, 2.5), 0.2);
  near(cueGainAt(p.musicCues, 3), 1);
  d.lights({ at: 0, rig: "dusk", dur: 1 });
  const bg = d.timeline.valueAt("stage", "background", 2);
  same(bg, [0, 2, 4].map((i) => parseInt(catalog.colors.dusk_sky.hex.slice(1 + i, 3 + i), 16) / 255));
  assert.ok(catalog.lights.dusk.sun.intensity < catalog.lights.evening.sun.intensity);
});

test("emphasize matches phrases ignoring quotes, commas and curly apostrophes", () => {
  const text = "\"I can't climb trees,\" said Owl. — Yes!";
  for (const [words, want] of [["can’t climb trees", [1, 3]], ["\"I can't", [0, 1]], ["said owl yes", [4, 7]], ["cant", [1, 1]], ["the dog", null]]) assert.deepEqual(findWords(text, words), want, words);
});

test("validator: round 3 errors carry their codes", () => {
  const { expect, script: s } = read("../fixtures/bad/bad_r3.json");
  const codes = validateScript(s, catalog).errors.map((e) => e.code);
  for (const c of expect) assert.ok(codes.includes(c), `wanted ${c}, got ${codes.join(", ")}`);
});

test("the round 3 tour validates, uses every new option and builds the same plan twice", async () => {
  const s = read("../../scripts/round3_tour.json");
  const v = validateScript(s, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
  const actions = s.scenes.flatMap((x) => x.beats.flatMap((b) => b.do));
  for (const [what, ok] of [["stage", actions.some((a) => a.do === "stage")], ["clear", actions.some((a) => a.do === "clear")], ["music", actions.some((a) => a.do === "music")],
    ["pad", actions.some((a) => a.pad)], ["fit", actions.some((a) => a.fit === "exact")], ["rect", actions.some((a) => a.rect)], ["after", actions.some((a) => a.at === "after")],
    ["pos", actions.some((a) => a.pos)], ["dusk", actions.some((a) => a.rig === "dusk")], ["cast", !!s.meta.cast], ["lift", s.objects.some((o) => o.lift)],
    ["hoop", s.objects.some((o) => o.shape === "hoop")], ["inherit", s.objects.some((o) => o.inherit)]]) assert.ok(ok, `tour has no ${what}`);
  const [a, b] = [await buildPlan({ script: s, catalog }), await buildPlan({ script: s, catalog })];
  assert.equal(JSON.stringify(a.timeline.toJSON()), JSON.stringify(b.timeline.toJSON()));
});
