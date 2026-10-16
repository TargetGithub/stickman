// Slice-of-life moves (STORY_SPEC 9-10, S5.4). Category "life" unless they travel ("movement").
// Drafted for review in batches (tools/draft.mjs move ...); checked with the move data checks on every
// body plan. Conventions: thighs follow the torso lean (lean L → thighs near L keeps legs upright).
// Seats: "sit" with a beat `object` (a bench, a chair) sits on it; "stand_up" leaves it (event unseat).
// Event flags read by the story layer: use (the held object's use), contact (a racket meets the ball),
// poke (a finger jab that pops bubbles), unseat.

const STAND = { lean: 0, head: 0, lUA: 12, lFA: 8, rUA: -12, rFA: 8, lTH: 6, lSH: 0, rTH: -6, rSH: 0 };
const legs = (lean, dy = 0) => ({ lean, lTH: lean + 6, lSH: 0, rTH: lean - 6, rSH: 0, dy });
// Sitting on the floor: legs out in front, hip on the floor, hands propped behind. (On a seat the
// seated leg mask replaces the legs and the hands rest beside the hips.)
const SIT_FLOOR = { lean: -10, head: -4, lUA: -60, lFA: 5, rUA: -55, rFA: 5, lTH: 80, lSH: 4, rTH: 75, rSH: 35 };

export const moves = [
  {
    name: "sit", category: "life", duration: 0.8, flags: { hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.45, pose: { lean: 22, head: -4, lUA: 30, lFA: 30, rUA: 25, rFA: 35, lTH: 70, lSH: 80, rTH: 62, rSH: 75, dy: 18 }, ease: "outQuad" },
      { t: 1, pose: SIT_FLOOR },
    ],
  },
  {
    name: "stand_up", category: "life", duration: 0.9,
    keys: [
      { t: 0, pose: SIT_FLOOR, ease: "inOutQuad" },
      { t: 0.4, pose: { lean: 28, head: -6, lUA: 40, lFA: 30, rUA: 35, rFA: 35, lTH: 72, lSH: 90, rTH: 62, rSH: 80, dy: 16 }, ease: "outQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.3, unseat: true }],
  },
  {
    name: "lie_down", category: "life", duration: 1.2, flags: { hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.35, pose: { lean: 30, head: -6, lUA: 40, lFA: 40, rUA: 35, rFA: 40, lTH: 95, lSH: 110, rTH: 70, rSH: 115, dy: 30 }, ease: "inOutQuad" },
      { t: 0.7, pose: { rot: -50, lean: 10, head: 0, lUA: 30, lFA: 20, rUA: 10, rFA: 20, lTH: 50, lSH: 40, rTH: 30, rSH: 30 }, ease: "outQuad" },
      { t: 1, pose: "down" },
    ],
  },
  {
    // Lie still and breathe; lie_down first. Zs float up.
    name: "sleep", category: "life", duration: 3.0, face: "asleep", flags: { hold: true },
    keys: [
      { t: 0, pose: "down", ease: "inOutQuad" },
      { t: 0.25, pose: { rot: -90, lean: 3, head: -3, lUA: 22, lFA: 10, rUA: -13, rFA: 10, lTH: 8, lSH: 4, rTH: -4, rSH: 10 }, ease: "inOutQuad" },
      { t: 0.5, pose: "down", ease: "inOutQuad" },
      { t: 0.75, pose: { rot: -90, lean: 3, head: -3, lUA: 22, lFA: 10, rUA: -13, rFA: 10, lTH: 8, lSH: 4, rTH: -4, rSH: 10 }, ease: "inOutQuad" },
      { t: 1, pose: "down" },
    ],
    events: [{ t: 0.1, fx: ["zzz"] }, { t: 0.45, fx: ["zzz"] }, { t: 0.8, fx: ["zzz"] }],
  },
  {
    name: "eat", category: "life", duration: 1.6, face: "happy",
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.2, pose: { ...STAND, head: 6, rUA: 115, rFA: 135 }, ease: "inOutQuad" },
      { t: 0.4, pose: { ...STAND, head: 2, rUA: 70, rFA: 95 }, ease: "inOutQuad" },
      { t: 0.6, pose: { ...STAND, head: 6, rUA: 115, rFA: 135 }, ease: "inOutQuad" },
      { t: 0.8, pose: { ...STAND, head: 2, rUA: 70, rFA: 95 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "drink", category: "life", duration: 1.4,
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.3, pose: { ...STAND, ...legs(-6), head: -22, rUA: 125, rFA: 140 }, ease: "linear" },
      { t: 0.7, pose: { ...STAND, ...legs(-8), head: -28, rUA: 130, rFA: 140 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "read", category: "life", duration: 2.0, params: { cycles: 2 }, flags: { loop: true },
    keys: [
      { t: 0, pose: { ...STAND, head: 24, lUA: 38, lFA: 100, rUA: 34, rFA: 106 }, ease: "inOutQuad" },
      { t: 0.5, pose: { ...STAND, head: 28, lUA: 40, lFA: 100, rUA: 36, rFA: 106 }, ease: "inOutQuad" },
      { t: 1, pose: { ...STAND, head: 24, lUA: 38, lFA: 100, rUA: 34, rFA: 106 } },
    ],
  },
  {
    name: "phone_talk", category: "life", duration: 1.6, params: { cycles: 2 }, flags: { loop: true },
    keys: [
      { t: 0, pose: { ...STAND, head: 4, rUA: 160, rFA: 130, lUA: 40, lFA: 60 }, ease: "inOutQuad" },
      { t: 0.5, pose: { ...STAND, head: 0, rUA: 160, rFA: 130, lUA: 60, lFA: 30 }, ease: "inOutQuad" },
      { t: 1, pose: { ...STAND, head: 4, rUA: 160, rFA: 130, lUA: 40, lFA: 60 } },
    ],
  },
  {
    name: "cheer", category: "life", duration: 0.8, params: { cycles: 3 }, face: "laugh", flags: { loop: true },
    keys: [
      { t: 0, pose: { ...STAND, head: -10, lUA: 195, lFA: 15, rUA: 140, rFA: 20 }, ease: "inOutQuad" },
      { t: 0.5, pose: { ...STAND, head: -14, lUA: 205, lFA: 5, rUA: 150, rFA: 5 }, ease: "inOutQuad" },
      { t: 1, pose: { ...STAND, head: -10, lUA: 195, lFA: 15, rUA: 140, rFA: 20 } },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.5, dx: 0, dy: -18, ease: "inQuad" }, { t: 1, dx: 0, dy: 0 }],
  },
  {
    name: "clap", category: "life", duration: 0.5, params: { cycles: 4 }, face: "happy", flags: { loop: true },
    keys: [
      { t: 0, pose: { ...STAND, lUA: 30, lFA: 80, rUA: 34, rFA: 105 }, ease: "inQuad" },
      { t: 0.5, pose: { ...STAND, lUA: 40, lFA: 92, rUA: 40, rFA: 92 }, ease: "outQuad" },
      { t: 1, pose: { ...STAND, lUA: 30, lFA: 80, rUA: 34, rFA: 105 } },
    ],
    events: [{ t: 0.5, sfx: "pop" }],
  },
  {
    name: "kneel", category: "life", duration: 0.8, flags: { hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.5, pose: { lean: 10, head: 5, lUA: 25, lFA: 30, rUA: 15, rFA: 40, lTH: 0, lSH: 60, rTH: 85, rSH: 80, dy: 10 }, ease: "outQuad" },
      { t: 1, pose: { lean: 0, head: 6, lUA: 20, lFA: 30, rUA: 10, rFA: 40, lTH: -20, lSH: 70, rTH: 90, rSH: 90 } },
    ],
  },
  {
    name: "wave_goodbye", category: "life", duration: 1.8,
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.15, pose: { ...STAND, ...legs(-3), head: -6, rUA: 145, rFA: 30 }, ease: "inOutQuad" },
      { t: 0.32, pose: { ...STAND, ...legs(-3), head: -6, rUA: 145, rFA: -30 }, ease: "inOutQuad" },
      { t: 0.5, pose: { ...STAND, ...legs(-3), head: -6, rUA: 145, rFA: 30 }, ease: "inOutQuad" },
      { t: 0.68, pose: { ...STAND, ...legs(-3), head: -6, rUA: 145, rFA: -30 }, ease: "inOutQuad" },
      { t: 0.85, pose: { ...STAND, ...legs(-3), head: -6, rUA: 145, rFA: 30 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "sneak", category: "movement", duration: 1.2, params: { stride: 70 }, flags: { loop: true },
    keys: [
      { t: 0, pose: { lean: 25, head: -12, lUA: 40, lFA: 90, rUA: 55, rFA: 80, lTH: 5, lSH: 50, rTH: 60, rSH: 70, dy: 18 } },
      { t: 0.25, pose: { lean: 25, head: -12, lUA: 45, lFA: 90, rUA: 50, rFA: 80, lTH: 30, lSH: 80, rTH: 30, rSH: 40, dy: 22 } },
      { t: 0.5, pose: { lean: 25, head: -12, lUA: 55, lFA: 80, rUA: 40, rFA: 90, lTH: 60, lSH: 70, rTH: 5, rSH: 50, dy: 18 } },
      { t: 0.75, pose: { lean: 25, head: -12, lUA: 50, lFA: 80, rUA: 45, rFA: 90, lTH: 30, lSH: 40, rTH: 30, rSH: 80, dy: 22 } },
      { t: 1, pose: { lean: 25, head: -12, lUA: 40, lFA: 90, rUA: 55, rFA: 80, lTH: 5, lSH: 50, rTH: 60, rSH: 70, dy: 18 } },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: "stride", dy: 0 }],
  },
  {
    name: "tiptoe", category: "movement", duration: 1.0, params: { stride: 60 }, flags: { loop: true },
    keys: [
      { t: 0, pose: { lean: -2, head: -6, lUA: 50, lFA: 120, rUA: 45, rFA: 125, lTH: -12, lSH: 20, rTH: 20, rSH: 30 } },
      { t: 0.5, pose: { lean: -2, head: -6, lUA: 45, lFA: 125, rUA: 50, rFA: 120, lTH: 20, lSH: 30, rTH: -12, rSH: 20 } },
      { t: 1, pose: { lean: -2, head: -6, lUA: 50, lFA: 120, rUA: 45, rFA: 125, lTH: -12, lSH: 20, rTH: 20, rSH: 30 } },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: "stride", dy: 0 }],
  },
  {
    name: "peek", category: "life", duration: 1.4,
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: { lean: 32, head: -28, lUA: 40, lFA: 90, rUA: 70, rFA: 100, lTH: 40, lSH: 18, rTH: 26, rSH: 12, dy: 6 }, ease: "linear" },
      { t: 0.75, pose: { lean: 34, head: -30, lUA: 40, lFA: 90, rUA: 70, rFA: 100, lTH: 42, lSH: 18, rTH: 28, rSH: 12, dy: 6 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.3, fx: ["question"] }],
  },
  {
    name: "hide", category: "life", duration: 0.7, face: "scared", flags: { hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "outCubic" },
      { t: 1, pose: "cowerPose" },
    ],
  },
  {
    name: "push", category: "life", duration: 1.2,
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: { lean: 30, head: -14, lUA: 115, lFA: 20, rUA: 120, rFA: 15, lTH: 0, lSH: 10, rTH: 70, rSH: 60, dy: 8 }, ease: "linear" },
      { t: 0.75, pose: { lean: 32, head: -16, lUA: 120, lFA: 10, rUA: 122, rFA: 8, lTH: 5, lSH: 10, rTH: 68, rSH: 55, dy: 8 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.25, dx: 0, dy: 0 }, { t: 0.75, dx: 30, dy: 0 }, { t: 1, dx: 30, dy: 0 }],
  },
  {
    name: "pull", category: "life", duration: 1.2,
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: { lean: -22, head: 6, lUA: 70, lFA: 20, rUA: 65, rFA: 25, lTH: 10, lSH: 30, rTH: -60, rSH: 10, dy: 6 }, ease: "linear" },
      { t: 0.75, pose: { lean: -26, head: 8, lUA: 66, lFA: 30, rUA: 62, rFA: 32, lTH: 8, lSH: 30, rTH: -62, rSH: 10, dy: 8 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.25, dx: 0, dy: 0 }, { t: 0.75, dx: -30, dy: 0 }, { t: 1, dx: -30, dy: 0 }],
  },
  {
    // Climbing in place (a ladder, a wall): hands and knees alternate while the body rises and settles.
    name: "climb_up", category: "life", duration: 1.4,
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: { lean: 8, head: -12, lUA: 165, lFA: 20, rUA: 120, rFA: 70, lTH: 14, lSH: 10, rTH: 80, rSH: 95 }, ease: "inOutQuad" },
      { t: 0.5, pose: { lean: 8, head: -12, lUA: 120, lFA: 70, rUA: 165, rFA: 20, lTH: 80, lSH: 95, rTH: 14, rSH: 10 }, ease: "inOutQuad" },
      { t: 0.75, pose: { lean: 8, head: -12, lUA: 165, lFA: 20, rUA: 120, rFA: 70, lTH: 14, lSH: 10, rTH: 80, rSH: 95 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "inOutQuad" }, { t: 0.5, dx: 0, dy: -40, ease: "inOutQuad" }, { t: 1, dx: 0, dy: 0 }],
  },
  {
    // A hop down off a step: up, then a soft crouched landing.
    name: "jump_down", category: "life", duration: 0.9,
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.15, pose: { ...legs(15, 14), head: -6, lUA: -20, lFA: 20, rUA: -20, rFA: 20, lTH: 50, lSH: 70, rTH: 45, rSH: 65 }, ease: "outQuad" },
      { t: 0.35, pose: { lean: -4, head: -8, lUA: 120, lFA: 30, rUA: 130, rFA: 25, lTH: 20, lSH: 40, rTH: 5, rSH: 30 }, ease: "inQuad" },
      { t: 0.6, pose: { lean: 22, head: -4, lUA: 60, lFA: 40, rUA: 70, rFA: 30, lTH: 75, lSH: 100, rTH: 65, rSH: 95, dy: 24 }, ease: "inOutQuad", snapHard: true },
      { t: 1, pose: "stand" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.15, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.35, dx: 40, dy: -60, ease: "inQuad" }, { t: 0.58, dx: 70, dy: 0 }, { t: 1, dx: 70, dy: 0 }],
    events: [{ t: 0.58, sfx: "land", fx: ["dust_land"] }],
  },
  {
    // Tennis forehand: racket back, swing through at waist height (contact at t 0.5), follow through.
    name: "swing_forehand", category: "life", duration: 0.7, needsProp: "racket",
    keys: [
      { t: 0, pose: "stand", ease: "outQuad", propAngle: 30 },
      { t: 0.3, pose: { ...legs(-4), head: -4, lUA: 30, lFA: 40, rUA: -45, rFA: 30, lTH: 16, rTH: -24 }, ease: "inQuad", propAngle: 50 },
      { t: 0.5, pose: { ...legs(6), head: -6, lUA: 10, lFA: 30, rUA: 95, rFA: 10, lTH: -4, rTH: 24 }, ease: "outQuad", propAngle: 0 },
      { t: 0.75, pose: { ...legs(4), head: -6, lUA: 10, lFA: 30, rUA: 150, rFA: 70, lTH: -4, rTH: 18 }, ease: "inOutQuad", propAngle: -30 },
      { t: 1, pose: "stand", propAngle: 30 },
    ],
    events: [{ t: 0.42, sfx: "whoosh" }, { t: 0.5, contact: true }],
  },
  {
    name: "swing_backhand", category: "life", duration: 0.7, needsProp: "racket",
    keys: [
      { t: 0, pose: "stand", ease: "outQuad", propAngle: 30 },
      { t: 0.3, pose: { ...legs(8), head: -2, lUA: 20, lFA: 40, rUA: 45, rFA: 130, lTH: 26, rTH: -6 }, ease: "inQuad", propAngle: 120 },
      { t: 0.5, pose: { ...legs(2), head: -6, lUA: 10, lFA: 30, rUA: 90, rFA: 0, lTH: 14, rTH: -4 }, ease: "outQuad", propAngle: 10 },
      { t: 0.75, pose: { ...legs(-4), head: -8, lUA: 0, lFA: 30, rUA: 140, rFA: -10, lTH: 4, rTH: -12 }, ease: "inOutQuad", propAngle: -20 },
      { t: 1, pose: "stand", propAngle: 30 },
    ],
    events: [{ t: 0.42, sfx: "whoosh" }, { t: 0.5, contact: true }],
  },
  {
    // Bring the bubble wand to the lips, blow (the wand's use: bubbles), lower it.
    name: "blow_wand", category: "life", duration: 1.3, needsProp: "wand",
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad", propAngle: 20 },
      { t: 0.35, pose: { ...STAND, head: -2, rUA: 75, rFA: 100 }, ease: "linear", propAngle: 90 },
      { t: 0.6, pose: { ...STAND, ...legs(-4), head: -6, rUA: 78, rFA: 100 }, ease: "inOutQuad", propAngle: 90 },
      { t: 1, pose: "stand", propAngle: 20 },
    ],
    events: [{ t: 0.45, use: true }],
  },
  {
    name: "poke", category: "life", duration: 0.6,
    keys: [
      { t: 0, pose: "stand", ease: "inQuad" },
      { t: 0.25, pose: { ...STAND, head: -4, rUA: 70, rFA: 90 }, ease: "outQuad" },
      { t: 0.45, pose: { ...STAND, ...legs(6), head: -8, rUA: 105, rFA: 0 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.45, poke: true, sfx: "pop" }],
  },
  {
    name: "stretch", category: "life", duration: 1.8, face: "tired",
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.35, pose: { ...STAND, ...legs(-12), head: -18, lUA: 200, lFA: 10, rUA: 150, rFA: 8 }, ease: "linear" },
      { t: 0.7, pose: { ...STAND, ...legs(-14), head: -20, lUA: 206, lFA: 6, rUA: 156, rFA: 5 }, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
];
