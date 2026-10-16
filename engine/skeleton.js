// Forward kinematics, 2-bone IK, ground contact helpers.
// Milestone: M0. Spec: section 5. Interfaces: docs/ARCHITECTURE.md section 4.

import { DEG } from "./math.js";
import { JOINT_ORDER } from "./types.js";

/** Body dimensions at scale 1.0 (spec 5.1): the stickman. Body plans (S3) pass their own dims. */
export const BODY = { headR: 22, neck: 8, torso: 78, upperArm: 38, forearm: 36, thigh: 48, shin: 46, lineWidth: 9 };

/** An actor's (or frame character's) body dims: its plan's, or the stickman's. */
export const dimsOf = (a) => (a && a.dims) || BODY;

/**
 * A pose with a body plan's posture added at weight w (the elder's stoop): the torso leans and the
 * thighs turn with it so the legs stay upright.
 */
export function withPosture(pose, posture, w = 1) {
  if (!posture || w <= 0) return pose;
  const lean = (posture.lean || 0) * w;
  return { ...pose, lean: (pose.lean || 0) + lean, head: (pose.head || 0) + (posture.head || 0) * w, lTH: (pose.lTH || 0) + lean, rTH: (pose.rTH || 0) + lean };
}

/** Leg-length ratio to the stickman: root motion (steps, travel, jumps) scales with it (ADR-015). */
export const strideOf = (dims) => (dims.thigh + dims.shin) / (BODY.thigh + BODY.shin);

/**
 * Pose angles → joint positions (spec 5.3, incl. rot).
 * @param {import("./types.js").Pose} pose  missing channels count as 0
 * @param {{x:number, y:number}} root  anchor (hip position before dx/dy)
 * @param {1|-1} facing
 * @param {number} scale
 * @param {object} dims  body dimensions (a body plan's; default the stickman)
 * @returns {import("./types.js").Joints}
 */
export function computeJoints(pose, root, facing, scale, dims = BODY) {
  const p = (k) => pose[k] || 0;
  const lean = p("lean");
  const L = {
    torso: dims.torso * scale,
    neck: dims.neck * scale,
    headR: dims.headR * scale,
    upperArm: dims.upperArm * scale,
    forearm: dims.forearm * scale,
    thigh: dims.thigh * scale,
    shin: dims.shin * scale,
  };

  // dir(a) = (facing * sin a, cos a): 0° down, 90° forward, 180° up.
  const step = (from, angleDeg, length) => {
    const a = angleDeg * DEG;
    return { x: from.x + facing * Math.sin(a) * length, y: from.y + Math.cos(a) * length };
  };

  const hip = { x: root.x + facing * p("dx"), y: root.y + p("dy") };
  const torsoAngle = 180 - lean;
  const shoulder = step(hip, torsoAngle, L.torso);
  const neckTop = step(shoulder, torsoAngle, L.neck);
  const head = step(neckTop, 180 - lean - p("head"), L.headR);

  const base = -lean;
  const lUA = base + p("lUA");
  const rUA = base + p("rUA");
  const lElbow = step(shoulder, lUA, L.upperArm);
  const lHand = step(lElbow, lUA + p("lFA"), L.forearm);
  const rElbow = step(shoulder, rUA, L.upperArm);
  const rHand = step(rElbow, rUA + p("rFA"), L.forearm);

  const lTH = base + p("lTH");
  const rTH = base + p("rTH");
  const lKnee = step(hip, lTH, L.thigh);
  const lFoot = step(lKnee, lTH - p("lSH"), L.shin);
  const rKnee = step(hip, rTH, L.thigh);
  const rFoot = step(rKnee, rTH - p("rSH"), L.shin);

  const center = step(hip, torsoAngle, L.torso / 2);
  const joints = { hip, shoulder, neckTop, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot, center };

  const rot = p("rot");
  if (rot !== 0) {
    const r = facing * rot * DEG;
    const c = Math.cos(r);
    const s = Math.sin(r);
    for (const name of JOINT_ORDER) {
      if (name === "center") continue;
      const q = joints[name];
      const x = q.x - center.x;
      const y = q.y - center.y;
      joints[name] = { x: center.x + x * c - y * s, y: center.y + x * s + y * c };
    }
  }
  return joints;
}

/**
 * Analytic two-bone IK. Clamps the target to [|len1 - len2|, 0.98 * (len1 + len2)] along the root→target direction.
 * bendSign +1 bends the middle joint clockwise (y-down screen) from the root→end line; use bendSignOf to keep the FK side.
 */
export function solveIK2(a, len1, len2, target, bendSign) {
  const dx = target.x - a.x;
  const dy = target.y - a.y;
  const raw = Math.hypot(dx, dy);
  const maxD = 0.98 * (len1 + len2);
  const minD = Math.abs(len1 - len2) + 1e-6;
  const d = Math.min(Math.max(raw, minD), maxD);
  const theta = raw > 1e-9 ? Math.atan2(dy, dx) : 0;
  const cosAlpha = Math.min(1, Math.max(-1, (len1 * len1 + d * d - len2 * len2) / (2 * len1 * d)));
  const ang = theta + bendSign * Math.acos(cosAlpha);
  return {
    mid: { x: a.x + Math.cos(ang) * len1, y: a.y + Math.sin(ang) * len1 },
    end: { x: a.x + Math.cos(theta) * d, y: a.y + Math.sin(theta) * d },
    reached: raw <= maxD && raw >= minD,
  };
}

/** Which side the middle joint bends to (+1 clockwise / -1), matching solveIK2's bendSign. */
export function bendSignOf(a, mid, end) {
  const cross = (end.x - a.x) * (mid.y - a.y) - (end.y - a.y) * (mid.x - a.x);
  return cross >= 0 ? 1 : -1;
}

/** Max y over all joints, head counted at head.y + headRadius. */
export function lowestPoint(joints, scale, dims = BODY) {
  let y = joints.head.y + dims.headR * scale;
  for (const name of JOINT_ORDER) {
    if (name !== "head" && name !== "center" && joints[name].y > y) y = joints[name].y;
  }
  return y;
}

/** Write joints into a Float32Array(26) in JOINT_ORDER, starting at offset. */
export function packJoints(joints, out, offset = 0) {
  for (let i = 0; i < JOINT_ORDER.length; i++) {
    const q = joints[JOINT_ORDER[i]];
    out[offset + i * 2] = q.x;
    out[offset + i * 2 + 1] = q.y;
  }
  return out;
}

/** Read joints back from a packed buffer. */
export function unpackJoints(buf, offset = 0) {
  const joints = {};
  for (let i = 0; i < JOINT_ORDER.length; i++) {
    joints[JOINT_ORDER[i]] = { x: buf[offset + i * 2], y: buf[offset + i * 2 + 1] };
  }
  return joints;
}
