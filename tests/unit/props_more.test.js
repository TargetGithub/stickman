// Batch A5 objects, FX and sounds: catalog entries, drawing (on a recording context, no canvas
// backend), the crystal's states while held, the Gloom Horn's use, the sneeze and the new recipes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawProp } from "../../engine/renderer/props.js";
import { SHAPES } from "../../engine/renderer/object_shapes.js";
import { MORE_PROP_SHAPES } from "../../engine/renderer/props_more.js";
import { holdableData } from "../../engine/objects.js";
import { createEngine } from "../../engine/index.js";
import { synthesize } from "../../tools/lib/synth.mjs";
import { catalog } from "../../catalog/index.js";

/** A 2D context stand-in that records calls and checks every number is finite. */
function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, k) {
      if (k in target) return target[k];
      if (k === "createRadialGradient" || k === "createLinearGradient") return () => ({ addColorStop() {} });
      return (...args) => {
        for (const a of args) if (typeof a === "number") assert.ok(Number.isFinite(a), `${String(k)} got ${a}`);
        calls.push(k);
      };
    },
    set(target, k, v) {
      target[k] = v;
      if (k === "fillStyle") calls.push(`fill:${v}`);
      return true;
    },
  });
  return { ctx, calls };
}

const NEW = {
  rainbow_crystal: { behavior: "holdable", shape: "crystal" },
  gloom_horn: { behavior: "holdable", shape: "horn" },
  jalebi: { behavior: "holdable", shape: "jalebi" },
  jalebi_plate: { behavior: "holdable", shape: "plate" },
  kite: { behavior: "floater", shape: "kite" },
  apple: { behavior: "ball", shape: "apple" },
  haystack: { behavior: "static" },
  cart: { behavior: "vehicle" },
  market_stall: { behavior: "static" },
  basket: { behavior: "breakable", shape: "basket" },
};

for (const [name, want] of Object.entries(NEW)) {
  test(`${name}: a ${want.behavior} that draws`, () => {
    const def = catalog.objects[name];
    assert.ok(def, `${name} is in the catalog`);
    assert.equal(def.behavior, want.behavior);
    if (want.shape) {
      assert.equal(holdableData(catalog, name).shape, want.shape);
      const { ctx, calls } = recorder();
      drawProp(ctx, holdableData(catalog, name), { butt: { x: 100, y: 100 }, tip: { x: 140, y: 80 }, grip: { x: 108, y: 96 } }, 1);
      assert.ok(calls.length > 5, "the held shape draws something");
    }
    if (def.draw !== "held") {
      const { ctx, calls } = recorder();
      SHAPES[def.draw](ctx, def.colors, { state: def.states?.[0], wheel: 0.5, angle: 0.2 }, def);
      assert.ok(calls.length > 5, "the object shape draws something");
    }
  });
}

test("every new held shape is listed for the catalog check", () => {
  for (const s of ["crystal", "horn", "jalebi", "plate", "apple", "kite", "basket"]) assert.ok(MORE_PROP_SHAPES.includes(s));
});

test("rainbow_crystal: seven colours and dim; each state draws its own colour, dim has no glow", () => {
  const def = catalog.objects.rainbow_crystal;
  assert.deepEqual(def.states, ["red", "orange", "yellow", "green", "blue", "indigo", "violet", "dim"]);
  const t = { butt: { x: 0, y: 0 }, tip: { x: 0, y: -28 } };
  const fills = def.states.map((state) => {
    const { ctx, calls } = recorder();
    drawProp(ctx, { ...def.hold, state }, t, 1);
    return { calls, first: calls.find((c) => c.startsWith("fill:#")) };
  });
  assert.equal(new Set(fills.map((f) => f.first)).size, 8, "a different facet colour per state");
  assert.ok(!fills[7].calls.includes("fillRect"), "dim: no glow");
  assert.ok(fills[0].calls.includes("fillRect"), "lit: a glow");
});

const story = (beats, cast = {}, set = []) => ({
  version: 2, meta: { title: "a5", format: "landscape", seed: 5, kind: "clip" },
  cast: [{ id: "a", color: "#5ec8ff", ...cast }],
  locations: [{ id: "p", theme: "city_park", set }],
  scenes: [{ id: "s", location: "p", cast: [{ id: "a", x: 1200, facing: 1 }], beats }],
});

test("a held crystal changes state with set_object and chimes", () => {
  const e = createEngine({ catalog });
  const r = e.load(story([
    { id: "p", at: 0.2, who: "a", do: "pick_prop" },
    { id: "c", at: 1.6, who: "world", do: "set_object", object: "gem", params: { state: "blue" } },
    { id: "d", at: 2.4, who: "world", do: "set_object", object: "gem", params: { state: "dim" } },
    { id: "n", at: 3, who: "a", do: "nod" },
  ], {}, [{ id: "gem", object: "rainbow_crystal", x: 1250, state: "green" }]));
  assert.ok(r.ok, JSON.stringify(r.errors));
  const states = e.getEvents().filter((x) => x.type === "object" && x.what === "state").map((x) => x.state);
  assert.deepEqual(states, ["blue", "dim"]);
  const sfx = e.getAudioEvents().map((x) => x.sfx);
  assert.equal(sfx.filter((s) => s === "crystal_chime").length, 1, "a chime for blue, none for dim");
});

test("the Gloom Horn's use plays its sound and leaves mist along the floor", () => {
  const e = createEngine({ catalog });
  const r = e.load(story([{ id: "u", at: 0.2, who: "a", do: "use" }, { id: "n", at: 4, who: "a", do: "nod" }], { prop: "gloom_horn" }));
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.ok(e.getAudioEvents().some((x) => x.sfx === "gloom_horn"));
  const use = e.getEvents().find((x) => x.type === "object" && x.what === "use");
  assert.deepEqual(use.fx, ["gloom_mist"]);
});

test("sneeze: an emote with the sneeze sound, a hurt face and tears", () => {
  const m = catalog.moves.find((x) => x.name === "sneeze");
  assert.equal(m.category, "emote");
  assert.equal(m.face, "hurt");
  assert.ok(m.events.some((x) => x.sfx === "sneeze") && m.events.some((x) => x.fx?.includes("tears")));
  const back = m.keys.find((k) => k.t === 0.45).pose;
  const forward = m.keys.find((k) => k.t === 0.52).pose;
  assert.ok(back.head < 0 && forward.head > 0 && forward.lean > back.lean, "head back, then a nod forward");
});

test("colour_powder and gloom_mist: four powder colours; a 3 s low-alpha mist on the floor", () => {
  const cp = catalog.fxPresets.colour_powder;
  assert.ok(cp.layers.filter((l) => l.shape === "puff").length >= 4);
  const gm = catalog.fxPresets.gloom_mist;
  assert.equal(gm.sustain.duration, 3);
  assert.equal(gm.anchor, "feet");
  assert.ok(gm.layers.every((l) => l.alpha[0] <= 0.35));
});

for (const key of ["gloom_horn", "sneeze", "crystal_chime"]) {
  test(`sfx ${key}: deterministic, finite and not silent`, () => {
    const a = synthesize(key);
    assert.ok(catalog.sfxKeys.includes(key));
    assert.ok(a.every(Number.isFinite));
    assert.ok(a.reduce((m, v) => Math.max(m, Math.abs(v)), 0) > 0.5);
    assert.deepEqual(a, synthesize(key));
  });
}
