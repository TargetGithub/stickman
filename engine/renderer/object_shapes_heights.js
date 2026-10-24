// Platforms to climb (series/baaaana/PLAN.md task 10b): garden_wall and lookout_tower. Same contract as
// object_shapes.js: (ctx, colors, piece, def), drawn at the object's bottom centre; the top a character
// stands on is the catalog `top`, so the drawn deck sits exactly there.

const INK = "#2b2219";

function box(ctx, x, y, w, h, fill, line = INK, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = line;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

export const HEIGHT_SHAPES = {
  /** Bricks in offset rows under a stone cap; the cap's top is the standing line. */
  garden_wall(ctx, c, piece, def) {
    const w = def.w;
    const top = def.top;
    box(ctx, -w / 2, -top + 14, w, top - 14, c.brick);
    ctx.strokeStyle = c.mortar;
    ctx.lineWidth = 3;
    const rows = Math.floor((top - 14) / 26);
    for (let r = 0; r < rows; r++) {
      const y = -r * 26 - 26;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 2, y);
      ctx.lineTo(w / 2 - 2, y);
      for (let x = -w / 2 + (r % 2 ? 30 : 60); x < w / 2 - 6; x += 60) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 26);
      }
      ctx.stroke();
    }
    box(ctx, -w / 2 - 10, -top, w + 20, 16, c.cap);
  },
  /** Four legs with cross braces, a ladder on the climbing side, a deck with a rail and a little roof. */
  lookout_tower(ctx, c, piece, def) {
    const top = def.top;
    const half = def.w / 2 - 25;
    for (const x of [-half, half - 18]) box(ctx, x, -top, 18, top, c.wood);
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (const y of [0.25, 0.6].map((k) => -top * k)) {
      ctx.moveTo(-half + 9, y);
      ctx.lineTo(half - 9, y - top * 0.3);
      ctx.moveTo(half - 9, y);
      ctx.lineTo(-half + 9, y - top * 0.3);
    }
    ctx.stroke();
    // The ladder, at climbAt.
    const lx = def.climbAt;
    for (const x of [lx - 26, lx + 26]) box(ctx, x - 4, -top - 10, 8, top + 10, c.wood, INK, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let y = -30; y > -top; y -= 36) {
      ctx.moveTo(lx - 24, y);
      ctx.lineTo(lx + 24, y);
    }
    ctx.stroke();
    // The deck, its rail (open at the ladder) and the roof on two posts.
    box(ctx, -def.w / 2, -top, def.w, 16, c.wood);
    box(ctx, -def.w / 2 + 70, -top - 70, def.w - 70, 10, c.dark, INK, 3);
    for (const x of [-def.w / 2 + 70, 0, def.w / 2 - 8]) box(ctx, x, -top - 70, 8, 70, c.dark, INK, 3);
    for (const x of [-half + 4, half - 14]) box(ctx, x, -top - 200, 10, 130, c.dark, INK, 3);
    ctx.fillStyle = c.roof;
    ctx.beginPath();
    ctx.moveTo(-def.w / 2 - 30, -top - 195);
    ctx.lineTo(0, -top - 270);
    ctx.lineTo(def.w / 2 + 30, -top - 195);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
  },
};
