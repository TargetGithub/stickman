// Post effects over the finished frame (ENGINE_V3_SPEC 6 `post`, ADR-026). Milestone: V3.5.
// Colour grade (exposure, contrast, saturation as one canvas filter pass; gamma as a soft-light grey),
// bloom (a bright, blurred copy screened back), film grain (a seeded noise tile, offset per frame),
// a tiny chromatic aberration (red and blue copies shifted apart), vignette and letterbox. Everything
// composites copies of the frame; nothing reads pixels back (no getImageData), and grain is seeded.

import { deriveRng, hash32 } from "../math.js";
import { drawVignette, drawLetterbox } from "./lens_draw.js";
import { letterboxBar } from "../camera3.js";

const GRAIN_TILE = 256;

/** Two scratch canvases the size of the frame (null without a host canvas factory). */
function scratch(r, i) {
  if (!r.createCanvas) return null;
  r.postScratch ??= [];
  const s = r.postScratch[i];
  if (s && s.canvas.width === r.PW && s.canvas.height === r.PH) return s;
  const canvas = r.createCanvas(r.PW, r.PH);
  return (r.postScratch[i] = { canvas, ctx: canvas.getContext("2d") });
}

/** Copy the frame into scratch i, optionally through a filter. */
function copyFrame(ctx, r, i, filter = "none") {
  const s = scratch(r, i);
  if (!s) return null;
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalCompositeOperation = "source-over";
  s.ctx.globalAlpha = 1;
  s.ctx.filter = "none";
  s.ctx.clearRect(0, 0, r.PW, r.PH);
  s.ctx.filter = filter;
  s.ctx.drawImage(ctx.canvas, 0, 0);
  s.ctx.filter = "none";
  return s;
}

/** The canvas filter for exposure (stops), contrast and saturation, or null when they are neutral. */
export function gradeFilter(p) {
  const parts = [];
  if (Math.abs(p.exposure) > 1e-3) parts.push(`brightness(${(2 ** p.exposure).toFixed(3)})`);
  if (Math.abs(p.contrast - 1) > 1e-3) parts.push(`contrast(${p.contrast.toFixed(3)})`);
  if (Math.abs(p.saturation - 1) > 1e-3) parts.push(`saturate(${p.saturation.toFixed(3)})`);
  return parts.length ? parts.join(" ") : null;
}

/** The grey a soft-light pass uses for a gamma (1 neutral, above 1 brightens the midtones). */
export const gammaGrey = (g) => Math.max(0, Math.min(255, Math.round(255 * (0.5 + (g - 1) * 0.35))));

/** The noise tile for film grain (one per seed). */
function grainTile(r) {
  if (r.grainTile || !r.createCanvas) return r.grainTile || null;
  const c = r.createCanvas(GRAIN_TILE, GRAIN_TILE);
  const g = c.getContext("2d");
  const img = g.createImageData(GRAIN_TILE, GRAIN_TILE);
  const rng = deriveRng(r.seed ?? 1, "grain");
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(128 + (rng() - 0.5) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  r.grainTile = c;
  return c;
}

/**
 * Apply the post settings to the frame in ctx, the raw output canvas (identity transform afterwards). Sizes are in
 * device px (r.PW x r.PH), so blur radii and shifts grow with the render scale; the grain tile is drawn scaled.
 * @param {object} p  postAt(): exposure, contrast, saturation, gamma, bloom, grain, chroma, vignette, letterbox
 * @param {number} n  the frame index (grain moves every frame, deterministically)
 */
export function applyPost(ctx, r, p, n) {
  const { PW: W, PH: H } = r;
  const k = r.scale ?? 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const filter = gradeFilter(p);
  if (filter) {
    const s = copyFrame(ctx, r, 0, filter);
    if (s) ctx.drawImage(s.canvas, 0, 0);
  }
  if (Math.abs(p.gamma - 1) > 1e-3) {
    const v = gammaGrey(p.gamma);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  if (p.bloom > 0.01) {
    const s = copyFrame(ctx, r, 0, `brightness(0.75) contrast(2.6) blur(${(18 * H / 1080).toFixed(1)}px)`);
    if (s) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(1, p.bloom);
      ctx.drawImage(s.canvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }
  if (p.chroma > 0.01) {
    // Keep green in place; add red shifted right and blue shifted left (each copy multiplied to one channel).
    const d = p.chroma * 4 * (H / 1080);
    const red = copyFrame(ctx, r, 0);
    const blue = copyFrame(ctx, r, 1);
    if (red && blue) {
      for (const [s, col] of [[red, "#ff0000"], [blue, "#0000ff"]]) {
        s.ctx.globalCompositeOperation = "multiply";
        s.ctx.fillStyle = col;
        s.ctx.fillRect(0, 0, W, H);
        s.ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(red.canvas, d, 0);
      ctx.drawImage(blue.canvas, -d, 0);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  if (p.grain > 0.01) {
    const tile = grainTile(r);
    if (tile) {
      const h = hash32(`grain:${n}`);
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = Math.min(1, p.grain) * 0.35;
      ctx.setTransform(k, 0, 0, k, -(h % GRAIN_TILE) * k, -((h >>> 8) % GRAIN_TILE) * k);
      ctx.fillStyle = ctx.createPattern(tile, "repeat");
      ctx.fillRect(0, 0, W / k + GRAIN_TILE, H / k + GRAIN_TILE);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }
  drawVignette(ctx, W, H, p.vignette);
  drawLetterbox(ctx, W, H, letterboxBar(W, H, p.letterbox));
  ctx.restore();
}

/** Whether any post effect is on. */
export const postActive = (p) => !!gradeFilter(p) || Math.abs(p.gamma - 1) > 1e-3 || p.bloom > 0.01 || p.grain > 0.01 || p.chroma > 0.01 || p.vignette > 0.01 || p.letterbox > 0.001;
