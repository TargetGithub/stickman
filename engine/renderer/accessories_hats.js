// Series head pieces (Doopi & Friends, batch B): chilli_hat (Madam Mirchi), pirate_hat (Captain Kanta, a
// tricorn with a fish, never a skull) and beard (Mallu Uncle). Drawn in face axes like accessories_more.js
// (angle 0 forward, 90° up, 180° back), after the face and the hair.

const INK = "#111111";
const DEG = Math.PI / 180;

const at = (c, r, ax, fa, ua) => ({ x: c.x + r * (fa * ax.f.x + ua * ax.u.x), y: c.y + r * (fa * ax.f.y + ua * ax.u.y) });
const polar = (c, r, ax, phi, k = 1) => at(c, r, ax, Math.cos(phi * DEG) * k, Math.sin(phi * DEG) * k);

/** Outline then fill a closed path of points, with optional quadratic segments ({ q, to }). */
function shape(ctx, start, segs, color, lw) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (const s of segs) {
    if (s.q) ctx.quadraticCurveTo(s.q.x, s.q.y, s.to.x, s.to.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** A tall red chilli worn as a hat: wide at the head, curving back to a point, green cap at the base. */
function chilliHat(ctx, c, r, ax, color) {
  const p = (phi, k) => polar(c, r, ax, phi, k);
  const lw = r * 0.08;
  shape(ctx, p(45, 1.0), [
    { q: p(72, 3.4), to: p(140, 4.1) },
    { q: p(112, 2.3), to: p(138, 1.0) },
  ], color, lw);
  // A shine along the front.
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  const a = p(66, 1.4);
  const m = p(82, 2.7);
  const b = p(120, 3.5);
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(m.x, m.y, b.x, b.y);
  ctx.stroke();
  // The green calyx where it sits on the head, and a little stem curl.
  shape(ctx, p(48, 0.98), [p(62, 1.22), p(80, 1.08), p(98, 1.24), p(116, 1.1), p(136, 1.2), p(140, 0.95)], "#3fae5a", lw * 0.8);
  ctx.strokeStyle = "#2f8a45";
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  const s0 = p(95, 1.2);
  const s1 = p(80, 1.45);
  ctx.moveTo(s0.x, s0.y);
  ctx.quadraticCurveTo(s1.x, s1.y, p(70, 1.35).x, p(70, 1.35).y);
  ctx.stroke();
}

/** A three-cornered pirate hat with a gold trim and a white fish emblem at the front. */
function pirateHat(ctx, c, r, ax, color) {
  const p = (phi, k) => polar(c, r, ax, phi, k);
  const lw = r * 0.08;
  // Crown, then the brim folded up into three corners.
  shape(ctx, p(36, 1.02), [{ q: p(90, 2.2), to: p(150, 1.02) }], color, lw);
  shape(ctx, p(8, 1.55), [
    { q: p(55, 1.35), to: p(90, 1.95) },
    { q: p(128, 1.35), to: p(176, 1.6) },
    p(150, 0.98),
    { q: p(90, 1.25), to: p(30, 0.98) },
  ], color, lw);
  ctx.strokeStyle = "#e6b84a";
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  const t0 = p(14, 1.42);
  ctx.moveTo(t0.x, t0.y);
  ctx.quadraticCurveTo(p(55, 1.25).x, p(55, 1.25).y, p(90, 1.82).x, p(90, 1.82).y);
  ctx.quadraticCurveTo(p(128, 1.25).x, p(128, 1.25).y, p(170, 1.48).x, p(170, 1.48).y);
  ctx.stroke();
  // The fish: an oval body and a tail.
  const fc = p(68, 1.5);
  const fr = r * 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(fc.x, fc.y, fr, fr * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fc.x - fr * 0.8, fc.y);
  ctx.lineTo(fc.x - fr * 1.5, fc.y - fr * 0.55);
  ctx.lineTo(fc.x - fr * 1.5, fc.y + fr * 0.55);
  ctx.closePath();
  ctx.fill();
}

/** A round fluffy beard around the chin, scalloped at the edge. */
function beard(ctx, c, r, ax, color) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const phi = 200 + (140 * i) / 14;
    const bump = i % 2 ? 0.08 : 0;
    const k = 0.78 + 0.72 * Math.sin(((phi - 200) / 140) * Math.PI) + bump;
    pts.push(polar(c, r, ax, phi, k));
  }
  pts.push(polar(c, r, ax, 340, 0.55), polar(c, r, ax, 270, 0.45), polar(c, r, ax, 200, 0.55));
  shape(ctx, pts[0], pts.slice(1), color, r * 0.07);
}

/** Series head pieces, after the face and the hair. */
export function drawHats(ctx, c, r, ax, acc) {
  if (acc.beard) beard(ctx, c, r, ax, acc.beard);
  if (acc.chilli_hat) chilliHat(ctx, c, r, ax, acc.chilli_hat);
  if (acc.pirate_hat) pirateHat(ctx, c, r, ax, acc.pirate_hat);
}
