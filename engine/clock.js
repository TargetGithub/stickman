// Story, fx and video clocks; slowmo, hitstop, freeze.
// Milestone: M3. Spec: section 6. Interfaces: docs/ARCHITECTURE.md section 4.

/** New clock at t = 0. */
export function createClock() {
  throw new Error("not implemented: createClock");
}

/** Start a slowmo with scale, duration, easeIn, easeOut. */
export function requestSlowmo(clock, opts) {
  throw new Error("not implemented: requestSlowmo");
}

/** Pause story time for a video-time duration. */
export function requestHitstop(clock, seconds) {
  throw new Error("not implemented: requestHitstop");
}

/** Like hitstop, for dramatic freezes. */
export function requestFreeze(clock, seconds) {
  throw new Error("not implemented: requestFreeze");
}

/** Advance one video frame; returns { storyDt, fxDt, videoDt }. */
export function tick(clock) {
  throw new Error("not implemented: tick");
}

/** Map a story time to video time using the recorded mapping. */
export function storyToVideo(clock, storyT) {
  throw new Error("not implemented: storyToVideo");
}
