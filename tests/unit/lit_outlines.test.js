// Outlines under a light rig (V3.9, Sridhar's review): the head shading leaves its own arc as the current path,
// so the head must be re-pathed before its outline; a shaded filled torso is stroked again on top.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeJoints } from "../../engine/skeleton.js";
import { drawCharacter } from "../../engine/renderer/character.js";

/** Records every call with its numeric args (paths, fills and strokes in order). */
function fakeCtx() {
  const calls = [];
  return new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        calls.push([k, ...args.filter((a) => typeof a === "number")]);
        return String(k).startsWith("create") ? { addColorStop() {} } : undefined;
      };
    },
    set() { return true; },
  });
}

const TONES = { base: "#5ec8ff", lit: "#9fe0ff", dark: "#3a8cc0", rim: "#ffffff", rimAlpha: 0.5, dir: { x: 0.6, y: -0.8 } };
const DIMS = { headR: 22, neck: 8, torso: 78, upperArm: 38, forearm: 36, thigh: 48, shin: 46, lineWidth: 9 };

/** Whether, after the head is filled, some stroke's current path ends in the head circle (the outline). */
function headOutlined(style) {
  const j = computeJoints({}, { x: 500, y: 600 }, 1, 1, DIMS);
  const ctx = fakeCtx();
  drawCharacter(ctx, j, { color: "#5ec8ff", scale: 1, facing: 1, dims: DIMS, ...style });
  const isHead = (c) => c[0] === "arc" && Math.abs(c[1] - j.head.x) < 1e-9 && Math.abs(c[2] - j.head.y) < 1e-9 && c[3] === DIMS.headR;
  const fill = ctx.calls.findIndex((c, i) => isHead(c) && ctx.calls[i + 1]?.[0] === "fill");
  assert.ok(fill >= 0, "the head is filled");
  let lastArc = null;
  for (const c of ctx.calls.slice(fill)) {
    if (c[0] === "arc") lastArc = c;
    if (c[0] === "stroke" && lastArc && isHead(lastArc)) return true;
  }
  return false;
}

test("the head outline strokes the head circle, with and without lighting", () => {
  for (const style of [{}, { light: TONES }]) assert.ok(headOutlined(style), style.light ? "with light" : "without light");
});

test("a shaded filled torso is outlined after its shading", () => {
  const j = computeJoints({}, { x: 500, y: 600 }, 1, 1, DIMS);
  const ctx = fakeCtx();
  drawCharacter(ctx, j, { color: "#ffb347", scale: 1, facing: 1, dims: DIMS, draw: "trapezoid", torsoWidth: 30, light: TONES });
  const clip = ctx.calls.findIndex((c) => c[0] === "clip");
  const restore = ctx.calls.findIndex((c, i) => i > clip && c[0] === "restore");
  const head = ctx.calls.findIndex((c, i) => i > restore && c[0] === "arc" && c[3] === DIMS.headR);
  assert.ok(ctx.calls.slice(restore, head).some((c) => c[0] === "stroke"), "the torso outline, between its shading and the head");
});
