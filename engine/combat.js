// Hurtboxes, aiming, reach, positioning, hit resolution.
// Milestone: M2. Spec: sections 8.3, 10, 11.4. Interfaces: docs/ARCHITECTURE.md section 4.

/** Head circle plus torso and limb capsules. */
export function buildHurtboxes(joints, scale) {
  throw new Error("not implemented: buildHurtboxes");
}

/** Aim point on the target for a hit (spec 8.3). */
export function resolveAimPoint(attacker, target, hit, catalog) {
  throw new Error("not implemented: resolveAimPoint");
}

/** Blend the hitting limb toward its IK solution. */
export function applyAimIK(joints, chain, aimPoint, weight) {
  throw new Error("not implemented: applyAimIK");
}

/** Start x that makes the outcome read clearly (spec 11.4). */
export function requiredStartX(attacker, target, def, params, outcome) {
  throw new Error("not implemented: requiredStartX");
}

/** Resolve open hit windows in spec 10.3 order. */
export function resolveHits(world, dt) {
  throw new Error("not implemented: resolveHits");
}

/** Per-hit reach, contact height and window middle from FK. */
export function deriveReach(def, poses) {
  throw new Error("not implemented: deriveReach");
}
