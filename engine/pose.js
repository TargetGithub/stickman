// Pose filling, blending and keyframe sampling.
// Milestone: M1. Spec: section 7. Interfaces: docs/ARCHITECTURE.md section 4.

/** Copy base and overwrite with the channels present in partial. */
export function fillPose(partial, base) {
  throw new Error("not implemented: fillPose");
}

/** Channel-wise lerp. */
export function blendPose(a, b, u) {
  throw new Error("not implemented: blendPose");
}

/** Pose at normalized move time t. */
export function samplePoseKeys(keys, t, poses, easings) {
  throw new Error("not implemented: samplePoseKeys");
}
