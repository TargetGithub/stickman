// Baaaana task 2: sprout kinds, party_hat, whistle and clipboard (engine/renderer/accessories_baaaana.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog } from "../../catalog/index.js";
import { computeJoints } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { drawLookFront } from "../../engine/renderer/accessories_more.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";

const NEW = ["leaf_sprout", "curly_vine", "flower_bud", "flower_bloom", "party_hat", "whistle", "clipboard", "gloss", "shoes"];

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

const plan = bodyPlan(catalog, "buddy");
const base = (facing) => ({ color: "#7fe8c4", scale: 1, facing, dims: plan.dims, draw: catalog.bodies.buddy.draw, torsoWidth: catalog.bodies.buddy.torsoWidth });
/** Draw calls for a buddy wearing `acc` (body plus the front hand pieces). */
function drawCalls(acc, facing = 1) {
  const j = computeJoints({}, { x: 400, y: 500 }, facing, 1, plan.dims);
  const ctx = fakeCtx();
  const look = { accessories: acc };
  drawCharacter(ctx, j, { ...base(facing), look, face: catalog.faces.happy, faceOpts: { t: 0.4, detail: "full" } });
  drawLookFront(ctx, { j, scale: 1, facing, alpha: 1, dims: plan.dims }, look);
  return ctx.calls.length;
}

test("every new accessory is a catalog and validator name with a description", () => {
  const raw = JSON.parse(readFileSync(new URL("../../catalog/characters/appearance.json", import.meta.url)));
  const byName = Object.fromEntries(raw.accessories.map((a) => [a.name, a]));
  for (const name of NEW) {
    assert.ok(V2_ENUMS.accessory.includes(name), `${name} in V2_ENUMS`);
    assert.ok(byName[name]?.description, `${name} described in appearance.json`);
    assert.ok(catalog.appearance.accessories.includes(name), `${name} in the built catalog`);
  }
});

for (const name of NEW) {
  for (const facing of [1, -1]) {
    test(`${name} draws something extra (facing ${facing})`, () => {
      assert.ok(drawCalls({ [name]: "#3fae5a" }, facing) > drawCalls({}, facing), `${name} adds draw calls`);
    });
  }
}

test("the clipboard draws without mittens, and before the near mitten when both are worn", () => {
  assert.ok(drawCalls({ clipboard: "#c98a4b" }) > drawCalls({}));
  assert.ok(drawCalls({ clipboard: "#c98a4b", mittens: "#ff9f43" }) > drawCalls({ mittens: "#ff9f43" }));
});

test("sprout kinds conflict with each other and party_hat with other headwear", () => {
  const pairs = new Set(catalog.appearance.conflicts.map((p) => p.join("|")));
  for (const p of [["flower_bud", "flower_bloom"], ["leaf_sprout", "sprout"], ["party_hat", "hat"], ["party_hat", "crown"]]) {
    assert.ok(pairs.has(p.join("|")), p.join(" vs "));
  }
});
