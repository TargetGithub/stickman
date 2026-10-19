// Doopi & Friends batch C1: the robot body plan (box torso, square head, bolts), the windup_key accessory,
// the iron layer kinds and places, and the festival and village objects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { computeJoints } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { drawWindupKey } from "../../engine/renderer/robot.js";
import { LAYER_KINDS, createBackground, drawBackground } from "../../engine/renderer/background.js";
import { IRON_KINDS } from "../../engine/renderer/background_iron.js";
import { OBJECT_SHAPES, drawSetPieces } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";

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

test("the robot plan draws a box torso, a square head and joint bolts", () => {
  const plan = bodyPlan(catalog, "robot");
  const j = computeJoints({}, { x: 500, y: 600 }, 1, 2.4, plan.dims);
  const ctx = fakeCtx();
  drawCharacter(ctx, j, { color: "#c8ccd8", scale: 2.4, facing: 1, dims: plan.dims, draw: "box", torsoWidth: catalog.bodies.robot.torsoWidth });
  const names = ctx.calls.map((c) => c[0]);
  assert.ok(names.filter((n) => n === "roundRect").length >= 3, "torso, panel and head");
});

test("the windup key turns with time", () => {
  const plan = bodyPlan(catalog, "robot");
  const c = { j: computeJoints({}, { x: 500, y: 600 }, 1, 2.4, plan.dims), scale: 2.4, facing: 1 };
  const at = (t) => { const ctx = fakeCtx(); drawWindupKey(ctx, c, "#e6b84a", t); return JSON.stringify(ctx.calls); };
  assert.notEqual(at(0), at(0.5));
  assert.ok(V2_ENUMS.accessory.includes("windup_key"));
});

test("iron kinds are layer kinds; the canyon and workshop draw deterministically", () => {
  for (const k of Object.keys(IRON_KINDS)) assert.ok(LAYER_KINDS.includes(k), k);
  for (const name of ["iron_canyon", "iron_workshop"]) {
    const bg = createBackground(catalog.themes[name], name, 5);
    const ctx = fakeCtx();
    drawBackground(ctx, bg, { x: 1600, y: 540, zoom: 1, shakeX: 0, shakeY: 0 }, 1920, 1080, 2);
    assert.ok(ctx.calls.length > 30, name);
    assert.equal(JSON.stringify(bg.geom), JSON.stringify(createBackground(catalog.themes[name], name, 5).geom));
  }
});

const HELD = [["dhol", "drum"], ["windup_key", "key"], ["pot_and_pan", "pan"]];
for (const [object, shape] of HELD) {
  test(`${object} is a holdable with the ${shape} shape`, () => {
    assert.equal(catalog.objects[object].hold.shape, shape);
    assert.ok(PROP_SHAPES.includes(shape));
  });
}

test("the lantern string glows and sways with time; the ribbon draws", () => {
  assert.ok(OBJECT_SHAPES().includes("lantern_string") && OBJECT_SHAPES().includes("ribbon"));
  const at = (t) => { const ctx = fakeCtx(); drawSetPieces(ctx, catalog, [{ id: "l", object: "lantern_string", x: 1000 }], "mid", t); return JSON.stringify(ctx.calls); };
  assert.notEqual(at(0), at(0.7));
  const ctx = fakeCtx();
  drawSetPieces(ctx, catalog, [{ id: "r", object: "ribbon", x: 1000 }], "mid");
  assert.ok(ctx.calls.length > 5);
});
