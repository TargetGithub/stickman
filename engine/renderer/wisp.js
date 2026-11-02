// The wisp body plan (Doopi season 2: the Hush, the Hush Storm, the grey pretend-monsters): a floating puff with a
// curling tail instead of legs, little puff hands on soft wispy arms and two glowing eyes. It uses the humanoid
// skeleton, so every move, gesture and turn works; the legs are not drawn and the body hovers and bobs above them.
// A pale aura keeps a light violet wisp readable on bright day themes.

import { hash32 } from "../math.js";

const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const mix = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** #rrggbb lightened toward white by k (0-1). */
export function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * k);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/**
 * Where the wisp's parts are: the skeleton lifted by the hover and bob, the tail's curve and its tip.
 * @returns {{ lift:number, head, mid, hip, tip, ctrl, r:number, u, f }}  r: head radius in world px
 */
export function wispFrame(j, s) {
  const r = (s.dims?.headR ?? 26) * s.scale;
  const t = s.time ?? 0;
  const phase = ((hash32(s.id || "wisp") % 1000) / 1000) * Math.PI * 2;
  const ground = Math.max(j.lFoot.y, j.rFoot.y);
  const lift = r * 0.9 + Math.sin(t * 2.1 + phase) * r * 0.18;
  const up = (p) => ({ x: p.x, y: p.y - lift });
  const head = up(j.head);
  const hip = up(j.hip);
  const neck = up(j.neckTop);
  const ul = Math.hypot(head.x - neck.x, head.y - neck.y) || 1;
  const u = { x: (head.x - neck.x) / ul, y: (head.y - neck.y) / ul };
  const f = s.facing === 1 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };
  const sway = Math.sin(t * 1.6 + phase) * r * 0.55;
  const tipY = Math.min(ground - lift * 0.5, hip.y + (ground - hip.y) * 0.62);
  const tip = { x: hip.x - s.facing * r * 0.7 + sway, y: tipY };
  const ctrl = { x: hip.x + s.facing * r * 0.4 - sway * 0.4, y: (hip.y + tipY) / 2 };
  return { lift, head, mid: mix(hip, head, 0.45), hip, neck, tip, ctrl, r, u, f };
}

function bodyPath(ctx, w) {
  const { head, mid, hip, tip, ctrl, r } = w;
  ctx.beginPath();
  ctx.moveTo(head.x + r * 1.18, head.y);
  ctx.arc(head.x, head.y, r * 1.18, 0, Math.PI * 2);
  ctx.moveTo(mid.x + r * 0.98, mid.y);
  ctx.arc(mid.x, mid.y, r * 0.98, 0, Math.PI * 2);
  ctx.moveTo(hip.x + r * 0.7, hip.y);
  ctx.arc(hip.x, hip.y, r * 0.7, 0, Math.PI * 2);
  // The tail: a tapering curl from either side of the hip to the tip.
  ctx.moveTo(hip.x - r * 0.62, hip.y);
  ctx.quadraticCurveTo(ctrl.x - r * 0.35, ctrl.y, tip.x, tip.y);
  ctx.quadraticCurveTo(ctrl.x + r * 0.35, ctrl.y, hip.x + r * 0.62, hip.y);
  ctx.closePath();
  // Little puffs round the top of the head.
  for (const [a, k] of [[-2.3, 0.42], [-1.6, 0.5], [-0.9, 0.42]]) {
    const p = { x: head.x + Math.cos(a) * r * 1.0, y: head.y + Math.sin(a) * r * 1.0 };
    ctx.moveTo(p.x + r * k, p.y);
    ctx.arc(p.x, p.y, r * k, 0, Math.PI * 2);
  }
}

function drawEye(ctx, c, rx, ry, face, opts, color) {
  const shut = opts.blink || face.eyes === "closed";
  ctx.save();
  ctx.translate(c.x, c.y);
  if (shut || face.eyes === "happy") {
    ctx.strokeStyle = color;
    ctx.lineWidth = rx * 0.55;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (face.eyes === "happy") ctx.arc(0, ry * 0.3, rx, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(0, -ry * 0.2, rx, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const k = face.eyes === "wide" ? 1.22 : 1;
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * 2.4);
  halo.addColorStop(0, "rgba(255, 250, 200, 0.75)");
  halo.addColorStop(1, "rgba(255, 250, 200, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, ry * 2.4, 0, Math.PI * 2);
  ctx.fill();
  const sy = face.eyes === "half" ? 0.55 : 1;
  // A dark socket, the glowing eye inside it and a white glint: readable on light and dark places alike.
  ctx.fillStyle = "#2c1a52";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * k * 1.3, ry * k * sy * 1.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.08, rx * k * 0.92, ry * k * sy * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(rx * 0.3, -ry * 0.25 * sy, rx * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWispFace(ctx, w, s) {
  const face = s.face || { eyes: "dot", mouth: "line" };
  const opts = s.faceOpts || {};
  const { r, u, f } = w;
  const shift = s.faceShift || 0;
  const centre = add(w.head, f, -shift * r);
  const at = (fa, ua) => ({ x: centre.x + f.x * fa * r + u.x * ua * r, y: centre.y + f.y * fa * r + u.y * ua * r });
  const eyeColor = "#ffe66b";
  const tilt = ((face.brows?.tilt ?? 0) * Math.PI) / 180;
  for (const [fa, side] of [[0.66, 1], [0.04, -1]]) {
    const c = at(fa - shift * 0.35, 0.12 + (face.brows?.lift ?? 0));
    drawEye(ctx, c, r * 0.19, r * 0.27, face, opts, eyeColor);
    if (face.brows && Math.abs(tilt) > 0.15) {
      // A darker lid over the eye shows the brows' mood (angry slants in, worried slants out).
      const lean = side * tilt * 0.9;
      ctx.strokeStyle = "rgba(40, 20, 70, 0.75)";
      ctx.lineWidth = r * 0.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.x - f.x * r * 0.22 + u.x * r * (0.34 - lean * 0.2), c.y - f.y * r * 0.22 + u.y * r * (0.34 - lean * 0.2));
      ctx.lineTo(c.x + f.x * r * 0.22 + u.x * r * (0.34 + lean * 0.2), c.y + f.y * r * 0.22 + u.y * r * (0.34 + lean * 0.2));
      ctx.stroke();
    }
  }
  const m = at(0.36 - shift * 0.35, -0.42);
  const mouth = opts.talking ? "o" : face.mouth;
  ctx.strokeStyle = "#2c1a52";
  ctx.fillStyle = "#2c1a52";
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (mouth === "o" || mouth === "open") {
    ctx.ellipse(m.x, m.y, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const bend = mouth === "smile" || mouth === "grin" ? 1 : mouth === "frown" || mouth === "wavy" ? -1 : mouth === "smirk" ? 0.6 : 0;
  const a = add(m, f, -r * 0.16);
  const b = add(m, f, r * (mouth === "smirk" ? 0.2 : 0.16));
  const ctl = add(m, u, -bend * r * 0.14);
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(ctl.x, ctl.y, b.x, b.y);
  ctx.stroke();
}

/**
 * Draw a wisp character (draw "wisp").
 * @param {{ color, scale, facing, alpha?, dims?, face?, faceOpts?, faceShift?, hideFace?, time?, id? }} s
 */
export function drawWisp(ctx, j, s) {
  const w = wispFrame(j, s);
  const { r } = w;
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  // The aura: a pale halo behind everything.
  const cy = (w.head.y + w.tip.y) / 2;
  const R = Math.max(r * 2.6, (w.tip.y - w.head.y) * 1.05);
  const aura = ctx.createRadialGradient(w.mid.x, cy, R * 0.15, w.mid.x, cy, R);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  aura.addColorStop(0.5, "rgba(232, 220, 255, 0.22)");
  aura.addColorStop(1, "rgba(232, 220, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(w.mid.x, cy, R, 0, Math.PI * 2);
  ctx.fill();
  // Wispy arms to the puff hands (far arm first, a little darker).
  const lift = (p) => ({ x: p.x, y: p.y - w.lift });
  ctx.lineCap = "round";
  for (const [sh, el, hand, k] of [[j.lShoulder || j.shoulder, j.lElbow, j.lHand, 0.82], [j.rShoulder || j.shoulder, j.rElbow, j.rHand, 1]]) {
    const a = lift(sh);
    const e = lift(el);
    const h = lift(hand);
    ctx.strokeStyle = k < 1 ? lighten(s.color, 0) : lighten(s.color, 0.25);
    ctx.globalAlpha = (s.alpha ?? 1) * 0.7 * k;
    ctx.lineWidth = r * 0.34;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(e.x, e.y, h.x, h.y);
    ctx.stroke();
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.fillStyle = k < 1 ? s.color : lighten(s.color, 0.3);
    ctx.beginPath();
    ctx.arc(h.x, h.y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  // The body: a soft gradient, light at the top.
  const g = ctx.createLinearGradient(0, w.head.y - r * 1.3, 0, w.tip.y);
  g.addColorStop(0, lighten(s.color, 0.55));
  g.addColorStop(0.45, s.color);
  g.addColorStop(1, lighten(s.color, 0.2));
  ctx.fillStyle = g;
  bodyPath(ctx, w);
  ctx.fill("nonzero");
  if (s.outline !== false) {
    ctx.strokeStyle = s.outlineColor && s.outlineColor !== "#111111" ? s.outlineColor : "rgba(70, 40, 120, 0.55)";
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.globalAlpha = (s.alpha ?? 1) * 0.6;
    bodyPath(ctx, w);
    ctx.stroke();
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.fillStyle = g;
    bodyPath(ctx, w);
    ctx.fill("nonzero"); // the inner seams of the puffs disappear; only the outer rim stays
  }
  if (!s.hideFace) drawWispFace(ctx, w, s);
  ctx.restore();
}
