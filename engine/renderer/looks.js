// A story character's look (STORY_SPEC 6.3). Milestone: S3.
// Merges the body plan's default appearance with the cast entry's, and folds the v1 accessories
// (headband, scarf, cape, hat) from either place into the style the accessory renderer uses.

const V1_ACCESSORIES = ["headband", "scarf", "cape", "hat"];

/** @returns {{ eyes, brows, mouthStyle, cheeks, hair, hairColor, outfit, outfitColor, accessories, style }} */
export function lookFor(catalog, cast) {
  const plan = catalog.bodies?.[cast.body || "stickman"];
  const look = { ...(plan?.appearance || {}), ...(cast.appearance || {}) };
  look.accessories = { ...(plan?.appearance?.accessories || {}), ...(cast.appearance?.accessories || {}) };
  const style = { ...(cast.style || {}) };
  for (const k of V1_ACCESSORIES) if (look.accessories[k] && !style[k]) style[k] = look.accessories[k];
  look.style = style;
  return look;
}

/**
 * The look at video time t: the base look with every earlier set_appearance change applied (changes
 * carry across scenes). params: { who, accessory, color, remove, eyes, brows, mouthStyle, hair,
 * hairColor, outfit, outfitColor, cheeks }.
 */
export function lookAt(base, changes, t) {
  if (!base || !changes.length || changes[0].videoT > t) return base;
  const look = { ...base, accessories: { ...base.accessories }, style: { ...base.style } };
  for (const e of changes) {
    if (e.videoT > t) break;
    const p = e.params;
    for (const k of ["eyes", "brows", "mouthStyle", "hair", "hairColor", "outfit", "outfitColor", "cheeks"]) if (p[k] !== undefined) look[k] = p[k];
    if (p.accessory) {
      if (p.remove) {
        delete look.accessories[p.accessory];
        delete look.style[p.accessory];
      } else {
        look.accessories[p.accessory] = p.color || look.accessories[p.accessory] || "#ff3b5c";
        if (V1_ACCESSORIES.includes(p.accessory)) look.style[p.accessory] = look.accessories[p.accessory];
      }
    }
  }
  return look;
}

