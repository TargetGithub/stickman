// Story builders for the compiler and macro tests (S6): one scene per macro, any body plans.

export const PLANS = ["stickman", "buddy", "kid", "bulky", "slim", "elder"];
const COLORS = ["#3fd8ff", "#ff5c8a", "#ffcc33", "#7cff6b", "#c58bff", "#ff9a3d", "#33e0c8", "#f0f0f0"];

/** A one-scene story with the given cast (ids a, b, c, ... with plans) and beats. */
export function story(plans, beats, opts = {}) {
  const ids = plans.map((_, i) => String.fromCharCode(97 + i));
  const width = opts.stageWidth ?? 3600;
  const xs = opts.xs ?? ids.map((_, i) => Math.round(width / 2 - 250 + i * (500 / Math.max(1, ids.length - 1))));
  return {
    version: 2,
    meta: { title: "Macro test", format: "landscape", seed: opts.seed ?? 7, kind: "clip", audience: opts.audience ?? "kids" },
    cast: ids.map((id, i) => ({ id, color: COLORS[i % COLORS.length], body: plans[i], ...(opts.props?.[i] ? { prop: opts.props[i] } : {}) })),
    locations: [{ id: "arena1", theme: "dojo_dusk", stageWidth: width, ...(opts.set ? { set: opts.set } : {}) }],
    scenes: [{ id: "s", location: "arena1", cast: ids.map((id, i) => ({ id, x: xs[i], facing: i % 2 ? -1 : 1, ...(opts.hidden?.includes(id) ? { hidden: true } : {}) })), beats }],
  };
}

/** One fight between plans p and q. */
export const fightStory = (p, q, params = {}, opts = {}) =>
  story([p, q], [{ id: "f", at: 0.3, macro: "fight", params: { sides: ["a", "b"], winner: "a", ...(params.phases ? {} : { exchanges: 6 }), ...params } }], opts);

/** A gauntlet of n opponents spread down a long street. */
export function gauntletStory(n, params = {}, plans = null) {
  const cast = plans ?? ["stickman", ...Array.from({ length: n }, (_, i) => PLANS[(i + 3) % PLANS.length])];
  const xs = cast.map((_, i) => (i === 0 ? 300 : 900 + i * 700));
  return story(cast, [{ id: "g", at: 0.3, macro: "gauntlet", params: { hero: "a", opponents: cast.slice(1).map((_, i) => String.fromCharCode(98 + i)), per: 2, ...params } }], { xs, stageWidth: Math.max(3600, xs[xs.length - 1] + 600) });
}
