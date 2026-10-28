// Easing curves u ∈ [0,1] → [0,1] (overshoot curves leave the range on purpose). Closed form only: a drop's
// bounce is bounceOut, not a physics step, so any frame can be drawn on its own (render chunks, scrubbing).

const c1 = 1.70158;
const c3 = c1 + 1;

function bounceOut(u) {
  const n = 7.5625;
  const d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
}

/** @type {Record<string, (u:number) => number>} */
export const EASES = {
  linear: (u) => u,
  step: (u) => (u < 1 ? 0 : 1),
  quadIn: (u) => u * u,
  quadOut: (u) => 1 - (1 - u) * (1 - u),
  quadInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  cubicIn: (u) => u * u * u,
  cubicOut: (u) => 1 - (1 - u) ** 3,
  cubicInOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  sineInOut: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  backOut: (u) => 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2,
  backIn: (u) => c3 * u * u * u - c1 * u * u,
  elasticOut: (u) => (u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  bounceOut,
  // A hop: 0 → 1 → 0 (for "up and back" moves such as a block's hop or a squash).
  hop: (u) => (u >= 1 ? 0 : Math.sin(Math.PI * u)),
};

export const EASE_NAMES = Object.keys(EASES);

export function ease(name, u) {
  const f = EASES[name ?? "linear"];
  if (!f) throw new Error(`unknown ease "${name}"`);
  return f(Math.max(0, Math.min(1, u)));
}
