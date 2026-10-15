// Vectors, easing, seeded PRNG, hashing, noise.
// Milestone: M0. Spec: sections 7.3, 15.2. Interfaces: docs/ARCHITECTURE.md section 4.

export const DEG = Math.PI / 180;

/** Easing functions keyed by name (spec 7.3). Filled in M0.2. */
export const easings = {};

/** Linear interpolation. */
export function lerp(a, b, u) {
  throw new Error("not implemented: lerp");
}

/** Clamp v into [lo, hi]. */
export function clamp(v, lo, hi) {
  throw new Error("not implemented: clamp");
}

/** Seeded PRNG returning () => number in [0, 1). */
export function mulberry32(seed) {
  throw new Error("not implemented: mulberry32");
}

/** FNV-1a 32-bit hash of a string. */
export function hash32(str) {
  throw new Error("not implemented: hash32");
}

/** Independent stream: mulberry32(seed ^ hash32(name)). */
export function deriveRng(seed, name) {
  throw new Error("not implemented: deriveRng");
}

/** Smooth 1D value noise in [-1, 1] for camera shake. */
export function valueNoise1D(rng, t) {
  throw new Error("not implemented: valueNoise1D");
}
