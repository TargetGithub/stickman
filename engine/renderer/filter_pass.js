// One filter pass for a group of shapes (background layers at night, a graded background). Draw time only.
// A canvas filter set while many shapes are drawn costs one offscreen pass per shape in Skia: the spice kitchen's
// shelves (hundreds of jars and sacks) under the night filter took about 12 s per frame at 4K (Doopi ep08,
// 2026-10-26). Drawing the shapes unfiltered into a scratch canvas and compositing it once with the filter costs
// one pass. Brightness, saturate and the other colour filters act per pixel, so the picture is the same.

import { framedContext } from "./lens_draw.js";

/**
 * A scratch canvas the size of ctx's canvas, made once per renderer (null without a canvas factory).
 * @param {{ createCanvas?: Function, filterScratch?: object }} r  the renderer
 */
export function filterScratch(r, ctx) {
  const real = ctx.__real || ctx;
  const w = real.canvas?.width;
  const h = real.canvas?.height;
  if (!r.createCanvas || !w || !h) return null;
  if (!r.filterScratch || r.filterScratch.canvas.width !== w || r.filterScratch.canvas.height !== h) {
    const canvas = r.createCanvas(w, h);
    r.filterScratch = { canvas, ctx: canvas.getContext("2d") };
  }
  return r.filterScratch;
}

/**
 * Draw `draw(g)` through `filter` at `alpha`: with a scratch canvas, unfiltered into it (g has ctx's base transform,
 * so setTransform and resetTransform work as on ctx) and then composited once; without one, straight to ctx with
 * the filter set, as before.
 */
export function throughFilter(ctx, scratch, filter, draw, alpha = 1) {
  if (!scratch || !filter || filter === "none") {
    const before = ctx.filter;
    const a = ctx.globalAlpha;
    ctx.filter = filter || "none";
    ctx.globalAlpha = alpha;
    draw(ctx);
    ctx.filter = before;
    ctx.globalAlpha = a;
    return;
  }
  const real = ctx.__real || ctx;
  ctx.resetTransform();
  const m = real.getTransform(); // the base transform (the render scale) under ctx
  const sc = scratch.ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.filter = "none";
  sc.globalAlpha = 1;
  sc.globalCompositeOperation = "source-over";
  sc.clearRect(0, 0, scratch.canvas.width, scratch.canvas.height);
  draw(framedContext(sc, [m.a, m.b, m.c, m.d, m.e, m.f], true));
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  real.filter = filter;
  real.globalAlpha = alpha;
  real.drawImage(scratch.canvas, 0, 0);
  real.restore();
}
