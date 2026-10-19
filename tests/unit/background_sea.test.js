// Doopi & Friends batch B3: ship and underwater layer kinds (ship_rail, seaweed, bubbles_bg), the three
// places, the lake objects, the swim/sink moves and the fishing net for captured.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { SEA_KINDS } from "../../engine/renderer/background_sea.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";
import { simulate } from "../../engine/sim.js";
import { validate } from "../../engine/index.js";

function fakeCtx() {
  const calls = [];
  const gradient = { addColorStop() {} };
  return new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        for (const v of args) if (typeof v === "number") assert.ok(Number.isFinite(v), `${String(k)} got ${v}`);
        calls.push([k, ...args.filter((a) => typeof a === "number")]);
        return String(k).startsWith("create") ? gradient : undefined;
      };
    },
    set() { return true; },
  });
}

test("sea kinds are registered layer kinds", () => {
  for (const k of Object.keys(SEA_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
});

for (const name of ["pirate_deck", "crystal_cave", "underwater"]) {
  test(`${name} draws with finite geometry, deterministically`, () => {
    const bg = createBackground(catalog.themes[name], name, 7);
    for (const zoom of [0.6, 1, 1.7]) {
      const ctx = fakeCtx();
      drawBackground(ctx, bg, { x: 1600, y: 540, zoom, shakeX: 0, shakeY: 0 }, 1920, 1080, 3.1);
      assert.ok(ctx.calls.length > 20);
    }
    assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes[name], name, 7).geom));
  });
}

const PIECES = [["raft", ["whole", "broken"]], ["fishing_net", ["closed", "open"]], ["treasure_chest", ["closed", "open"]]];
for (const [object, states] of PIECES) {
  test(`${object} draws differently in each state`, () => {
    assert.ok(OBJECT_SHAPES().includes(catalog.objects[object].draw));
    const drawn = states.map((state) => {
      const ctx = fakeCtx();
      drawSetPieces(ctx, catalog, [{ id: "p", object, x: 1000, state }], "mid");
      return JSON.stringify(ctx.calls);
    });
    assert.equal(new Set(drawn).size, states.length);
  });
}

for (const object of ["pirate_ship", "rowboat"]) {
  test(`${object} is a vehicle with a registered shape`, () => {
    assert.equal(catalog.objects[object].behavior, "vehicle");
    assert.ok(OBJECT_SHAPES().includes(catalog.objects[object].draw));
  });
}

const story = (beats, cast = [{ id: "kai", color: "#3fd8ff" }, { id: "becky", body: "dog_small", color: "#f3e3c3" }]) => ({
  version: 2, meta: { title: "sea", format: "landscape", seed: 3, kind: "clip", audience: "kids" },
  cast, locations: [{ id: "u", theme: "underwater", stageWidth: 3000 }],
  scenes: [{ id: "s", location: "u", cast: cast.map((c, i) => ({ id: c.id, x: 900 + i * 300, facing: 1 })), beats }],
});

test("swim takes a destination for people and dogs; sink lands and holds", () => {
  const s = story([
    { id: "a", at: 0.3, who: "kai", do: "swim", to: { x: 1800 } },
    { id: "b", at: 0.3, who: "becky", do: "swim", to: { x: 2100 } },
    { id: "c", at: { after: "a" }, who: "kai", do: "sink" },
  ]);
  assert.deepEqual(validate(s, catalog).errors.map((e) => e.code), []);
  const sim = simulate(s, catalog, { dryRun: true });
  assert.ok(sim.events.some((e) => e.type === "moveEnd" && e.actor === "becky" && e.move === "swim_dog"));
});

test("captured with net 1 drops a fishing net instead of a cage", () => {
  const s = story([{ id: "c", at: 0.3, who: "kai", do: "captured", params: { net: 1 } }, { id: "w", at: 0.5, who: "becky", do: "bark" }]);
  const sim = simulate(s, catalog, { dryRun: true });
  const spawned = sim.events.filter((e) => e.type === "object" && e.what === "spawn").map((e) => e.kind);
  assert.ok(spawned.includes("fishing_net") && !spawned.includes("cage"), spawned.join(","));
});
