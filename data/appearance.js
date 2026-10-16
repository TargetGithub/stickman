// Appearance options (STORY_SPEC 6.3). The schema takes strings; the validator checks them against
// these lists (E_APPEARANCE) so new options are data only. Drawn by engine/renderer/appearance.js.

export const appearance = {
  eyes: ["dot", "big", "oval", "sleepy", "visor", "glasses"],
  brows: ["none", "thin", "thick"],
  mouthStyle: ["line", "cartoon"],
  hair: ["none", "spiky", "bob", "ponytail", "cap"],
  outfit: ["none", "shirt", "coat", "armor", "robe"],
  accessories: ["headband", "scarf", "cape", "hat", "antenna", "bowtie", "mask", "crown", "backpack", "eyepatch"],
  // Things that sit in the same place and cannot be worn together.
  conflicts: [["hat", "crown"], ["hat", "hair:cap"], ["crown", "hair:cap"], ["mask", "eyes:visor"], ["eyepatch", "eyes:visor"]],
};
