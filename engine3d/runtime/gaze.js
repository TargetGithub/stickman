// Where a toon critter's irises point (Bao Buddy's eyes): they glance around on their own in quick, deterministic
// darts (from the critter's id and t, no randomness), lead a head `look` (the eyes get there first and go further),
// and follow a timeline `gaze` prop when a script sets one. Pure: no three.js, no clocks.
// The result is an iris offset in eye widths, in the critter's own axes: x + toward its left (+x), y + up.

import { hash32 } from "./rng.js";

/** How far the irises may travel, in eye widths: x either way, y either way. */
export const GAZE_RANGE = { x: 0.32, y: 0.11 };
/** Idle glances: how long each one is held (s) and how fast the eye darts to the next (s). */
export const GLANCE = { hold: 1.7, dart: 0.12 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (k) => k * k * (3 - 2 * k);

/** The idle glance target for glance number n of critter `id`: about half the time straight ahead. */
export function glance(id, n) {
  const h = hash32(`${id}:glance:${n}`);
  if (h % 5 < 2) return [0, 0];
  const a = ((h >>> 8) % 1000) / 1000, b = ((h >>> 18) % 1000) / 1000;
  return [(a * 2 - 1) * 0.6, (b * 2 - 1) * 0.5];
}

/**
 * The iris offset at time t.
 * @param {string} id  the critter's id (its own glance pattern)
 * @param {number} t   seconds
 * @param {{ look?: number[], gaze?: number[] }} s  timeline props: look [yaw, pitch] degrees; gaze [x, y] in -1..1
 *   (x + toward the critter's left, y + up), which replaces the idle glances while it is set
 * @returns {[number, number]} offset in eye widths
 */
export function gazeOffset(id, t, s = {}) {
  let gx, gy;
  if (Array.isArray(s.gaze)) [gx, gy] = s.gaze;
  else {
    const phase = (hash32(id) % 1000) / 1000 * GLANCE.hold;
    const u = (t + phase) / GLANCE.hold;
    const n = Math.floor(u);
    const k = smooth(clamp(((u - n) * GLANCE.hold) / GLANCE.dart, 0, 1));
    const [ax, ay] = glance(id, n - 1), [bx, by] = glance(id, n);
    gx = ax + (bx - ax) * k;
    gy = ay + (by - ay) * k;
  }
  // A head look: the eyes lead it (yaw + turns toward +x; pitch + looks down).
  if (Array.isArray(s.look)) {
    gx += clamp(s.look[0] / 35, -1, 1);
    gy -= clamp(s.look[1] / 20, -1, 1);
  }
  return [clamp(gx, -1, 1) * GAZE_RANGE.x, clamp(gy, -1, 1) * GAZE_RANGE.y];
}
