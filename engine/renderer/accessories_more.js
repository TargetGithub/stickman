// More appearance options (Doopi & Friends, package A2): head pieces (horns, stub_horns, turban,
// sprout, hair_flower, moustache), the bun hair style, and hand pieces (mittens, bracelet).
// Head pieces are drawn in face axes like appearance.js (angle 0 forward, 90° up, 180° back);
// appearance.js calls them at its hooks (behind the head, after the hair). Hand pieces follow the
// joints: the far mitten goes behind the character, the near mitten and the bracelet in front.

import { dimsOf } from "../skeleton.js";
import { drawHats } from "./accessories_hats.js";
import { drawWindupKey } from "./robot.js";
import { drawHeadBaaaana, drawHandBaaaana } from "./accessories_baaaana.js";

const INK = "#111111";
const DEG = Math.PI / 180;
/** Rainbow order for the bracelet's gem slots (red first, violet last). */
export const RAINBOW = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#1e90ff", "#4b3bd6", "#a347e0"];
const UNLIT = "#6e6a7a";

/** Point at (fa, ua) head radii in face axes. */
const at = (c, r, ax, fa, ua) => ({ x: c.x + r * (fa * ax.f.x + ua * ax.u.x), y: c.y + r * (fa * ax.f.y + ua * ax.u.y) });
/** Point at angle phi (degrees), k head radii from the center. */
const polar = (c, r, ax, phi, k = 1) => at(c, r, ax, Math.cos(phi * DEG) * k, Math.sin(phi * DEG) * k);

/** Multiply a #rrggbb color by k. */
function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function fillPath(ctx, pts, color, lw) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function disc(ctx, p, rad, color, lw) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (lw) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// ---- Head pieces -------------------------------------------------------------------------------

/**
 * One curly ram horn: a tapering spiral from the top of the head, curling back and down around a
 * center behind the crown. `shift` moves it in face axes (the far horn sits a little forward).
 */
function ramHorn(ctx, c, r, ax, color, shift) {
  const o = { f: -0.55 + shift.f, u: 0.55 + shift.u };
  const n = 22;
  const center = [];
  const width = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const th = (30 + 355 * t) * DEG; // from the crown up, over the top, back, down and forward again
    const rad = 0.85 - 0.66 * t;
    center.push(at(c, r, ax, o.f + Math.cos(th) * rad, o.u + Math.sin(th) * rad));
    width.push(r * (0.46 - 0.32 * t));
  }
  // Outline as a polygon: offset each center point both ways along the normal.
  const side = (k) => center.map((p, i) => {
    const a = center[Math.max(0, i - 1)];
    const b = center[Math.min(n, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / l) * width[i] * 0.5 * k, y: p.y + (dx / l) * width[i] * 0.5 * k };
  });
  // The outline never gets thinner than ~1.6 px, so the horns hold their shape far away.
  fillPath(ctx, [...side(1), ...side(-1).reverse()], color, Math.max(1.6, r * 0.09));
  // Three ring grooves across the horn.
  ctx.strokeStyle = tint(color.startsWith("#") ? color : "#e6b84a", 0.6);
  ctx.lineWidth = Math.max(0.8, r * 0.06);
  ctx.lineCap = "round";
  for (const i of [5, 9, 13]) {
    const a = side(0.8)[i];
    const b = side(-0.8)[i];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

/** Far ram horn, drawn behind the head (before the head disc). */
export function drawHornsBack(ctx, c, r, ax, acc) {
  if (acc.horns) ramHorn(ctx, c, r, ax, tint(acc.horns, 0.78), { f: 0.22, u: 0.1 });
}

/** A round bun on top of the head with a hairpin, over a short cap of hair. */
export function drawBun(ctx, c0, r, ax0, color) {
  const lw = r * 0.08;
  const { c, ax } = slideAt(c0, r, ax0, 120, 1.22);
  disc(ctx, polar(c, r, ax, 120, 1.22), r * 0.55, color, lw);
  for (const a of mirrorAxes(ax0)) {
    const outer = Array.from({ length: 15 }, (_, i) => polar(c0, r, a, 55 + (150 * i) / 14, 1.08));
    const inner = Array.from({ length: 11 }, (_, i) => polar(c0, r, a, 205 - (130 * i) / 10, 0.86));
    fillPath(ctx, [...outer, ...inner], color, lw);
  }
  // The hairpin: a wooden stick through the bun.
  const a = polar(c, r, ax, 92, 1.32);
  const b = polar(c, r, ax, 140, 1.5);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = "#a0673a";
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
}

/** A wrapped turban with a round jewel at the front (it covers the hair). */
function turban(ctx, c, r, ax, color) {
  const lw = r * 0.08;
  const dome = Array.from({ length: 17 }, (_, i) => {
    const phi = 52 + (153 * i) / 16;
    const peak = 1 + 0.18 * Math.exp(-(((phi - 105) / 40) ** 2)); // a soft rounded top
    return polar(c, r, ax, phi, 1.14 * peak);
  });
  fillPath(ctx, [...dome, polar(c, r, ax, 205, 0.8), polar(c, r, ax, 52, 0.98)], color, lw);
  // Wrap folds across the dome.
  ctx.strokeStyle = tint(color, 0.72);
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = "round";
  for (const [p0, p1, k] of [[56, 150, 1.0], [78, 190, 0.95], [115, 200, 0.88], [55, 112, 1.08]]) {
    // Folds wrap diagonally from the front-bottom up over the back.
    ctx.beginPath();
    const a = polar(c, r, ax, p0, 0.95);
    const m = polar(c, r, ax, (p0 + p1) / 2, 1.15 * k + 0.12);
    const b = polar(c, r, ax, p1, 0.98 * k);
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(m.x, m.y, b.x, b.y);
    ctx.stroke();
  }
  disc(ctx, polar(c, r, ax, 68, 1.12), r * 0.17, "#ffe08a", r * 0.05);
  disc(ctx, polar(c, r, ax, 68, 1.12), r * 0.1, "#e63946");
}

/** A short stem with two leaves growing from the top of the head. */
function sprout(ctx, c, r, ax, color) {
  const base = polar(c, r, ax, 98, 0.96);
  const tip = polar(c, r, ax, 92, 1.55);
  const bend = polar(c, r, ax, 108, 1.3);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.17;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(bend.x, bend.y, tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = tint(color, 0.8);
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
  for (const side of [1, -1]) {
    // Leaves tilt out to the front and the back, slightly up.
    const dir = { x: ax.f.x * side * 0.8 + ax.u.x * 0.45, y: ax.f.y * side * 0.8 + ax.u.y * 0.45 };
    const ctr = { x: tip.x + dir.x * r * 0.36, y: tip.y + dir.y * r * 0.36 };
    ctx.beginPath();
    ctx.ellipse(ctr.x, ctr.y, r * 0.4, r * 0.19, Math.atan2(dir.y, dir.x), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.07;
    ctx.stroke();
  }
}

/** A five-petal flower clip above the ear (the back half of the head in side view). */
function hairFlower(ctx, c, r, ax, color) {
  const ctr = polar(c, r, ax, 135, 0.98);
  const pr = r * 0.17;
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 + 90) * DEG;
    disc(ctx, { x: ctr.x + Math.cos(a) * pr * 1.05, y: ctr.y - Math.sin(a) * pr * 1.05 }, pr, color, r * 0.05);
  }
  disc(ctx, ctr, pr * 0.75, "#ffd60a", r * 0.05);
}

/** A big curly handlebar moustache between the eyes and the mouth. */
function moustache(ctx, c, r, ax, color) {
  const p = (fa, ua) => at(c, r, ax, fa, ua);
  ctx.beginPath();
  const m = p(0.42, -0.15);
  ctx.moveTo(m.x, m.y);
  for (const side of [1, -1]) {
    // Each half: a fat lobe out to the side, curling up at the tip.
    const q = (df, du) => p(0.42 + side * df, -0.15 + du);
    const [a, b, tip, d, e] = [q(0.16, 0.06), q(0.34, -0.1), q(0.5, 0.06), q(0.4, -0.2), q(0.16, -0.16)];
    ctx.moveTo(m.x, m.y);
    ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
    ctx.quadraticCurveTo(tip.x, tip.y, q(0.44, 0.1).x, q(0.44, 0.1).y);
    ctx.quadraticCurveTo(d.x, d.y, q(0.28, -0.2).x, q(0.28, -0.2).y);
    ctx.quadraticCurveTo(e.x, e.y, m.x, m.y);
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.05;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Two tiny crooked cone horns, glued on top of the head. */
function stubHorns(ctx, c, r, ax, color) {
  for (const [phi, lean] of [[72, -10], [112, 12]]) {
    const a = polar(c, r, ax, phi - 9, 0.95);
    const b = polar(c, r, ax, phi + 9, 0.95);
    const tip = polar(c, r, ax, phi + lean, 1.45);
    fillPath(ctx, [a, tip, b], color, r * 0.07);
  }
}

/**
 * Turned views (V3.9): head pieces are authored in profile. `ax.wrap` (0 at the side, 1 from the front or back)
 * says how far the head faces the camera. Masses (hair, cap, turban, horns, crown, moustache) are drawn twice: a
 * mirrored copy whose forward axis is scaled by wrap, then the piece itself, so they wrap round the head and are
 * symmetric from the front. Single pieces (ponytail, bun, antenna, sprout, flower) keep their shape and slide
 * toward the middle of the head, as a point on a turning head does (its forward offset times sin(yaw)).
 */
export function mirrorAxes(ax) {
  const w = ax.wrap || 0;
  const self = { u: ax.u, f: ax.f };
  return w > 0.05 ? [{ u: ax.u, f: { x: -ax.f.x * w, y: -ax.f.y * w } }, self] : [self];
}
/** The head centre to draw a single piece anchored at (phi degrees, dist radii) with, and the plain axes. */
export function slideAt(c, r, ax, phi, dist) {
  const k = Math.sqrt(Math.max(0, 1 - (ax.wrap || 0) ** 2));
  const d = r * dist * Math.cos((phi * Math.PI) / 180) * (k - 1);
  return { c: { x: c.x + ax.f.x * d, y: c.y + ax.f.y * d }, ax: { u: ax.u, f: ax.f } };
}

/** Head pieces drawn after the face and the hair (near horn, turban, sprout, flower, moustache); `ax.wrap`: see mirrorAxes. */
export function drawHeadMore(ctx, c, r, ax0, acc) {
  const masses = mirrorAxes(ax0);
  for (const ax of masses) {
    if (acc.moustache && !ax0.back) moustache(ctx, c, r, ax, acc.moustache);
    if (acc.turban) turban(ctx, c, r, ax, acc.turban);
    if (acc.stub_horns) stubHorns(ctx, c, r, ax, acc.stub_horns);
    if (acc.horns) ramHorn(ctx, c, r, ax, acc.horns, { f: 0, u: 0 });
  }
  if (acc.sprout) { const p = slideAt(c, r, ax0, 98, 0.96); sprout(ctx, p.c, r, p.ax, acc.sprout); }
  if (acc.hair_flower) { const p = slideAt(c, r, ax0, 135, 0.98); hairFlower(ctx, p.c, r, p.ax, acc.hair_flower); }
  for (const ax of masses) drawHats(ctx, c, r, ax, acc); // batch B: chilli_hat, pirate_hat, beard
  drawHeadBaaaana(ctx, c, r, ax0, acc, slideAt); // Baaaana: sprout kinds, party_hat
}

// ---- Hand pieces -------------------------------------------------------------------------------

/** A rounded mitten at a hand, pointing along the forearm, with a thumb bump. */
function mitten(ctx, elbow, hand, size, color) {
  const ang = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, size * 0.22);
  ctx.beginPath();
  ctx.ellipse(size * 0.35, size * 0.55, size * 0.5, size * 0.42, 0.6, 0, Math.PI * 2); // thumb
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(size * 0.25, 0, size * 1.05, size * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A band across the far (left) wrist with seven gem slots; the first `slots` light up in rainbow order. */
function bracelet(ctx, j, lw, color, slots) {
  const e = j.lElbow;
  const h = j.lHand;
  const t = 0.78;
  const p = { x: e.x + (h.x - e.x) * t, y: e.y + (h.y - e.y) * t };
  const ang = Math.atan2(h.y - e.y, h.x - e.x);
  const len = lw * 2.7;
  const thick = lw * 1.05;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.22);
  ctx.beginPath();
  ctx.roundRect(-len / 2, -thick / 2, len, thick, thick * 0.45);
  ctx.fill();
  ctx.stroke();
  const n = RAINBOW.length;
  const lit = Math.max(0, Math.min(n, Math.round(slots ?? 0)));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (len * (i + 0.5)) / n;
    ctx.beginPath();
    ctx.arc(x, 0, Math.max(0.6, (len / n) * 0.36), 0, Math.PI * 2);
    ctx.fillStyle = i < lit ? RAINBOW[i] : UNLIT;
    ctx.fill();
  }
  ctx.restore();
}

/** Line width of a character in px (its plan's lineWidth times its scale). */
const lineOf = (c) => dimsOf(c).lineWidth * c.scale;

/** Hand pieces behind the character: the far mitten. `c` is a frame character, `look` its look. */
export function drawLookBehind(ctx, c, look, t = 0) {
  const acc = look?.accessories;
  if (acc?.windup_key && !c.quad) drawWindupKey(ctx, c, acc.windup_key, t); // batch C: Iron Ghoom's key
  if (!acc?.mittens || c.quad) return;
  ctx.save();
  ctx.globalAlpha = c.alpha ?? 1;
  mitten(ctx, c.j.lElbow, c.j.lHand, lineOf(c) * 0.95, tint(acc.mittens, 0.85));
  ctx.restore();
}

/** Hand pieces in front of the character: the near mitten and the bracelet. */
export function drawLookFront(ctx, c, look) {
  const acc = look?.accessories;
  if (!acc || c.quad || (!acc.mittens && !acc.bracelet && !acc.clipboard)) return;
  ctx.save();
  ctx.globalAlpha = c.alpha ?? 1;
  if (acc.bracelet) bracelet(ctx, c.j, lineOf(c), acc.bracelet, look.slots);
  drawHandBaaaana(ctx, c, acc);
  if (acc.mittens) mitten(ctx, c.j.rElbow, c.j.rHand, lineOf(c) * 0.95, acc.mittens);
  ctx.restore();
}
