// A bendable spine (ENGINE_V3_SPEC 5.8, ADR-036). Draw time only: the spine between the hip and the shoulders
// is drawn as a quadratic curve through a mid-spine point instead of one straight bone. The hip, the shoulders,
// the neck and the head stay where the simulation (and follow-through, breathing, turnaround) put them, so
// arms and legs attach where they always did and reach, hits and the frame store never see the bend.
// The bend is one signed number per character and frame: the mid-spine's offset from the straight bone as a
// share of the bone's length, positive toward the back (a hunch), negative toward the front (an arch). It is
// - posture: a hunch that grows as the body leans forward and an arch as it leans back;
// - follow-through: the middle of the back trails the torso when it swings, through the same kind of
//   under-damped spring as the arms (engine/motion_fx.js), so it overshoots and settles;
// - squash: a landing hunches the back for a moment; a blow folds it around the hit.
// Quadrupeds (a bonus): their back bends with the swing of the body and sags on landing; positive is an arch.
// Pure functions of joint history, events and time.

import { clamp } from "./math.js";
import { springTrack } from "./motion_fx.js";

export const MAX_BEND = 0.2; // the mid-spine never strays more than 20% of the spine's length from the bone
const POSTURE = 0.16 / 60; // bend per degree of lean (60° of lean: 0.16)
const FOLLOW = 0.55; // bend per radian the torso's spring trails its angle
const SQUASH_T = 0.22; // s: a landing or a blow bends the back this long

const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/** The forward lean of a torso in degrees (0 upright, positive forward), from hip to shoulder and the facing. */
export function leanOf(j, facing) {
  return (Math.atan2(facing * (j.shoulder.x - j.hip.x), j.hip.y - j.shoulder.y) * 180) / Math.PI;
}

/**
 * The bend this frame.
 * @param {object[]} history  joints, oldest first (current last), frames of the same scene
 * @param {object[]} events  the character's land events and the hits on it (video time), each hit with `dir`
 *   (+1: the blow pushes toward +x)
 * @param {1|-1} facing
 * @param {number} amount  0 off, 1 full (rubber limbs pass more)
 * @param {boolean} [quad]  a four-legged body: no posture term, positive arches the back up
 */
export function spineBend(history, events, t, facing, amount, quad = false) {
  if (amount <= 0 || !history.length) return 0;
  const j = history[history.length - 1];
  let b = quad ? 0 : clamp(leanOf(j, facing) * POSTURE, -0.16, 0.16);
  if (history.length >= 3) {
    // The torso's angle swings; its middle trails behind through a spring (screen angles, y down).
    const series = history.map((h) => angle(h.hip, h.shoulder));
    const { value, target } = springTrack(series, { omega: 16, zeta: 0.4 });
    // The spring trails the swing; times facing, a forward swing (or a quadruped's nose going down) is positive:
    // the middle stays behind the bone, toward the back (or up, an arch, for a quadruped).
    const lag = (target - value) * facing;
    b += clamp(lag * FOLLOW, -0.14, 0.14);
  }
  for (const e of events) {
    const age = t - e.videoT;
    if (age < 0 || age > SQUASH_T) continue;
    const k = Math.sin(Math.PI * (age / SQUASH_T));
    if (e.type === "land") b += (quad ? -0.08 : 0.1) * k; // takes its weight: a hunch, or a quadruped's back sags
    else if (!quad) b += 0.12 * k * -(e.dir ?? -facing) * facing; // folds around the blow: a blow from the front hunches
  }
  return clamp(b * amount, -MAX_BEND, MAX_BEND);
}

/**
 * The quadratic control point of the spine from a to b (hip to shoulders) bent by `bend` (share of its length):
 * the curve's middle sits bend x length off the bone, on the back side (a humanoid's back is opposite its facing;
 * a quadruped's back is up).
 */
export function spineControl(a, b, facing, bend, quad = false) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // n: unit normal toward the back. Upright humanoid (a below b): n = (-facing, 0). Quadruped (a behind b): up.
  const n = quad ? (facing === 1 ? { x: dy / len, y: -dx / len } : { x: -dy / len, y: dx / len }) : { x: (dy / len) * facing, y: (-dx / len) * facing };
  return { x: (a.x + b.x) / 2 + n.x * bend * len * 2, y: (a.y + b.y) / 2 + n.y * bend * len * 2 };
}

/** The point and the unit tangent at u (0..1) of the quadratic a → b with control p. */
export function curveAt(a, p, b, u) {
  const w = 1 - u;
  const pt = { x: w * w * a.x + 2 * w * u * p.x + u * u * b.x, y: w * w * a.y + 2 * w * u * p.y + u * u * b.y };
  const tx = 2 * w * (p.x - a.x) + 2 * u * (b.x - p.x);
  const ty = 2 * w * (p.y - a.y) + 2 * u * (b.y - p.y);
  const l = Math.hypot(tx, ty) || 1;
  return { p: pt, t: { x: tx / l, y: ty / l } };
}

/** The spine to stroke for a stick body: the sampled curve from the hip to the shoulders, then the neck. */
export function spineLine(j, facing, bend, samples = 10) {
  if (!bend) return [j.hip, j.shoulder, j.neckTop];
  const p = spineControl(j.hip, j.shoulder, facing, bend);
  const out = [];
  for (let i = 0; i <= samples; i++) out.push(curveAt(j.hip, p, j.shoulder, i / samples).p);
  out.push(j.neckTop);
  return out;
}
