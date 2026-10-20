// Turnaround views (ENGINE_V3_SPEC 5.4, ADR-027). Milestone: V3.6.
// The simulation stays side-on: joints are computed in profile (x forward along `facing`). A view is a yaw
// the renderer applies to those joints: side 90°, three_quarter 50°, front 0°, back 180°. Each limb gets a
// left/right offset (near limbs one way, far limbs the other) from the body plan's `turn` widths, so a front
// view spreads the arms and legs apart; the forward part of a pose becomes depth, foreshortened on the ground
// plane so steps still read. Which view shows comes from the event log: beat `view`s, placement and cast
// defaults, and a move's view hint while it runs. A change of view turns over TURN_TIME. Pure.

import { clamp, easings } from "./math.js";

export const VIEWS = ["side", "three_quarter", "front", "back"];
export const VIEW_YAW = Object.freeze({ side: 90, three_quarter: 50, front: 0, back: 180 });
export const TURN_TIME = 0.2; // s for a turn between two views
/** Default turn widths at scale 1 (px): half the shoulder span, half the hip span, ground foreshortening. */
export const TURN_DEFAULTS = Object.freeze({ shoulder: 16, hip: 10, foreshorten: 0.3 });
const FACE_SHIFT = 0.31; // of the head radius: how far the face slides to the middle of the head from the front
const LATERAL = { lElbow: -1, lHand: -1, rElbow: 1, rHand: 1, lKnee: -1, lFoot: -1, rKnee: 1, rFoot: 1 };
const ARMS = new Set(["lElbow", "lHand", "rElbow", "rHand"]);

/** The views a body plan has (catalog `views`; humanoids default to all four, quadrupeds to side and front). */
export function viewsOf(plan) {
  if (plan?.views) return plan.views;
  return plan?.rig === "quadruped" ? ["side", "front"] : VIEWS;
}

/** The nearest view a plan has for a wanted view (three_quarter falls back to front, then side). */
export function resolveView(plan, want) {
  const have = viewsOf(plan);
  if (!want || have.includes(want)) return want || "side";
  const order = { three_quarter: ["front", "side"], back: ["side"], front: ["three_quarter", "side"], side: ["three_quarter", "front"] }[want] || ["side"];
  return order.find((v) => have.includes(v)) || have[0];
}

/**
 * The view changes of one character in a scene: explicit views ({ storyT, view }) and move hints
 * ({ t0, t1, view } while a move with a view hint runs). See viewEvents in renderer/scene_views.js.
 * @returns {number} the yaw (degrees) at scene story time t, turning smoothly over TURN_TIME
 */
export function yawAt(track, t) {
  const want = (time) => {
    const hint = track.hints.findLast((h) => h.t0 <= time && time < h.t1);
    if (hint) return { view: hint.view, since: hint.t0 };
    const set = track.sets.findLast((e) => e.storyT <= time);
    // The view changed when it was set, or when the last hint before `time` ended, whichever is later.
    const ended = track.hints.reduce((m, h) => (h.t1 <= time && h.t1 > m ? h.t1 : m), -Infinity);
    return { view: set ? set.view : track.base, since: Math.max(set ? set.storyT : -Infinity, ended) };
  };
  const now = want(t);
  const yaw = VIEW_YAW[now.view];
  const u = (t - now.since) / TURN_TIME;
  if (u >= 1) return yaw;
  const before = want(now.since - 1e-6);
  return before.view === now.view ? yaw : VIEW_YAW[before.view] + (yaw - VIEW_YAW[before.view]) * easings.inOutQuad(clamp(u, 0, 1));
}

/** How far the face slides across the head (in head radii) at a yaw: 0 in profile, FACE_SHIFT from the front. */
export const faceShiftOf = (yaw) => FACE_SHIFT * Math.max(0, Math.cos((Math.min(yaw, 90) * Math.PI) / 180));
/** Whether the face shows at a yaw (it turns away past three-quarter back). */
export const faceShows = (yaw) => yaw < 112;

/**
 * Joints seen at a yaw. Side (90) returns the joints unchanged; other yaws add shoulder and hip points for
 * each side (lShoulder, rShoulder, lHip, rHip) so limbs start from the body's edges.
 * @param {object} j  side-view joints @param {1|-1} facing @param {number} yaw  degrees
 * @param {{ shoulder, hip, foreshorten }} turn  the plan's turn widths (scale 1) @param {number} scale
 */
export function turnJoints(j, facing, yaw, turn, scale) {
  if (Math.abs(yaw - 90) < 1e-6) return j;
  const a = (yaw * Math.PI) / 180;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const T = { ...TURN_DEFAULTS, ...(turn || {}) };
  const hx = j.hip.x;
  // body-local: f forward (along facing), l lateral (+ near side); screen x = hip + facing (f sin a - l cos a)
  const at = (p, l) => {
    const f = (p.x - hx) * facing;
    return { x: hx + facing * (f * s - l * c), y: p.y + f * c * T.foreshorten };
  };
  const out = {};
  for (const [k, p] of Object.entries(j)) {
    if (!p || typeof p.x !== "number") { out[k] = p; continue; }
    const side = LATERAL[k] ?? 0;
    out[k] = at(p, side * (ARMS.has(k) ? T.shoulder : T.hip) * scale);
  }
  out.lShoulder = at(j.shoulder, -T.shoulder * scale);
  out.rShoulder = at(j.shoulder, T.shoulder * scale);
  out.lHip = at(j.hip, -T.hip * scale);
  out.rHip = at(j.hip, T.hip * scale);
  return out;
}

/** The order to draw the two sides in at a yaw: the side nearer the camera last. */
export const nearSide = (yaw) => (yaw > 90 ? "l" : "r");
