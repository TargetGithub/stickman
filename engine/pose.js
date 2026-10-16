// Pose filling, blending and keyframe sampling.
// Milestone: M1. Spec: section 7. Interfaces: docs/ARCHITECTURE.md section 4.

import { POSE_CHANNELS } from "./types.js";
import { easings } from "./math.js";

/** Full pose: base channels overwritten by the channels present in partial. */
export function fillPose(partial, base) {
  const out = {};
  for (const ch of POSE_CHANNELS) {
    const v = partial[ch];
    out[ch] = v === undefined ? base[ch] ?? 0 : v;
  }
  return out;
}

/** Channel-wise lerp between two full poses. */
export function blendPose(a, b, u) {
  const out = {};
  for (const ch of POSE_CHANNELS) out[ch] = a[ch] + (b[ch] - a[ch]) * u;
  return out;
}

/**
 * Index i of the key segment containing t: keys[i].t <= t < keys[i+1].t (clamped to the last segment).
 * Keys are sorted by t, first t = 0, last t = 1.
 */
export function segmentAt(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  return i;
}

/**
 * Pose at normalized move time t from prepared keys (each key has a full `pose`).
 * A key's `ease` shapes the segment that LEAVES it (spec 7.2); default linear.
 */
export function samplePoseKeys(keys, t) {
  if (keys.length === 1 || t <= keys[0].t) return keys[0].pose;
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].pose;
  const i = segmentAt(keys, t);
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.t - a.t;
  const u = span > 0 ? (t - a.t) / span : 1;
  const ease = easings[a.ease || "linear"];
  return blendPose(a.pose, b.pose, ease(u));
}
