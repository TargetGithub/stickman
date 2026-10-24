// Crowd behaviours for extras (series/baaaana/PLAN.md task 7), posed at render time like the S6 behaviours:
//   copy_leader     copies the leader's pose a beat late (each member its own delay); some do it mirrored
//   conga           follows the leader's path in a line, each member a little later and a step behind
//   sync_dance      everybody dances to one beat (dance_a and dance_b by the bar); a few are off the beat
//   wave            a stadium wave runs across the area from `at`, again and again
//   pile_on         from `at`, everybody runs to the leader (or the middle of the area) and piles up in a heap
//   scatter_giggle  from `at` (or the first hit), everybody runs off a little, turns round and laughs
// Pure: a member's state comes from its plan (engine/story/extras.js), the scene time and the leader's stored
// frames. Each state is { move, u, x, facing, lift?, face? } or, for copying, { copy, x, facing, mirror }.

import { segmentIndexAt } from "../framestore.js";
import { STAGE, FPS } from "../config.js";
import { lowestPoint } from "../skeleton.js";
import { charsAt } from "./draw_chars.js";

export const CROWD_BEHAVIORS = ["copy_leader", "conga", "sync_dance", "wave", "pile_on", "scatter_giggle"];
const RUN = 520; // px/s
const WAVE = { speed: 1100, period: 4.5, hop: 0.9 }; // px/s, s, s
const HEAP = [4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]; // members per heap row, bottom first (then a second heap beside it)

/** The leader's character at `back` seconds before the frame being drawn (same scene), or null. */
function leaderAt(r, f, id, back) {
  const n = (r.frameN ?? 0) - Math.round(back * FPS);
  if (n < 0 || segmentIndexAt(r.sim.store, n) !== f.segment) return null;
  return charsAt(r, n).find((c) => c.id === id) ?? null;
}

/** A second seeded number per member, from its phase. */
const phase2 = (e) => (e.phase * 7.13) % 1;

/** Heap slot of the k-th member: row (0 bottom) and offset in member widths. */
function heapSlot(k) {
  let row = 0;
  let left = k;
  while (left >= HEAP[row]) left -= HEAP[row++];
  const n = HEAP[row];
  return { row: row % 4, col: left - (n - 1) / 2 + Math.floor(row / 4) * 4.5 };
}

/**
 * State of a crowd-behaviour extra at scene time t, or undefined for the S6 behaviours.
 * @param {object} e  the extra's plan; r, f: renderer and frame view; reactions: the scene's hits and defeats
 */
export function crowdState(e, t, r, f, reactions) {
  if (!CROWD_BEHAVIORS.includes(e.behavior)) return undefined;
  const at = e.at ?? 0;
  const idle = (facing = e.dir) => ({ move: "idle", u: ((t + e.phase * 2.4) / 2.4) % 1, x: e.x, facing });
  const centre = () => {
    const now = e.leader ? leaderAt(r, f, e.leader, 0) : null;
    return now ? now.j.hip.x : (e.lo + e.hi) / 2;
  };
  switch (e.behavior) {
    case "copy_leader": {
      const c = t >= at ? leaderAt(r, f, e.leader, 0.15 + e.phase * 0.4) : null;
      if (!c) return idle();
      const mirror = phase2(e) < 0.15;
      return { copy: c, x: e.x, facing: mirror ? -c.facing : c.facing, mirror, face: c.face };
    }
    case "conga": {
      const c = t >= at ? leaderAt(r, f, e.leader, (e.rank + 1) * 0.3) : null;
      if (!c) return idle();
      return { copy: c, x: c.j.hip.x - c.facing * (e.rank + 1) * 70 * e.scale, facing: c.facing, mirror: false, face: "happy", travel: true };
    }
    case "sync_dance": {
      const beats = Math.max(0, t - at) * ((e.bpm ?? 120) / 60);
      if (t < at) return idle();
      const bar = Math.floor(beats / 4);
      const off = phase2(e) < 0.2 ? 0.12 : 0; // a few are a little behind the beat
      return { move: bar % 2 ? "dance_b" : "dance_a", u: (((beats / 4) % 1) - off + 1) % 1, x: e.x, facing: bar % 2 ? -1 : 1, face: "laugh" };
    }
    case "wave": {
      const c = (e.lo + e.hi) / 2;
      const facing = e.x < c ? 1 : -1;
      if (t < at) return idle(facing);
      const dt = (((t - at - (e.x - e.lo) / WAVE.speed) % WAVE.period) + WAVE.period) % WAVE.period;
      if (t - at < (e.x - e.lo) / WAVE.speed || dt >= WAVE.hop) return idle(facing);
      return { move: "jump_joy", u: dt / WAVE.hop, x: e.x, facing, face: "laugh" };
    }
    case "pile_on": {
      const start = at + e.phase * 0.4;
      if (t < start) return idle();
      const slot = heapSlot(e.rank);
      const target = centre() + slot.col * 58 * e.scale;
      const dist = target - e.x;
      const runT = Math.abs(dist) / RUN;
      const ran = t - start;
      if (ran < runT) return { move: "run", u: (ran / 0.6) % 1, x: e.x + Math.sign(dist) * RUN * ran, facing: Math.sign(dist) || 1, face: "laugh" };
      return { move: "lie_down", u: 1, x: target, facing: e.rank % 2 ? -1 : 1, lift: slot.row * 42 * e.scale, face: "laugh" };
    }
    default: {
      // scatter_giggle
      const t0 = e.at ?? reactions.first;
      if (t0 === null || t0 === undefined || t < t0) return idle();
      const away = e.x < centre() ? -1 : 1;
      const run = Math.min(t - t0, 0.9);
      const x = e.x + away * RUN * (0.6 + e.phase * 0.4) * run;
      if (t - t0 < 0.9) return { move: "run", u: ((t - t0) / 0.6) % 1, x, facing: away, face: "surprised" };
      return { move: "laugh", u: ((t - t0 - 0.9 + e.phase) / 1.2) % 1, x, facing: -away, face: "laugh" };
    }
  }
}

const heightOf = (d) => 2 * d.headR + d.neck + d.torso + d.thigh + d.shin;

/**
 * The leader's stored joints moved onto an extra: scaled by their sizes about the leader's hip, mirrored when
 * asked, standing at the extra's x and keeping the leader's height above the floor (hops copy as hops).
 */
export function copyJoints(c, e, dims, s) {
  const k = (e.scale * heightOf(dims)) / (c.scale * heightOf(c.dims));
  const low = lowestPoint(c.j, c.scale, c.dims);
  const lift = (STAGE.groundY - low) * k;
  const m = s.mirror ? -1 : 1;
  const out = {};
  for (const [name, p] of Object.entries(c.j)) {
    out[name] = p && typeof p.x === "number" ? { x: s.x + (p.x - c.j.hip.x) * k * m, y: STAGE.groundY - lift + (p.y - low) * k } : p;
  }
  return out;
}
