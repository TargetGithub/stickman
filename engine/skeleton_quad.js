// Forward kinematics for four-legged body plans (STORY_SPEC 6.2, ADR-020). Milestone: A1.
// The 13 humanoid joints get quadruped meanings: hip = rear hip (root), shoulder = front shoulders
// (the spine runs forward), neckTop/head = neck and head, l/rElbow + l/rHand = far/near front leg,
// l/rKnee + l/rFoot = far/near rear leg. Same channels, same storage, same angle convention as
// computeJoints: dir(a) = (facing * sin a, cos a), 0° down, 90° forward, 180° up.

import { DEG } from "./math.js";
import { JOINT_ORDER } from "./types.js";

/** Neck angle above the spine at rest (the head held forward and up). */
export const NECK_REST = 45;
/** The snout points this many degrees below the neck line (renderer/quadruped.js draws it there). */
export const SNOUT_TURN = 65;

/**
 * The mouth of a quadruped, where it holds things (a plan's `grip`: offset [along the snout, down], angle).
 * @returns {{ point:{x:number, y:number}, angle:number }} angle in radians (screen space, along the snout)
 */
export function mouthOf(joints, facing, scale, grip) {
  const nx = joints.head.x - joints.neckTop.x;
  const ny = joints.head.y - joints.neckTop.y;
  const a = Math.atan2(ny, nx) + facing * SNOUT_TURN * DEG;
  const f = { x: Math.cos(a), y: Math.sin(a) };
  const down = facing === 1 ? { x: -f.y, y: f.x } : { x: f.y, y: -f.x };
  const [along, below] = grip?.offset || [0, 0];
  return {
    point: { x: joints.head.x + (f.x * along + down.x * below) * scale, y: joints.head.y + (f.y * along + down.y * below) * scale },
    angle: a - facing * (grip?.angle || 0) * DEG,
  };
}

/**
 * Pose angles → joint positions for a quadruped.
 * Channels: lean = spine pitch (+ raises the front), head (+ lowers the head), lUA/rUA and lTH/rTH =
 * front and rear upper legs (+ forward), lFA/rFA and lSH/rSH = lower-leg bends (+ paw back).
 * The legs are fixed to the body, so they turn with the spine pitch.
 * @param {import("./types.js").Pose} pose  missing channels count as 0
 * @param {{x:number, y:number}} root  anchor (rear hip before dx/dy)
 * @param {1|-1} facing
 * @param {number} scale
 * @param {object} dims  the plan's dims (torso = spine length, upperArm/forearm = front leg, thigh/shin = rear leg)
 * @returns {import("./types.js").Joints}
 */
export function computeJointsQuad(pose, root, facing, scale, dims) {
  const p = (k) => pose[k] || 0;
  const lean = p("lean");
  const step = (from, angleDeg, length) => {
    const a = angleDeg * DEG;
    return { x: from.x + facing * Math.sin(a) * length * scale, y: from.y + Math.cos(a) * length * scale };
  };

  const hip = { x: root.x + facing * p("dx"), y: root.y + p("dy") };
  const spineAngle = 90 + lean;
  const shoulder = step(hip, spineAngle, dims.torso);
  const neckAngle = spineAngle + NECK_REST - p("head");
  const neckTop = step(shoulder, neckAngle, dims.neck);
  const head = step(neckTop, neckAngle, dims.headR * 0.8);

  const leg = (from, upper, lower, a, b) => {
    const knee = step(from, lean + a, upper);
    return [knee, step(knee, lean + a - b, lower)];
  };
  const [lElbow, lHand] = leg(shoulder, dims.upperArm, dims.forearm, p("lUA"), p("lFA"));
  const [rElbow, rHand] = leg(shoulder, dims.upperArm, dims.forearm, p("rUA"), p("rFA"));
  const [lKnee, lFoot] = leg(hip, dims.thigh, dims.shin, p("lTH"), p("lSH"));
  const [rKnee, rFoot] = leg(hip, dims.thigh, dims.shin, p("rTH"), p("rSH"));

  const center = step(hip, spineAngle, dims.torso / 2);
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
