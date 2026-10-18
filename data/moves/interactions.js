// Paired moves (STORY_SPEC 9, S5.3). Category "interaction". A lead move has a `pair` block (format in
// engine/story/pairs.js); its partner move (flags.partner) plays on the beat's `partner` at the same
// time. Contacts are reached with IK on both bodies, so pairs line up across body plans.
// put_down ends a carry or a piggyback (it takes over the attachment until its detach event).

const STAND = { lean: 0, head: 0, lUA: 12, lFA: 8, rUA: -12, rFA: 8, lTH: 6, lSH: 0, rTH: -6, rSH: 0 };
const legs = (lean, dy = 0) => ({ lean, lTH: lean + 6, lSH: 0, rTH: lean - 6, rSH: 0, dy });
const pose = (o) => ({ ...STAND, ...o });

// Shared pose pieces.
const HUG = pose({ ...legs(6), head: 12, lUA: 88, lFA: 75, rUA: 82, rFA: 80 });
const HIGH = pose({ ...legs(-2), head: -6, rUA: 155, rFA: 5 });
const HIGH_FAR = pose({ ...legs(-2), head: -6, lUA: 155, lFA: 5 }); // the far arm: drawn behind the head
const FIST = pose({ ...legs(4), head: -2, rUA: 88, rFA: 0 });
const SHAKE_A = pose({ head: 4, rUA: 48, rFA: 30 });
const SHAKE_B = pose({ head: 4, rUA: 40, rFA: 46 });
const REACH = pose({ ...legs(4), head: 6, rUA: 78, rFA: 12 });
const CRADLE = pose({ ...legs(-6), head: 8, lUA: 72, lFA: 58, rUA: 68, rFA: 62 });
const CARRIED = { rot: 75, lean: 0, head: -12, lUA: 125, lFA: 50, rUA: 60, rFA: 70, lTH: 95, lSH: 85, rTH: 100, rSH: 80 };
const PIGGY_LEAD = pose({ ...legs(14, 6), head: -8, lUA: -40, lFA: 60, rUA: -35, rFA: 65 });
const PIGGY = { lean: 22, head: -8, lUA: 105, lFA: 75, rUA: 98, rFA: 82, lTH: 100, lSH: 95, rTH: 95, rSH: 100 };
const LIFT_UP = pose({ ...legs(-4), head: -12, lUA: 148, lFA: 18, rUA: 152, rFA: 16 });
const LIFTED = { lean: 0, head: -6, lUA: 205, lFA: 10, rUA: 115, rFA: 30, lTH: 14, lSH: 25, rTH: -4, rSH: 30 };
const PULL = pose({ ...legs(-20), head: 6, lUA: 70, lFA: 25, rUA: 66, rFA: 28, rTH: -50, rSH: 10 });
const DRAGGED = { rot: 88, lean: 0, head: 0, lUA: 175, lFA: 5, rUA: 170, rFA: 5, lTH: 4, lSH: 6, rTH: -4, rSH: 12 };
const HAND_ON_SHOULDER = pose({ ...legs(10), head: 14, rUA: 108, rFA: 22 });

const pair = (o) => ({ leadFaces: "toward", partnerFaces: "toward", contacts: [], ...o });

export const moves = [
  {
    name: "hug", category: "interaction", duration: 1.8, face: "happy",
    pair: pair({ partnerMove: "hug_partner", gap: 30, contacts: [
      { t0: 0.3, t1: 0.82, from: "lead", part: "rHand", to: "back" }, { t0: 0.3, t1: 0.82, from: "lead", part: "lHand", to: "back" },
      { t0: 0.32, t1: 0.82, from: "partner", part: "rHand", to: "back" }, { t0: 0.32, t1: 0.82, from: "partner", part: "lHand", to: "back" },
    ] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.2, pose: pose({ ...legs(2), head: -4, lUA: 95, lFA: 20, rUA: 100, rFA: 20 }), ease: "inOutQuad" },
      { t: 0.35, pose: HUG, ease: "linear" },
      { t: 0.8, pose: HUG, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "hug_partner", category: "interaction", duration: 1.8, face: "happy", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: pose({ head: -4, lUA: 95, lFA: 20, rUA: 100, rFA: 20 }), ease: "inOutQuad" },
      { t: 0.38, pose: HUG, ease: "linear" },
      { t: 0.8, pose: HUG, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "high_five", category: "interaction", duration: 1.0, face: "laugh",
    pair: pair({ partnerMove: "high_five_partner", gap: 62, contacts: [{ t0: 0.42, t1: 0.58, from: "lead", part: "rHand", to: "lHand", meet: true }] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: pose({ ...legs(-6), head: -4, rUA: 135, rFA: 70 }), ease: "inQuad" },
      { t: 0.45, pose: HIGH, ease: "linear" },
      { t: 0.6, pose: HIGH, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.48, sfx: "pop" }],
  },
  {
    name: "high_five_partner", category: "interaction", duration: 1.0, face: "laugh", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: pose({ ...legs(-6), head: -4, lUA: 135, lFA: 70, rUA: -12 }), ease: "inQuad" },
      { t: 0.45, pose: HIGH_FAR, ease: "linear" },
      { t: 0.6, pose: HIGH_FAR, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "fist_bump", category: "interaction", duration: 0.9, face: "happy",
    pair: pair({ partnerMove: "fist_bump_partner", gap: 60, contacts: [{ t0: 0.4, t1: 0.6, from: "lead", part: "rHand", to: "rHand", meet: true }] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: pose({ head: -2, rUA: 50, rFA: 90 }), ease: "inQuad" },
      { t: 0.45, pose: FIST, ease: "linear" },
      { t: 0.6, pose: FIST, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.45, sfx: "pop" }],
  },
  {
    name: "fist_bump_partner", category: "interaction", duration: 0.9, face: "happy", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: pose({ head: -2, rUA: 50, rFA: 90 }), ease: "inQuad" },
      { t: 0.45, pose: FIST, ease: "linear" },
      { t: 0.6, pose: FIST, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "handshake", category: "interaction", duration: 1.5,
    pair: pair({ partnerMove: "handshake_partner", gap: 58, contacts: [{ t0: 0.25, t1: 0.82, from: "lead", part: "rHand", to: "rHand", meet: true }] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: SHAKE_A, ease: "inOutQuad" },
      { t: 0.4, pose: SHAKE_B, ease: "inOutQuad" },
      { t: 0.55, pose: SHAKE_A, ease: "inOutQuad" },
      { t: 0.7, pose: SHAKE_B, ease: "inOutQuad" },
      { t: 0.82, pose: SHAKE_A, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "handshake_partner", category: "interaction", duration: 1.5, flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.25, pose: SHAKE_A, ease: "inOutQuad" },
      { t: 0.82, pose: SHAKE_A, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    // Two gentle pats on the top of the partner's head.
    name: "pat_head", category: "interaction", duration: 1.5, face: "happy",
    pair: pair({ partnerMove: "pat_head_partner", gap: 56, contacts: [
      { t0: 0.28, t1: 0.4, from: "lead", part: "rHand", to: "top" }, { t0: 0.56, t1: 0.68, from: "lead", part: "rHand", to: "top" },
    ] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.2, pose: pose({ ...legs(6), head: 14, rUA: 120, rFA: 60 }), ease: "inOutQuad" },
      { t: 0.8, pose: pose({ ...legs(6), head: 14, rUA: 120, rFA: 60 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "pat_head_partner", category: "interaction", duration: 1.5, face: "laugh", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.3, pose: pose({ head: 12, lUA: 20, rUA: -4 }), ease: "inOutQuad" },
      { t: 0.8, pose: pose({ head: 12, lUA: 20, rUA: -4 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    // Hand the held prop to the partner (event give at t 0.5).
    name: "give", category: "interaction", duration: 1.3, face: "happy",
    pair: pair({ partnerMove: "receive", gap: 58, contacts: [{ t0: 0.35, t1: 0.6, from: "lead", part: "rHand", to: "rHand", meet: true }] }),
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.35, pose: REACH, ease: "linear" },
      { t: 0.6, pose: REACH, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.5, give: true }],
  },
  {
    name: "receive", category: "interaction", duration: 1.3, face: "happy", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.35, pose: REACH, ease: "linear" },
      { t: 0.6, pose: REACH, ease: "inOutQuad" },
      { t: 1, pose: pose({ head: 10, rUA: 30, rFA: 100 }) },
    ],
  },
  {
    // Scoop the partner up and keep carrying (walks keep them in the arms) until put_down.
    name: "carry", category: "interaction", duration: 1.4, flags: { hold: true },
    pair: pair({ partnerMove: "carried", gap: 40, partnerFaces: "same", attach: { t0: 0.45, anchor: "rHand", offset: [0, -14], until: "detach" } }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.35, pose: pose({ lean: 30, head: 8, lUA: 60, lFA: 40, rUA: 55, rFA: 45, lTH: 80, lSH: 90, rTH: 60, rSH: 80, dy: 20 }), ease: "outQuad" },
      { t: 1, pose: CRADLE },
    ],
  },
  {
    name: "carried", category: "interaction", duration: 1.4, face: "happy", flags: { partner: true, hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.45, pose: CARRIED, ease: "inOutQuad" },
      { t: 1, pose: CARRIED },
    ],
  },
  {
    // End a carry or a piggyback: lower the partner and let go (detach at t 0.6).
    name: "put_down", category: "interaction", duration: 1.1,
    pair: pair({ partnerMove: "set_down", gap: 0, inheritAttach: true }),
    keys: [
      { t: 0, pose: CRADLE, ease: "inOutQuad" },
      { t: 0.55, pose: pose({ lean: 30, head: 8, lUA: 55, lFA: 40, rUA: 50, rFA: 45, lTH: 78, lSH: 90, rTH: 58, rSH: 80, dy: 20 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0.6, detach: true }],
  },
  {
    name: "set_down", category: "interaction", duration: 1.1, flags: { partner: true },
    keys: [
      { t: 0, pose: CARRIED, ease: "inOutQuad" },
      { t: 0.55, pose: pose({ lean: 10, head: 0, lTH: 40, lSH: 60, rTH: 30, rSH: 50, dy: 10 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    // The partner climbs on the lead's back and rides along until put_down.
    name: "piggyback", category: "interaction", duration: 1.4, flags: { hold: true }, face: "happy",
    pair: pair({ partnerMove: "piggyback_partner", gap: 34, leadFaces: "away", partnerFaces: "same", attach: { t0: 0.42, anchor: "shoulder", offset: [-24, 34], until: "detach" } }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.35, pose: pose({ ...legs(24, 18), head: -6, lUA: -30, lFA: 50, rUA: -25, rFA: 55, lTH: 60, lSH: 60, rTH: 50, rSH: 55 }), ease: "inOutQuad" },
      { t: 1, pose: PIGGY_LEAD },
    ],
  },
  {
    name: "piggyback_partner", category: "interaction", duration: 1.4, face: "laugh", flags: { partner: true, hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.3, pose: pose({ ...legs(10, 12), head: -10, lUA: 90, lFA: 30, rUA: 95, rFA: 30, lTH: 50, lSH: 70, rTH: 40, rSH: 60 }), ease: "outQuad" },
      { t: 0.5, pose: PIGGY, ease: "inOutQuad" },
      { t: 1, pose: PIGGY },
    ],
  },
  {
    name: "lift_up", category: "interaction", duration: 2.0, face: "laugh",
    pair: pair({ partnerMove: "lifted", gap: 36, attach: { t0: 0.3, t1: 0.8, anchor: "rHand", offset: [6, -30] } }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.2, pose: pose({ lean: 26, head: 6, lUA: 60, lFA: 30, rUA: 58, rFA: 32, lTH: 70, lSH: 80, rTH: 55, rSH: 70, dy: 16 }), ease: "inOutQuad" },
      { t: 0.45, pose: LIFT_UP, ease: "linear" },
      { t: 0.65, pose: LIFT_UP, ease: "inOutQuad" },
      { t: 0.82, pose: pose({ lean: 20, head: 6, lUA: 60, lFA: 30, rUA: 58, rFA: 32, lTH: 60, lSH: 70, rTH: 45, rSH: 60, dy: 14 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "lifted", category: "interaction", duration: 2.0, face: "laugh", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.3, pose: LIFTED, ease: "linear" },
      { t: 0.8, pose: LIFTED, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    // Pull the partner along the floor by the hand, walking backward.
    name: "drag", category: "interaction", duration: 2.2,
    pair: pair({ partnerMove: "dragged", gap: 150, contacts: [{ t0: 0.15, t1: 0.9, from: "lead", part: "rHand", to: "rHand", meet: true }],
      attach: { t0: 0.2, t1: 0.9, anchor: "rHand", offset: [150, 0], mode: "x" } }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.2, pose: PULL, ease: "linear" },
      { t: 0.9, pose: PULL, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.2, dx: 0, dy: 0 }, { t: 0.9, dx: -160, dy: 0 }, { t: 1, dx: -160, dy: 0 }],
    events: [{ t: 0.3, sfx: "slip" }],
  },
  {
    name: "dragged", category: "interaction", duration: 2.2, face: "tired", flags: { partner: true, hold: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.2, pose: DRAGGED, ease: "linear" },
      { t: 1, pose: DRAGGED },
    ],
  },
  {
    name: "lean_on", category: "interaction", duration: 2.2, face: "tired",
    pair: pair({ partnerMove: "lean_on_partner", gap: 48, contacts: [{ t0: 0.2, t1: 0.85, from: "lead", part: "rHand", to: "shoulder" }] }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: pose({ ...legs(16), head: 18, rUA: 110, rFA: 20 }), ease: "linear" },
      { t: 0.8, pose: pose({ ...legs(18), head: 20, rUA: 112, rFA: 20 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "lean_on_partner", category: "interaction", duration: 2.2, face: "happy", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: pose({ ...legs(-4), head: 4 }), ease: "linear" },
      { t: 0.8, pose: pose({ ...legs(-4), head: 4 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "comfort", category: "interaction", duration: 2.4,
    pair: pair({ partnerMove: "comfort_partner", gap: 48, contacts: [{ t0: 0.2, t1: 0.85, from: "lead", part: "rHand", to: "shoulder" }] }),
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.25, pose: HAND_ON_SHOULDER, ease: "inOutQuad" },
      { t: 0.55, pose: pose({ ...legs(12), head: 18, rUA: 108, rFA: 22 }), ease: "inOutQuad" },
      { t: 0.85, pose: HAND_ON_SHOULDER, ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    name: "comfort_partner", category: "interaction", duration: 2.4, face: "sad", flags: { partner: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.3, pose: pose({ ...legs(8), head: 26, lUA: 4, rUA: -6 }), ease: "inOutQuad" },
      { t: 0.85, pose: pose({ ...legs(6), head: 18, lUA: 4, rUA: -6 }), ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
  },
  {
    // Walk side by side holding hands (params.distance for both).
    name: "walk_together", category: "interaction", duration: 1.0, params: { stride: 120 }, flags: { loop: true }, face: "happy",
    pair: pair({ partnerMove: "walk_together_partner", gap: 52, leadFaces: "away", partnerFaces: "same", sync: true,
      contacts: [{ t0: 0, t1: 1, from: "lead", part: "lHand", to: "rHand", meet: true }] }),
    keys: [
      { t: 0, pose: "walkA" }, { t: 0.25, pose: "walkPassA" }, { t: 0.5, pose: "walkB" }, { t: 0.75, pose: "walkPassB" }, { t: 1, pose: "walkA" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: "stride", dy: 0 }],
    events: [{ t: 0.0, sfx: "step" }, { t: 0.5, sfx: "step" }],
  },
  {
    name: "walk_together_partner", category: "interaction", duration: 1.0, params: { stride: 120 }, flags: { loop: true, partner: true }, face: "happy",
    keys: [
      { t: 0, pose: "walkB" }, { t: 0.25, pose: "walkPassB" }, { t: 0.5, pose: "walkA" }, { t: 0.75, pose: "walkPassA" }, { t: 1, pose: "walkB" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: "stride", dy: 0 }],
  },
];
