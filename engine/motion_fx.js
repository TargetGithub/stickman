// Motion quality (ENGINE_V3_SPEC 5.5, ADR-029). Milestone: V3.7.
// Render-time motion over the stored frames, so the simulation (reach, hits, timing) never changes:
// - follow-through and overshoot: arms and head trail and overshoot their stored angles (a damped spring run
//   over the last WINDOW frames), legs stay exactly as stored so feet never slide;
// - squash and stretch on any axis: stretch along the motion while airborne, squash on landing, squash along
//   the blow when hit;
// - secondary motion: the hair sways against the head's motion (capes and scarves already trail, tails wag);
// - breathing: a slow rise of the upper body with per-character timing while standing still;
// - motion blur: faint ghosts behind fast limbs (off unless a script asks);
// - limb stretch (rubber limbs only, ADR-034): an arm or an airborne leg grows a little longer on a fast reach
//   and at the moment its blow lands, bounded by MAX_STRETCH; every other channel keeps bone lengths.
// All pure functions of joint history (oldest first, the current frame last), events and time.

import { clamp, hash32 } from "./math.js";

export const MOTION_DEFAULTS = Object.freeze({ followThrough: 1, squash: 1, secondary: 1, breathing: 1, blur: 0, stretch: 1 });
export const WINDOW = 14; // frames of history the springs run over
const SPRING = { omega: 22, zeta: 0.45 }; // rad/s; under-damped: about 20% overshoot
const MAX_DEV = (18 * Math.PI) / 180; // a limb never strays more than this from its stored angle
const DT = 1 / 60;
const ARM_CHAINS = [["shoulder", "lElbow", "lHand"], ["shoulder", "rElbow", "rHand"]];

const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const wrap = (d) => ((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

/**
 * A damped spring tracking a series (oldest first) from its first value; returns where it ends.
 * Angles are unwrapped first so a turn through ±π does not spin the spring.
 */
export function springTrack(series, { omega, zeta } = SPRING, dt = DT) {
  if (!series.length) return { value: 0, target: 0 };
  const s = [series[0]];
  for (let i = 1; i < series.length; i++) s.push(s[i - 1] + wrap(series[i] - series[i - 1]));
  let x = s[0];
  let v = s.length > 1 ? (s[1] - s[0]) / dt : 0;
  for (let i = 1; i < s.length; i++) {
    const a = omega * omega * (s[i] - x) - 2 * zeta * omega * v;
    v += a * dt;
    x += v * dt;
  }
  return { value: x, target: s[s.length - 1] };
}

/** An angle filtered toward the spring's value by amount, clamped to MAX_DEV from the stored one. */
function filtered(series, amount) {
  const { value, target } = springTrack(series);
  return target + clamp((value - target) * amount, -MAX_DEV * amount, MAX_DEV * amount);
}

/**
 * Follow-through: the current joints with the arms and the head trailing and overshooting.
 * @param {object[]} history  joints, oldest first, the current frame last (frames of the same scene)
 * @param {number} amount  0 off, 1 full
 */
export function followThrough(history, amount) {
  const j = history[history.length - 1];
  if (amount <= 0 || history.length < 3) return j;
  const out = { ...j };
  for (const [root, mid, end] of ARM_CHAINS) {
    const upper = filtered(history.map((h) => angle(h[root], h[mid])), amount);
    const fore = filtered(history.map((h) => angle(h[mid], h[end])), amount);
    const l1 = dist(j[root], j[mid]);
    const l2 = dist(j[mid], j[end]);
    out[mid] = { x: j[root].x + Math.cos(upper) * l1, y: j[root].y + Math.sin(upper) * l1 };
    out[end] = { x: out[mid].x + Math.cos(fore) * l2, y: out[mid].y + Math.sin(fore) * l2 };
  }
  const head = filtered(history.map((h) => angle(h.neckTop, h.head)), amount * 0.6);
  const lh = dist(j.neckTop, j.head);
  out.head = { x: j.neckTop.x + Math.cos(head) * lh, y: j.neckTop.y + Math.sin(head) * lh };
  if (j.propTip) out.propTip = { x: j.propTip.x + (out.rHand.x - j.rHand.x), y: j.propTip.y + (out.rHand.y - j.rHand.y) };
  return out;
}

/**
 * Squash and stretch for this frame: a 2x2 matrix to apply about a pivot (world), or null.
 * @param {object[]} history  joints, oldest first (current last)
 * @param {object[]} events  the character's land events and hits on it (video time), each hit with `dir` (x)
 * @param {number} groundY  the floor
 */
export function squashStretch(history, events, t, groundY, amount) {
  if (amount <= 0) return null;
  const j = history[history.length - 1];
  const feet = Math.max(j.lFoot.y, j.rFoot.y);
  // A landing or a hit in the last 0.18 s: squash (vertical for a landing, along the blow for a hit).
  for (const e of events) {
    const age = t - e.videoT;
    if (age < 0 || age > 0.18) continue;
    const k = 1 - 0.14 * amount * Math.sin(Math.PI * (age / 0.18));
    if (e.type === "land") return { m: [1 / k, 0, 0, k], pivot: { x: j.hip.x, y: feet } };
    const d = { x: e.dir || 1, y: 0 };
    return { m: axisScale(d, k), pivot: { x: j.hip.x, y: (j.hip.y + j.neckTop.y) / 2 } };
  }
  // In the air: stretch along the vertical speed.
  if (history.length >= 3 && feet < groundY - 6) {
    const prev = history[history.length - 3];
    const vy = (j.hip.y - prev.hip.y) / (2 * DT);
    const s = 1 + clamp(Math.abs(vy) / 2600, 0, 0.12) * amount;
    if (s > 1.002) return { m: [1 / Math.sqrt(s), 0, 0, s], pivot: { x: j.hip.x, y: j.hip.y } };
  }
  return null;
}

/** Scale by k along the unit axis d and by 1/k across it (area kept). */
export function axisScale(d, k) {
  const n = { x: -d.y, y: d.x };
  const kk = 1 / k;
  return [k * d.x * d.x + kk * n.x * n.x, k * d.x * d.y + kk * n.x * n.y, k * d.x * d.y + kk * n.x * n.y, k * d.y * d.y + kk * n.y * n.y];
}

/** Hair sway (radians): the hair leans against the head's sideways motion and swings back. */
export function hairSway(history, amount) {
  if (amount <= 0 || history.length < 3) return 0;
  const vx = [];
  for (let i = 1; i < history.length; i++) vx.push((history[i].head.x - history[i - 1].head.x) / DT);
  const lean = vx.map((v) => clamp(-v * 0.0007, -0.4, 0.4));
  const { value } = springTrack(lean, { omega: 14, zeta: 0.35 });
  return clamp(value * amount, -0.4, 0.4);
}

/** Is the character standing still (the hip has barely moved over the history)? */
export function standingStill(history) {
  if (history.length < 6) return false;
  const a = history[0].hip;
  const b = history[history.length - 1].hip;
  return Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5;
}

/**
 * Breathing: the upper body (shoulders, neck, head, arms) rises and falls slowly, each character on its own
 * period and phase; only while standing still.
 */
export function breathe(j, id, t, scale, amount) {
  if (amount <= 0) return j;
  const h = hash32(`breath:${id}`);
  const period = 2.4 + (h % 900) / 1000; // 2.4-3.3 s
  const phase = ((h >>> 10) % 1000) / 1000;
  const dy = -Math.sin(2 * Math.PI * (t / period + phase)) * 1.6 * scale * amount;
  const out = { ...j };
  for (const k of ["shoulder", "neckTop", "head", "lElbow", "lHand", "rElbow", "rHand", "center"]) if (j[k]) out[k] = { x: j[k].x, y: j[k].y + dy * (k === "center" ? 0.5 : 1) };
  return out;
}

/** Motion blur ghosts: the past frames to draw faintly behind fast limbs, as [{ back, alpha }] (empty when slow). */
export function blurGhosts(history, amount) {
  if (amount <= 0 || history.length < 3) return [];
  const a = history[history.length - 1];
  const b = history[history.length - 2];
  const speed = Math.max(...["lHand", "rHand", "lFoot", "rFoot", "head"].map((k) => dist(a[k], b[k]) / DT));
  if (speed < 1400) return [];
  const k = clamp((speed - 1400) / 1600, 0, 1) * amount;
  return [{ back: 2, alpha: 0.1 * k }, { back: 1, alpha: 0.18 * k }];
}

export const MAX_STRETCH = 0.22; // a limb is never drawn more than 22% longer than its bones
const LIMBS = { lArm: ["shoulder", "lElbow", "lHand"], rArm: ["shoulder", "rElbow", "rHand"], lLeg: ["hip", "lKnee", "lFoot"], rLeg: ["hip", "rKnee", "rFoot"] };
const IMPACT = 0.15; // s: how long a landed blow stretches the striking limb

/**
 * The stretch channel (ADR-034): how much longer each limb is drawn this frame, as factors >= 1
 * ({ lArm, rArm, lLeg, rLeg }), or null when none stretches. A limb stretches with the speed its end moves away
 * from its root (fast reaches; the last 4 frames, fading) and pulses when a hit the character made lands
 * (the limb nearest the hit's point strikes). Legs stretch only while their foot is off the floor, so feet never slide.
 * @param {object[]} history  joints, oldest first (current last)
 * @param {object[]} hits  hits this character made, each with videoT and point (world, where it landed)
 */
export function limbStretch(history, hits, t, groundY, scale, amount) {
  if (amount <= 0 || history.length < 2) return null;
  const j = history[history.length - 1];
  const reachOf = (h, [a, , c]) => dist(h[a], h[c]);
  let impact = 0;
  for (const e of hits) {
    const age = t - e.videoT;
    if (age >= 0 && age <= IMPACT) impact = Math.max(impact, Math.sin(Math.PI * (age / IMPACT)));
  }
  // The striking limb: the one whose end is nearest where the blow landed (else the most extended one).
  let striker = null;
  if (impact > 0) {
    const point = hits.find((e) => e.point)?.point;
    let best = Infinity;
    for (const [name, chain] of Object.entries(LIMBS)) {
      const score = point ? dist(j[chain[2]], point) : -reachOf(j, chain) / (dist(j[chain[0]], j[chain[1]]) + dist(j[chain[1]], j[chain[2]]) || 1);
      if (score < best) [best, striker] = [score, name];
    }
  }
  const out = {};
  let any = false;
  for (const [name, chain] of Object.entries(LIMBS)) {
    if (name.endsWith("Leg") && j[chain[2]].y >= groundY - 6) continue;
    let reach = 0;
    for (let k = 0; k < 4 && history.length - 2 - k >= 0; k++) {
      const v = (reachOf(history[history.length - 1 - k], chain) - reachOf(history[history.length - 2 - k], chain)) / DT / (scale || 1);
      reach = Math.max(reach, clamp((v - 400) / 2000, 0, 1) * (1 - k / 4));
    }
    const s = clamp(reach * 0.14 + (name === striker ? impact * 0.12 : 0), 0, MAX_STRETCH) * amount;
    if (s > 0.002) {
      out[name] = 1 + s;
      any = true;
    }
  }
  return any ? out : null;
}

/** The joints with limbs stretched from their roots by the factors of limbStretch (the root stays put). */
export function applyStretch(j, stretch) {
  if (!stretch) return j;
  const out = { ...j };
  for (const [name, k] of Object.entries(stretch)) {
    const [a, b, c] = LIMBS[name];
    out[b] = { x: j[a].x + (j[b].x - j[a].x) * k, y: j[a].y + (j[b].y - j[a].y) * k };
    out[c] = { x: out[b].x + (j[c].x - j[b].x) * k, y: out[b].y + (j[c].y - j[b].y) * k };
  }
  if (j.propTip && stretch.rArm) out.propTip = { x: j.propTip.x + (out.rHand.x - j.rHand.x), y: j.propTip.y + (out.rHand.y - j.rHand.y) };
  return out;
}
