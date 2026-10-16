// Text blocklist for say / text_pop / caption (spec 21). Lowercase whole words.
// Starter list; extend as needed. Matching is case-insensitive on whole words/phrases.
export const blocklist = ["blood", "bloody", "gore", "gory", "suicide", "kill yourself", "kys"];

// Soft list (STORY_SPEC 13, ADR-018): words that give a W_TEXT_SOFT warning with a kinder alternative,
// for v2 scripts. `general` audiences only get the strongest ones.
export const softWords = [
  { word: "kill", alt: "defeat", audiences: ["kids", "general"] },
  { word: "killed", alt: "defeated", audiences: ["kids", "general"] },
  { word: "murder", alt: "defeat", audiences: ["kids", "general"] },
  { word: "die", alt: "be gone", audiences: ["kids"] },
  { word: "died", alt: "was lost", audiences: ["kids"] },
  { word: "dead", alt: "gone", audiences: ["kids"] },
  { word: "death", alt: "loss", audiences: ["kids"] },
  { word: "hate", alt: "really don't like", audiences: ["kids"] },
  { word: "stupid", alt: "silly", audiences: ["kids"] },
  { word: "idiot", alt: "silly goose", audiences: ["kids"] },
  { word: "shut up", alt: "be quiet", audiences: ["kids"] },
  { word: "gun", alt: "blaster", audiences: ["kids"] },
  { word: "knife", alt: "a toy", audiences: ["kids"] },
];
