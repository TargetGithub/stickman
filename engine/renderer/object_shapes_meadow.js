// Baaaana set pieces (series/baaaana/PLAN.md task 9): picnic_blanket, cake, camera_tripod, yoga_mat and
// mushroom_hut. Same contract as object_shapes.js: (ctx, colors, piece, def), drawn at the bottom centre.

const INK = "#2b2219";

function fillStroke(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** A round mushroom house: a cream stem with a door and a window, under a spotted cap. */
function mushroomHouse(ctx, w, h, c) {
  const stemW = w * 0.62;
  const stemH = h * 0.55;
  ctx.beginPath();
  ctx.moveTo(-stemW / 2, 0);
  ctx.quadraticCurveTo(-stemW * 0.58, -stemH * 0.5, -stemW * 0.45, -stemH);
  ctx.lineTo(stemW * 0.45, -stemH);
  ctx.quadraticCurveTo(stemW * 0.58, -stemH * 0.5, stemW / 2, 0);
  ctx.closePath();
  fillStroke(ctx, c.stem, Math.max(2, w * 0.02));
  ctx.beginPath();
  ctx.roundRect(-w * 0.09, -stemH * 0.62, w * 0.18, stemH * 0.62, [w * 0.09, w * 0.09, 0, 0]);
  fillStroke(ctx, c.door, Math.max(2, w * 0.015));
  ctx.beginPath();
  ctx.arc(stemW * 0.26, -stemH * 0.62, w * 0.06, 0, Math.PI * 2);
  fillStroke(ctx, c.window, Math.max(2, w * 0.015));
  ctx.beginPath();
  ctx.moveTo(-w / 2, -stemH + h * 0.06);
  ctx.quadraticCurveTo(-w * 0.48, -h * 1.02, 0, -h);
  ctx.quadraticCurveTo(w * 0.48, -h * 1.02, w / 2, -stemH + h * 0.06);
  ctx.quadraticCurveTo(0, -stemH - h * 0.04, -w / 2, -stemH + h * 0.06);
  fillStroke(ctx, c.cap, Math.max(2, w * 0.02));
  ctx.fillStyle = c.spots;
  for (const [x, y, r] of [[-0.25, 0.8, 0.07], [0.05, 0.9, 0.06], [0.28, 0.76, 0.05], [-0.05, 0.7, 0.04], [0.36, 0.62, 0.035], [-0.38, 0.6, 0.04]]) {
    ctx.beginPath();
    ctx.arc(x * w, -y * h, r * w, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const MEADOW_SHAPES = {
  picnic_blanket(ctx, c, piece, def) {
    const w = def.w;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w * 0.42, -def.h);
    ctx.lineTo(-w * 0.42, -def.h);
    ctx.closePath();
    fillStroke(ctx, c.cloth, 3);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.check;
    for (let x = -w / 2; x < w / 2; x += 40) ctx.fillRect(x, -def.h, 20, def.h);
    ctx.globalAlpha = 0.5;
    for (let y = 0; y > -def.h; y -= 12) ctx.fillRect(-w / 2, y - 6, w, 6);
    ctx.restore();
  },
  cake(ctx, c, piece, def) {
    const w = def.w;
    for (const [k, y] of [[1, 0], [0.75, -0.42]]) {
      ctx.beginPath();
      ctx.roundRect((-w * k) / 2, y * def.h - def.h * 0.42, w * k, def.h * 0.42, 8);
      fillStroke(ctx, c.sponge, 3);
      ctx.beginPath();
      ctx.roundRect((-w * k) / 2 - 2, y * def.h - def.h * 0.44, w * k + 4, def.h * 0.1, 6);
      fillStroke(ctx, c.icing, 2);
    }
    for (const x of [-0.18, 0, 0.18]) {
      ctx.beginPath();
      ctx.rect(x * w - 3, -def.h - 22, 6, 22);
      fillStroke(ctx, c.candle, 2);
      ctx.fillStyle = "#ffcf3f";
      ctx.beginPath();
      ctx.ellipse(x * w, -def.h - 30, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  camera_tripod(ctx, c, piece, def) {
    ctx.strokeStyle = c.legs;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const x of [-50, 0, 50]) {
      ctx.moveTo(0, -def.h + 50);
      ctx.lineTo(x, 0);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-38, -def.h, 76, 50, 8);
    fillStroke(ctx, c.body, 3);
    ctx.beginPath();
    ctx.arc(26, -def.h + 25, 16, 0, Math.PI * 2);
    fillStroke(ctx, c.lens, 3);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(21, -def.h + 20, 4, 0, Math.PI * 2);
    ctx.fill();
  },
  yoga_mat(ctx, c, piece, def) {
    ctx.beginPath();
    ctx.roundRect(-def.w / 2, -def.h, def.w, def.h, def.h / 2);
    fillStroke(ctx, c.mat, 3);
    ctx.beginPath();
    ctx.arc(def.w / 2 - def.h * 0.6, -def.h * 1.1, def.h * 1.1, 0, Math.PI * 2);
    fillStroke(ctx, c.mat, 3);
  },
  mushroom_hut(ctx, c, piece, def) {
    mushroomHouse(ctx, def.w, def.h, c);
  },
};

export { mushroomHouse };
