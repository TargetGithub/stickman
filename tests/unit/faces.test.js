// Faces (S2): automatic face priority, beat faces, carry-over, frame store, and drawing every face.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shownFace, faceEvents, HURT_SECONDS } from "../../engine/story/faces.js";
import { drawFace, blinkAt } from "../../engine/renderer/face.js";
import { simulate } from "../../engine/sim.js";
import { frameView } from "../../engine/framestore.js";
import { catalog } from "../../data/index.js";

const actor = (o = {}) => ({ id: "a", face: "neutral", hurtUntil: 0, move: null, ...o });
const move = (name, category = "emote", face = null) => ({ def: { name, category, face } });

const PRIORITY = [
  ["v1 actors have no face", actor({ face: null }), new Set(), null],
  ["base face", actor({ face: "happy" }), new Set(), "happy"],
  ["attack with a neutral base looks determined", actor({ move: move("jab", "attack") }), new Set(), "determined"],
  ["attack keeps an explicit emotion", actor({ face: "furious", move: move("jab", "attack") }), new Set(), "furious"],
  ["a move's own face", actor({ face: "happy", move: move("cry", "emote", "cry") }), new Set(), "cry"],
  ["hurt beats the move face", actor({ hurtUntil: 5, move: move("cry", "emote", "cry") }), new Set(), "hurt"],
  ["knocked out is dizzy", actor({ hurtUntil: 5 }), new Set(["a"]), "dizzy"],
  ["a KO move is dizzy", actor({ move: move("ko_fall", "reaction") }), new Set(), "dizzy"],
];
for (const [name, a, dead, want] of PRIORITY) test(`shownFace: ${name}`, () => assert.equal(shownFace(a, dead, 1), want));

test("faceEvents: a landed hit makes the target hurt for a moment; v1 actors are skipped", () => {
  const a = actor({ id: "a" });
  const b = actor({ id: "b", face: null });
  const world = { byId: new Map([["a", a], ["b", b]]) };
  faceEvents(world, [{ type: "hit", kind: "hit", target: "a" }, { type: "hit", kind: "blocked", target: "b" }, { type: "hit", kind: "hit", target: "b" }], 2);
  assert.equal(a.hurtUntil, 2 + HURT_SECONDS);
  assert.equal(b.hurtUntil, 0);
});

test("blinks are deterministic, short and differ per character", () => {
  const closed = (id) => Array.from({ length: 600 }, (_, i) => blinkAt(1, id, i / 60)).filter(Boolean).length;
  assert.equal(closed("kai"), closed("kai"));
  assert.ok(closed("kai") > 0 && closed("kai") < 40);
  const a = Array.from({ length: 600 }, (_, i) => blinkAt(1, "kai", i / 60)).join();
  const b = Array.from({ length: 600 }, (_, i) => blinkAt(1, "pip", i / 60)).join();
  assert.notEqual(a, b);
});

/** A 2D context that records calls and checks every number is finite. */
function fakeCtx() {
  const calls = [];
  return new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        for (const v of args) if (typeof v === "number") assert.ok(Number.isFinite(v), `${String(k)} got ${v}`);
        calls.push(k);
      };
    },
    set() { return true; },
  });
}

for (const [name, face] of Object.entries(catalog.faces)) {
  test(`drawFace: ${name} draws in every mode`, () => {
    for (const o of [{}, { blink: true }, { talking: true }, { detail: "simple", neutral: true }, { gaze: { f: -1, u: 1 }, t: 3.7 }]) {
      const ctx = fakeCtx();
      drawFace(ctx, { x: 100, y: 100 }, 22, { u: { x: 0, y: -1 }, f: { x: 1, y: 0 } }, face, o);
      assert.ok(ctx.calls.length > 2);
    }
  });
}

function story() {
  return {
    version: 2,
    meta: { title: "t", format: "landscape", seed: 3, kind: "clip" },
    cast: [{ id: "a", color: "#3fd8ff" }, { id: "b", color: "#ff3b3b" }],
    scenes: [
      { id: "one", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1, face: "happy" }, { id: "b", x: 1420, facing: -1 }],
        beats: [{ id: "s", at: 0.2, who: "a", do: "wave", face: "sad" }, { id: "c", at: 0.4, who: "b", do: "cry" }] },
      { id: "two", location: "city_street", cast: [{ id: "a", x: 900, facing: 1 }, { id: "b", x: 1300, facing: -1, face: "angry" }],
        beats: [{ id: "w", at: 0.2, who: "a", do: "nod" }] },
    ],
  };
}

test("faces in the frame store: scene face, beat face from then on, move face, carry-over", () => {
  const sim = simulate(story(), catalog);
  const at = (n, id) => frameView(sim.store, n).chars.find((c) => c.id === id).face;
  assert.equal(at(0, "a"), "happy");
  assert.equal(at(0, "b"), "neutral");
  const later = sim.scenes[0].startFrame + 60;
  assert.equal(at(later, "a"), "sad");
  assert.equal(at(later, "b"), "cry");
  const two = sim.scenes[1].startFrame;
  assert.equal(at(two, "a"), "sad", "carried into the next scene");
  assert.equal(at(two, "b"), "angry", "scene cast face wins");
});

test("v1 scripts store no face", async () => {
  const { readFileSync } = await import("node:fs");
  const v1 = JSON.parse(readFileSync(new URL("../fixtures/good/minimal.json", import.meta.url), "utf8"));
  const sim = simulate(v1, catalog);
  assert.ok(frameView(sim.store, 10).chars.every((c) => c.face === null));
});
