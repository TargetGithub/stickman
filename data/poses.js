// Named poses (spec 7.1). Authored facing right. Missing channels default to stand.
// Channel reminders (spec 5.2): + is forward for rot, lean, head, UA, TH; FA + flexes the elbow
// forward/up; SH + flexes the knee (shin swings back). l* = far limb, r* = near limb.
export const poses = {
  stand: { rot: 0, lean: 0, head: 0, lUA: 12, lFA: 8, rUA: -12, rFA: 8, lTH: 6, lSH: 0, rTH: -6, rSH: 0, dx: 0, dy: 0 },
  guard: { lean: 10, head: -4, lUA: 60, lFA: 100, rUA: 40, rFA: 110, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  crouch: { lean: 28, head: -18, lUA: 50, lFA: 100, rUA: 35, rFA: 110, lTH: 90, lSH: 85, rTH: 100, rSH: 95 },

  walkA: { lean: 4, lUA: 25, lFA: 15, rUA: -25, rFA: 15, lTH: -20, lSH: 15, rTH: 25, rSH: 5 },
  walkPassA: { lean: 4, lUA: 0, lFA: 15, rUA: 0, rFA: 15, lTH: 22, lSH: 50, rTH: -2, rSH: 4 },
  walkB: { lean: 4, lUA: -25, lFA: 15, rUA: 25, rFA: 15, lTH: 25, lSH: 5, rTH: -20, rSH: 15 },
  walkPassB: { lean: 4, lUA: 0, lFA: 15, rUA: 0, rFA: 15, lTH: -2, lSH: 4, rTH: 22, rSH: 50 },
  runA: { lean: 15, head: -8, lUA: 60, lFA: 90, rUA: -45, rFA: 90, lTH: -35, lSH: 70, rTH: 55, rSH: 60 },
  runB: { lean: 15, head: -8, lUA: -45, lFA: 90, rUA: 60, rFA: 90, lTH: 55, lSH: 60, rTH: -35, rSH: 70 },

  jumpUp: { lean: 5, head: -10, lUA: 140, lFA: 20, rUA: 125, rFA: 30, lTH: -10, lSH: 10, rTH: 0, rSH: 20 },
  jumpPeak: { lean: 10, head: 0, lUA: 100, lFA: 40, rUA: 90, rFA: 50, lTH: 60, lSH: 90, rTH: 70, rSH: 100 },
  jumpFall: { lean: 5, head: -5, lUA: 60, lFA: 30, rUA: 50, rFA: 40, lTH: 20, lSH: 30, rTH: 35, rSH: 40 },
  tuck: { lean: 20, head: 10, lUA: 80, lFA: 90, rUA: 70, rFA: 100, lTH: 110, lSH: 140, rTH: 120, rSH: 140 },

  jabWindup: { lean: 6, head: -4, lUA: 60, lFA: 100, rUA: 30, rFA: 125, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  jabExtend: { lean: 16, head: -6, lUA: 60, lFA: 105, rUA: 95, rFA: 2, lTH: -18, lSH: 18, rTH: 20, rSH: 18, dx: 8, dy: 6 },
  crossWindup: { lean: 2, head: -4, lUA: 20, lFA: 130, rUA: 45, rFA: 110, lTH: -16, lSH: 22, rTH: 16, rSH: 24, dy: 6 },
  crossExtend: { lean: 24, head: -8, lUA: 100, lFA: 0, rUA: 30, rFA: 115, lTH: -30, lSH: 12, rTH: 24, rSH: 22, dx: 16, dy: 8 },
  punchWindup: { lean: -5, lUA: 60, lFA: 100, rUA: -30, rFA: 120, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  punchExtend: { lean: 18, head: -10, lUA: 30, lFA: 110, rUA: 100, rFA: 0, lTH: -25, lSH: 10, rTH: 25, rSH: 20, dx: 10, dy: 6 },
  kickWindup: { lean: -10, lUA: 60, lFA: 100, rUA: 30, rFA: 110, lTH: -5, lSH: 10, rTH: 90, rSH: 120 },
  kickExtend: { lean: -25, head: 15, lUA: 50, lFA: 100, rUA: -40, rFA: 60, lTH: -20, lSH: 5, rTH: 75, rSH: 0 },

  hitHeavy: { lean: -32, head: -30, lUA: 60, lFA: 30, rUA: 80, rFA: 20, lTH: -20, lSH: 30, rTH: 25, rSH: 35 },
  launchFly: { lean: -40, head: -30, lUA: 140, lFA: 20, rUA: 120, rFA: 30, lTH: 30, lSH: 40, rTH: 10, rSH: 20 },
  stagger: { lean: -20, head: -15, lUA: 100, lFA: 30, rUA: -20, rFA: 40, lTH: -25, lSH: 20, rTH: 10, rSH: 30 },
  block: { lean: 6, head: 10, lUA: 80, lFA: 125, rUA: 75, rFA: 130, lTH: -14, lSH: 22, rTH: 16, rSH: 26, dy: 8 },
  parry: { lean: -6, head: -4, lUA: 60, lFA: 100, rUA: 125, rFA: 40, lTH: -16, lSH: 22, rTH: 16, rSH: 24, dy: 6 },
  duck: { lean: 45, head: 10, lUA: 70, lFA: 120, rUA: 60, rFA: 125, lTH: 95, lSH: 120, rTH: 105, rSH: 125 },
  dodgeBack: { lean: -30, head: -10, lUA: 60, lFA: 110, rUA: 45, rFA: 120, lTH: -30, lSH: 40, rTH: 20, rSH: 10 },
  downImpact: { rot: -90, lean: 0, head: -10, lUA: 40, lFA: 20, rUA: 10, rFA: 20, lTH: 40, lSH: 30, rTH: 25, rSH: 40 },
  sit: { rot: 0, lean: 5, head: -5, lUA: -35, lFA: 10, rUA: -30, rFA: 10, lTH: 90, lSH: 10, rTH: 85, rSH: 60 },
  hitLight: { lean: -15, head: -20, lUA: 30, lFA: 60, rUA: 50, rFA: 40, lTH: -10, lSH: 15, rTH: 15, rSH: 25 },
  down: { rot: -90, lean: 0, head: 0, lUA: 20, lFA: 10, rUA: -15, rFA: 10, lTH: 8, lSH: 4, rTH: -4, rSH: 10 },
  victory: { lean: -5, head: -10, lUA: 20, lFA: 120, rUA: 135, rFA: 20, lTH: -15, lSH: 5, rTH: 15, rSH: 5 },
};
