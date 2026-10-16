// unarmed moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
// Stance: near leg (r) forward, so the near arm (r) is the lead hand (jab) and the far arm (l) the rear hand (cross).
export const moves = [
  {
    name: "jab",
    category: "attack",
    duration: 0.36,
    params: { damage: 5, travel: 10 },
    mouth: "neutral",
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.25, pose: "jabWindup", ease: "outCubic" },
      { t: 0.42, pose: "jabExtend", ease: "linear" },
      { t: 0.58, pose: "jabExtend", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.25, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.45, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [
      { t0: 0.38, t1: 0.58, part: "rHand", aim: "auto", damage: "damage", knock: [120, 0], hitstop: 0.05,
        reaction: "hit_light", fx: ["impact_small"], sfx: "punch_light" },
    ],
    events: [{ t: 0.26, sfx: "whoosh" }],
  },
  {
    name: "cross",
    category: "attack",
    duration: 0.5,
    params: { damage: 9, travel: 22 },
    mouth: "shout",
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.3, pose: "crossWindup", ease: "outCubic" },
      { t: 0.48, pose: "crossExtend", ease: "linear" },
      { t: 0.64, pose: "crossExtend", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.3, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.5, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [
      { t0: 0.44, t1: 0.64, part: "lHand", aim: "auto", damage: "damage", knock: [220, -20], hitstop: 0.07,
        reaction: "hit_light", fx: ["impact_med"], sfx: "punch_heavy" },
    ],
    events: [{ t: 0.31, sfx: "whoosh" }],
  },
  {
    name: "front_kick",
    category: "attack",
    duration: 0.7,
    params: { damage: 10, travel: 30 },
    mouth: "shout",
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.28, pose: "kickWindup", ease: "outCubic" },
      { t: 0.44, pose: "kickExtend", ease: "linear" },
      { t: 0.56, pose: "kickExtend", ease: "inOutQuad" },
      { t: 0.74, pose: "kickWindup", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.28, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.46, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [
      { t0: 0.4, t1: 0.58, part: "rFoot", aim: "auto", damage: "damage", knock: [380, -40], hitstop: 0.08,
        reaction: "hit_light", fx: ["impact_med"], shake: "small", sfx: "kick_light" },
    ],
    events: [{ t: 0.3, sfx: "whoosh" }],
  },
];
