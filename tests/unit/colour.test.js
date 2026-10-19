// Character and scene colour effects (package A3): glow, grade and petrify state, the sim side of petrify,
// thaw and the colour wave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { glowAt, glowColor, gradeAt, worldFilter, petrifyAt, thawLine } from "../../engine/renderer/colour.js";
import { simulate } from "../../engine/sim.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const glow = (videoT, params) => ({ videoT, params });
const GLOW = [
  ["nothing set", [], 5, null],
  ["an instant glow", [glow(1, { level: 0.6 })], 2, { color: "#ffd23f", level: 0.6 }],
  ["halfway up", [glow(1, { level: 1, dur: 2, color: "#ff7ab8" })], 2, { color: "#ff7ab8", level: 0.5 }],
  ["not yet", [glow(3, { level: 1 })], 2, null],
  ["turned off", [glow(1, { level: 1 }), glow(2, { level: 0 })], 3, null],
  ["fading down", [glow(1, { level: 1 }), glow(2, { level: 0, dur: 2 })], 3, { color: "#ffd23f", level: 0.5 }],
];
for (const [name, events, t, want] of GLOW) {
  test(`glowAt: ${name}`, () => {
    const got = glowAt(events, t);
    if (!want) return assert.equal(got, null);
    assert.equal(got.color, want.color);
    assert.ok(Math.abs(got.level - want.level) < 1e-9, `${got.level}`);
  });
}

test("glowColor: a rainbow cycles its hue, a color stays", () => {
  assert.equal(glowColor({ color: "#123456" }, 1), "#123456");
  assert.notEqual(glowColor({ color: "rainbow" }, 0), glowColor({ color: "rainbow" }, 1));
});

const grade = (videoT, params) => ({ videoT, params });
const GRADE = [
  ["full colour", {}, [], 1, null],
  ["a grey scene", { grade: { saturation: 0.2 } }, [], 1, { sat: 0.2, keepCast: false, wave: false }],
  ["keepCast", { grade: { saturation: 0, keepCast: true } }, [], 1, { sat: 0, keepCast: true, wave: false }],
  ["blending back", { grade: { saturation: 0 } }, [grade(1, { saturation: 1, dur: 2 })], 2, { sat: 0.5, keepCast: false, wave: false }],
  ["back in colour", { grade: { saturation: 0 } }, [grade(1, { saturation: 1, dur: 2 })], 4, null],
  ["a wave from a character", { grade: { saturation: 0 } }, [grade(1, { saturation: 1, dur: 2, from: "kai" })], 1.5, { sat: 0.25, keepCast: false, wave: true }],
  ["no wave with keepCast", { grade: { saturation: 0, keepCast: true } }, [grade(1, { saturation: 1, dur: 2, from: "kai" })], 1.5, { sat: 0.25, keepCast: true, wave: false }],
];
for (const [name, look, events, t, want] of GRADE) {
  test(`gradeAt: ${name}`, () => {
    const got = gradeAt(look, events, t);
    if (!want) return assert.equal(got, null);
    assert.ok(Math.abs(got.sat - want.sat) < 1e-9, `${got.sat}`);
    assert.equal(got.keepCast, want.keepCast);
    assert.equal(!!got.wave, want.wave);
    assert.equal(worldFilter(got) !== null, want.keepCast);
  });
}

test("gradeAt: a wave holds the old value outside and the new one inside", () => {
  const g = gradeAt({ grade: { saturation: 0.1 } }, [grade(0, { saturation: 0.9, dur: 2, from: "kai" })], 0.5);
  assert.deepEqual({ s0: g.wave.s0, s1: g.wave.s1, u: g.wave.u }, { s0: 0.1, s1: 0.9, u: 0.25 });
});

const P = (type, videoT) => ({ type, videoT, actor: "mo", move: type === "defeat" ? "petrify" : undefined });
const PETRIFY = [
  ["in colour", [], 1, null],
  ["turning grey", [P("defeat", 1)], 1.75, { grey: 0.5, thaw: null }],
  ["stone", [P("defeat", 1)], 9, { grey: 1, thaw: null }],
  ["thawing", [P("defeat", 1), P("thaw", 5)], 5.6, { grey: 1, thaw: 0.5 }],
  ["thawed", [P("defeat", 1), P("thaw", 5)], 7, null],
];
for (const [name, events, t, want] of PETRIFY) {
  test(`petrifyAt: ${name}`, () => {
    const got = petrifyAt(events, t);
    if (!want) return assert.equal(got, null);
    assert.ok(Math.abs(got.grey - want.grey) < 1e-9);
    if (want.thaw === null) assert.equal(got.thaw, null);
    else assert.ok(Math.abs(got.thaw - want.thaw) < 1e-9);
  });
}

test("thawLine rises from below the feet to above the head", () => {
  const p = (y) => ({ x: 0, y });
  const c = { scale: 1, j: { head: p(500), neck: p(530), lHand: p(600), rHand: p(600), lFoot: p(800), rFoot: p(800), hip: p(680) } };
  assert.ok(thawLine(c, 0) > 800);
  assert.ok(thawLine(c, 1) < 500);
  assert.ok(thawLine(c, 0.5) < thawLine(c, 0.2));
});

// The sim side.
const CAST = [{ id: "kai", color: "#3fd8ff" }, { id: "mo", color: "#ffd23f" }, { id: "becky", body: "dog_small", color: "#f3e3c3" }];
const scene = (id, beats, ids = ["kai", "mo"]) => ({ id, location: "park", cast: ids.map((c, i) => ({ id: c, x: 1300 + 300 * i, facing: i ? -1 : 1 })), beats });
const story = (scenes) => ({
  version: 2, meta: { title: "colour", format: "landscape", seed: 7, kind: "clip", audience: "kids" },
  cast: CAST, locations: [{ id: "park", theme: "city_park" }], scenes,
});
const errors = (s) => validate(s, catalog).errors.map((e) => `${e.code} ${e.path}`);

test("petrify: the character holds its pose, counts as defeated and thaws on return", () => {
  const s = story([scene("s", [
    { id: "w", at: 0.3, who: "mo", do: "wave" },
    { id: "p", at: 0.8, who: "mo", do: "petrify", interrupt: true },
    { id: "t", at: { after: "p", delay: 2 }, who: "kai", do: "talk", say: "Mo?" },
    { id: "r", at: { after: "t" }, who: "mo", do: "return" },
  ])]);
  assert.deepEqual(errors(s), []);
  const sim = simulate(s, catalog);
  const defeat = sim.events.find((e) => e.type === "defeat" && e.actor === "mo");
  const thaw = sim.events.find((e) => e.type === "thaw" && e.actor === "mo");
  assert.equal(defeat?.move, "petrify");
  assert.ok(thaw && thaw.videoT > defeat.videoT, "a thaw after the petrify");
  assert.equal(sim.endState.mo.defeated, false);
});

test("petrify: kids stories warn when nobody thaws, not when a later scene does", () => {
  const frozen = story([scene("a", [{ id: "p", at: 0.3, who: "mo", do: "petrify" }])]);
  assert.ok(validate(frozen, catalog).warnings.some((w) => w.code === "W_KIDS_NO_HOPE"));
  const thawed = story([scene("a", [{ id: "p", at: 0.3, who: "mo", do: "petrify" }]), scene("b", [{ id: "r", at: 0.5, who: "mo", do: "return" }])]);
  assert.ok(!validate(thawed, catalog).warnings.some((w) => w.code === "W_KIDS_NO_HOPE"));
});

test("petrify: carried into the next scene frozen, in the same pose, until return", () => {
  const s = story([
    scene("a", [{ id: "p", at: 0.3, who: "mo", do: "petrify" }, { id: "k", at: { after: "p" }, who: "kai", do: "gasp" }]),
    scene("b", [{ id: "k2", at: 0.3, who: "kai", do: "cry" }, { id: "r", at: { after: "k2" }, who: "mo", do: "return" }]),
  ]);
  assert.deepEqual(errors(s), []);
  const sim = simulate(s, catalog, { dryRun: true });
  assert.ok(sim.events.some((e) => e.type === "thaw" && e.actor === "mo" && e.scene === 1), "it thaws in scene b");
});

test("petrify and return on a dog play through its move map", () => {
  const s = story([scene("s", [
    { id: "p", at: 0.3, who: "becky", do: "petrify" },
    { id: "r", at: { after: "p", delay: 1 }, who: "becky", do: "return" },
  ], ["kai", "becky"])]);
  assert.deepEqual(errors(s), []);
  const sim = simulate(s, catalog, { dryRun: true });
  assert.ok(sim.events.some((e) => e.type === "thaw" && e.actor === "becky"));
  assert.ok(sim.events.some((e) => e.type === "moveEnd" && e.actor === "becky" && e.move === "return_dog"));
});

test("set_grade from a character bursts colour_return sparkles there; set_glow validates", () => {
  const s = story([{ ...scene("s", [
    { id: "g", at: 0.3, who: "world", do: "set_grade", params: { saturation: 1, dur: 2, from: "kai" } },
    { id: "h", at: 0.5, who: "world", do: "set_glow", params: { who: "kai", color: "rainbow", level: 0.8, dur: 1 } },
    { id: "c", at: { after: "g" }, who: "kai", do: "cheer" },
  ]), grade: { saturation: 0 } }]);
  assert.deepEqual(errors(s), []);
  const sim = simulate(s, catalog, { dryRun: true });
  assert.ok(sim.events.some((e) => e.type === "fx" && e.actor === "kai" && e.names.includes("colour_return")));
});
