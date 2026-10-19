// Doopi & Friends batch B2: fort, kitchen and lake layer kinds (fort_wall, shelves, water, huts_stilts), the
// four places, the fort objects and the ladle, the series hats, and the series cast's contrast there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { FORT_KINDS } from "../../engine/renderer/background_fort.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { drawHats } from "../../engine/renderer/accessories_hats.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";
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

test("fort kinds are registered layer kinds", () => {
  for (const k of Object.keys(FORT_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
});

const THEMES = ["mirchi_hill", "spice_kitchen", "spice_cellar", "lotus_lake"];
for (const name of THEMES) {
  test(`${name} draws with finite geometry at three distances, deterministically`, () => {
    const bg = createBackground(catalog.themes[name], name, 7);
    for (const zoom of [0.6, 1, 1.7]) {
      const ctx = fakeCtx();
      drawBackground(ctx, bg, { x: 1600, y: 540, zoom, shakeX: 0, shakeY: 0 }, 1920, 1080, 2.2);
      assert.ok(ctx.calls.length > 30);
    }
    assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes[name], name, 7).geom));
  });
}

const PIECES = [
  ["giant_pot", [undefined]],
  ["lever", ["up", "down"]],
  ["trapdoor", ["closed", "open"]],
  ["rope_bridge", ["whole", "broken"]],
];
for (const [object, states] of PIECES) {
  test(`${object} draws in every state, and states look different`, () => {
    assert.ok(OBJECT_SHAPES().includes(catalog.objects[object].draw));
    const drawn = states.map((state) => {
      const ctx = fakeCtx();
      drawSetPieces(ctx, catalog, [{ id: "p", object, x: 1000, state }], "mid", 1);
      assert.ok(ctx.calls.length > 5);
      return JSON.stringify(ctx.calls);
    });
    assert.equal(new Set(drawn).size, states.length);
  });
}

test("the ladle is a staff-kind holdable with its own shape", () => {
  const hold = catalog.objects.ladle.hold;
  assert.equal(hold.kind, "staff");
  assert.ok(PROP_SHAPES.includes(hold.shape));
});

const HATS = ["chilli_hat", "pirate_hat", "beard"];
for (const hat of HATS) {
  test(`${hat} is an accessory name and draws`, () => {
    assert.ok(V2_ENUMS.accessory.includes(hat));
    const ctx = fakeCtx();
    drawHats(ctx, { x: 100, y: 100 }, 20, { f: { x: 1, y: 0 }, u: { x: 0, y: -1 } }, { [hat]: "#e63946" });
    assert.ok(ctx.calls.length > 3);
  });
}

const CAST = { doopi: "#5ec8ff", doomi: "#ff9ccc", dony: "#4cd964", mooka: "#7fe8c4", becky: "#f3e3c3", tara: "#ffa45c", mirchi: "#ffb08a", kanta: "#9ad1d4", goon: "#e8e0f0" };
for (const name of THEMES) {
  test(`the series cast stands out on ${name}`, () => {
    for (const [id, color] of Object.entries(CAST)) assert.ok(contrastRatio(color, catalog.themes[name].characterBg) >= 1.6, `${id} ${contrastRatio(color, catalog.themes[name].characterBg).toFixed(2)}`);
  });
}
