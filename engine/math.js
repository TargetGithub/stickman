// Vectors, easing, seeded PRNG, hashing, noise.
// Milestone: M0. Spec: sections 7.3, 15.2. Interfaces: docs/ARCHITECTURE.md section 4.

export const DEG = Math.PI / 180;

/** Linear interpolation. */
export function lerp(a, b, u) {
  return a + (b - a) * u;
}

/** Clamp v into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------- vectors (plain {x, y} objects, never mutated) ----------

export const vec = (x, y) => ({ x, y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s });
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function norm(a) {
  const l = Math.hypot(a.x, a.y);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

/** Rotate by rad. Positive is clockwise on a y-down screen. */
export function rotate(a, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

// ---------- easing (spec 7.3) ----------

const outBounce = (u) => {
  const n = 7.5625;
  const d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
};

/** Easing functions keyed by name. Each maps [0,1] → value with f(0)=0, f(1)=1. */
export const easings = {
  linear: (u) => u,
  inQuad: (u) => u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  inCubic: (u) => u * u * u,
  outCubic: (u) => 1 - (1 - u) ** 3,
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  outBack: (u) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
  },
  outElastic: (u) => {
    if (u === 0 || u === 1) return u;
    return 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce,
  snap: (u) => (u < 0.5 ? 0 : 1),
  holdThenSnap: (u) => (u < 0.85 ? 0 : 1),
};

// ---------- randomness (spec 15.2) ----------

/** Seeded PRNG returning () => number in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of a string. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Independent stream: mulberry32(seed ^ hash32(name)). */
export function deriveRng(seed, name) {
  return mulberry32((seed ^ hash32(name)) >>> 0);
}

/**
 * Smooth 1D value noise in [-1, 1] for camera shake.
 * Lattice values are drawn once from rng (64 entries, wrapped), so noise is a pure function of t afterwards.
 * Returns a function of t.
 */
export function valueNoise1D(rng) {
  const table = new Float32Array(64);
  for (let i = 0; i < 64; i++) table[i] = rng() * 2 - 1;
  return (t) => {
    const i = Math.floor(t);
    const f = t - i;
    const a = table[((i % 64) + 64) % 64];
    const b = table[(((i + 1) % 64) + 64) % 64];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}
