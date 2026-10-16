// Story, fx and video clocks; slowmo, hitstop, freeze (spec 6).
// Milestone: M3. One tick() per video frame. Only this module decides how far each clock advances.

import { FPS } from "./config.js";

const VIDEO_DT = 1 / FPS;

export function createClock() {
  return {
    frame: 0,
    videoT: 0,
    storyT: 0,
    fxT: 0,
    slowmo: null, // { scale, storyEnd, easeIn, easeOut, startVideo, endVideo }
    hitstopLeft: 0,
    freezeLeft: 0,
    storyAt: [0], // story time at each frame (frame n shows the world at storyAt[n])
    fxAt: [0],
  };
}

/**
 * Slow motion: story time runs at `scale` for `duration` story seconds, ramping in over easeIn and
 * out over easeOut video seconds. A newer request replaces the current one.
 */
export function requestSlowmo(clock, { scale, duration, easeIn = 0.05, easeOut = 0.2 }) {
  clock.slowmo = { scale, storyEnd: clock.storyT + duration, easeIn, easeOut, startVideo: clock.videoT, endVideo: null };
}

/** Pause story time for `seconds` of video (FX and camera keep moving). Overlapping requests take the longer. */
export function requestHitstop(clock, seconds) {
  clock.hitstopLeft = Math.max(clock.hitstopLeft, seconds);
}

export function requestFreeze(clock, seconds) {
  clock.freezeLeft = Math.max(clock.freezeLeft, seconds);
}

/** Current slowmo factor in (0, 1]; 1 when inactive. */
export function slowmoFactor(clock) {
  const s = clock.slowmo;
  if (!s) return 1;
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  if (s.endVideo === null) {
    const u = s.easeIn > 0 ? (clock.videoT - s.startVideo) / s.easeIn : 1;
    return 1 + (s.scale - 1) * smooth(u);
  }
  const u = s.easeOut > 0 ? (clock.videoT - s.endVideo) / s.easeOut : 1;
  return s.scale + (1 - s.scale) * smooth(u);
}

/** True while any of slowmo, hitstop or freeze is still running. */
export function timeEffectsActive(clock) {
  return !!clock.slowmo || clock.hitstopLeft > 1e-9 || clock.freezeLeft > 1e-9;
}

/** Advance one video frame. Returns the deltas the simulation should use for this frame. */
export function tick(clock) {
  const factor = slowmoFactor(clock);
  const paused = clock.hitstopLeft > 1e-9 || clock.freezeLeft > 1e-9;
  const storyDt = paused ? 0 : factor * VIDEO_DT;
  const fxDt = paused ? VIDEO_DT : factor * VIDEO_DT;
  if (paused) {
    // Snap tiny remainders to zero so float residue never keeps time paused.
    const left = (v) => (v - VIDEO_DT > 1e-9 ? v - VIDEO_DT : 0);
    clock.hitstopLeft = left(clock.hitstopLeft);
    clock.freezeLeft = left(clock.freezeLeft);
  }
  clock.frame++;
  clock.videoT = clock.frame * VIDEO_DT;
  clock.storyT += storyDt;
  clock.fxT += fxDt;
  const s = clock.slowmo;
  if (s) {
    if (s.endVideo === null && clock.storyT >= s.storyEnd - 1e-9) s.endVideo = clock.videoT;
    if (s.endVideo !== null && clock.videoT - s.endVideo >= s.easeOut - 1e-9) clock.slowmo = null;
  }
  clock.storyAt.push(clock.storyT);
  clock.fxAt.push(clock.fxT);
  return { storyDt, fxDt, videoDt: VIDEO_DT };
}

/** Video time of the first frame whose story time reaches storyT (spec 15.4 audio conversion). */
export function storyToVideo(clock, storyT) {
  const a = clock.storyAt;
  let lo = 0;
  let hi = a.length - 1;
  if (storyT > a[hi]) return hi * VIDEO_DT + (storyT - a[hi]);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < storyT - 1e-9) lo = mid + 1;
    else hi = mid;
  }
  return lo * VIDEO_DT;
}
