// Doopi & Friends places (batch A4): layer kinds huts, bunting, banyan, pillars, mist; set pieces
// crystal_socket, throne, crystal_ball; contrast of the series cast on the three themes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { VILLAGE_KINDS } from "../../engine/renderer/background_village.js";
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
        calls.push(k);
        return String(k).startsWith("create") ? gradient : undefined;
      };
    },
    set() { return true; },
  });
}

const THEMES = ["tokyo_village", "banyan_hill", "gloom_throne_room"];

test("village kinds are registered layer kinds", () => {
  for (const k of Object.keys(VILLAGE_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
});

for (const name of THEMES) {
  test(`${name} draws with finite geometry at three camera distances`, () => {
    const bg = createBackground(catalog.themes[name], name, 7);
    for (const zoom of [0.6, 1, 1.7]) {
      for (const fxT of [0, 2.5]) {
        const ctx = fakeCtx();
        drawBackground(ctx, bg, { x: 1600, y: 540, zoom, shakeX: 0, shakeY: 0 }, 1920, 1080, fxT);
        assert.ok(ctx.calls.length > 20);
      }
    }
  });
  test(`${name} geometry is deterministic per seed`, () => {
    const a = JSON.stringify(createBackground(catalog.themes[name], name, 7).geom);
    assert.equal(a, JSON.stringify(createBackground(catalog.themes[name], name, 7).geom));
  });
}

const PIECES = [
  ["crystal_socket", ["empty", "red", "orange", "yellow", "green", "blue", "indigo", "violet"]],
  ["throne", [undefined]],
  ["crystal_ball", [undefined]],
];
for (const [object, states] of PIECES) {
  test(`set piece ${object} draws in every state`, () => {
    assert.ok(OBJECT_SHAPES().includes(catalog.objects[object].draw));
    if (states[0]) assert.deepEqual(catalog.objects[object].states, states);
    for (const state of states) {
      const ctx = fakeCtx();
      drawSetPieces(ctx, catalog, [{ id: "p", object, x: 500, state }], "mid");
      assert.ok(ctx.calls.includes("fill"), `${object} ${state}`);
    }
  });
}

// Heroes must read on every Doopi place (BIBLE section 4; Doopi in the #5ec8ff that passes).
const HEROES = { doopi: "#5ec8ff", dony: "#4cd964", doomi: "#ff9ccc", becky: "#f3e3c3", mooka: "#7fe8c4" };
for (const name of THEMES) {
  test(`heroes pass W_CONTRAST on ${name}`, () => {
    for (const [id, color] of Object.entries(HEROES)) assert.ok(contrastRatio(color, catalog.themes[name].characterBg) >= 1.6, id);
  });
}
test("Peepa reads in his throne room", () => {
  assert.ok(contrastRatio("#c9a6ff", catalog.themes.gloom_throne_room.characterBg) >= 1.6);
});
