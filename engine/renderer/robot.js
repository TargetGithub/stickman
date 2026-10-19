// The robot body plan's look (Doopi & Friends batch C, Iron Ghoom): a rounded box torso with rivets and a
// chest panel, a rounded square head, bolts at the elbows and knees, and the windup_key accessory (a big
// brass key in the back that turns slowly). Humanoid rig; character.js and bodies.js call these for
// draw "box".

const INK = "#111111";

/** Unit vectors along the spine (up) and across it. */
function spine(j) {
  const dx = j.neckTop.x - j.hip.x;
  const dy = j.neckTop.y - j.hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const up = { x: dx / len, y: dy / len };
  return { up, across: { x: -up.y, y: up.x }, len };
}

/** A rounded box torso from the hip to the neck, with a chest panel and rivets. */
export function drawBoxTorso(ctx, j, o) {
  const { up, len } = spine(j);
  const w = (o.torsoWidth ?? 30) * o.scale;
  const ang = Math.atan2(up.y, up.x) - Math.PI / 2;
  ctx.save();
  ctx.translate(j.hip.x, j.hip.y);
  ctx.rotate(ang);
  // Local frame: y runs from the hip (0) to the neck (len); x across.
  ctx.beginPath();
  ctx.roundRect(-w, -w * 0.15, w * 2, len + w * 0.25, w * 0.35);
  ctx.fillStyle = o.color;
  ctx.fill();
  if (o.outline) {
    ctx.strokeStyle = o.outlineColor;
    ctx.lineWidth = o.lw * 0.45;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(-w * 0.55, len * 0.38, w * 1.1, len * 0.42, w * 0.15);
  ctx.fillStyle = o.panel ?? "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.fillStyle = o.rivet ?? "rgba(0,0,0,0.35)";
  for (const [x, y] of [[-0.75, 0.1], [0.75, 0.1], [-0.75, 0.92], [0.75, 0.92]]) {
    ctx.beginPath();
    ctx.arc(x * w, y * len, w * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

/** A rounded square head, turned with the head axes (u: up, from the neck). */
export function boxHeadPath(ctx, head, r, u) {
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(Math.atan2(u.y, u.x) + Math.PI / 2);
  ctx.beginPath();
  ctx.roundRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1, r * 0.35);
  ctx.restore();
}

/** Bolts at the elbows and knees. */
export function drawBolts(ctx, j, lw, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, lw * 0.18);
  for (const p of [j.lElbow, j.rElbow, j.lKnee, j.rKnee]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, lw * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** A big brass wind-up key sticking out of the back, turning slowly (t: video seconds). */
export function drawWindupKey(ctx, c, color, t = 0) {
  const j = c.j;
  const { up, across, len } = spine(j);
  const back = -(c.facing ?? 1);
  const s = c.scale ?? 1;
  const base = { x: j.hip.x + up.x * len * 0.62 + across.x * 0, y: j.hip.y + up.y * len * 0.62 };
  const dir = { x: back * Math.abs(across.x) || back, y: 0 };
  const stem = 26 * s;
  const tip = { x: base.x + dir.x * stem * 2.2, y: base.y };
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * s;
  ctx.stroke();
  // Two round wings, squashed as the key turns.
  const turn = Math.abs(Math.cos(t * 1.6));
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(tip.x + dir.x * 8 * s, tip.y + side * 24 * s * (0.35 + 0.65 * turn), 14 * s, 20 * s * (0.35 + 0.65 * turn), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
