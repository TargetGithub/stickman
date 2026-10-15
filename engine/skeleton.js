// Forward kinematics, 2-bone IK, ground contact helpers.
// Milestone: M0. Spec: section 5. Interfaces: docs/ARCHITECTURE.md section 4.

/** Body dimensions at scale 1.0 (spec 5.1). */
export const BODY = { headR: 22, neck: 8, torso: 78, upperArm: 38, forearm: 36, thigh: 48, shin: 46, lineWidth: 9 };

/** Pose angles → joint positions (spec 5.3, incl. rot). */
export function computeJoints(pose, root, facing, scale) {
  throw new Error("not implemented: computeJoints");
}

/** Analytic two-bone IK; clamps to 0.98 of full reach. */
export function solveIK2(a, len1, len2, target, bendSign) {
  throw new Error("not implemented: solveIK2");
}

/** Which side the middle joint bends to (+1 / -1). */
export function bendSignOf(a, mid, end) {
  throw new Error("not implemented: bendSignOf");
}

/** Max y over all joints, head counted at head.y + headRadius. */
export function lowestPoint(joints, scale) {
  throw new Error("not implemented: lowestPoint");
}

/** Write joints into a Float32Array(26) in JOINT_ORDER. */
export function packJoints(joints, out) {
  throw new Error("not implemented: packJoints");
}

/** Read joints back from a packed buffer. */
export function unpackJoints(buf, offset = 0) {
  throw new Error("not implemented: unpackJoints");
}
