// defensive moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
// flags.guard = [t0, t1, kind]: while the move time is in [t0, t1] the character blocks or parries.
// flags.invulnerable = [t0, t1]: hits pass through in that window.
export const moves = [
  {
    name: "block",
    category: "defensive",
    duration: 0.6,
    flags: { guard: [0.12, 0.85, "block"] },
    keys: [
      { t: 0, pose: "guard", ease: "outCubic" },
      { t: 0.18, pose: "block", ease: "linear" },
      { t: 0.8, pose: "block", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
  },
  {
    name: "parry",
    category: "defensive",
    duration: 0.5,
    flags: { guard: [0.15, 0.6, "parry"] },
    keys: [
      { t: 0, pose: "guard", ease: "outCubic" },
      { t: 0.25, pose: "parry", ease: "linear" },
      { t: 0.55, pose: "parry", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0.15, sfx: "whoosh" }],
  },
  {
    name: "duck",
    category: "defensive",
    duration: 0.85,
    flags: { invulnerable: [0.12, 0.85] },
    keys: [
      { t: 0, pose: "guard", ease: "outCubic" },
      { t: 0.16, pose: "duck", ease: "linear" },
      { t: 0.82, pose: "duck", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
  },
];
