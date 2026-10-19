// Doopi & Friends batch D: the moon layer kinds (moon, moon_surface), the Grey Moon and Banyan-under-the-moon
// places, the hanging cage, the rainbow bridge and shield (animated) and the finale effects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { MOON_KINDS } from "../../engine/renderer/background_moon.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";

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

test("moon kinds are layer kinds; the places draw deterministically", () => {
  for (const k of Object.keys(MOON_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
  for (const name of ["grey_moon", "banyan_moon"]) {
    const bg = createBackground(catalog.themes[name], name, 9);
    const ctx = fakeCtx();
    drawBackground(ctx, bg, { x: 1600, y: 540, zoom: 0.8, shakeX: 0, shakeY: 0 }, 1920, 1080, 2);
    assert.ok(ctx.calls.length > 20, name);
    assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes[name], name, 9).geom));
  }
});

test("the hanging cage draws closed and open differently", () => {
  const at = (state) => { const ctx = fakeCtx(); drawSetPieces(ctx, catalog, [{ id: "c", object: "hanging_cage", x: 900, state }], "mid"); return JSON.stringify(ctx.calls); };
  assert.notEqual(at("closed"), at("open"));
});

for (const object of ["rainbow_bridge", "rainbow_shield"]) {
  test(`${object} shimmers with time`, () => {
    assert.ok(OBJECT_SHAPES().includes(object));
    const at = (t) => { const ctx = fakeCtx(); drawSetPieces(ctx, catalog, [{ id: "r", object, x: 900 }], "mid", t); return JSON.stringify(ctx.calls); };
    assert.notEqual(at(0), at(0.4));
  });
}

test("the finale effects are in the catalog", () => {
  for (const fx of ["crystal_pull", "grow_giant", "giant_blast", "beam_clash"]) assert.ok(catalog.fxNames.includes(fx), fx);
});
