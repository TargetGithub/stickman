// Baaaana held shapes (series/baaaana/PLAN.md task 9): trumpet, triangle, pillow and watering_can. Same contract
// as props_series.js: drawn between t.butt (the grip end) and t.tip at the prop's scale.

const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const angleOf = (t) => Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);
const lenOf = (t) => Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);

/** Work in the prop's own frame: x along it from the butt, y across it. */
function frame(ctx, t, draw) {
  ctx.save();
  ctx.translate(t.butt.x, t.butt.y);
  ctx.rotate(angleOf(t));
  draw(lenOf(t));
  ctx.restore();
}

function shape(ctx, fill, outline, lw, path) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** A brass tube with three valves, flaring into a bell at the tip. */
function trumpet(ctx, prop, t, scale, outline) {
  frame(ctx, t, (L) => {
    const w = prop.width * scale;
    shape(ctx, prop.color, outline, 2, () => ctx.rect(0, -w * 0.18, L * 0.72, w * 0.36));
    shape(ctx, prop.color, outline, 2, () => {
      ctx.moveTo(L * 0.7, -w * 0.18);
      ctx.lineTo(L, -w * 0.62);
      ctx.lineTo(L, w * 0.62);
      ctx.lineTo(L * 0.7, w * 0.18);
      ctx.closePath();
    });
    for (const u of [0.32, 0.42, 0.52]) shape(ctx, prop.trim, outline, 1.5, () => ctx.rect(L * u - w * 0.08, -w * 0.62, w * 0.16, w * 0.44));
  });
}

/** A steel triangle hanging from a little string at the tip. */
function triangle(ctx, prop, t, scale, outline) {
  const hang = t.tip;
  const s = prop.width * scale * 1.4;
  ctx.save();
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lerpPt(t.butt, t.tip, 0.6).x, lerpPt(t.butt, t.tip, 0.6).y);
  ctx.lineTo(hang.x, hang.y + s * 0.2);
  ctx.stroke();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(2, s * 0.16);
  ctx.lineJoin = "round";
  const top = { x: hang.x, y: hang.y + s * 0.2 };
  ctx.beginPath();
  ctx.moveTo(top.x - s * 0.08, top.y + s * 0.12);
  ctx.lineTo(top.x - s * 0.55, top.y + s);
  ctx.lineTo(top.x + s * 0.55, top.y + s);
  ctx.lineTo(top.x + s * 0.1, top.y + s * 0.15);
  ctx.stroke();
  ctx.strokeStyle = prop.color;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.stroke();
  ctx.restore();
}

/** A puffy pillow held by one corner, with a soft seam. */
function pillow(ctx, prop, t, scale, outline) {
  frame(ctx, t, (L) => {
    const w = prop.width * scale;
    shape(ctx, prop.color, outline, 2, () => ctx.roundRect(L * 0.05, -w * 0.5, L * 0.95, w, w * 0.4));
    ctx.strokeStyle = prop.trim;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.roundRect(L * 0.12, -w * 0.38, L * 0.8, w * 0.76, w * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

/** A round can held by its handle, the long spout pointing to the tip with a sprinkler rose. */
function wateringCan(ctx, prop, t, scale, outline) {
  frame(ctx, t, (L) => {
    const w = prop.width * scale;
    shape(ctx, prop.color, outline, 2, () => ctx.roundRect(0, -w * 0.1, L * 0.45, w, w * 0.25));
    shape(ctx, prop.color, outline, 2, () => {
      ctx.moveTo(L * 0.42, w * 0.55);
      ctx.lineTo(L * 0.95, -w * 0.15);
      ctx.lineTo(L * 0.98, w * 0.02);
      ctx.lineTo(L * 0.44, w * 0.75);
      ctx.closePath();
    });
    shape(ctx, prop.trim, outline, 1.5, () => ctx.ellipse(L * 0.97, -w * 0.08, w * 0.1, w * 0.2, -0.6, 0, Math.PI * 2));
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(L * 0.2, -w * 0.1, w * 0.3, Math.PI, 0);
    ctx.stroke();
  });
}

const DRAW = { trumpet, triangle, pillow, watering_can: wateringCan };

/** Draws a Baaaana shape; false when the shape is not one of these. */
export function drawBaaaanaProp(ctx, prop, t, scale, outline) {
  const draw = DRAW[prop.shape];
  if (!draw) return false;
  draw(ctx, prop, t, scale, outline);
  return true;
}

export const BAAAANA_PROP_SHAPES = Object.keys(DRAW);
