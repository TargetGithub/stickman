// Named poses (spec 7.1). Authored facing right. Missing channels default to stand.
export const poses = {
  stand: { rot: 0, lean: 0, head: 0, lUA: 8, lFA: 6, rUA: -8, rFA: 6, lTH: 6, lSH: 0, rTH: -6, rSH: 0, dx: 0, dy: 0 },
  guard: { lean: 10, head: -4, lUA: 60, lFA: 100, rUA: 40, rFA: 110, lTH: -14, lSH: 20, rTH: 16, rSH: 24, dy: 6 },
  down: { rot: -90, lean: 0, head: 0, lUA: 20, lFA: 10, rUA: -15, rFA: 10, lTH: 8, lSH: 4, rTH: -4, rSH: 10 },
};
