// Pose blending used by tools before engine/pose.js lands in M1. Replace with blendPose then.
import { poses } from "../../data/poses.js";
import { POSE_CHANNELS } from "../../engine/types.js";

export function blendForBench(a, b, u) {
  const out = {};
  for (const k of POSE_CHANNELS) {
    const va = poses[a][k] ?? poses.stand[k] ?? 0;
    const vb = poses[b][k] ?? poses.stand[k] ?? 0;
    out[k] = va + (vb - va) * u;
  }
  return out;
}
