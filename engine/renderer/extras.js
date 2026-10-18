// Drawing extras and depth layers (STORY_SPEC 14, S6.5). Milestone: S6.
// Layers: back (scaled 0.75 at the feet, faded, drawn behind mid set pieces), mid, front (scaled 1.15,
// drawn last). Extras are posed from the scene time (engine/story/extras.js has their plans) and drawn with
// less detail than the leads: no face, no outline, soft colours.

import { computeJoints, lowestPoint } from "../skeleton.js";
import { samplePoseKeys } from "../pose.js";
import { bodyPlan } from "../story/bodies.js";
import { drawCharacter } from "./character.js";
import { STAGE } from "../config.js";

export const LAYER_LOOK = { back: { scale: 0.75, alpha: 0.75 }, mid: { scale: 1, alpha: 1 }, front: { scale: 1.15, alpha: 0.95 } };
const WRAP = 300; // px past the area a walker turns up again on the other side
const REACT = { cheer: 1.2, gasp: 0.9 }; // s

/** Scale (and fade) a draw call about a point on the floor, for a depth layer. */
export function withLayer(ctx, layer, x, draw) {
  const look = LAYER_LOOK[layer] || LAYER_LOOK.mid;
  if (look.scale === 1) return draw(1);
  ctx.save();
  ctx.translate(x, STAGE.groundY);
  ctx.scale(look.scale, look.scale);
  ctx.translate(-x, -STAGE.groundY);
  draw(look.alpha);
  ctx.restore();
}

/** What an extra does at scene time t: { move, u (0-1 in the move), x, facing } or null when gone. */
function extraState(e, t, reactions) {
  if (e.behavior === "walk_by") {
    const span = e.hi - e.lo + 2 * WRAP;
    const d = (((e.x - e.lo + WRAP + e.dir * e.speed * t) % span) + span) % span;
    return { move: "walk", u: (e.phase + (t * e.speed) / 120) % 1, x: e.lo - WRAP + d, facing: e.dir };
  }
  if (e.behavior === "idle_chat") {
    const turn = Math.floor((t + e.phase * 6) / 3) % 2 === e.pair;
    return { move: turn ? "talk" : "idle", u: ((t + e.phase) / (turn ? 0.8 : 2.4)) % 1, x: e.x, facing: e.dir };
  }
  if (e.behavior === "flee") {
    const t0 = reactions.first;
    if (t0 === null || t < t0) return { move: "idle", u: ((t + e.phase * 2.4) / 2.4) % 1, x: e.x, facing: e.dir };
    const edge = e.x < (e.lo + e.hi) / 2 ? -1 : 1;
    const x = e.x + edge * 520 * (t - t0);
    if (x < e.lo - WRAP || x > e.hi + WRAP) return null;
    return { move: "run", u: ((t - t0) / 0.6) % 1, x, facing: edge };
  }
  // cheer: idle, cheering after hits, a gasp after a defeat
  const hit = reactions.hits.findLast((h) => h <= t && t - h < REACT.cheer);
  const gasp = reactions.defeats.findLast((h) => h <= t && t - h < REACT.gasp);
  const face = e.x < reactions.center ? 1 : -1;
  if (gasp !== undefined) return { move: "gasp", u: (t - gasp) / REACT.gasp, x: e.x, facing: face };
  if (hit !== undefined) return { move: "cheer", u: ((t - hit) / 0.8) % 1, x: e.x, facing: face };
  return { move: "idle", u: ((t + e.phase * 2.4) / 2.4) % 1, x: e.x, facing: face };
}

/**
 * Draw the extras of one layer.
 * @param {object} sv  scene view: extras, storyStart, reactions { hits[], defeats[], first, center } (scene story s)
 */
export function drawExtras(ctx, r, sv, f, layer) {
  const t = f.storyT - sv.storyStart;
  for (const e of sv.extras) {
    if (e.layer !== layer) continue;
    const s = extraState(e, t, sv.reactions);
    const def = s && r.sim.extraMoves?.[s.move];
    if (!def) continue;
    const plan = bodyPlan(r.catalog, e.plan);
    const pose = samplePoseKeys(def.keys, Math.max(0, Math.min(1, s.u)));
    const probe = computeJoints(pose, { x: s.x, y: 0 }, s.facing, e.scale, plan.dims);
    const j = computeJoints(pose, { x: s.x, y: STAGE.groundY - lowestPoint(probe, e.scale, plan.dims) }, s.facing, e.scale, plan.dims);
    const style = r.catalog.bodies?.[e.plan];
    withLayer(ctx, layer, s.x, (alpha) => drawCharacter(ctx, j, {
      color: e.color, scale: e.scale, facing: s.facing, alpha: 0.85 * alpha, outline: false,
      dims: plan.dims, draw: style?.draw, torsoWidth: style?.torsoWidth,
    }));
  }
}
