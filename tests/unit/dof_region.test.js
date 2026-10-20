// Depth of field speed-ups (V3.9, ADR-032): wide blurs on a smaller copy, and blur layers limited to the rects
// their nodes draw in (characters and set pieces boxed generously; anything else is the whole frame).
import { test } from "node:test";
import assert from "node:assert/strict";
import { blurDownscale, padRect, unionRect, blurLayer } from "../../engine/renderer/lens_draw.js";
import { characterBox, pieceBox } from "../../engine/renderer/depth_draw.js";
import { STAGE } from "../../engine/config.js";

test("blurDownscale: full size for small blurs, 2x and 4x for wider ones", () => {
  for (const [px, d] of [[0.5, 1], [1.19, 1], [1.2, 2], [3, 2], [5.9, 2], [6, 4], [40, 4]]) assert.equal(blurDownscale(px), d, `px ${px}`);
});

test("padRect and unionRect: grow, clamp, whole pixels, empty is null", () => {
  assert.deepEqual(padRect({ x0: 10.5, y0: 20.2, x1: 30.1, y1: 40.9 }, 5, 1920, 1080), { x0: 5, y0: 15, x1: 36, y1: 46 });
  assert.deepEqual(padRect({ x0: -50, y0: -50, x1: 3000, y1: 2000 }, 0, 1920, 1080), { x0: 0, y0: 0, x1: 1920, y1: 1080 });
  assert.equal(padRect({ x0: 2000, y0: 0, x1: 2100, y1: 10 }, 2, 1920, 1080), null);
  assert.deepEqual(unionRect({ x0: 0, y0: 5, x1: 10, y1: 20 }, { x0: -3, y0: 8, x1: 4, y1: 30 }), { x0: -3, y0: 5, x1: 10, y1: 30 });
  assert.deepEqual(unionRect(null, { x0: 1, y0: 2, x1: 3, y1: 4 }), { x0: 1, y0: 2, x1: 3, y1: 4 });
});

test("boxes: a character box holds its joints and the ground under it; a piece box its catalog size", () => {
  const j = { head: { x: 500, y: 600 }, hip: { x: 505, y: 700 }, lFoot: { x: 490, y: STAGE.groundY }, rFoot: { x: 520, y: STAGE.groundY } };
  const c = { j, scale: 1, dims: { headR: 20 } };
  for (const cast of [false, true]) {
    const b = characterBox(c, cast);
    assert.ok(b.x0 < 490 && b.x1 > 520 && b.y0 < 580 && b.y1 > STAGE.groundY, `cast ${cast}`);
  }
  assert.ok(characterBox(c, true).x1 > characterBox(c, false).x1, "a cast shadow widens the box");
  const lamp = pieceBox({ w: 60, h: 520 }, { x: 1000 });
  assert.ok(lamp.x1 - 1000 >= 130 && STAGE.groundY - lamp.y0 >= 620, "the lamp's glow fits");
  assert.equal(pieceBox({}, { x: 1000 }), null);
});

/** A recording 2D context: enough for blurLayer to run, and a log of the composites. */
function fakeCanvas(w, h, log) {
  const ctx = { filter: "none", globalAlpha: 1, imageSmoothingEnabled: true, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) };
  for (const k of ["save", "restore", "setTransform", "transform"]) ctx[k] = () => {};
  ctx.clearRect = (...a) => log.push(["clear", ...a]);
  ctx.drawImage = (...a) => log.push(["draw", ctx.filter, ...a.slice(1)]);
  const canvas = { width: w, height: h, getContext: () => ctx };
  ctx.canvas = canvas;
  return canvas;
}

test("blurLayer: only the announced rects are blurred and cleared next time; unannounced means the whole frame", () => {
  const log = [];
  const r = { W: 1920, H: 1080, createCanvas: (w, h) => fakeCanvas(w, h, log) };
  const frame = fakeCanvas(1920, 1080, log).getContext("2d");
  const a = blurLayer(frame, r, 1); // 1 px: full-size composite
  a.add({ x0: 100, y0: 200, x1: 300, y1: 400 });
  a.end();
  const comp = log.filter((e) => e[0] === "draw").at(-1);
  assert.equal(comp[1], "blur(1.00px)");
  assert.deepEqual(comp.slice(2, 6), [95, 195, 210, 210], "the rect plus 3 blur radii and 2 px");
  log.length = 0;
  const b = blurLayer(frame, r, 1);
  assert.deepEqual(log[0], ["clear", 95, 195, 210, 210], "the next layer clears only what the last one used");
  b.end();
  assert.deepEqual(log.filter((e) => e[0] === "draw").at(-1).slice(2, 6), [0, 0, 1920, 1080]);
});

test("drawCastShadow: a multiply grey on the frame, translucent black on a blur layer (same darkening)", async () => {
  const { drawCastShadow } = await import("../../engine/renderer/shading.js");
  const c = { alpha: 1, scale: 1, j: { hip: { x: 0, y: 0 } } };
  const cast = { a: 1, b: 0, c: -0.5, d: 0.3, alpha: 0.4 };
  for (const onLayer of [false, true]) {
    const seen = [];
    const ctx = { globalCompositeOperation: "source-over", save() {}, restore() {}, translate() {}, transform() {} };
    drawCastShadow(ctx, c, cast, 900, (g, color, alpha) => seen.push([g.globalCompositeOperation, color, alpha]), onLayer);
    if (onLayer) {
      assert.equal(seen[0][0], "source-over");
      assert.equal(seen[0][1], "#000000");
      assert.ok(Math.abs(seen[0][2] - 0.4) < 0.01);
    } else assert.deepEqual(seen[0], ["multiply", "#999999", undefined]);
  }
});
