import { test } from "node:test";
import assert from "node:assert/strict";
import { createClock, tick, requestSlowmo, requestHitstop, requestFreeze, storyToVideo, slowmoFactor, timeEffectsActive } from "../../engine/clock.js";

const close = (a, b, eps = 1e-9, msg = "") => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b}`);
const run = (clock, frames) => {
  for (let i = 0; i < frames; i++) tick(clock);
};

test("normal time: all clocks advance 1/60 per frame", () => {
  const c = createClock();
  run(c, 60);
  close(c.videoT, 1);
  close(c.storyT, 1, 1e-9);
  close(c.fxT, 1, 1e-9);
  assert.equal(c.storyAt.length, 61);
});

test("hitstop pauses story time for exactly N frames; fx keeps running", () => {
  const c = createClock();
  requestHitstop(c, 0.1); // 6 frames
  const story = [];
  for (let i = 0; i < 8; i++) story.push(tick(c).storyDt);
  assert.deepEqual(story.map((d) => d === 0), [true, true, true, true, true, true, false, false]);
  close(c.fxT, 8 / 60, 1e-9);
  requestHitstop(c, 0.05);
  requestHitstop(c, 0.02);
  assert.equal(c.hitstopLeft, 0.05, "overlapping hitstops take the longer");
});

test("freeze behaves like a long hitstop", () => {
  const c = createClock();
  requestFreeze(c, 0.5);
  run(c, 30);
  assert.equal(c.storyT, 0);
  run(c, 1);
  assert.ok(c.storyT > 0);
});

test("slowmo: ramps in, holds, lasts its story duration, ramps out, then clears", () => {
  const c = createClock();
  requestSlowmo(c, { scale: 0.25, duration: 0.5, easeIn: 0.05, easeOut: 0.2 });
  const factors = [];
  while (timeEffectsActive(c) && c.frame < 600) {
    factors.push(slowmoFactor(c));
    tick(c);
  }
  assert.equal(factors[0], 1, "starts at full speed");
  assert.ok(factors.some((f) => Math.abs(f - 0.25) < 1e-9), "reaches the target scale");
  assert.ok(factors[factors.length - 1] > 0.25, "ramps out");
  const videoSeconds = c.videoT;
  assert.ok(videoSeconds > 1.8 && videoSeconds < 2.4, `0.5 story s at 0.25x ≈ 2 video s (got ${videoSeconds})`);
  assert.equal(slowmoFactor(c), 1);
});

test("storyToVideo maps through slowmo and hitstop", () => {
  const c = createClock();
  run(c, 60); // story 1.0 at video 1.0
  requestHitstop(c, 0.5); // story paused 0.5 s
  run(c, 60);
  close(storyToVideo(c, 0.5), 0.5, 1e-9, "before the pause");
  close(storyToVideo(c, 1.2), 1.5 + 0.2, 1 / 60 + 1e-9, "after the pause");
});
