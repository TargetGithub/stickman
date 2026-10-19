// Series held shapes (Doopi & Friends batch C): drum (a dhol on a strap), key (Iron Ghoom's brass wind-up
// key) and pan (a frying pan held like a bat, the village's funny shield). Same contract as props_more.js:
// drawn between t.butt and t.tip at the prop's scale.

const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const angleOf = (t) => Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);

function drum(ctx, prop, t, scale, outline) {
  const c = lerpPt(t.butt, t.tip, 0.55);
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angleOf(t) + Math.PI / 2);
  const w = prop.width * scale;
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.55, L * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) { ctx.moveTo(-w * 0.5, (k * L) / 6); ctx.lineTo(w * 0.5, (-k * L) / 6); }
  ctx.stroke();
  for (const end of [-1, 1]) {
    ctx.fillStyle = "#f4ead2";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, (end * L) / 2, w * 0.45, w * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function key(ctx, prop, t, scale, outline) {
  ctx.lineCap = "round";
  const w = prop.width * scale;
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(t.butt.x, t.butt.y);
  ctx.lineTo(t.tip.x, t.tip.y);
  ctx.stroke();
  ctx.strokeStyle = prop.color;
  ctx.lineWidth = w;
  ctx.stroke();
  const a = angleOf(t);
  ctx.save();
  ctx.translate(t.tip.x, t.tip.y);
  ctx.rotate(a);
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(w, side * w * 2.2, w * 1.6, w * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function pan(ctx, prop, t, scale, outline) {
  const head = lerpPt(t.butt, t.tip, 0.72);
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.lineWidth = prop.width * scale + 3;
  ctx.beginPath();
  ctx.moveTo(t.butt.x, t.butt.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = prop.width * scale;
  ctx.stroke();
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(head.x + (t.tip.x - head.x) * 0.2, head.y + (t.tip.y - head.y) * 0.2, L * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Draws a series shape; false when the shape is not one of these. */
export function drawSeriesProp(ctx, prop, t, scale, outline) {
  if (prop.shape === "drum") drum(ctx, prop, t, scale, outline);
  else if (prop.shape === "key") key(ctx, prop, t, scale, outline);
  else if (prop.shape === "pan") pan(ctx, prop, t, scale, outline);
  else return false;
  return true;
}

export const SERIES_PROP_SHAPES = ["drum", "key", "pan"];
