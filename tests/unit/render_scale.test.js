// Render scale (ADR-039): the logical frame stays 1920x1080 (1080x1920 portrait); the output canvas, scratch
// canvases and pixel effects grow by the scale. No canvas backend: recording fakes stand in for contexts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngine, renderScale } from "../../engine/index.js";
import { framedContext, scaledContext, deviceSize, blurLayer, drawVignette } from "../../engine/renderer/lens_draw.js";
import { applyPost } from "../../engine/renderer/post.js";
import { catalog } from "../../catalog/index.js";

test("renderScale: numbers and presets, 1 by default, out-of-range refused", () => {
  for (const [v, s] of [[undefined, 1], [null, 1], [1, 1], [2, 2], ["2", 2], ["4k", 2], ["4K", 2], ["1080p", 1], ["720p", 2 / 3], ["1440p", 4 / 3], [0.5, 0.5]]) {
    assert.equal(renderScale(v), s, `scale ${v}`);
  }
  for (const v of [0, -1, 5, NaN, Infinity, "8k", "big", {}]) assert.throws(() => renderScale(v), RangeError, `scale ${String(v)}`);
});

test("deviceSize: the output canvas for each format and scale", () => {
  for (const [W, H, s, w, h] of [
    [1920, 1080, 1, 1920, 1080],
    [1920, 1080, 2, 3840, 2160],
    [1080, 1920, 2, 2160, 3840],
    [1920, 1080, 4 / 3, 2560, 1440],
    [1920, 1080, 2 / 3, 1280, 720],
  ]) assert.deepEqual(deviceSize(W, H, s), { width: w, height: h }, `${W}x${H} at ${s}`);
});

test("createEngine scale: load and getMeta report the logical frame and the output size", () => {
  const minimal = JSON.parse(readFileSync("tests/fixtures/good/minimal.json", "utf8"));
  const portrait = { ...minimal, meta: { ...minimal.meta, format: "portrait" } };
  for (const [script, scale, frame, out] of [
    [minimal, undefined, [1920, 1080], [1920, 1080]],
    [minimal, 2, [1920, 1080], [3840, 2160]],
    [minimal, "4k", [1920, 1080], [3840, 2160]],
    [portrait, 2, [1080, 1920], [2160, 3840]],
  ]) {
    const engine = createEngine({ catalog, scale });
    const r = engine.load(script);
    assert.ok(r.ok, JSON.stringify(r.errors));
    assert.deepEqual([r.width, r.height, r.outputWidth, r.outputHeight], [...frame, ...out]);
    const m = engine.getMeta();
    assert.deepEqual([m.width, m.height, m.outputWidth, m.outputHeight, m.scale], [...frame, ...out, renderScale(scale)]);
  }
  assert.throws(() => createEngine({ catalog, scale: 9 }), RangeError);
});

test("createEngine scale: the simulation is the same at every scale", () => {
  const minimal = JSON.parse(readFileSync("tests/fixtures/good/minimal.json", "utf8"));
  const a = createEngine({ catalog });
  const b = createEngine({ catalog, scale: 2 });
  a.load(minimal);
  b.load(minimal);
  assert.deepEqual(b.getEvents(), a.getEvents());
  for (const n of [0, 60, 200]) assert.deepEqual(b.getFrame(n), a.getFrame(n), `frame ${n}`);
});

/** A context that records transforms and draws. */
function fakeCtx(w = 1920, h = 1080, log = []) {
  const ctx = {
    filter: "none", globalAlpha: 1, globalCompositeOperation: "source-over", imageSmoothingEnabled: true, m: [1, 0, 0, 1, 0, 0],
    setTransform(...m) { this.m = m; },
    getTransform() { const [a, b, c, d, e, f] = this.m; return { a, b, c, d, e, f }; },
    save() {}, restore() {}, transform() {}, translate() {},
    clearRect: (...a) => log.push(["clear", ...a]),
    fillRect: (...a) => log.push(["fill", ctx.m.slice(), ...a]),
    drawImage: (...a) => log.push(["draw", ctx.filter, ...a.slice(1)]),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    createImageData: (W, H) => ({ data: new Uint8ClampedArray(W * H * 4) }),
    putImageData() {},
  };
  ctx.canvas = { width: w, height: h, getContext: () => ctx };
  return ctx;
}

test("scaledContext: scale 1 is the context itself; scale s composes every transform with s", () => {
  const raw = fakeCtx();
  assert.equal(scaledContext(raw, 1), raw);
  for (const [s, m, want] of [
    [2, [1, 0, 0, 1, 0, 0], [2, 0, 0, 2, 0, 0]],
    [2, [0.5, 0, 0, 0.5, 100, 40], [1, 0, 0, 1, 200, 80]],
    [4 / 3, [1, 0, 0, 1, 30, 0], [4 / 3, 0, 0, 4 / 3, 40, 0]],
  ]) {
    const g = scaledContext(raw, s);
    g.setTransform(...m);
    assert.deepEqual(raw.m.map((x) => +x.toFixed(9)), want.map((x) => +x.toFixed(9)), `scale ${s}, ${m}`);
  }
});

test("framedContext: a lens over a scaled context reaches the raw canvas and the scaled screen", () => {
  const raw = fakeCtx();
  const screen = scaledContext(raw, 2);
  const lens = framedContext(screen, [1, 0, 0, 1, 0, 10]); // a tilt of 10 frame px
  assert.equal(lens.__real, raw);
  assert.equal(lens.__screen, screen);
  assert.equal(screen.__real, raw);
  assert.equal(screen.__screen, undefined, "the scaled context is itself the screen");
  lens.setTransform(1, 0, 0, 1, 0, 0);
  assert.deepEqual(raw.m, [2, 0, 0, 2, 0, 20], "lens, then scale");
  // Screen passes (vignette) draw the logical frame under the scale, not the lens.
  const log = [];
  const raw2 = fakeCtx(3840, 2160, log);
  drawVignette(framedContext(scaledContext(raw2, 2), [1, 0, 0, 1, 0, 10]), 1920, 1080, 1);
  assert.deepEqual(log.at(-1), ["fill", [2, 0, 0, 2, 0, 0], 0, 0, 1920, 1080]);
});

test("blurLayer: device px at scale 2 (scratch canvas, blur radius, clamp)", () => {
  for (const [scale, PW, PH, blur, rect] of [
    [1, 1920, 1080, "blur(1.00px)", [95, 195, 210, 210]],
    [2, 3840, 2160, "blur(1.00px)", [190, 390, 420, 420]],
  ]) {
    const log = [];
    const sizes = [];
    const r = { W: 1920, H: 1080, PW, PH, scale, createCanvas: (w, h) => (sizes.push([w, h]), fakeCtx(w, h, log).canvas) };
    const frame = fakeCtx(PW, PH, log);
    // px 1 is frame px; at scale 2 the blur is 2 device px, made on a 2x smaller copy (1 px there).
    const a = blurLayer(frame, r, 1);
    a.add({ x0: 100 * scale, y0: 200 * scale, x1: 300 * scale, y1: 400 * scale });
    a.end();
    assert.deepEqual(sizes[0], [PW, PH], `scratch at scale ${scale}`);
    const comp = log.filter((e) => e[0] === "draw").at(-1);
    if (scale === 1) {
      assert.equal(comp[1], blur);
      assert.deepEqual(comp.slice(2, 6), rect);
    } else {
      assert.deepEqual(sizes[1], [PW / 2, PH / 2], "the half-size copy");
      assert.deepEqual(comp.slice(-4), [192, 392, 416, 416], "the rect plus 3 blur radii (2 px each) and 2 px");
    }
  }
});

test("applyPost: scratch canvases at the output size, blur and grain scaled", () => {
  for (const [scale, PW, PH, bloom] of [[1, 1920, 1080, "blur(18.0px)"], [2, 3840, 2160, "blur(36.0px)"]]) {
    const log = [];
    const sizes = [];
    const filters = [];
    const r = { W: 1920, H: 1080, PW, PH, scale, seed: 1, createCanvas: (w, h) => {
      sizes.push([w, h]);
      const c = fakeCtx(w, h, log);
      Object.defineProperty(c, "filter", { get: () => "none", set: (v) => filters.push(v) });
      return c.canvas;
    } };
    const ctx = fakeCtx(PW, PH, log);
    const p = { exposure: 0, contrast: 1, saturation: 1, gamma: 1, bloom: 0.5, grain: 0.5, chroma: 0, vignette: 0, letterbox: 0 };
    applyPost(ctx, r, p, 7);
    assert.ok(sizes.some(([w, h]) => w === PW && h === PH), `frame scratch at scale ${scale}`);
    assert.ok(filters.some((f) => f.includes(bloom)), `bloom ${bloom}`);
    const grain = log.filter((e) => e[0] === "fill").at(-1);
    assert.equal(grain[1][0], scale, "the grain tile is drawn scaled");
    assert.ok(grain[1][0] * (grain[4] - 256) >= PW, "and covers the output");
  }
});
