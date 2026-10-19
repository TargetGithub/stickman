// Doopi & Friends batch B1: the forest layer kinds (vines, ferns), the whispering_forest theme, the bus and
// the campfire (its flames move with the scene time), and the series cast's contrast in the forest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { FOREST_KINDS } from "../../engine/renderer/background_forest.js";
import { OBJECT_SHAPES, drawSetPieces, drawMovingObjects } from "../../engine/renderer/objects.js";
import { TRAVEL_SHAPES } from "../../engine/renderer/object_shapes_travel.js";
import { contrastRatio } from "../../engine/validator/semantic.js";

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

test("forest kinds are registered layer kinds", () => {
  for (const k of Object.keys(FOREST_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
});

test("whispering_forest draws with finite geometry at three camera distances, and is deterministic", () => {
  const bg = createBackground(catalog.themes.whispering_forest, "whispering_forest", 7);
  for (const zoom of [0.6, 1, 1.7]) {
    const ctx = fakeCtx();
    drawBackground(ctx, bg, { x: 1600, y: 540, zoom, shakeX: 0, shakeY: 0 }, 1920, 1080, 1.3);
    assert.ok(ctx.calls.length > 40);
  }
  assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes.whispering_forest, "whispering_forest", 7).geom));
});

const SHAPES = [
  ["bus", "vehicle"],
  ["campfire", "static"],
];
for (const [object, behavior] of SHAPES) {
  test(`${object} is a ${behavior} object with a registered shape`, () => {
    const def = catalog.objects[object];
    assert.equal(def.behavior, behavior);
    assert.ok(OBJECT_SHAPES().includes(def.draw));
    assert.ok(TRAVEL_SHAPES[def.draw]);
  });
}

test("the campfire's flames move with time; out shows no flames", () => {
  const at = (t, state) => {
    const ctx = fakeCtx();
    drawSetPieces(ctx, catalog, [{ id: "f", object: "campfire", x: 1000, state }], "mid", t);
    return JSON.stringify(ctx.calls);
  };
  assert.notEqual(at(0, "lit"), at(0.4, "lit"));
  assert.equal(at(0, "out"), at(0.4, "out"));
});

test("the bus draws as a moving object with turning wheels", () => {
  const ctx = fakeCtx();
  drawMovingObjects(ctx, catalog, [{ obj: true, kind: "bus", x: 1500, y: 0, wheel: 1.2, facing: 1 }]);
  assert.ok(ctx.calls.length > 30);
});

const CAST = { doopi: "#5ec8ff", doomi: "#ff9ccc", dony: "#4cd964", mooka: "#7fe8c4", becky: "#f3e3c3", tara: "#ffa45c", peepa: "#c9a6ff", tony: "#c8c8d6" };
for (const [id, color] of Object.entries(CAST)) {
  test(`${id} stands out in the forest`, () => {
    assert.ok(contrastRatio(color, catalog.themes.whispering_forest.characterBg) >= 1.6);
  });
}
