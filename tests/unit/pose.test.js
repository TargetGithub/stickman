import { test } from "node:test";
import assert from "node:assert/strict";
import { fillPose, blendPose, samplePoseKeys, segmentAt } from "../../engine/pose.js";
import { POSE_CHANNELS } from "../../engine/types.js";

const zero = Object.fromEntries(POSE_CHANNELS.map((c) => [c, 0]));
const P = (o) => fillPose(o, zero);

test("fillPose overrides only present channels and fills the rest from base", () => {
  const base = P({ lean: 5, rUA: 10 });
  const out = fillPose({ rUA: 30 }, base);
  assert.equal(out.lean, 5);
  assert.equal(out.rUA, 30);
  assert.equal(out.rot, 0);
  assert.deepEqual(Object.keys(out), POSE_CHANNELS);
});

test("blendPose interpolates every channel", () => {
  const out = blendPose(P({ lean: 0, rot: 0 }), P({ lean: 20, rot: 360 }), 0.25);
  assert.equal(out.lean, 5);
  assert.equal(out.rot, 90, "angles are not wrapped");
});

const keys = [
  { t: 0, pose: P({ lean: 0 }), ease: "linear" },
  { t: 0.5, pose: P({ lean: 10 }), ease: "holdThenSnap" },
  { t: 1, pose: P({ lean: 30 }) },
];

test("segmentAt picks the containing segment", () => {
  for (const [t, want] of [[0, 0], [0.49, 0], [0.5, 1], [0.99, 1], [1, 1]]) assert.equal(segmentAt(keys, t), want, `t=${t}`);
});

test("samplePoseKeys: endpoints, linear segment, and ease applies to the leaving segment", () => {
  const cases = [
    [0, 0],
    [0.25, 5],
    [0.5, 10],
    [0.7, 10], // holdThenSnap on the t=0.5 key holds the 0.5 → 1 segment
    [0.95, 30], // ...then snaps after 85% of the segment
    [1, 30],
    [1.2, 30],
  ];
  for (const [t, want] of cases) assert.equal(samplePoseKeys(keys, t).lean, want, `t=${t}`);
});
