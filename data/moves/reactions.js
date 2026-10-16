// reactions moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
// Reactions start with no blend (they snap into the hit pose). flags.hold keeps the last pose
// until the next command (lying down until get_up).
export const moves = [
  {
    name: "hit_light",
    category: "reaction",
    duration: 0.45,
    mouth: "shout",
    keys: [
      { t: 0, pose: "hitLight", ease: "linear" },
      { t: 0.35, pose: "hitLight", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.3, dx: -12, dy: 0, ease: "outQuad" }, { t: 1, dx: -16, dy: 0 }],
  },
  {
    name: "hit_heavy",
    category: "reaction",
    duration: 0.65,
    mouth: "shout",
    keys: [
      { t: 0, pose: "hitHeavy", ease: "linear" },
      { t: 0.4, pose: "hitHeavy", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outCubic" }, { t: 0.35, dx: -30, dy: 0, ease: "outQuad" }, { t: 1, dx: -36, dy: 0 }],
  },
  {
    name: "hit_launch",
    category: "reaction",
    duration: 0.3,
    mouth: "shout",
    flags: { airborne: true, hold: true },
    keys: [{ t: 0, pose: "hitHeavy", ease: "outQuad" }, { t: 1, pose: "launchFly" }],
  },
  {
    name: "knockdown",
    category: "reaction",
    duration: 0.6,
    flags: { hold: true },
    keys: [
      { t: 0, pose: "downImpact", ease: "outQuad", snapHard: true },
      { t: 0.45, pose: "down", ease: "inOutQuad" },
      { t: 1, pose: "down" },
    ],
    events: [{ t: 0, sfx: "land_heavy", fx: ["dust_land"] }],
  },
  {
    name: "get_up",
    category: "movement",
    duration: 0.9,
    keys: [
      { t: 0, pose: "down", ease: "inOutQuad" },
      { t: 0.35, pose: "sit", ease: "inOutQuad" },
      { t: 0.65, pose: "crouch", ease: "outQuad" },
      { t: 1, pose: "guard" },
    ],
  },
  {
    name: "stagger",
    category: "reaction",
    duration: 0.7,
    mouth: "shout",
    keys: [
      { t: 0, pose: "stagger", ease: "outQuad" },
      { t: 0.5, pose: { lean: -12, lUA: 70, rUA: 10 }, ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.5, dx: -40, dy: 0, ease: "outQuad" }, { t: 1, dx: -46, dy: 0 }],
    events: [{ t: 0, fx: ["stars_dizzy"] }],
  },
  {
    name: "ko_fall",
    category: "reaction",
    duration: 1.3,
    mouth: "shout",
    flags: { hold: true },
    keys: [
      { t: 0, pose: "hitHeavy", ease: "outQuad" },
      { t: 0.25, pose: "stagger", ease: "inOutQuad" },
      { t: 0.55, pose: "koKneel", ease: "inQuad" },
      { t: 0.8, pose: "downFace", ease: "outQuad", snapHard: true },
      { t: 1, pose: "downFace" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.3, dx: -30, dy: 0 }, { t: 1, dx: -20, dy: 0 }],
    events: [{ t: 0.8, sfx: "ko", fx: ["dust_land"], shake: "small" }],
  },
];
