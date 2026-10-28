// Seeded random streams (the 3D twin of engine/core deriveRng). Never Math.random: every stream comes from the
// script's seed and a name, so the same script gives the same confetti on every run and in every render chunk.

/** FNV-1a 32-bit hash of a string. */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: a small, fast 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A named stream: deriveRng(7, "confetti") is independent of deriveRng(7, "sparkles").
 * @returns {{ next: () => number, range: (a:number, b:number) => number, int: (a:number, b:number) => number, pick: <T>(list:T[]) => T }}
 */
export function deriveRng(seed, name) {
  const next = mulberry32(hash32(`${seed >>> 0}:${name}`));
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor((b - a + 1) * next()),
    pick: (list) => list[Math.floor(list.length * next())],
  };
}
