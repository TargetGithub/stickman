// Named poses (spec 7.1). Authored facing right. Missing channels default to stand.
// Channel reminders (spec 5.2): + is forward for rot, lean, head, UA, TH; FA + flexes the elbow
// forward/up; SH + flexes the knee (shin swings back). l* = far limb, r* = near limb.
export const poses = {
  stand: { rot: 0, lean: 0, head: 0, lUA: 12, lFA: 8, rUA: -12, rFA: 8, lTH: 6, lSH: 0, rTH: -6, rSH: 0, dx: 0, dy: 0 },
  guard: { lean: 10, head: -4, lUA: 60, lFA: 100, rUA: 40, rFA: 110, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  crouch: { lean: 28, head: -18, lUA: 50, lFA: 100, rUA: 35, rFA: 110, lTH: 90, lSH: 85, rTH: 100, rSH: 95 },

  walkA: { lean: 4, lUA: 25, lFA: 15, rUA: -25, rFA: 15, lTH: -20, lSH: 15, rTH: 25, rSH: 5 },
  walkB: { lean: 4, lUA: -25, lFA: 15, rUA: 25, rFA: 15, lTH: 25, lSH: 5, rTH: -20, rSH: 15 },
  runA: { lean: 15, head: -8, lUA: 60, lFA: 90, rUA: -45, rFA: 90, lTH: -35, lSH: 70, rTH: 55, rSH: 60 },
  runB: { lean: 15, head: -8, lUA: -45, lFA: 90, rUA: 60, rFA: 90, lTH: 55, lSH: 60, rTH: -35, rSH: 70 },

  jumpUp: { lean: 5, head: -10, lUA: 140, lFA: 20, rUA: 125, rFA: 30, lTH: -10, lSH: 10, rTH: 0, rSH: 20 },
  tuck: { lean: 20, head: 10, lUA: 80, lFA: 90, rUA: 70, rFA: 100, lTH: 110, lSH: 140, rTH: 120, rSH: 140 },

  punchWindup: { lean: -5, lUA: 60, lFA: 100, rUA: -30, rFA: 120, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  punchExtend: { lean: 18, head: -10, lUA: 30, lFA: 110, rUA: 100, rFA: 0, lTH: -25, lSH: 10, rTH: 25, rSH: 20, dx: 10, dy: 6 },
  kickWindup: { lean: -10, lUA: 60, lFA: 100, rUA: 30, rFA: 110, lTH: -5, lSH: 10, rTH: 90, rSH: 120 },
  kickExtend: { lean: -25, head: 15, lUA: 50, lFA: 100, rUA: -40, rFA: 60, lTH: -20, lSH: 5, rTH: 75, rSH: 0 },

  hitLight: { lean: -15, head: -20, lUA: 30, lFA: 60, rUA: 50, rFA: 40, lTH: -10, lSH: 15, rTH: 15, rSH: 25 },
  down: { rot: -90, lean: 0, head: 0, lUA: 20, lFA: 10, rUA: -15, rFA: 10, lTH: 8, lSH: 4, rTH: -4, rSH: 10 },
  victory: { lean: -5, head: -10, lUA: 20, lFA: 120, rUA: 135, rFA: 20, lTH: -15, lSH: 5, rTH: 15, rSH: 5 },
};
