// Heights and climbing (series/baaaana/PLAN.md task 10b). A `platform` object (a wall, a lookout tower) has a
// `top` a character can stand on, a `deck` (the standable span, as offsets from its x) and a `climbAt` offset
// where the way up is (a ladder, the end of the wall). Beats:
//   climb_up    { object }  walk to the way up, climb (the climb animation loops while the actor's ground rises),
//                           step onto the deck; the character then stands at the top
//   climb_down  { object }  walk along the deck to the way down, climb down to the floor
//   jump_down               from a height: hop off and fall to the floor (physics lands it, with a squash)
// Standing at a height is the actor's own ground line raised by the platform's top (actor.groundY), so moves,
// ground contact and physics all work up there unchanged; walking on top stays on the deck.

import { STAGE } from "../config.js";
import { clamp } from "../math.js";

export const CLIMB_MOVES = new Set(["climb_up", "climb_down", "jump_down"]);
const SPEED = 120; // px of height per second of climbing
const CLIMB_CYCLE = 1.4; // s: one climb_up / climb_down cycle (the catalog move's duration)
const ARRIVE = 20; // px: close enough to the way up

const platformOf = (world, id) => {
  const o = id ? world.objects?.byId.get(id) : null;
  return o && o.behavior === "platform" ? o : null;
};
const deckOf = (p) => p.def.deck ?? [-p.def.w / 2 + 20, p.def.w / 2 - 20];

/** Walk the character to x first (the beat waits); returns true while walking. */
function walkFirst(director, beat, actor, x, ctx, command) {
  const d = x - actor.x;
  if (beat.state === "approached" || Math.abs(d) <= ARRIVE * actor.scale) return false;
  actor.facing = Math.sign(d) || actor.facing;
  command(ctx.world, beat.who, "walk", { params: { distance: Math.abs(d) } });
  beat.notes.push(`walk ${Math.abs(d).toFixed(0)}px to climb ${beat.object}`);
  beat.state = "approached";
  director.waiting.set(actor.id, [beat, ...(director.waiting.get(actor.id) || []).filter((b) => b !== beat)]);
  return true;
}

/**
 * Before a climb_up, climb_down or jump_down beat fires: walk to the way up or down (returns true: the beat
 * waits), or set up the climb (the beat then plays its move with enough cycles to cover the height).
 */
export function climbGate(director, beat, actor, ctx, command) {
  const { world, storyT } = ctx;
  if (beat.do === "jump_down") {
    if (actor.elev > 0) dropFrom(actor);
    return false;
  }
  const p = platformOf(world, beat.object ?? (beat.do === "climb_down" ? actor.platform : null));
  if (!p) return false;
  const [lo, hi] = deckOf(p);
  const foot = p.x + p.def.climbAt;
  const edge = p.x + clamp(p.def.climbAt, lo, hi);
  const up = beat.do === "climb_up";
  if (up ? walkFirst(director, beat, actor, foot, ctx, command) : actor.platform === p.id && walkFirst(director, beat, actor, edge, ctx, command)) return true;
  const from = up ? actor.elev ?? 0 : p.def.top;
  const to = up ? p.def.top : 0;
  const cycles = Math.max(1, Math.round(Math.abs(to - from) / (SPEED * CLIMB_CYCLE)));
  actor.climb = { t0: storyT, dur: cycles * CLIMB_CYCLE, from, to, x0: actor.x, x1: up ? edge : foot, platform: p.id };
  actor.facing = Math.sign(p.x - foot) || actor.facing;
  beat.params = { ...(beat.params || {}), cycles };
  return false;
}

/** Hop off a height: the ground line drops to the floor and the body falls from where it is. */
function dropFrom(actor) {
  actor.airY -= actor.elev;
  actor.groundY = STAGE.groundY;
  actor.airborne = true;
  actor.vy = -260;
  actor.vx = actor.facing * 140;
  actor.elev = 0;
  actor.platform = null;
  actor.climb = null; // a jump right at the top of a climb ends the climb
}

/** Each tick: climbers rise or sink with their climb; characters on a deck stay on it. */
export function updateClimbs(world, t) {
  for (const a of world.actors) {
    const c = a.climb;
    if (c) {
      const u = clamp((t - c.t0) / c.dur, 0, 1);
      a.elev = c.from + (c.to - c.from) * u;
      // Up: climb in place, step onto the deck at the end. Down: step off the deck, then climb down.
      const step = c.to > c.from ? clamp((u - 0.85) / 0.15, 0, 1) : clamp(u / 0.15, 0, 1);
      a.x = c.x0 + (c.x1 - c.x0) * step;
      if (u >= 1) {
        a.climb = null;
        a.platform = c.to > 0 ? c.platform : null;
      }
    } else if (a.platform) {
      const p = platformOf(world, a.platform);
      if (p) {
        const [lo, hi] = deckOf(p);
        a.x = clamp(a.x, p.x + lo, p.x + hi);
      }
    }
    if (c || a.platform || a.elev) a.groundY = STAGE.groundY - (a.elev || 0);
  }
}
