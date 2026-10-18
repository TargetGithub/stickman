// Slice-of-life moves (S5.4): data checks for every move, seats with slots, stand_up, racket and wand moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileReader } from "../../catalog/index.js";

const life = fileReader()("moves/life.json");
import { checkMove } from "../../tools/lib/draft.mjs";
import { createEngine } from "../../engine/index.js";
import { unpackJoints } from "../../engine/skeleton.js";
import { catalog } from "../../catalog/index.js";

test("there are 28 slice-of-life moves (25 in batch 1, 3 ball moves for activities)", () => assert.equal(life.length, 28));

for (const m of life) {
  test(`move checks on every body plan: ${m.name}`, () => {
    assert.deepEqual(checkMove(m, { ...catalog, moves: catalog.moves.filter((x) => x.name !== m.name) }), []);
  });
}

const story = (beats, extra = {}) => ({
  version: 2, meta: { title: "life", format: "landscape", seed: 5, kind: "clip" },
  cast: [{ id: "kai", color: "#3fd8ff", ...extra.kai }, { id: "pip", body: "buddy", color: "#2fd3c0" }],
  locations: [{ id: "p", theme: "city_park", set: [{ id: "bench1", object: "bench", x: 1500 }] }],
  scenes: [{ id: "s", location: "p", cast: [{ id: "kai", x: 1200, facing: 1 }, { id: "pip", x: 1800, facing: -1 }], beats }],
});

function load(s) {
  const e = createEngine({ catalog });
  const r = e.load(s);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const at = (t, id) => {
    const f = e.getFrame(Math.min(r.totalFrames - 1, Math.round(t * 60)));
    return unpackJoints(f.chars.find((c) => c.id === id).joints);
  };
  return { e, r, at };
}

test("two characters sit on one bench in its two slots, hips at seat height", () => {
  const { at, r } = load(story([
    { id: "a", at: 0.2, who: "kai", do: "sit", object: "bench1" },
    { id: "b", at: 0.2, who: "pip", do: "sit", object: "bench1" },
  ]));
  const end = (r.totalFrames - 1) / 60;
  const k = at(end, "kai");
  const p = at(end, "pip");
  assert.ok(Math.abs(k.hip.x - 1440) < 2 && Math.abs(p.hip.x - 1560) < 2, `hips at ${k.hip.x}, ${p.hip.x}`);
  assert.ok(Math.abs(k.hip.y - (880 - 62)) < 2, `kai hip y ${k.hip.y}`);
  assert.ok(k.lFoot.y < 880 + 1 && k.lKnee.y < k.lFoot.y, "legs hang from the seat");
});

test("stand_up leaves the seat and the feet are back on the floor", () => {
  const { at, r } = load(story([
    { id: "a", at: 0.2, who: "kai", do: "sit", object: "bench1" },
    { id: "u", at: { after: "a", delay: 0.5 }, who: "kai", do: "stand_up" },
  ]));
  const j = at((r.totalFrames - 1) / 60, "kai");
  assert.ok(Math.abs(Math.max(j.lFoot.y, j.rFoot.y) - 880) < 2);
});

test("upper-body moves work while seated (eat keeps the legs on the seat)", () => {
  const { at, e } = load(story([
    { id: "a", at: 0.2, who: "kai", do: "sit", object: "bench1" },
    { id: "e", at: { after: "a", delay: 0.2 }, who: "kai", do: "eat" },
  ], { kai: { prop: "ice_cream" } }));
  const eat = e.getAnchors().find((x) => x.beatId === "e" && x.anchor === "start");
  const j = at(eat.videoT + 0.4, "kai");
  assert.ok(Math.abs(j.hip.y - (880 - 62)) < 2);
});

test("blow_wand blows bubbles; swing_forehand marks its contact", () => {
  const { e } = load(story([{ id: "w", at: 0.2, who: "kai", do: "blow_wand" }], { kai: { prop: "bubble_wand" } }));
  assert.ok(e.getEvents().filter((x) => x.type === "object" && x.what === "spawn" && x.kind === "bubble").length >= 3);
  const r2 = load(story([{ id: "f", at: 0.2, who: "kai", do: "swing_forehand" }, { id: "w2", at: { after: "f" }, who: "kai", do: "wait", params: { seconds: 2 } }], { kai: { prop: "racket" } }));
  assert.ok(r2.e.getEvents().some((x) => x.type === "moveEvent" && x.contact));
});
