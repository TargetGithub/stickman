import { test } from "node:test";
import assert from "node:assert/strict";
import { throughFilter, filterScratch } from "../../engine/renderer/filter_pass.js";

/** A canvas context that records calls and keeps a transform. */
function fakeCtx(w = 1920, h = 1080, log = []) {
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const ctx = {
    canvas: { width: w, height: h },
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    log,
    setTransform(a, b, c, d, e, f) { m = typeof a === "object" ? { ...a } : { a, b, c, d, e, f }; },
    resetTransform() { m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    getTransform: () => ({ ...m }),
    save() {}, restore() {},
    clearRect() { log.push(["clearRect"]); },
    fillRect(...a) { log.push(["fillRect", ctx.filter, ctx.globalAlpha, ...a]); },
    drawImage(img, x, y) { log.push(["drawImage", ctx.filter, ctx.globalAlpha, img === undefined ? null : "canvas", x, y]); },
  };
  return ctx;
}

test("throughFilter without a scratch canvas draws straight with the filter and puts the state back", () => {
  const ctx = fakeCtx();
  throughFilter(ctx, null, "brightness(0.5)", (g) => g.fillRect(0, 0, 10, 10), 0.5);
  assert.deepEqual(ctx.log, [["fillRect", "brightness(0.5)", 0.5, 0, 0, 10, 10]]);
  assert.equal(ctx.filter, "none");
  assert.equal(ctx.globalAlpha, 1);
});

test("throughFilter with a scratch canvas: shapes go unfiltered into it, then one filtered composite", () => {
  const ctx = fakeCtx();
  const scratchLog = [];
  const sc = fakeCtx(1920, 1080, scratchLog);
  const scratch = { canvas: sc.canvas, ctx: sc };
  throughFilter(ctx, scratch, "brightness(0.4) saturate(0.7)", (g) => {
    for (let i = 0; i < 300; i++) g.fillRect(i, 0, 5, 5); // a busy layer
  }, 0.8);
  assert.equal(scratchLog[0][0], "clearRect");
  assert.equal(scratchLog.length, 301);
  assert.ok(scratchLog.slice(1).every((c) => c[1] === "none"), "no filter on the shapes");
  assert.deepEqual(ctx.log, [["drawImage", "brightness(0.4) saturate(0.7)", 0.8, "canvas", 0, 0]], "one filtered pass");
});

test("throughFilter keeps ctx's base transform (the render scale) for the shapes", () => {
  const ctx = fakeCtx(3840, 2160);
  const base = [2, 0, 0, 2, 0, 0];
  // ctx as a render-scale context: resetTransform puts the base back.
  ctx.resetTransform = () => ctx.setTransform(...base);
  const sc = fakeCtx(3840, 2160);
  let seen = null;
  throughFilter(ctx, { canvas: sc.canvas, ctx: sc }, "brightness(0.5)", (g) => {
    g.setTransform(1, 0, 0, 1, 10, 0);
    seen = sc.getTransform();
  });
  assert.deepEqual(seen, { a: 2, b: 0, c: 0, d: 2, e: 20, f: 0 });
});

test("filterScratch is made once per renderer at the canvas size, and only with a canvas factory", () => {
  const made = [];
  const r = { createCanvas: (w, h) => (made.push([w, h]), { width: w, height: h, getContext: () => ({}) }) };
  const ctx = fakeCtx(3840, 2160);
  const a = filterScratch(r, ctx);
  assert.equal(filterScratch(r, ctx), a);
  assert.deepEqual(made, [[3840, 2160]]);
  assert.equal(filterScratch({}, ctx), null);
});
