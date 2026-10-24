// Crowd kinds (characters/crowds.json, series/baaaana/PLAN.md task 6): a seeded member of a crowd, so 30 Baaaanas
// never look copy-pasted and look the same in every render. Each member draws its body plan, shade, height,
// mouth, cheeks, belly, sprout (kind and colour) and maybe one accent from its own stream.

import { deriveRng } from "../math.js";

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * @param {object} kind  a crowds.json entry
 * @param {number} seed  the script seed
 * @param {string} key  what this member belongs to (a scene and entry), so crowds in two scenes differ
 * @param {number} i  the member's index
 * @returns {{ body:string, color:string, scale:number, appearance:object }}  a cast-like look
 */
export function crowdMember(kind, seed, key, i) {
  const rng = deriveRng(seed, `crowd:${key}:${i}`);
  const [lo, hi] = kind.scale ?? [1, 1];
  const body = pick(rng, kind.bodies);
  const color = pick(rng, kind.colors);
  const scale = Math.round((lo + rng() * (hi - lo)) * 100) / 100;
  const sprout = kind.sprouts?.length ? pick(rng, kind.sprouts) : null;
  const accessories = { ...(kind.always || {}) };
  if (sprout) accessories[sprout.name] = pick(rng, sprout.colors);
  // At most one accent; every accent draws its roll and colour in order, so the stream stays aligned.
  let accent = null;
  for (const a of kind.accents || []) {
    const roll = rng();
    const c = pick(rng, a.colors);
    if (!accent && roll < a.chance) accessories[(accent = a.name)] = c;
  }
  const appearance = {
    ...(kind.eyes ? { eyes: pick(rng, kind.eyes) } : {}),
    ...(kind.mouthStyles ? { mouthStyle: pick(rng, kind.mouthStyles) } : {}),
    ...(kind.cheeks ? { cheeks: pick(rng, kind.cheeks) } : {}),
    ...(kind.bellies ? { belly: pick(rng, kind.bellies) } : {}),
    accessories,
  };
  return { body, color, scale, appearance };
}
