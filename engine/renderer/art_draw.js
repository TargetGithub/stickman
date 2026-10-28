// Workbook art (WORKBOOK_SPEC 4.4): a preset, prop or object drawn to fit a box. The drawing is measured once
// with boundsContext, then drawn scaled into the box (centred, or standing on its bottom edge). Shapes are W2.

import { computeJoints, lowestPoint, withPosture } from "../skeleton.js";
import { bodyPlan } from "../story/bodies.js";
import { holdableData } from "../objects.js";
import { lookFor } from "./looks.js";
import { drawCharacter } from "./character.js";
import { drawBehind, drawFront } from "./accessories.js";
import { drawLookBehind, drawLookFront } from "./accessories_more.js";
import { drawProp } from "./props.js";
import { drawObjectShape } from "./objects.js";
import { boundsContext } from "./bounds_ctx.js";

const PAST = () => null;

/** A preset standing on y = 0 at x = 0, scale 1. */
function drawPreset(ctx, catalog, ref) {
  const preset = catalog.presets[ref.preset];
  const cast = { id: preset.id, ...preset.cast, body: preset.cast.body || "stickman" };
  const plan = catalog.bodies[cast.body];
  const dims = bodyPlan(catalog, cast.body).dims;
  const pose = withPosture(catalog.poses[ref.pose || (plan.quad ? "dog_stand" : "stand")], plan.posture);
  const facing = ref.facing ?? 1;
  const probe = computeJoints(pose, { x: 0, y: 0 }, facing, 1, dims);
  const j = computeJoints(pose, { x: 0, y: -lowestPoint(probe, 1, dims) }, facing, 1, dims);
  const look = lookFor(catalog, cast);
  const prop = cast.prop && holdableData(catalog, cast.prop) ? { data: holdableData(catalog, cast.prop), angle: 0 } : undefined;
  const faceName = ref.face || "happy";
  const c = { j, scale: 1, facing, alpha: 1, dims, face: faceName, quad: plan.quad };
  drawBehind(ctx, c, PAST, look.style);
  drawLookBehind(ctx, c, look);
  drawCharacter(ctx, j, {
    color: cast.color, scale: 1, facing, dims, draw: plan.draw, torsoWidth: plan.torsoWidth, quad: plan.quad, prop,
    look, face: catalog.faces[faceName], faceOpts: { t: 0.4, detail: "full" }, faceName, id: cast.id, time: 0.4,
  });
  drawFront(ctx, c, PAST, look.style);
  drawLookFront(ctx, c, look);
}

/** Draw an art reference at its natural size around the origin. */
export function drawArtRaw(ctx, catalog, ref) {
  if (ref.preset) return drawPreset(ctx, catalog, ref);
  const held = ref.prop ? catalog.props[ref.prop] : ref.object && catalog.objects[ref.object]?.behavior === "holdable" ? holdableData(catalog, ref.object) : null;
  if (held) return drawProp(ctx, held, { butt: { x: 0, y: 0 }, tip: { x: 0, y: -held.len } }, 1.6);
  if (ref.object) {
    ctx.save();
    if (ref.facing === -1) ctx.scale(-1, 1);
    drawObjectShape(ctx, catalog.objects[ref.object], { x: 0, y: 0 });
    ctx.restore();
  }
}

/** Bounds of an art reference at its natural size (null when it draws nothing). */
export function artBounds(catalog, ref) {
  const b = boundsContext();
  drawArtRaw(b.ctx, catalog, ref);
  return b.bounds();
}

/**
 * Draw an art reference fitted into a box, keeping its aspect.
 * @param {{ x, y, w, h, align?: "bottom" | "center" }} box
 * @param {(ctx: object) => object} [wrap]  wraps the context for the drawing (the line-art context)
 */
export function drawArt(ctx, catalog, ref, box, wrap = (c) => c) {
  const b = artBounds(catalog, ref);
  if (!b) return;
  const bw = Math.max(1e-6, b.x1 - b.x0);
  const bh = Math.max(1e-6, b.y1 - b.y0);
  const s = Math.min(box.w / bw, box.h / bh);
  const x = box.x + (box.w - bw * s) / 2 - b.x0 * s;
  const y = (box.align === "bottom" ? box.y + box.h - bh * s : box.y + (box.h - bh * s) / 2) - b.y0 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawArtRaw(wrap(ctx), catalog, ref);
  ctx.restore();
}
