// Extras (STORY_SPEC 14, S6.5): unnamed background characters from a location's or scene's `extras`
// entries ({ count, behavior, layer, from, to }). Milestone: S6.
// They are not simulated: each extra is a plan (seeded colour, body plan, place, pace), and the renderer works
// out its pose from the scene time, so extras cost nothing in the frame store and never touch the action.
//   walk_by    walks across the area and around again
//   idle_chat  stands in pairs, taking turns to talk
//   cheer      watches; cheers after hits, gasps after a defeat
//   flee       stands about until the first hit or defeat, then runs off the nearer edge
// A scene uses its own `extras`, else its location's; at most LIMITS_V2.extras per scene.

import { deriveRng } from "../math.js";
import { LIMITS_V2, STAGE } from "../config.js";

const PLANS = ["stickman", "stickman", "kid", "slim", "bulky", "elder", "buddy"];
// Soft, slightly grey colours: extras should never compete with the leads.
const COLORS = ["#8fa3b8", "#b89a8f", "#9fb89a", "#b5a1c4", "#c4bc95", "#94b5b3", "#c49aa8", "#a7a7a7"];

/** Moves the renderer needs to pose extras. */
export const EXTRA_MOVES = ["idle", "walk", "run", "talk", "cheer", "gasp"];

/**
 * @param {object} scene  the (compiled) scene; location: its location entry (or null)
 * @returns {object[]} [{ id, plan, color, scale, layer, behavior, x, dir, speed, phase, pair }]
 */
export function planExtras(scene, location, catalog, seed, stageWidth = STAGE.width) {
  const entries = scene.extras ?? location?.extras ?? [];
  if (!entries.length) return [];
  const rng = deriveRng(seed, `extras@${scene.id}`);
  const out = [];
  for (const e of entries) {
    const lo = e.from ?? STAGE.margin;
    const hi = e.to ?? stageWidth - STAGE.margin;
    for (let i = 0; i < e.count && out.length < LIMITS_V2.extras; i++) {
      const plan = PLANS[Math.floor(rng() * PLANS.length)];
      const x = lo + ((i + 0.2 + rng() * 0.6) / e.count) * (hi - lo);
      const pair = e.behavior === "idle_chat" ? i % 2 : 0;
      out.push({
        id: `extra${out.length + 1}`,
        plan: catalog.bodies?.[plan] ? plan : "stickman",
        color: COLORS[Math.floor(rng() * COLORS.length)],
        scale: 0.85 + rng() * 0.25,
        layer: e.layer ?? "back",
        behavior: e.behavior,
        // idle_chat partners stand 120 px apart, facing each other
        x: e.behavior === "idle_chat" && pair ? out[out.length - 1].x + 120 : x,
        dir: e.behavior === "idle_chat" ? (pair ? -1 : 1) : rng() < 0.5 ? -1 : 1,
        speed: 70 + rng() * 60, // px/s walking
        phase: rng(),
        pair,
        lo,
        hi,
      });
    }
  }
  return out;
}
