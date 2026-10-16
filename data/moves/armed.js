// armed moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
// needsProp names a prop kind ("any" = whatever is held). Keys carry propAngle (degrees, positive
// raises the tip); slash trails follow the weapon tip (events with part: "propTip").
const SWORD_GUARD = { pose: "swordGuard", propAngle: 55 };
const sword = (name, dur, params, keys, hits, events, extra = {}) => ({ name, category: "attack", duration: dur, params, needsProp: "sword", keys, hits, events, ...extra });

export const moves = [
  sword("sword_slash", 0.6, { damage: 11, travel: 20 },
    [
      { t: 0, ...SWORD_GUARD, ease: "outQuad" },
      { t: 0.3, pose: "swordWindup", propAngle: 60, ease: "outCubic" },
      { t: 0.46, pose: "swordSlashB", propAngle: -20, ease: "linear" },
      { t: 0.6, pose: "swordSlashB", propAngle: -25, ease: "inOutQuad" },
      { t: 1, ...SWORD_GUARD },
    ],
    [{ t0: 0.4, t1: 0.58, part: "propTip", aim: "auto", damage: "damage", knock: [260, -40], hitstop: 0.08, fx: ["impact_med"], shake: "small", sfx: "slash" }],
    [{ t: 0.32, sfx: "whoosh", fx: ["slash_arc"], part: "propTip" }],
    { root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.3, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.48, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }] }),
  sword("sword_thrust", 0.55, { damage: 12, travel: 40 },
    [
      { t: 0, ...SWORD_GUARD, ease: "outQuad" },
      { t: 0.3, pose: "thrustWindup", propAngle: 0, ease: "outCubic" },
      { t: 0.45, pose: "thrustExtend", propAngle: 0, ease: "linear" },
      { t: 0.62, pose: "thrustExtend", propAngle: 0, ease: "inOutQuad" },
      { t: 1, ...SWORD_GUARD },
    ],
    [{ t0: 0.4, t1: 0.62, part: "propTip", aim: "torso", damage: "damage", knock: [300, -20], hitstop: 0.08, fx: ["impact_med"], sfx: "slash" }],
    [{ t: 0.32, sfx: "whoosh" }],
    { root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.3, dx: -8, dy: 0, ease: "outQuad" }, { t: 0.46, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }] }),
  sword("sword_spin", 0.85, { damage: 13, travel: 40 },
    [
      { t: 0, ...SWORD_GUARD, ease: "outQuad" },
      { t: 0.18, pose: "swordWindup", propAngle: 30, ease: "linear" },
      { t: 0.3, pose: { lean: 10, lUA: 40, lFA: 60, rUA: 90, rFA: 0, lTH: 0, lSH: 10, rTH: 10, rSH: 20 }, propAngle: 0, ease: "linear" },
      { t: 0.42, pose: "swordWindup", propAngle: 40, ease: "outCubic" },
      { t: 0.54, pose: "swordSlashB", propAngle: 0, ease: "linear" },
      { t: 0.68, pose: "swordSlashB", propAngle: -10, ease: "inOutQuad" },
      { t: 1, ...SWORD_GUARD },
    ],
    [{ t0: 0.5, t1: 0.68, part: "propTip", aim: "auto", damage: "damage", knock: [420, -80], hitstop: 0.1, fx: ["impact_big"], shake: "small", sfx: "slash" }],
    [{ t: 0.2, turn: true, sfx: "whoosh" }, { t: 0.36, turn: true }, { t: 0.44, sfx: "whoosh", fx: ["slash_arc"], part: "propTip" }],
    { root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.42, dx: 10, dy: 0, ease: "outQuad" }, { t: 0.56, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }] }),
  sword("sword_overhead", 0.8, { damage: 15, travel: 30 },
    [
      { t: 0, ...SWORD_GUARD, ease: "outQuad" },
      { t: 0.38, pose: "overheadUp", propAngle: 30, ease: "holdThenSnap" },
      { t: 0.5, pose: "overheadDown", propAngle: -15, ease: "linear" },
      { t: 0.7, pose: "overheadDown", propAngle: -15, ease: "inOutQuad" },
      { t: 1, ...SWORD_GUARD },
    ],
    [{ t0: 0.45, t1: 0.64, part: "propTip", aim: "head", damage: "damage", knock: [260, 0], hitstop: 0.12, reaction: "hit_heavy", fx: ["impact_big"], shake: "med", sfx: "slash" }],
    [{ t: 0.4, sfx: "whoosh", fx: ["slash_arc"], part: "propTip" }],
    { mouth: "shout", root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.38, dx: -6, dy: 0, ease: "outQuad" }, { t: 0.52, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }] }),
  {
    name: "staff_swing", category: "attack", duration: 0.7, params: { damage: 10, travel: 25 }, needsProp: "staff",
    keys: [
      { t: 0, pose: "staffGuard", propAngle: 0, ease: "outQuad" },
      { t: 0.32, pose: "staffWindup", propAngle: 40, ease: "outCubic" },
      { t: 0.48, pose: "staffSwing", propAngle: -10, ease: "linear" },
      { t: 0.64, pose: "staffSwing", propAngle: -15, ease: "inOutQuad" },
      { t: 1, pose: "staffGuard", propAngle: 0 },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.32, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.5, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [{ t0: 0.42, t1: 0.62, part: "propTip", aim: "auto", damage: "damage", knock: [380, -40], hitstop: 0.09, fx: ["impact_med"], shake: "small", sfx: "punch_heavy" }],
    events: [{ t: 0.34, sfx: "whoosh", fx: ["slash_arc"], part: "propTip" }],
  },
  {
    name: "staff_spin", category: "attack", duration: 1.0, params: { damage: 6, travel: 60 }, needsProp: "staff",
    keys: [
      { t: 0, pose: "staffGuard", propAngle: 0, ease: "linear" },
      { t: 0.2, pose: "twirl", propAngle: 180, ease: "linear" },
      { t: 0.4, pose: "twirl", propAngle: 360, ease: "linear" },
      { t: 0.6, pose: "twirl", propAngle: 540, ease: "linear" },
      { t: 0.8, pose: "twirl", propAngle: 720, ease: "inOutQuad" },
      { t: 1, pose: "staffGuard", propAngle: 720 },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.8, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [
      { t0: 0.36, t1: 0.44, part: "propTip", aim: "auto", damage: "damage", knock: [60, 0], hitstop: 0.04, reaction: "hit_light", fx: ["impact_small"], sfx: "punch_light", dodge: "back" },
      { t0: 0.72, t1: 0.8, part: "propTip", aim: "auto", damage: "damage", knock: [320, -60], hitstop: 0.08, fx: ["impact_med"], sfx: "punch_heavy", dodge: "back" },
    ],
    events: [{ t: 0.18, sfx: "whoosh" }, { t: 0.5, sfx: "whoosh" }],
  },
  {
    name: "bat_swing", category: "attack", duration: 0.85, params: { damage: 18, travel: 20 }, needsProp: "bat", mouth: "shout",
    keys: [
      { t: 0, pose: "batReady", propAngle: 60, ease: "outQuad" },
      { t: 0.36, pose: "batCoil", propAngle: 80, ease: "holdThenSnap" },
      { t: 0.5, pose: "batSwing", propAngle: 0, ease: "linear" },
      { t: 0.62, pose: "batFollow", propAngle: -60, ease: "inOutQuad" },
      { t: 1, pose: "batReady", propAngle: 60 },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.36, dx: -6, dy: 0, ease: "outQuad" }, { t: 0.5, dx: "travel", dy: 0 }, { t: 1, dx: "travel", dy: 0 }],
    hits: [{ t0: 0.44, t1: 0.6, part: "propTip", aim: "auto", damage: "damage", knock: [750, -800], hitstop: 0.14, reaction: "hit_launch", fx: ["impact_big"], shake: "big", sfx: "kick_heavy" }],
    events: [{ t: 0.4, sfx: "whoosh", fx: ["slash_arc"], part: "propTip" }],
  },
  {
    name: "throw_prop", category: "attack", duration: 0.75, params: { damage: 10 }, needsProp: "any", flags: { ranged: [150, 1300] },
    keys: [
      { t: 0, pose: "guard", propAngle: 0, ease: "outQuad" },
      { t: 0.36, pose: "throwWindup", propAngle: 30, ease: "outCubic" },
      { t: 0.48, pose: "throwRelease", propAngle: 0, ease: "linear" },
      { t: 0.7, pose: "throwRelease", propAngle: 0, ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    events: [
      { t: 0.42, sfx: "whoosh" },
      { t: 0.48, projectile: { kind: "prop", from: "rHand", speed: 1300, radius: 22, damage: "damage", life: 1.6, spin: 14, knock: [350, -200], hitstop: 0.08, fx: ["impact_med"], sfx: "punch_heavy" } },
    ],
  },
  {
    name: "shoot", category: "attack", duration: 0.7, params: { damage: 9 }, needsProp: "blaster", flags: { ranged: [200, 1800] },
    keys: [
      { t: 0, pose: "guard", propAngle: 0, ease: "outQuad" },
      { t: 0.3, pose: "aimShot", propAngle: 0, ease: "linear" },
      { t: 0.4, pose: "aimShot", propAngle: 0, ease: "outQuad" },
      { t: 0.48, pose: "recoil", propAngle: 10, ease: "inOutQuad" },
      { t: 0.75, pose: "aimShot", propAngle: 0, ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0.4, sfx: "energy_fire", projectile: { kind: "bolt", from: "rHand", speed: 2000, radius: 14, damage: "damage", life: 1.5, knock: [200, -40], hitstop: 0.06, fx: ["spark", "impact_small"], sfx: "punch_light" } }],
  },
];
