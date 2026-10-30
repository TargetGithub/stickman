import { test } from "node:test";
import assert from "node:assert/strict";
import { createTimeline } from "../../runtime/timeline.js";
import { ease, EASE_NAMES } from "../../runtime/ease.js";
import { deriveRng } from "../../runtime/rng.js";

test("eases start at 0 and end at their end value", () => {
  for (const n of EASE_NAMES) {
    assert.ok(Math.abs(ease(n, 0)) < 1e-9, n);
    assert.ok(Math.abs(ease(n, 1) - (n === "hop" || n === "wiggle" ? 0 : 1)) < 1e-9, n);
  }
});

const cases = [
  { name: "before any segment: base", t: 0.5, want: 0 },
  { name: "mid tween, linear", t: 1.5, want: 5 },
  { name: "after tween: to", t: 3, want: 10 },
  { name: "second tween starts from running value", t: 4.5, want: 15 },
  { name: "set is a step", t: 7, want: 99 },
];
test("valueAt folds segments in start order", () => {
  const tl = createTimeline();
  tl.base("a", "x", 0);
  tl.set("a", "x", 99, 6); // added out of order on purpose
  tl.tween("a", "x", { start: 1, dur: 1, to: 10, ease: "linear" });
  tl.tween("a", "x", { start: 4, dur: 1, to: 20, ease: "linear" });
  for (const c of cases) assert.equal(tl.valueAt("a", "x", c.t), c.want, c.name);
});

test("hop returns to its start; vectors interpolate per axis", () => {
  const tl = createTimeline();
  tl.base("b", "p", [0, 0, 0]);
  tl.tween("b", "p", { start: 0, dur: 1, to: [0, 2, 0], ease: "hop" });
  assert.deepEqual(tl.valueAt("b", "p", 0.5), [0, 2, 0]);
  assert.deepEqual(tl.valueAt("b", "p", 2), [0, 0, 0]);
});

test("clipsAt cross-fades and loops", () => {
  const tl = createTimeline();
  tl.clip("r", "Idle", { start: 0, loop: true, fade: 0 });
  tl.clip("r", "Wave", { start: 2, loop: false, fade: 0.5 });
  const len = () => 1.5;
  assert.deepEqual(tl.clipsAt("r", 1.6, len), [{ name: "Idle", time: 1.6 % 1.5, weight: 1 }]);
  const mid = tl.clipsAt("r", 2.25, len);
  assert.equal(mid[0].name, "Wave");
  assert.ok(Math.abs(mid[0].weight - 0.5) < 1e-9 && Math.abs(mid[1].weight - 0.5) < 1e-9);
  assert.equal(tl.clipsAt("r", 9, len)[0].time, 1.5); // a one-shot holds its last pose
});

test("named rng streams are repeatable and independent", () => {
  const a = deriveRng(7, "confetti"), b = deriveRng(7, "confetti"), c = deriveRng(7, "other");
  const xs = Array.from({ length: 5 }, () => a.next());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b.next()));
  assert.notDeepEqual(xs, Array.from({ length: 5 }, () => c.next()));
});
