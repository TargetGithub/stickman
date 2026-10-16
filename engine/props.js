// Prop transforms (spec 12): where a held prop's grip, butt and tip are for a pose.
// Milestone: M7. Pure geometry; prop state lives on the actor ({ kind, name, data }).

import { DEG } from "./math.js";

const ELBOW = { rHand: "rElbow", lHand: "lElbow" };

/**
 * Grip, butt and tip of a held prop.
 * @param {object} joints  character joints
 * @param {object} prop  data/props.js entry
 * @param {number} propAngle  degrees from the forearm line; positive raises the tip
 * @returns {{ grip, butt, tip, angle }} angle in radians (screen space)
 */
export function propTransform(joints, prop, propAngle, facing, scale) {
  const grip = joints[prop.grip];
  const elbow = joints[ELBOW[prop.grip]];
  const angle = Math.atan2(grip.y - elbow.y, grip.x - elbow.x) - facing * propAngle * DEG;
  const len = prop.len * scale;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  return {
    grip,
    angle,
    tip: { x: grip.x + dir.x * len * (1 - prop.gripAt), y: grip.y + dir.y * len * (1 - prop.gripAt) },
    butt: { x: grip.x - dir.x * len * prop.gripAt, y: grip.y - dir.y * len * prop.gripAt },
  };
}

/** Find a prop definition by kind (moves name kinds in needsProp; scripts name props by key). */
export function propByKind(props, kind) {
  return Object.values(props).find((p) => p.kind === kind) || null;
}
