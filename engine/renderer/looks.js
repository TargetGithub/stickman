// A story character's look (STORY_SPEC 6.3). Milestone: S3.
// Merges the body plan's default appearance with the cast entry's, and folds the v1 accessories
// (headband, scarf, cape, hat) from either place into the style the accessory renderer uses.

const V1_ACCESSORIES = ["headband", "scarf", "cape", "hat"];

/**
 * A belly patch (capsule bodies) is drawn by bodies.js as the "belly" outfit, so it only shows when
 * no real outfit covers the torso.
 */
function withBelly(look) {
  if (look.belly && (!look.outfit || look.outfit === "none")) {
    look.ownOutfitColor = look.outfitColor;
    look.outfit = "belly";
    look.outfitColor = look.belly;
  }
  return look;
}

/** Undo withBelly before applying changes (so a later outfit change replaces the patch). */
function withoutBelly(look) {
  if (look.outfit === "belly") {
    look.outfit = undefined;
    look.outfitColor = look.ownOutfitColor;
  }
  return look;
}

/** @returns {{ eyes, brows, mouthStyle, cheeks, hair, hairColor, outfit, outfitColor, accessories, style }} */
export function lookFor(catalog, cast) {
  const plan = catalog.bodies?.[cast.body || "stickman"];
  const look = { ...(plan?.appearance || {}), ...(cast.appearance || {}) };
  look.accessories = { ...(plan?.appearance?.accessories || {}), ...(cast.appearance?.accessories || {}) };
  const style = { ...(cast.style || {}) };
  for (const k of V1_ACCESSORIES) if (look.accessories[k] && !style[k]) style[k] = look.accessories[k];
  look.style = style;
  return withBelly(look);
}

/**
 * The look at video time t: the base look with every earlier set_appearance change applied (changes
 * carry across scenes). params: { who, accessory, color, remove, eyes, brows, mouthStyle, hair,
 * hairColor, outfit, outfitColor, cheeks, belly, slots } (slots: lit bracelet gems, 0-7).
 */
export function lookAt(base, changes, t) {
  if (!base || !changes.length || changes[0].videoT > t) return base;
  const look = withoutBelly({ ...base, accessories: { ...base.accessories }, style: { ...base.style } });
  for (const e of changes) {
    if (e.videoT > t) break;
    const p = e.params;
    for (const k of ["eyes", "brows", "mouthStyle", "hair", "hairColor", "outfit", "outfitColor", "cheeks", "belly", "slots"]) if (p[k] !== undefined) look[k] = p[k];
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
  return withBelly(look);
}

