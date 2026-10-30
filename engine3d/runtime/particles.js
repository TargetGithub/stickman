// Seeded particle paths as pure data (Node + page): the page draws them, the director reads bubble pop
// times to cue pop sounds. Every path is a closed-form function of the time since its burst.

import { deriveRng } from "./rng.js";

/**
 * Bubbles released over `dur` seconds from a floor area, rising with a wobble, each popping at its own height.
 * @returns {Array<{ x:number, z:number, y0:number, start:number, speed:number, size:number, popAt:number, wob:number, phase:number }>}
 *   start and popAt in seconds after the burst
 */
export function bubblePaths(seed, id, { count = 40, area = [8, 3], height = 4.5, size = 0.35, dur = 8 } = {}) {
  const rng = deriveRng(seed, `bubbles:${id}`);
  const out = [];
  for (let i = 0; i < count; i++) {
    const start = rng.range(0, Math.max(0.1, dur - 2));
    const speed = rng.range(0.45, 0.9); // m/s: slow, calm
    const y0 = rng.range(0.3, 0.9);
    const top = rng.range(height * 0.55, height);
    out.push({ x: rng.range(-area[0] / 2, area[0] / 2), z: rng.range(-area[1] / 2, area[1] / 2), y0, start, speed, size: size * rng.range(0.6, 1.3),
      popAt: start + (top - y0) / speed, wob: rng.range(0.08, 0.25), phase: rng.range(0, 6.283) });
  }
  return out;
}

/** Where a bubble is u seconds after its burst, or null when it has not started or has popped. */
export function bubbleAt(b, u) {
  if (u < b.start || u >= b.popAt + 0.12) return null;
  const k = u - b.start;
  // The last 0.12 s after popAt: a quick swell and vanish (the "pop").
  const pop = u > b.popAt ? 1 + 2.5 * ((u - b.popAt) / 0.12) : 1;
  const grow = Math.min(1, k / 0.4);
  return { x: b.x + Math.sin(k * 1.7 + b.phase) * b.wob, y: b.y0 + b.speed * Math.min(k, b.popAt - b.start), z: b.z, scale: b.size * grow * pop, fade: u > b.popAt ? 1 - (u - b.popAt) / 0.12 : 1 };
}

/** Star positions on a backdrop behind the stage, with gentle twinkle rates (well under 1 Hz: no flashing). */
export function starField(seed, id, { count = 120, width = 70, low = 3, high = 22, depth = -30 } = {}) {
  const rng = deriveRng(seed, `stars:${id}`);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: rng.range(-width / 2, width / 2), y: rng.range(low, high), z: depth + rng.range(-4, 4), size: rng.range(0.25, 0.75), hz: rng.range(0.15, 0.45), phase: rng.range(0, 6.283) });
  }
  return out;
}
