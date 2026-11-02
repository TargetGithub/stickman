// Season 2 accessories (Doopi & Friends): skates, roller skates on both feet (Zippy the tiffin courier): a boot
// on a plate with two wheels, square to the shin; the far skate behind the body, the near one in front.

import { dimsOf } from "../skeleton.js";

const INK = "#2a2230";

/** Darker shade of a #rrggbb colour (k < 1). */
const tint = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.round(((n >> s) & 255) * k);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

/** One roller skate at a foot (size: the leg's line width). */
export function skate(ctx, knee, foot, size, facing, color) {
  const ang = Math.atan2(foot.y - knee.y, foot.x - knee.x) - (Math.PI / 2) * facing;
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(ang);
  ctx.scale(facing, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, size * 0.2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-size * 0.9, -size * 1.4, size * 1.6, size * 1.7, size * 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-size * 1.1, size * 0.2, size * 2.7, size * 0.45, size * 0.2);
  ctx.fillStyle = "#e8e8f0";
  ctx.fill();
  ctx.stroke();
  for (const x of [-size * 0.55, size * 1.05]) {
    ctx.beginPath();
    ctx.arc(x, size * 1.0, size * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

const lineOf = (c) => dimsOf(c).lineWidth * c.scale;

/** The far skate (behind the character). */
export function drawSkatesBehind(ctx, c, acc) {
  if (acc.skates) skate(ctx, c.j.lKnee, c.j.lFoot, lineOf(c) * 0.85, c.facing || 1, tint(acc.skates, 0.85));
}

/** The near skate (in front of the character). */
export function drawSkatesFront(ctx, c, acc) {
  if (acc.skates) skate(ctx, c.j.rKnee, c.j.rFoot, lineOf(c) * 0.85, c.facing || 1, acc.skates);
}
