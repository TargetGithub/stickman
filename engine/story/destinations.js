// Beat destinations (STORY_SPEC 4.3 `to`, S6): walk, run, sneak, tiptoe or walk_together to a place.
// Milestone: S6. The distance is worked out when the beat starts, from where everyone really is:
//   { "x": 2400 }                  that stage x
//   { "near": "pip", "gap": 80 }   next to a character or object, on the walker's side (gap: hip to hip)
//   { "exit": "right" }            toward that stage edge (at most EXIT_REACH px: the camera follows everyone in
//                                  view, so a longer walk only delays the exit), then fade out until it enters again
// A hidden character that starts a beat with `to` walks in: it shows and fades in (the enter macro).

import { STAGE } from "../config.js";

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
    const reach = (EXIT_REACH[move] ?? 700) * actor.scale;
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
  const x = destinationX(world, actor, beat.to, beat.do);
  if (x === null) return null;
  const d = x - actor.x;
  if (!paired && Math.abs(d) > 0.5) actor.facing = Math.sign(d);
  if (actor.hidden) {
    actor.hidden = false;
    actor.alpha = 0;
    actor.fade = { a0: 0, a1: 1, t0: t, dur: ENTER_FADE };
  }
  actor.exiting = beat.to.exit ? beat.id : null;
  return { ...opts, params: { ...opts.params, distance: Math.max(1, Math.abs(d)) } };
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
