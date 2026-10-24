// Baaaana task 9: props (held shapes), set pieces and the baaaana_meadow theme with its new layer kinds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";

function fakeCtx() {
  const calls = [];
  const gradient = { addColorStop() {} };
  return new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        for (const v of args) if (typeof v === "number") assert.ok(Number.isFinite(v), `${String(k)} got ${v}`);
        calls.push(k);
        return String(k).startsWith("create") ? gradient : undefined;
      };
    },
    set() { return true; },
  });
}

const HELD = ["trumpet", "triangle", "pillow", "watering_can"];
const PIECES = ["picnic_blanket", "cake", "camera_tripod", "yoga_mat", "mushroom_hut"];

test("the new holdables are catalog objects with their own held shapes", () => {
  for (const o of HELD) {
    const def = catalog.objects[o];
    assert.equal(def?.behavior, "holdable", o);
    assert.ok(PROP_SHAPES.includes(def.hold.shape), def.hold.shape);
  }
});

for (const o of PIECES) {
  test(`set piece ${o} draws with finite numbers`, () => {
    assert.ok(OBJECT_SHAPES().includes(catalog.objects[o].draw));
    const ctx = fakeCtx();
    drawSetPieces(ctx, catalog, [{ id: "p", object: o, x: 800 }], "mid", 0);
    assert.ok(ctx.calls.length > 5, `${o} drew ${ctx.calls.length} calls`);
  });
}

test("baaaana_meadow uses the new layer kinds and draws over time", () => {
  const theme = catalog.themes.baaaana_meadow;
  const kinds = theme.layers.map((l) => l.kind);
  for (const k of ["mushroom_huts", "meadow_flowers"]) {
    assert.ok(LAYER_KINDS.includes(k) && kinds.includes(k), k);
  }
  const bg = createBackground(theme, "baaaana_meadow", 3);
  for (const fxT of [0, 1.3]) {
    const ctx = fakeCtx();
    drawBackground(ctx, bg, { x: 1600, y: 600, zoom: 1, shakeX: 0, shakeY: 0 }, 1920, 1080, fxT);
    assert.ok(ctx.calls.filter((c) => c === "arc").length > 20, "huts' spots and flowers");
  }
});
