// Combat geometry: hurtboxes, swept hit tests, reach derivation, aim points, aim IK, positioning.
// Milestone: M2. Spec: sections 8.3, 10.1-10.2, 11.4. Hit resolution and outcomes live in world.js.

import { BODY, computeJoints, lowestPoint, solveIK2, bendSignOf } from "./skeleton.js";
import { samplePoseKeys } from "./pose.js";
import { rootOffsetAt } from "./moves.js";
import { COMBAT } from "./config.js";

/** IK chains per hit part: [root joint, middle joint, end joint, upper bone, lower bone]. */
export const CHAINS = {
  rHand: ["shoulder", "rElbow", "rHand", "upperArm", "forearm"],
  lHand: ["shoulder", "lElbow", "lHand", "upperArm", "forearm"],
  rFoot: ["hip", "rKnee", "rFoot", "thigh", "shin"],
  lFoot: ["hip", "lKnee", "lFoot", "thigh", "shin"],
};

export const IK_RAMP = 0.3; // normalized move time before t0 over which aiming blends in
export const IK_RELEASE = 0.15; // normalized move time after t1 over which aiming blends out

// ---------- hurtboxes and hit tests (spec 10.1, 10.2) ----------

/** Head circle plus torso and limb capsules: [{ part, a, b, r }]. A circle has a === b. */
export function buildHurtboxes(j, scale) {
  const r = (BODY.lineWidth / 2 + 4) * scale;
  const cap = (part, a, b, rad = r) => ({ part, a, b, r: rad });
  return [
    cap("head", j.head, j.head, BODY.headR * scale),
    cap("torso", j.hip, j.neckTop),
    cap("lUpperArm", j.shoulder, j.lElbow), cap("lForearm", j.lElbow, j.lHand),
    cap("rUpperArm", j.shoulder, j.rElbow), cap("rForearm", j.rElbow, j.rHand),
    cap("lThigh", j.hip, j.lKnee), cap("lShin", j.lKnee, j.lFoot),
    cap("rThigh", j.hip, j.rKnee), cap("rShin", j.rKnee, j.rFoot),
  ];
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Squared distance between segments p1-q1 and p2-q2. */
export function segSegDist2(p1, q1, p2, q2) {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y };
  const d2 = { x: q2.x - p2.x, y: q2.y - p2.y };
  const r = { x: p1.x - p2.x, y: p1.y - p2.y };
  const a = d1.x * d1.x + d1.y * d1.y;
  const e = d2.x * d2.x + d2.y * d2.y;
  const f = d2.x * r.x + d2.y * r.y;
  let s;
  let t;
  if (a <= 1e-12 && e <= 1e-12) return r.x * r.x + r.y * r.y;
  if (a <= 1e-12) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1.x * r.x + d1.y * r.y;
    if (e <= 1e-12) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1.x * d2.x + d1.y * d2.y;
      const denom = a * e - b * b;
      s = denom > 1e-12 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const dx = p1.x + d1.x * s - (p2.x + d2.x * t);
  const dy = p1.y + d1.y * s - (p2.y + d2.y * t);
  return dx * dx + dy * dy;
}

/** Swept hitbox (prev → cur, radius) against hurtboxes. Returns the touched hurtbox or null. */
export function sweptHit(prev, cur, radius, hurtboxes) {
  for (const h of hurtboxes) {
    const rr = radius + h.r;
    if (segSegDist2(prev, cur, h.a, h.b) <= rr * rr) return h;
  }
  return null;
}

// ---------- reach and aiming (spec 8.3, 11.4) ----------

/**
 * Per hit: forward reach of the contact joint from the root, its height above the ground,
 * and the window middle, at scale 1 with the move's FK pose (ADR-004). Cached on def.derived.
 */
export function deriveReach(def) {
  if (def.derived) return def.derived;
  def.derived = def.hits.map((hit) => {
    const tmid = (hit.t0 + hit.t1) / 2;
    const j = computeJoints(samplePoseKeys(def.keys, tmid), { x: 0, y: 0 }, 1, 1);
    const p = j[hit.part === "propTip" ? "rHand" : hit.part];
    return { tmid, reach: p.x, height: lowestPoint(j, 1) - p.y };
  });
  return def.derived;
}

/**
 * Named aim points on a body, in auto-preference order (spec 8.3). With a scale and the side the
 * attacker is on (side = -attackerFacing), points sit on the near surface of the body instead of
 * its centre line, so blows land on the outline rather than inside a big target.
 */
export function aimCandidates(j, scale = 0, side = 0) {
  const along = (a, b, u, r) => ({ x: a.x + (b.x - a.x) * u + side * r * scale, y: a.y + (b.y - a.y) * u });
  const limb = BODY.lineWidth / 2 + 4;
  return [
    { name: "head", point: along(j.head, j.head, 0, BODY.headR * 0.5) },
    { name: "upperTorso", point: along(j.hip, j.shoulder, 0.8, limb) },
    { name: "torsoMid", point: along(j.hip, j.shoulder, 0.5, limb) },
    { name: "hip", point: along(j.hip, j.shoulder, 0.1, limb) },
    { name: "knees", point: along(j.lKnee, j.rKnee, 0.5, limb) },
  ];
}

const AIM_GROUPS = { head: ["head"], torso: ["upperTorso", "torsoMid"], legs: ["hip", "knees"] };

export function aimPointByName(j, name, scale = 0, side = 0) {
  return aimCandidates(j, scale, side).find((c) => c.name === name).point;
}

/**
 * Choose where a hit lands on the target: among the candidates allowed by `aim`, those the hitting
 * limb can reach; of those, the one closest to where the authored FK pose would make contact.
 * If none is reachable, the closest candidate overall (IK then extends as far as it can).
 * @returns {{ name:string, point:{x,y} }}
 */
export function resolveAimPoint(attackerJoints, part, scale, targetJoints, aim, fkPoint, targetScale = 0, side = 0) {
  const allowed = AIM_GROUPS[aim] || null;
  const cands = aimCandidates(targetJoints, targetScale, side).filter((c) => !allowed || allowed.includes(c.name));
  const chain = CHAINS[part];
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  let pool = cands;
  if (chain) {
    const root = attackerJoints[chain[0]];
    const len = 0.98 * (BODY[chain[3]] + BODY[chain[4]]) * scale;
    const reachable = cands.filter((c) => d2(root, c.point) <= len * len);
    if (reachable.length) pool = reachable;
  }
  return pool.reduce((best, c) => (d2(c.point, fkPoint) < d2(best.point, fkPoint) ? c : best));
}

/** IK blend weight for a hit at normalized move time t: ramps in before t0, holds, releases after t1. */
export function ikWeight(t, hit) {
  const start = hit.t0 - IK_RAMP;
  if (t <= start || t >= hit.t1 + IK_RELEASE) return 0;
  if (t < hit.t0) {
    const u = (t - start) / IK_RAMP;
    return u * u * (3 - 2 * u);
  }
  if (t <= hit.t1) return 1;
  return 1 - (t - hit.t1) / IK_RELEASE;
}

function lerpAngle(a, b, w) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * w;
}

/** Blend the hitting limb from its FK angles toward the 2-bone IK solution for aimPoint (weight w). */
export function applyAimIK(joints, part, aimPoint, w, scale) {
  const chain = CHAINS[part];
  if (!chain || w <= 0) return joints;
  const [rootName, midName, endName, b1, b2] = chain;
  const root = joints[rootName];
  const mid = joints[midName];
  const end = joints[endName];
  const l1 = BODY[b1] * scale;
  const l2 = BODY[b2] * scale;
  const ik = solveIK2(root, l1, l2, aimPoint, bendSignOf(root, mid, end));
  const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const a1 = lerpAngle(ang(root, mid), ang(root, ik.mid), w);
  const a2 = lerpAngle(ang(mid, end), ang(ik.mid, ik.end), w);
  const newMid = { x: root.x + Math.cos(a1) * l1, y: root.y + Math.sin(a1) * l1 };
  const newEnd = { x: newMid.x + Math.cos(a2) * l2, y: newMid.y + Math.sin(a2) * l2 };
  return { ...joints, [midName]: newMid, [endName]: newEnd };
}

/**
 * How far short of the aim point a whiff stops: whiffGap at the attacker's scale plus the target's
 * limb thickness, so the attacking limb clearly misses even big targets.
 */
export function whiffGap(attacker, target) {
  return COMBAT.whiffGap * attacker.scale + (BODY.lineWidth / 2 + 4 + 10) * target.scale;
}

/**
 * Start x that makes a choreographed outcome read clearly (spec 11.4):
 * the contact point at the window middle lands on the aim point, or whiffGap short for whiffs.
 */
export function requiredStartX(attacker, target, def, params, outcome, hitIndex = 0) {
  const d = deriveReach(def)[hitIndex];
  const s = attacker.scale;
  const f = Math.sign(target.x - attacker.x) || attacker.facing;
  const travel = rootOffsetAt(def, d.tmid, params).dx * s;
  const contactY = attacker.groundY - d.height * s;
  const tj = target.joints || computeJoints({}, { x: target.x, y: target.groundY - (BODY.thigh + BODY.shin) * target.scale }, target.facing, target.scale);
  const cands = aimCandidates(tj, target.scale, -f);
  const aim = cands.reduce((best, c) => (Math.abs(c.point.y - contactY) < Math.abs(best.point.y - contactY) ? c : best));
  const gap = outcome === "whiff" ? whiffGap(attacker, target) : 0;
  return aim.point.x - f * (d.reach * s + travel + gap);
}
