// Appearance (STORY_SPEC 6.3). Milestone: S3. Hair, masks and head/neck/back accessories for story
// characters, drawn around the head in face axes: angle 0 points forward, 90° up, 180° back.
// Order (character.js): backpack and ponytail behind the body; mask before the face features; hair,
// eyepatch, antenna and crown after them; bowtie on the neck.

const INK = "#111111";
const DEG = Math.PI / 180;

/** Point on (or around) the head at angle phi (degrees), k head radii from the center. */
const polar = (c, r, ax, phi, k = 1) => ({
  x: c.x + r * k * (Math.cos(phi * DEG) * ax.f.x + Math.sin(phi * DEG) * ax.u.x),
  y: c.y + r * k * (Math.cos(phi * DEG) * ax.f.y + Math.sin(phi * DEG) * ax.u.y),
});

function fillPath(ctx, pts, color, lw) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}

const arcPts = (c, r, ax, from, to, k, n = 14) => Array.from({ length: n + 1 }, (_, i) => polar(c, r, ax, from + ((to - from) * i) / n, k));

/** Ponytail (behind the head). */
export function drawHairBack(ctx, c, r, ax, look) {
  if (look.hair !== "ponytail") return;
  const color = look.hairColor || "#3a2a20";
  const root = polar(c, r, ax, 165, 0.95);
  const tip = polar(c, r, ax, 200, 2.0);
  const mid = polar(c, r, ax, 185, 1.6);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.quadraticCurveTo(mid.x + (tip.x - c.x) * 0.1, mid.y - r * 0.4, tip.x, tip.y);
  ctx.quadraticCurveTo(mid.x, mid.y + r * 0.3, polar(c, r, ax, 185, 0.9).x, polar(c, r, ax, 185, 0.9).y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Hair over the head: bob (and the top of a ponytail), spiky, cap. Never below the brows in front. */
export function drawHair(ctx, c, r, ax, look) {
  const hair = look.hair;
  if (!hair || hair === "none") return;
  const color = look.hairColor || (hair === "cap" ? "#d94b4b" : "#3a2a20");
  const lw = r * 0.08;
  if (hair === "bob" || hair === "ponytail") {
    // From the forehead over the top to the back of the neck, hugging the head.
    const outer = arcPts(c, r, ax, 62, 235, 1.1);
    const inner = arcPts(c, r, ax, 225, 75, 0.82, 10);
    fillPath(ctx, [...outer, ...inner], color, lw);
  } else if (hair === "spiky") {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const phi = 55 + i * 15;
      pts.push(polar(c, r, ax, phi, i % 2 ? 1.5 : 0.98));
    }
    pts.push(polar(c, r, ax, 200, 0.75), polar(c, r, ax, 70, 0.75));
    fillPath(ctx, pts, color, lw);
  } else if (hair === "cap") {
    const dome = arcPts(c, r, ax, 25, 185, 1.06);
    fillPath(ctx, [...dome, polar(c, r, ax, 185, 0.55), polar(c, r, ax, 25, 0.55)], color, lw);
    // Brim forward.
    const a = polar(c, r, ax, 30, 1.0);
    const b = { x: a.x + ax.f.x * r * 0.75 - ax.u.x * r * 0.05, y: a.y + ax.f.y * r * 0.75 - ax.u.y * r * 0.05 };
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.15;
    ctx.stroke();
  }
}

/** A mask band across the eyes (clipped to the head), with eye holes; drawn before the face features. */
export function drawMask(ctx, c, r, ax, color) {
  const at = (fa, ua) => ({ x: c.x + ax.f.x * r * fa + ax.u.x * r * ua, y: c.y + ax.f.y * r * fa + ax.u.y * r * ua });
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color || "#222244";
  const band = [at(-1.2, 0.36), at(1.2, 0.36), at(1.2, -0.1), at(-1.2, -0.1)];
  ctx.beginPath();
  ctx.moveTo(band[0].x, band[0].y);
  for (const p of band.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  for (const fa of [0.5, 0.12]) {
    const p = at(fa, 0.13);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.16, r * 0.12, Math.atan2(ax.f.y, ax.f.x), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Eyepatch over the front eye, with a strap. */
export function drawEyepatch(ctx, c, r, ax, color) {
  const eye = { x: c.x + ax.f.x * r * 0.5 + ax.u.x * r * 0.12, y: c.y + ax.f.y * r * 0.5 + ax.u.y * r * 0.12 };
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  const s0 = polar(c, r, ax, 60, 1);
  const s1 = polar(c, r, ax, 175, 1);
  ctx.moveTo(s0.x, s0.y);
  ctx.quadraticCurveTo(eye.x, eye.y - r * 0.1, s1.x, s1.y);
  ctx.stroke();
  ctx.fillStyle = color || INK;
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y, r * 0.2, r * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Antenna and crown on top of the head. */
export function drawHeadTop(ctx, c, r, ax, acc) {
  if (acc.antenna) {
    const base = polar(c, r, ax, 100, 1);
    const tip = polar(c, r, ax, 112, 1.85);
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(polar(c, r, ax, 95, 1.5).x, polar(c, r, ax, 95, 1.5).y, tip.x, tip.y);
    ctx.stroke();
    ctx.fillStyle = acc.antenna;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (acc.crown) {
    const a = polar(c, r, ax, 125, 0.95);
    const b = polar(c, r, ax, 60, 0.95);
    const up = (p, k) => ({ x: p.x + ax.u.x * r * k, y: p.y + ax.u.y * r * k });
    const pts = [a, up(a, 0.55)];
    for (let i = 1; i <= 4; i++) {
      const p = { x: a.x + (b.x - a.x) * (i / 4), y: a.y + (b.y - a.y) * (i / 4) };
      pts.push(up(p, i % 2 ? 0.25 : 0.55));
    }
    pts.push(b);
    fillPath(ctx, pts, acc.crown, r * 0.07);
  }
}

/** Bowtie at the neck. */
export function drawBowtie(ctx, j, r, color, facing) {
  const c = j.neckTop;
  const s = r * 0.32;
  const f = facing;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.06;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(c.x + f * s * 0.2, c.y);
    ctx.lineTo(c.x + f * s * 0.2 + side * s * 0.25, c.y - s);
    ctx.lineTo(c.x + f * s * 0.2 + side * s * 0.25, c.y + s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** Backpack behind the torso (drawn before the body). */
export function drawBackpack(ctx, j, r, color, facing) {
  const dx = j.neckTop.x - j.hip.x;
  const dy = j.neckTop.y - j.hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const up = { x: dx / len, y: dy / len };
  // Backward = minus the forward axis (forward is up rotated 90° toward facing, as in character.js).
  const back = facing === 1 ? { x: up.y, y: -up.x } : { x: -up.y, y: up.x };
  const c = { x: j.hip.x + dx * 0.6 + back.x * r * 0.75, y: j.hip.y + dy * 0.6 + back.y * r * 0.75 };
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.atan2(up.y, up.x) + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, -len * 0.3, r * 1.1, len * 0.6, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
