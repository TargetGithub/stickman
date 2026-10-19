// Doopi & Friends batch C2: shadow lands layer kinds (dead_trees, mirrors, castle), the three places, the
// breakable mirror, snowball and rock, and Shadow Doopi standing out in the valley.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { SHADOW_KINDS } from "../../engine/renderer/background_shadow.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";
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

test("shadow kinds are layer kinds", () => {
  for (const k of Object.keys(SHADOW_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
});

for (const name of ["shadow_valley", "mirror_maze", "gloom_castle_gate", "grey_peak", "mountain_cave"]) {
  test(`${name} draws with finite geometry, deterministically`, () => {
    const bg = createBackground(catalog.themes[name], name, 3);
    const ctx = fakeCtx();
    drawBackground(ctx, bg, { x: 1600, y: 540, zoom: 0.8, shakeX: 0, shakeY: 0 }, 1920, 1080, 4);
    assert.ok(ctx.calls.length > 10);
    assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes[name], name, 3).geom));
  });
}

test("the mirror draws differently whole and broken", () => {
  assert.ok(OBJECT_SHAPES().includes("mirror"));
  const at = (state) => { const ctx = fakeCtx(); drawSetPieces(ctx, catalog, [{ id: "m", object: "mirror", x: 900, state }], "mid"); return JSON.stringify(ctx.calls); };
  assert.notEqual(at("whole"), at("broken"));
});

test("snowball and rock are balls", () => {
  for (const k of ["snowball", "rock_round"]) assert.equal(catalog.objects[k].behavior, "ball");
});

test("Shadow Doopi's indigo and the heroes stand out in the shadow valley and the maze", () => {
  for (const theme of ["shadow_valley", "mirror_maze"]) {
    for (const c of ["#1a0f3a", "#5ec8ff", "#4cd964", "#7fe8c4", "#f3e3c3"]) {
      assert.ok(contrastRatio(c, catalog.themes[theme].characterBg) >= 1.6, `${c} on ${theme}`);
    }
  }
});
