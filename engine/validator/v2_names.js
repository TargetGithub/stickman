// Frozen names for script v2 (STORY_SPEC, S0 freeze). Lists marked "catalog" are replaced by
// catalog names on export once that data exists (bodies S3, faces S2, objects S4, activities S5,
// moods S7); the names here are the required minimum set.

export const ID = "^[a-z][a-z0-9_]{0,31}$";
export const COLOR = "^#[0-9a-fA-F]{6}$";

export const V2_ENUMS = {
  kind: ["story", "fight", "clip"],
  audience: ["kids", "general"],
  style: ["default", "soft", "ink"],
  body: ["stickman", "buddy", "kid", "bulky", "slim", "elder"], // catalog
  face: ["neutral", "happy", "laugh", "sad", "cry", "angry", "furious", "scared", "surprised", "determined", "smug", "tired", "love", "dizzy", "hurt", "asleep"], // catalog (asleep: S5)
  eyes: ["dot", "big", "oval", "sleepy", "visor", "glasses"],
  brows: ["none", "thin", "thick"],
  mouthStyle: ["line", "cartoon"],
  hair: ["none", "spiky", "bob", "ponytail", "cap"],
  outfit: ["none", "shirt", "coat", "armor", "robe"],
  accessory: ["headband", "scarf", "cape", "hat", "antenna", "bowtie", "mask", "crown", "backpack", "eyepatch"],
  timbre: ["soft", "squeaky", "deep", "robot"],
  time: ["dawn", "day", "dusk", "night"],
  weather: ["clear", "cloudy", "rain", "snow", "wind", "fog"],
  layer: ["back", "mid", "front"],
  transition: ["cut", "fade", "dissolve", "wipe", "iris", "card"],
  cardKind: ["title", "chapter", "time", "end"],
  dir: ["left", "right", "up", "down"],
  mood: ["happy", "playful", "calm", "sad", "tense", "mysterious", "heroic", "battle", "boss", "triumphant", "lullaby"], // catalog
  ambience: ["none", "city_traffic", "park_birds", "rain", "wind", "crowd_murmur", "cave_drip"], // catalog
  bubble: ["speech", "think", "shout", "whisper"],
  extrasBehavior: ["walk_by", "idle_chat", "cheer", "flee"],
  cameraMode: ["follow", "focus", "fixed", "pan", "push", "two_shot", "close_up", "wide", "over_shoulder", "track"],
  beatMacro: ["dialogue", "activity", "walk_together", "travel", "enter", "exit", "fight", "gauntlet", "brawl", "chase", "defeat", "grief"],
  sceneMacro: ["fight_card", "montage"],
  defeatStyle: ["ko", "faint", "vanish", "ghost", "captured", "flee"],
  activity: ["blow_bubbles", "tennis_rally", "play_catch", "kick_ball", "eat_together", "dance_together", "selfie", "sleep", "comfort"], // catalog
  ending: ["win", "miss", "laugh", "interrupted"],
  intensity: ["low", "medium", "high"],
  fightStyle: ["even", "dominant", "comeback", "close"],
  pace: ["walk", "run", "sneak"],
  side: ["left", "right"],
};

/** Object behaviors (spec 8) and the initial object kinds (S4.6, catalog). */
export const OBJECT_BEHAVIORS = ["static", "seat", "holdable", "ball", "floater", "vehicle", "breakable"];
export const OBJECT_KINDS = {
  static: ["tree_big", "bush", "lamppost", "door", "sign", "fountain", "tennis_net", "cage", "table"],
  seat: ["bench", "chair"],
  holdable: ["sword", "club_big", "staff", "bat", "shield", "blaster", "racket", "bubble_wand", "phone", "ice_cream", "flower", "book", "rope", "cane"],
  ball: ["tennis_ball", "football"],
  floater: ["bubble", "balloon"],
  vehicle: ["car", "bike"],
  breakable: ["crate", "box"],
};

/** World commands added in v2 (v1 commands all stay; spec 7.3, 5.2, 8, 16). */
export const V2_WORLD_COMMANDS = [
  "narrate", "title_card", "chapter_card", "time_card", "end_card",
  "set_time", "set_weather", "set_music", "shot",
  "spawn_object", "remove_object", "set_object", "set_appearance",
  "activity", // S5: the runtime form of the @activity macro
];

/** Character moves/commands added in v2 that the director treats specially. */
export const V2_CHARACTER_COMMANDS = ["use", "ride", "dismount", "return"];

/** Defeat styles allowed per audience (spec 13, ADR-018). */
export const DEFEAT_STYLES_BY_AUDIENCE = {
  kids: ["ko", "faint", "vanish", "captured", "flee"],
  general: ["ko", "faint", "vanish", "ghost", "captured", "flee"],
};

/** New FX presets the story milestones add (catalog). */
export const V2_FX = ["sparkle", "sparkle_rise", "tears", "zzz", "camera_flash", "rope_bind", "cage_drop", "bubble_pop", "confetti", "halo"];

/** A destination for walking, travel and macros. */
export const DEST = {
  "x-formMessage": 'Use {"x": <px>}, {"near": "<character or object id>"} or {"exit": "left"|"right"}.',
  oneOf: [
    { type: "object", required: ["x"], additionalProperties: false, properties: { x: { type: "number" } } },
    { type: "object", required: ["near"], additionalProperties: false, properties: { near: { type: "string", pattern: ID }, gap: { type: "number", minimum: 0, maximum: 600 } } },
    { type: "object", required: ["exit"], additionalProperties: false, properties: { exit: { enum: V2_ENUMS.side } } },
  ],
};
