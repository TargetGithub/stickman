// The retention kit (ENGINE_RETENTION_KIT.md): layout maths, the director moves as timeline data, the speaking
// beats' timing, engagement cues, validation codes, the retention lints, the demo script, and that the kit's kinds
// build and pose in Node (badges with text; icon badges need a canvas and are drawn in the page only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createDirector } from "../../runtime/director.js";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { buildObject, createMaterials } from "../../runtime/objects.js";
import { BAND, CAPTION_TOP, ICONS, SPOTS, keywordSpot, projectPoint, trackerFit, trackerLayout, trackerRect, wordShare } from "../../runtime/retain_layout.js";
import { lintsOn } from "../../runtime/validate_retain.js";

const catalog = loadCatalog3d();
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const codes = (v) => v.warnings.map((w) => w.code);
const base = (objects, beats, meta = {}) => ({ kind: "video3d", version: 1, meta, objects, scenes: [{ id: "s", beats }] });

test("wordShare finds whole words, case-blind, and their place in the line", () => {
  for (const [text, word, want] of [
    ["Plants need water and sun.", "water", 0.51], ["Water is wet.", "water", 0.1], ["sunlight and sun", "sun", 0.86],
    ["I like grapes", "grape", null], ["G is for gift!", "gift", 0.71],
  ]) {
    const got = wordShare(text, word);
    if (want == null) assert.equal(got, null, `${word} in ${text}`);
    else assert.ok(Math.abs(got - want) < 0.03, `${word} in "${text}": ${got}`);
  }
});

test("trackers fit the band, clear of the captions and the bottom corners, for every style and corner", () => {
  for (const style of ["train", "checklist", "stars", "path"]) {
    for (const corner of ["top_left", "top_right", "top"]) {
      for (const slots of [1, 4, 10]) {
        const o = { kind: "tracker", style, slots, surprise: true, corner, labels: [] };
        const r = trackerRect(o, trackerFit(o).anchor);
        assert.ok(r.x0 >= -8 && r.x1 <= 8 && r.y1 <= 4.5, `${style} ${corner} ${slots}: ${JSON.stringify(r)}`);
        assert.ok(r.y0 > CAPTION_TOP + 1.5, `${style} ${corner} ${slots} reaches the captions: ${r.y0}`);
        assert.equal(trackerLayout(o).slots.length, slots + 1);
      }
    }
  }
  const left = trackerRect({ kind: "tracker", slots: 6, surprise: true }, trackerFit({ kind: "tracker", slots: 6, surprise: true }).anchor);
  assert.ok(Math.abs(left.x0 - BAND.left) < 1e-9 && left.x1 <= BAND.left + BAND.width + 1e-9);
});

test("projectPoint puts the look point in the middle and right-hand things right", () => {
  const cam = { position: [0, 2, 10], lookAt: [0, 2, 0], fov: 40 };
  assert.ok(Math.abs(projectPoint([0, 2, 0], cam).x) < 1e-9);
  assert.ok(projectPoint([3, 2, 0], cam).x > 0.3);
  assert.ok(projectPoint([-3, 2, 0], cam).x < -0.3);
  assert.ok(projectPoint([0, 4, 0], cam).y > 0.3);
});

test("keywordSpot takes the side away from the teaching object and skips busy spots", () => {
  for (const [o, want] of [
    [{ avoidX: 0.5 }, SPOTS.keyword.left[0]], [{ avoidX: -0.5 }, SPOTS.keyword.right[0]], [{ avoidX: 0 }, SPOTS.keyword.right[0]],
    [{ side: "left", avoidX: -0.5 }, SPOTS.keyword.left[0]],
    [{ avoidX: 0, busy: [{ x0: 5, x1: 8, y0: 0.6, y1: 2 }] }, SPOTS.keyword.right[1]],
    [{ avoidX: 0, busy: [{ x0: 5, x1: 8, y0: -1, y1: 2 }] }, SPOTS.keyword.left[0]],
  ]) assert.deepEqual(keywordSpot(o), want, JSON.stringify(o));
});

test("timer: pops in, drains, counts 3-2-1 with ticks, rings and pops out", () => {
  const d = createDirector({ catalog });
  d.add({ id: "clock", kind: "timer_ring", hud: true });
  const o = d.plan().objects.find((x) => x.id === "clock");
  assert.equal(o.hidden, true);
  assert.deepEqual(o.at, SPOTS.timer);
  d.timer("clock", { at: 2, dur: 5 });
  const p = d.plan();
  const v = (prop, t) => p.timeline.valueAt("clock", prop, t);
  assert.equal(v("fill", 2.3), 1);
  assert.ok(Math.abs(v("fill", 4.8) - 0.5) < 1e-9);
  for (const [t, n] of [[4.2, 0], [4.4, 3], [5.4, 2], [6.4, 1], [7.4, 0]]) assert.equal(v("num", t), n, `num at ${t}`);
  assert.equal(v("visible", 9), false);
  assert.deepEqual(p.audio.filter((a) => a.sound === "timer_tick").map((a) => a.t), [4.3, 5.3, 6.3]);
  assert.deepEqual(p.audio.filter((a) => a.sound === "timer_chime").map((a) => a.t), [7.3]);
  assert.deepEqual(p.engagement.map((e) => e.kind), ["timer"]);
});

test("timer without a target makes one ring at the timer spot and reuses it", () => {
  const d = createDirector({ catalog });
  d.timer(null, { at: 0, dur: 3 }).timer(undefined, { at: 10, dur: 3, count: 0 });
  const rings = d.plan().objects.filter((o) => o.kind === "timer_ring");
  assert.equal(rings.length, 1);
  assert.equal(d.plan().audio.filter((a) => a.sound === "timer_tick").length, 3);
});

test("options pulse in turn; answers look different for correct and wrong", () => {
  const d = createDirector({ catalog });
  for (const [id, x] of [["a", -2], ["b", 0], ["c", 2]]) d.add({ id, kind: "letter", text: id.toUpperCase(), at: [x, 0, 0] });
  d.add({ id: "party", kind: "confetti" });
  d.options(null, { at: 0, targets: ["a", "b", "c"], dur: 3 });
  d.answer("b", { at: 4, confetti: "party" });
  d.answer("c", { at: 8, result: "wrong", hint: "b" });
  const p = d.plan();
  const marks = p.objects.filter((o) => o.kind === "_mark").map((o) => o.result);
  assert.deepEqual(marks, ["correct", "incorrect"]);
  assert.ok(p.timeline.valueAt("a", "scale", 0.25)[0] > 1.05, "a pulses first");
  assert.ok(p.timeline.valueAt("b", "scale", 0.8)[0] > 1.05, "then b");
  assert.ok(p.timeline.valueAt("b", "hop", 4.35) > 0.2, "correct hops");
  assert.ok(Math.abs(p.timeline.valueAt("c", "rotation", 8.2)[2]) > 1, "wrong shakes");
  assert.equal(p.timeline.valueAt("party", "burst", 4.2), 4.1);
  assert.deepEqual(p.audio.filter((a) => ["ding", "wrong_soft"].includes(a.sound)).map((a) => a.sound), ["ding", "wrong_soft"]);
  assert.throws(() => d.options(null, { targets: ["a"] }), /two or more/);
});

test("progress fills slots in order, teases the surprise and only moves forward", () => {
  const d = createDirector({ catalog });
  d.add({ id: "trip", kind: "tracker", hud: true, slots: 3, surprise: true });
  assert.deepEqual(d.plan().objects[0].at, trackerFit({ slots: 3, surprise: true }).anchor);
  d.progress("trip", { at: 1, tease: true }).progress("trip", { at: 2 }).progress("trip", { at: 5, step: 4 });
  const p = d.plan();
  const v = (prop, t) => p.timeline.valueAt("trip", prop, t);
  assert.equal(v("tease", 1.5), 1);
  assert.equal(v("f0", 2.1), 2);
  assert.equal(v("f1", 4), -1);
  for (const [i, t] of [[1, 5], [2, 5.4], [3, 5.8]]) assert.equal(v(`f${i}`, 9), t);
  assert.equal(v("step", 9), 4);
  assert.deepEqual(p.audio.filter((a) => a.t >= 5).map((a) => a.sound), ["pop", "train_whistle", "magic_sparkle"]);
  assert.throws(() => d.progress("trip", { at: 9 }), /forward/);
  const e = createDirector({ catalog });
  e.add({ id: "plain", kind: "tracker", hud: true, slots: 2 });
  assert.throws(() => e.progress("plain", { tease: true }), /surprise/);
});

test("keyword badges pop away from the object, stack when they overlap, and reuse free badges", () => {
  const d = createDirector({ catalog });
  d.add({ id: "g", kind: "letter", text: "G", at: [3, 0, 0] });
  d.keyword(null, { at: 1, icon: "drop", avoid: "g" });
  d.keyword(null, { at: 1.5, icon: "sun", avoid: "g" });
  d.keyword(null, { at: 6, icon: "drop" });
  d.keyword(null, { at: 9, model: "apple" });
  const p = d.plan();
  const badges = p.objects.filter((o) => o.kind === "badge");
  assert.equal(badges.length, 3, "drop reused, sun and apple new");
  const pos = (id, t) => p.timeline.valueAt(id, "position", t);
  assert.deepEqual(pos(badges[0].id, 1.2), SPOTS.keyword.left[0]);
  assert.deepEqual(pos(badges[1].id, 1.7), SPOTS.keyword.left[1]);
  assert.deepEqual(pos(badges[0].id, 6.2), SPOTS.keyword.right[0]);
  assert.ok(p.objects.some((o) => o.kind === "prop" && o.model === "apple" && o.parent === badges[2].id && o.hud));
  assert.deepEqual(p.audio.map((a) => a.sound), ["splash", "sparkle", "splash", "pop"]);
});

test("keyword badges keep clear of a tracker on screen", () => {
  const d = createDirector({ catalog });
  d.add({ id: "list", kind: "tracker", hud: true, style: "checklist", slots: 6 });
  d.keyword(null, { at: 1, icon: "star", side: "left" });
  const p = d.plan();
  const b = p.objects.find((o) => o.kind === "badge");
  assert.deepEqual(p.timeline.valueAt(b.id, "position", 1.2), SPOTS.keyword.left[1], "the checklist covers the upper left spot");
});

test("compiled hook, challenge and call chain their lines and stretch their beat", () => {
  const s = read("../../scripts/demos/retention_kit.json");
  const p = compileScript(s, { catalog });
  const line = (text) => p.lines.find((l) => l.text === text);
  const q = line("Can you help find the letter G? Let's check behind this box!");
  assert.ok(Math.abs(q.t - 0.2) < 1e-9);
  const there = line("There it is! The letter G!");
  assert.ok(there.t > q.t + q.dur + 0.6, "the answer comes after the reveal");
  assert.equal(p.timeline.valueAt("g_big", "visible", there.t), true);
  const ask = line("What sound does G make? Say it with me!");
  const guh = line("Guh! G says guh!");
  assert.ok(Math.abs(guh.t - (ask.t + ask.dur + 0.3 + 2.5)) < 1e-9, "the answer waits for the pause");
  assert.ok(p.musicCues.some((c) => c.gain < 1 && c.t > ask.t), "the music dips in the pause");
  const point = line("Point to the letter G before the timer rings!");
  const yes = line("Yes! That's G!");
  assert.ok(yes.t > point.t + point.dur + 5, "praise after the timer");
  const kinds = new Set(p.engagement.map((e) => e.kind));
  for (const k of ["hook", "challenge", "call", "keyword", "progress", "timer", "options", "answer"]) assert.ok(kinds.has(k), `no ${k} cue`);
  assert.ok(p.engagement[0].t === 0);
  // Say keywords: each badge pops when its word is spoken.
  const garden = line("G is for garden. A garden needs water and sun.");
  const kw = p.engagement.filter((e) => e.kind === "keyword" && e.t >= garden.t && e.t <= garden.t + garden.dur);
  assert.equal(kw.length, 2);
  assert.ok(Math.abs(kw[0].t - (garden.t + garden.dur * wordShare(garden.text, "water"))) < 1e-9);
});

test("the demo is deterministic, validates clean with the lints on, and uses the whole kit", () => {
  const s = read("../../scripts/demos/retention_kit.json");
  const v = validateScript(s, catalog, { retention: true });
  assert.deepEqual([v.errors, v.warnings], [[], []]);
  const [a, b] = [compileScript(s, { catalog }), compileScript(s, { catalog })];
  assert.equal(JSON.stringify(a.timeline.toJSON()), JSON.stringify(b.timeline.toJSON()));
  const styles = new Set(s.objects.filter((o) => o.kind === "tracker").map((o) => o.style));
  assert.equal(styles.size, 4);
});

test("lints run only when asked for or the kit is used, so older scripts are unchanged", () => {
  const old = base([{ id: "g", kind: "letter", text: "G" }], [{ do: [{ do: "say", text: "Hello." }] }]);
  assert.equal(lintsOn(old), false);
  assert.equal(lintsOn({ ...old, meta: { retention: true } }), true);
  assert.equal(lintsOn(old, true), true);
  const kit = base([{ id: "g", kind: "letter", text: "G" }], [{ do: [{ do: "say", text: "Water.", keywords: { water: "drop" } }] }]);
  assert.equal(lintsOn(kit), true);
  assert.equal(lintsOn({ ...kit, meta: { retention: false } }), false);
});

test("retention lint fixtures warn with their codes", () => {
  const dir = new URL("../fixtures/retention/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const { expectWarnings, script } = read(`../fixtures/retention/${f}`);
    const v = validateScript(script, catalog);
    assert.deepEqual(v.errors, [], f);
    for (const c of expectWarnings) assert.ok(codes(v).includes(c), `${f}: wanted ${c}, got ${codes(v).join(", ")}`);
  }
});

test("lint limits come from meta.retention", () => {
  const say = { do: "say", text: "One two three four five six seven eight nine ten eleven twelve thirteen." };
  const beats = [{ do: [say] }, { do: [{ ...say }] }, { do: [{ do: "pop", target: "g" }] }];
  const s = (r) => base([{ id: "g", kind: "letter", text: "G", hidden: true }], beats, { retention: r });
  assert.ok(codes(validateScript(s(true), catalog)).includes("W3D_HOOK_LATE"));
  assert.ok(!codes(validateScript(s({ hookBy: 30, staticMax: 60 }), catalog)).includes("W3D_HOOK_LATE"));
  assert.ok(codes(validateScript(s({ hookBy: 30, staticMax: 5 }), catalog)).includes("W3D_STATIC_CAMERA"));
  assert.ok(validateScript(s({ hookBy: 99 }), catalog).errors.some((e) => e.code === "E3D_RANGE"));
});

test("a fast hook beats the late-hook lint; a static script with a hook still gets the camera lint", () => {
  const objects = [{ id: "box", kind: "prop", model: "toy_box" }, { id: "g", kind: "letter", text: "G", hidden: true }];
  const hook = { do: "hook", question: "Can you find G?", behind: "box", target: "g", shot: false };
  const talk = Array.from({ length: 12 }, (_, i) => ({ do: [{ do: "say", text: `Line ${i}: letters are fun.` }, { do: "pop", target: "g", at: 0.1 }] }));
  const v = validateScript(base(objects, [{ do: [hook] }, ...talk]), catalog);
  assert.ok(!codes(v).includes("W3D_HOOK_LATE"));
  assert.ok(codes(v).includes("W3D_STATIC_CAMERA"));
});

test("the kit's kinds build and pose in Node", () => {
  const ttf = readFileSync(new URL("../../../assets/fonts/Andika-Bold.ttf", import.meta.url));
  const font = new Font(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length)));
  const assets = { fonts: new Map([["andika_bold", font]]), characters: new Map() };
  const material = createMaterials(catalog);
  const specs = [
    { id: "r", kind: "timer_ring", hud: true }, { id: "r2", kind: "timer_ring", hud: true, fixed: true, color: "blue", size: 1.4 },
    { id: "b", kind: "badge", hud: true, text: "G" }, { id: "b2", kind: "badge", hud: true, text: "1+2" },
    ...["train", "checklist", "stars", "path"].flatMap((style) => [
      { id: `t_${style}`, kind: "tracker", hud: true, style, slots: 4, labels: style === "checklist" ? ["One", "Two"] : ["A", "B"], surprise: "Z" },
      { id: `u_${style}`, kind: "tracker", hud: true, style, slots: 2, surprise: true, filled: 1 },
    ]),
  ];
  const d = createDirector({ catalog });
  for (const s of specs) d.add(s);
  d.timer("r", { at: 0, dur: 4 });
  for (const s of specs.filter((x) => x.kind === "tracker")) d.progress(s.id, { at: 1, step: s.slots + 1 });
  const plan = d.plan();
  for (const o of plan.objects) {
    const h = buildObject(o, { catalog, assets, material, seed: 1, handles: new Map() });
    new THREE.Group().add(h.group);
    for (const t of [0, 1.2, 3.5, 6]) h.update?.(t, plan.timeline.evaluate(t)[o.id] ?? {}, {});
    const box = new THREE.Box3().setFromObject(h.group);
    assert.ok(!box.isEmpty() && Number.isFinite(box.max.x), `${o.id} has a size`);
  }
});

test("every badge icon has a colour and a known sound", () => {
  for (const [name, v] of Object.entries(ICONS)) {
    assert.ok(catalog.colors[v.color], `${name} colour`);
    assert.ok(catalog.sounds[v.sound], `${name} sound`);
  }
});
