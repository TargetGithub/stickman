// emotes moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
export const moves = [
  {
    name: "taunt",
    category: "emote",
    duration: 1.2,
    mouth: "grin",
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.2, pose: "taunt1", ease: "inOutQuad" },
      { t: 0.4, pose: "taunt2", ease: "inOutQuad" },
      { t: 0.6, pose: "taunt1", ease: "inOutQuad" },
      { t: 0.8, pose: "taunt2", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
  },
  {
    name: "victory",
    category: "emote",
    duration: 1.4,
    mouth: "grin",
    flags: { hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "outBack" },
      { t: 0.3, pose: "victory", ease: "inOutQuad" },
      { t: 0.6, pose: "victoryB", ease: "inOutQuad" },
      { t: 1, pose: "victory" },
    ],
    events: [{ t: 0.3, sfx: "crowd_cheer" }],
  },
  {
    name: "charge_up",
    category: "emote",
    duration: 1.4,
    mouth: "shout",
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.2, pose: "chargePose", ease: "linear" },
      { t: 0.85, pose: "chargePose", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0.05, sfx: "energy_charge", fx: ["aura"], shake: "small" }],
  },
];
