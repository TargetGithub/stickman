// Extras (STORY_SPEC 14, S6.5): unnamed background characters from a location's or scene's `extras`
// entries ({ count, behavior, layer, from, to, crowd }). Milestone: S6.
// `crowd` names a crowd kind (characters/crowds.json): its members get a seeded look (crowd.js) and are drawn
// with faces, instead of the soft grey faceless extras.
// They are not simulated: each extra is a plan (seeded colour, body plan, place, pace), and the renderer works
// out its pose from the scene time, so extras cost nothing in the frame store and never touch the action.
//   walk_by    walks across the area and around again
//   idle_chat  stands in pairs, taking turns to talk
//   cheer      watches; cheers after hits, gasps after a defeat
//   flee       stands about until the first hit or defeat, then runs off the nearer edge
//   copy_leader, conga, sync_dance, wave, pile_on, scatter_giggle: crowd behaviours (renderer/crowd_moves.js),
//              with `leader` (a cast id), `at` (scene seconds) and `bpm` on the entry
// A scene uses its own `extras`, else its location's; at most LIMITS_V2.extras per scene.

import { deriveRng } from "../math.js";
import { LIMITS_V2, STAGE } from "../config.js";
import { crowdMember } from "./crowd.js";

const PLANS = ["stickman", "stickman", "kid", "slim", "bulky", "elder", "buddy"];
// Soft, slightly grey colours: extras should never compete with the leads.
const COLORS = ["#8fa3b8", "#b89a8f", "#9fb89a", "#b5a1c4", "#c4bc95", "#94b5b3", "#c49aa8", "#a7a7a7"];

/** Moves the renderer needs to pose extras. */
export const EXTRA_MOVES = ["idle", "walk", "run", "talk", "cheer", "gasp", "dance_a", "dance_b", "jump_joy", "laugh", "lie_down"];

/**
 * @param {object} scene  the (compiled) scene; location: its location entry (or null)
 * @returns {object[]} [{ id, plan, color, scale, layer, behavior, x, dir, speed, phase, pair, look? }]
 */
export function planExtras(scene, location, catalog, seed, stageWidth = STAGE.width) {
  const entries = scene.extras ?? location?.extras ?? [];
  if (!entries.length) return [];
  const rng = deriveRng(seed, `extras@${scene.id}`);
  const out = [];
  for (const [k, e] of entries.entries()) {
    const kind = e.crowd ? catalog.crowds?.[e.crowd] : null;
    const lo = e.from ?? STAGE.margin;
    const hi = e.to ?? stageWidth - STAGE.margin;
    for (let i = 0; i < e.count && out.length < LIMITS_V2.extras; i++) {
      const plan = PLANS[Math.floor(rng() * PLANS.length)];
      const x = lo + ((i + 0.2 + rng() * 0.6) / e.count) * (hi - lo);
      const pair = e.behavior === "idle_chat" ? i % 2 : 0;
      const member = kind ? crowdMember(kind, seed, `${scene.id}:${k}`, i) : null;
      out.push({
        id: `extra${out.length + 1}`,
        plan: catalog.bodies?.[plan] ? plan : "stickman",
        color: COLORS[Math.floor(rng() * COLORS.length)],
        scale: 0.85 + rng() * 0.25,
        ...(member ? { plan: catalog.bodies?.[member.body] ? member.body : "stickman", color: member.color, scale: member.scale, look: member.appearance } : {}),
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
        rank: i, // place in its entry (conga line, heap slot)
        ...(e.leader ? { leader: e.leader } : {}),
        ...(e.at !== undefined ? { at: e.at } : {}),
        ...(e.bpm ? { bpm: e.bpm } : {}),
      });
    }
  }
  return out;
}
