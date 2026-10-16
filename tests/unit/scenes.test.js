// Scenes (S1, ADR-016): normalization, boundaries, carry-over, holds, cards, per-scene randomness.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, flatScene, transitionInto, transitionDuration } from "../../engine/story/normalize.js";
import { simulate } from "../../engine/sim.js";
import { catalog } from "../../data/index.js";
import { FPS } from "../../engine/config.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const v1 = read("../fixtures/good/minimal.json");

function story(over = {}) {
  return {
    version: 2,
    meta: { title: "t", format: "landscape", seed: 5, kind: "clip" },
    cast: [{ id: "a", color: "#3fd8ff", hp: 100 }, { id: "b", color: "#ff3b3b", hp: 100 }],
    scenes: [
      { id: "one", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1 }, { id: "b", x: 1420, facing: -1 }],
        beats: [{ id: "hit1", at: 0.2, who: "a", do: "cross", target: "b", outcome: "hit", approach: "run" }] },
      { id: "two", location: "city_street", transitionIn: { type: "fade", dur: 0.5 }, cast: [{ id: "b", x: 900, facing: 1 }, { id: "a", x: 1500, facing: -1 }],
        beats: [{ id: "w2", at: 0.5, who: "b", do: "wave" }] },
    ],
    ...over,
  };
}

test("normalize: a v1 script becomes one legacy scene and keeps its fields", () => {
  const s = normalize(v1);
  assert.equal(s.legacy, true);
  assert.equal(s.meta.kind, "clip");
  assert.equal(s.meta.audience, "general");
  assert.equal(s.scenes.length, 1);
  assert.deepEqual(s.scenes[0].beats, v1.beats);
  assert.deepEqual(s.cast.map((c) => c.id), v1.characters.map((c) => c.id));
  const flat = flatScene(s, 0, catalog);
  assert.deepEqual(flat.characters.map(({ id, x, facing, color }) => ({ id, x, facing, color })), v1.characters.map(({ id, x, facing, color }) => ({ id, x, facing, color })));
});

const TRANSITIONS = [
  ["next scene's transitionIn wins", [{}, { transitionIn: { type: "wipe" } }], 1, "wipe"],
  ["else previous transitionOut", [{ transitionOut: { type: "fade" } }, {}], 1, "fade"],
  ["else nothing (cut)", [{}, {}], 1, null],
  ["first scene uses its own transitionIn", [{ transitionIn: { type: "card", text: "x" } }, {}], 0, "card"],
];
for (const [name, scenes, i, want] of TRANSITIONS) {
  test(`transitionInto: ${name}`, () => assert.equal(transitionInto({ scenes }, i)?.type ?? null, want));
}

test("transition durations: explicit dur, card defaults, cut is zero", () => {
  assert.equal(transitionDuration({ type: "cut", dur: 2 }), 0);
  assert.equal(transitionDuration({ type: "fade", dur: 0.5 }), 0.5);
  assert.equal(transitionDuration({ type: "card", kind: "title" }), 3);
  assert.equal(transitionDuration(null), 0);
});

test("scene boundary: hold frames, cast order per scene, scene-local times and paths", () => {
  const sim = simulate(story(), catalog);
  const [one, two] = sim.scenes;
  assert.equal(one.startFrame, 0);
  assert.equal(two.startFrame - (one.startFrame + one.frames), Math.round(0.5 * FPS), "hold length");
  const seg = sim.store.segments.find((x) => x.kind === "scene" && x.scene === 1);
  assert.deepEqual(seg.chars.map((c) => c.id), ["b", "a"]);
  assert.equal(sim.events.find((e) => e.type === "hit").scene, 0);
  const wave = sim.beats.find((x) => x.id === "w2");
  assert.ok(Math.abs(wave.firedAt - (two.storyStart + 0.5)) < 1.5 / FPS, `wave at ${wave.firedAt}, scene starts ${two.storyStart}`);
  assert.equal(wave.path, "scenes[1].beats[0]");
});

test("carry-over: hp lost in scene one is still lost in scene two", async () => {
  const { frameView } = await import("../../engine/framestore.js");
  const sim = simulate(story(), catalog);
  const two = sim.scenes[1];
  const f = frameView(sim.store, two.startFrame);
  const b = f.chars.find((c) => c.id === "b");
  assert.ok(b.hp < 100, `b hp ${b.hp}`);
  assert.equal(b.maxHp, 100);
  // Position is set by the scene, not carried.
  const a = f.chars.find((c) => c.id === "a");
  assert.equal(a.facing, -1);
});

test("a card world command holds the story clock for its duration", () => {
  const s = story();
  s.scenes[0].beats = [{ id: "c", at: 0.2, who: "world", do: "chapter_card", params: { text: "Later", dur: 1.5 } }, { id: "w", at: { after: "c" }, who: "a", do: "wave" }];
  const sim = simulate(s, catalog, { dryRun: true });
  const card = sim.events.find((e) => e.type === "world" && e.do === "chapter_card");
  const wave = sim.beats.find((b) => b.id === "w");
  assert.ok(Math.abs(wave.firedAt - card.storyT) < 2 / FPS, "story time does not move during the card");
  const vt = sim.clock.storyAt.findIndex((t) => t > card.storyT + 1e-6) / FPS;
  assert.ok(vt - card.videoT >= 1.5 - 2 / FPS, `story resumes ${(vt - card.videoT).toFixed(2)}s after the card`);
});

test("RNG streams are scoped per scene: editing scene two leaves scene one's particles unchanged", () => {
  const a = simulate(story(), catalog, { dryRun: true });
  const s = story();
  s.scenes[1].beats.push({ at: 0.1, who: "b", do: "taunt", fx: ["anger_mark", "spark"] });
  const b = simulate(s, catalog, { dryRun: true });
  const one = (sim) => sim.fx.log.slice(sim.scenes[0].fxStart, sim.scenes[0].fxEnd);
  assert.deepEqual(one(b), one(a));
});

test("the same story simulates identically twice", () => {
  const strip = (sim) => JSON.stringify(sim.events);
  assert.equal(strip(simulate(story(), catalog, { dryRun: true })), strip(simulate(story(), catalog, { dryRun: true })));
});

test("a fixed scene duration ends the scene on time", () => {
  const s = story();
  s.scenes[1].duration = 4;
  const sim = simulate(s, catalog, { dryRun: true });
  assert.ok(Math.abs(sim.scenes[1].frames / FPS - 4) < 2 / FPS, `${sim.scenes[1].frames / FPS}`);
});

test("hidden cast members start invisible", () => {
  const s = story();
  s.scenes[1].cast[1].hidden = true;
  s.scenes[1].beats.push({ at: 0.2, who: "a", do: "spawn" });
  const sim = simulate(s, catalog);
  const seg = sim.store.segments.find((x) => x.kind === "scene" && x.scene === 1);
  const ai = seg.chars.findIndex((c) => c.id === "a");
  assert.equal(seg.body[ai * 33 + 32], 0, "alpha 0 at the scene start");
});
