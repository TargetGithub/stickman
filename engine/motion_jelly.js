// Jelly motion for squishy body plans (series/baaaana/PLAN.md, task 5): render-time only, like motion_fx.js.
// - jellySquash: a stronger squash and stretch that wobbles and settles after a landing or a bump, squashes a
//   little on every step down, stretches in the air, and shakes while laughing;
// - sproutLean: how far a head sprout leans (radians, positive toward the back): it trails the head's motion,
//   droops when sad or tired, perks up when happy, bounces on a laugh, shivers when scared and sways at rest.
// Pure functions of joint history (oldest first), events, the face name and video time.

import { clamp } from "./math.js";
import { axisScale } from "./motion_fx.js";

const DT = 1 / 60;
const WOBBLE = 0.5; // seconds a landing or a bump keeps wobbling

/**
 * @param {object[]} history  joints, oldest first (current last)
 * @param {object[]} events  land events and hits on the character (video time), hits with `dir` (x)
 * @param {number} amount  the scene's squash amount times the plan's `squishy`
 * @returns {{ m:number[], pivot:{x,y} }|null}  a 2x2 matrix about a pivot, as squashStretch
 */
export function jellySquash(history, events, t, groundY, amount, faceName) {
  if (amount <= 0) return null;
  const j = history[history.length - 1];
  const feet = Math.max(j.lFoot.y, j.rFoot.y);
  const base = { x: j.hip.x, y: feet };
  for (const e of events) {
    const age = t - e.videoT;
    if (age < 0 || age > WOBBLE) continue;
    // A damped wobble: squashed at once, then over- and under-shooting back to round.
    const k = clamp(1 - 0.15 * amount * Math.exp(-age * 7) * Math.cos(age * Math.PI * 2 * 4.5), 0.7, 1.3);
    if (e.type === "land") return { m: [1 / k, 0, 0, k], pivot: base };
    return { m: axisScale({ x: e.dir || 1, y: 0 }, k), pivot: { x: j.hip.x, y: (j.hip.y + j.neckTop.y) / 2 } };
  }
  let k = 1;
  if (history.length >= 3) {
    const prev = history[history.length - 3];
    const vy = (j.hip.y - prev.hip.y) / (2 * DT);
    if (feet < groundY - 6) {
      // In the air: stretch along the vertical speed (taller and thinner).
      const s = 1 + clamp(Math.abs(vy) / 2200, 0, 0.12) * amount;
      return { m: [1 / Math.sqrt(s), 0, 0, s], pivot: { x: j.hip.x, y: j.hip.y } };
    }
    // On the ground: squash a little as the hip drops into each step, stretch as it rises.
    k = 1 - clamp(vy / 1600, -0.05, 0.05) * amount;
  }
  if (faceName === "laugh") k *= 1 + 0.035 * amount * Math.sin(t * Math.PI * 2 * 6);
  return Math.abs(k - 1) > 0.002 ? { m: [1 / Math.sqrt(k), 0, 0, k], pivot: base } : null;
}

const DROOP = { sad: 0.6, cry: 0.7, tired: 0.55, hurt: 0.5, asleep: 0.75, dizzy: 0.35, scared: 0.3 };
const PERK = { happy: -0.12, laugh: -0.12, love: -0.15, surprised: -0.2, determined: -0.08 };

/**
 * @param {string} faceName  the character's face this frame
 * @param {number} sway  the hair sway from motion_fx.hairSway (radians, against the head's motion)
 * @param {number} phase  a per-character offset (seconds) so a crowd doesn't sway in step
 */
export function sproutLean(faceName, sway, t, phase = 0) {
  let a = DROOP[faceName] ?? PERK[faceName] ?? 0;
  if (faceName === "laugh") a += 0.14 * Math.sin(t * Math.PI * 2 * 6);
  if (faceName === "scared") a += 0.07 * Math.sin(t * Math.PI * 2 * 14);
  a += 1.6 * sway + 0.05 * Math.sin((t + phase) * 1.9);
  return clamp(a, -0.6, 0.95);
}
