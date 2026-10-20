// Beat destinations (STORY_SPEC 4.3 `to`, S6): walk, run, sneak, tiptoe or walk_together to a place.
// Milestone: S6. The distance is worked out when the beat starts, from where everyone really is:
//   { "x": 2400 }                  that stage x
//   { "near": "pip", "gap": 80 }   next to a character or object, on the walker's side (gap: hip to hip)
//   { "exit": "right" }            toward that stage edge (at most EXIT_REACH px: the camera follows everyone in
//                                  view, so a longer walk only delays the exit), then fade out until it enters again
// A hidden character that starts a beat with `to` walks in: it shows and fades in (the enter macro).

import { STAGE } from "../config.js";
import { planDepthWalk } from "../depth.js";
import { resolveMove, rootOffsetAt } from "../moves.js";
import { motionScale } from "../combat.js";
import { travelFactor } from "./pace.js";

/** Moves that take a `to`. */
export const TO_MOVES = ["walk", "run", "sneak", "tiptoe", "walk_together", "swim"];

const ENTER_FADE = 0.35; // s
const EXIT_FADE = 0.4; // s
const DEFAULT_GAP = 110; // px at scale 1
export const EXIT_REACH = { walk: 700, walk_together: 700, sneak: 400, tiptoe: 400, run: 1300 }; // px

/** Stage x of a `to` destination, or null when it names nothing in the scene. */
export function destinationX(world, actor, to, move = "walk") {
  const lo = STAGE.margin;
  const hi = world.stageWidth - STAGE.margin;
  if (typeof to.x === "number") return Math.max(lo, Math.min(hi, to.x));
  if (to.exit) {
    // Under a pace (ADR-038) an exit walk lasts at most pace.maxExit seconds before the fade.
    const paced = world.pace ? walkSpeed(world, actor, move) * world.pace.maxExit : Infinity;
    const reach = Math.min((EXIT_REACH[move] ?? 700) * actor.scale, paced);
    return to.exit === "right" ? Math.min(hi, actor.x + reach) : Math.max(lo, actor.x - reach);
  }
  const other = world.byId.get(to.near) || world.objects?.byId.get(to.near);
  if (!other) return null;
  const side = Math.sign(actor.x - other.x) || -actor.facing;
  const gap = to.gap ?? DEFAULT_GAP * Math.max(actor.scale, other.scale ?? 1);
  return Math.max(lo, Math.min(hi, other.x + side * gap));
}

/**
 * Before a beat with `to` starts: face the destination (not for paired moves, whose pair sets the facing),
 * show a hidden walker, and turn the destination into params.distance.
 * @returns {object|null} the command options to use, or null when the destination is unknown
 */
export function startTo(world, actor, beat, opts, t, paired = false) {
  let x = destinationX(world, actor, beat.to, beat.do);
  // A walk in depth (V3.2, `to: { z, x? }`): plan where it ends and how long it takes; the sim and the
  // renderer lerp z over that time (actor.depthMove; the director emits the depth event).
  if (typeof beat.to.z === "number" && world.depth) {
    const plan = planDepthWalk(actor, { ...beat.to, ...(x !== null ? { x } : {}) }, world.depth, walkSpeed(world, actor, beat.do), { lo: STAGE.margin, hi: world.stageWidth - STAGE.margin });
    actor.depthMove = { z0: actor.z || 0, z1: plan.z1, t0: t, dur: plan.dur, dx: plan.x - actor.x }; // dx: the walker's turn (V3.9)
    x = plan.x;
  }
  if (x === null) return null;
  const cut = paired || actor.depthMove || beat.to.exit ? null : travelCut(world, actor, beat.do, x);
  if (cut?.enter) actor.x = cut.enter; // an entering walker starts near where it is going
  const d = x - actor.x;
  if (!paired && Math.abs(d) > 0.5) actor.facing = Math.sign(d);
  if (actor.hidden) {
    actor.hidden = false;
    actor.alpha = 0;
    actor.fade = { a0: 0, a1: 1, t0: t, dur: ENTER_FADE };
  }
  actor.exiting = beat.to.exit ? beat.id : null;
  return { ...opts, params: { ...opts.params, distance: Math.max(1, Math.abs(d)) }, ...(cut?.skip ? { skip: cut.skip } : {}) };
}

/**
 * Cut-to-arrival under a pace (ADR-038): a walk longer than pace.maxTravel seconds walks pace.leave seconds,
 * jumps (the camera cuts) and walks the last pace.arrive seconds. A hidden walker (entering) skips the leaving
 * part and starts pace.arrive seconds out. Null when the walk is short enough or there is no pace.
 * @returns {{ enter?:number, skip?:{ at:number, by:number } } | null}
 */
export function travelCut(world, actor, name, x) {
  const pace = world.pace;
  if (!pace) return null;
  const v = walkSpeed(world, actor, name);
  const dist = Math.abs(x - actor.x);
  if (dist / v <= pace.maxTravel) return null;
  const dir = Math.sign(x - actor.x);
  if (actor.hidden) return { enter: x - dir * v * pace.arrive };
  const leave = v * pace.leave;
  return { skip: { at: leave, by: dist - leave - v * pace.arrive } };
}

/** Ground px per second a travel move covers for this actor (its root motion over one cycle; a pace's speed-up included). */
export function walkSpeed(world, actor, name) {
  const def = resolveMove(world.moves, actor, name);
  if (!def) return 200;
  const dx = Math.abs(rootOffsetAt(def, 1, def.params).dx || 0) * motionScale(actor);
  return (dx > 1 ? dx / def.duration : 200) * travelFactor(world.pace, name);
}

/** After each world step: characters walking in depth move along z (V3.2). */
export function updateDepth(world, t) {
  for (const a of world.actors) {
    const m = a.depthMove;
    if (!m) continue;
    const u = Math.min(1, (t - m.t0) / m.dur);
    a.z = m.z0 + (m.z1 - m.z0) * u;
    if (u >= 1) a.depthMove = null;
  }
}

/** After each world step: characters who reached an exit fade out (and are hidden at the end). */
export function updateExits(world, events, t) {
  for (const e of events) {
    if (e.type !== "moveEnd" || !e.beatId) continue;
    const a = world.byId.get(e.actor);
    if (!a || a.exiting !== e.beatId) continue;
    a.exiting = null;
    a.fade = { a0: a.alpha, a1: 0, t0: t, dur: EXIT_FADE };
  }
}
