// Four-legged characters (STORY_SPEC 6.2, ADR-020). Milestone: A1.
// Joints carry quadruped meanings (skeleton_quad.js): hip = rear hip, shoulder = front shoulders,
// l* limbs = far side, r* limbs = near side. The tail and the ears are not stored: they are drawn from
// the face, the scene time and the hip's movement since the previous frame, seeded by the id.

import { drawFace } from "./face.js";
import { drawProp } from "./props.js";
import { propTransform } from "../props.js";
import { SNOUT_TURN } from "../skeleton_quad.js";
import { limbLine } from "./limb_curves.js";

const WAG = {
  happy: { lift: 55, amp: 26, hz: 3.4 },
  calm: { lift: 35, amp: 12, hz: 1.3 },
  sad: { lift: -35, amp: 4, hz: 0.6 },
  scared: { lift: -70, amp: 3, hz: 6 },
  asleep: { lift: -15, amp: 0, hz: 0 },
};
const MOOD = {
  happy: "happy", laugh: "happy", love: "happy", smug: "happy", determined: "calm", surprised: "calm",
  sad: "sad", cry: "sad", tired: "sad", hurt: "sad", dizzy: "sad", scared: "scared", asleep: "asleep",
};

/** A stable number in [0, 1) from an id (the wag phase), so every dog wags on its own beat. */
function phaseOf(id = "") {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const unit = (a, b) => {
  const x = b.x - a.x;
  const y = b.y - a.y;
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};
/** Rotate v by deg degrees clockwise on screen (y down). */
const turn = (v, deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
};
const add = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k });

function fillShape(ctx, path, color, s) {
  ctx.beginPath();
  path();
  ctx.fillStyle = color;
  ctx.fill();
  if (s.outline) {
    ctx.strokeStyle = s.outlineColor;
    ctx.lineWidth = s.olw;
    ctx.stroke();
  }
}

function strokeLeg(ctx, pts0, color, lw, s) {
  const pts = s.limbStyle ? limbLine(pts0, s.limbStyle) : pts0; // rubber-hose legs (ADR-034)
  const line = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  if (s.outline) {
    ctx.strokeStyle = s.outlineColor;
    ctx.lineWidth = lw * 1.45;
    line();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  line();
  // A round paw, a little forward of the leg's end.
  const paw = add(pts0[2], { x: s.facing, y: 0 }, lw * 0.35);
  fillShape(ctx, () => ctx.ellipse(paw.x, paw.y, lw * 0.85, lw * 0.55, 0, 0, Math.PI * 2), color, s);
}

/** The tail from the rear of the body: lifted and wagging by mood, streaming back when running. */
function drawTail(ctx, j, s, back, up, len, color) {
  const mood = WAG[MOOD[s.faceName] || "calm"];
  const t = s.time ?? 0;
  const speed = s.prevHip ? Math.abs(j.hip.x - s.prevHip.x) * 60 : 0; // px/s at 60 fps
  const run = Math.min(1, speed / 400);
  const lift = mood.lift * (1 - run) + 15 * run;
  const wag = mood.amp * (1 - run * 0.7) * Math.sin(2 * Math.PI * (mood.hz * t + phaseOf(s.id)));
  const base = add(add(j.hip, back, s.bw * 0.55), up, s.bw * 0.35);
  // Angle from straight back, lifted toward up (for facing right a clockwise turn of "back" lifts it).
  const dir = turn(back, s.facing * (lift + wag));
  const mid = add(add(base, dir, len * 0.55), up, len * 0.12);
  const tip = add(base, turn(dir, s.facing * (20 + wag * 0.5)), len);
  const lw = s.lw * 1.1;
  if (s.outline) {
    ctx.strokeStyle = s.outlineColor;
    ctx.lineWidth = lw * 1.45;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
  ctx.stroke();
}

/** A floppy (or pointy) ear hanging from the back top of the head; bounces with the head. */
function drawEar(ctx, head, r, ax, s, near, color) {
  const kind = s.quad.ears || "floppy";
  const bounce = s.prevHead ? Math.max(-1, Math.min(1, (head.y - s.prevHead.y) * 0.4)) : 0;
  const base = add(add(head, ax.u, r * 0.62), ax.f, near ? -r * 0.55 : -r * 0.3);
  if (kind === "pointy") {
    const tip = add(add(base, ax.u, r * 0.85), ax.f, -r * 0.2);
    fillShape(ctx, () => {
      ctx.moveTo(base.x + ax.f.x * r * 0.32, base.y + ax.f.y * r * 0.32);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(base.x - ax.f.x * r * 0.32, base.y - ax.f.y * r * 0.32);
      ctx.closePath();
    }, color, s);
    return;
  }
  // Floppy: a teardrop falling down the back of the head, swinging back a little when the head drops.
  const down = { x: -ax.u.x, y: -ax.u.y };
  const swing = add(down, ax.f, -0.35 - bounce * 0.25);
  const tip = add(base, swing, r * 1.15);
  const side = { x: -swing.y, y: swing.x };
  const w = r * 0.42;
  fillShape(ctx, () => {
    ctx.moveTo(base.x + side.x * w * 0.5, base.y + side.y * w * 0.5);
    ctx.quadraticCurveTo(tip.x + side.x * w * 1.2, tip.y + side.y * w * 1.2, tip.x, tip.y);
    ctx.quadraticCurveTo(tip.x - side.x * w * 1.2, tip.y - side.y * w * 1.2, base.x - side.x * w * 0.5, base.y - side.y * w * 0.5);
    ctx.closePath();
  }, color, s);
}

/**
 * Draw a quadruped. Style as drawCharacter's, plus quad (the plan's look: ears, earColor, tail, patch,
 * belly, collar, bell), grip (where the mouth holds a prop), faceName, id, time, prevHip and prevHead (the previous frame's, for the tail and ears).
 */
export function drawQuadruped(ctx, j, s0, shade) {
  const dims = s0.dims;
  const s = { ...s0, quad: s0.quad || {}, lw: dims.lineWidth * s0.scale };
  s.olw = s.lw * 0.45;
  s.bw = (dims.bodyWidth ?? 12) * s.scale;
  const q = s.quad;
  const fwd = unit(j.hip, j.shoulder); // along the spine, toward the head
  const back = { x: -fwd.x, y: -fwd.y };
  const up = s.facing === 1 ? { x: fwd.y, y: -fwd.x } : { x: -fwd.y, y: fwd.x };
  const far = shade(s.color, s.farBrightness);
  const earColor = q.earColor || shade(s.color, 0.6);
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Far legs, then the tail, behind the body.
  strokeLeg(ctx, [j.shoulder, j.lElbow, j.lHand], far, s.lw, s);
  strokeLeg(ctx, [j.hip, j.lKnee, j.lFoot], far, s.lw, s);
  if (q.tail !== "none") drawTail(ctx, j, s, back, up, dims.torso * s.scale * (q.tail === "stub" ? 0.2 : 0.5), s.color);

  // Neck: a thick stroke from the shoulders to the head.
  for (const [color, w] of s.outline ? [[s.outlineColor, s.bw * 1.2 + s.olw * 2], [s.color, s.bw * 1.2]] : [[s.color, s.bw * 1.2]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(j.shoulder.x, j.shoulder.y);
    ctx.lineTo(j.neckTop.x, j.neckTop.y);
    ctx.stroke();
  }

  // Body: a bean from the rear hip to the shoulders, a lighter belly underneath.
  const a = add(j.hip, back, s.bw * 0.15);
  const b = add(j.shoulder, fwd, s.bw * 0.1);
  const ang = Math.atan2(fwd.y, fwd.x);
  fillShape(ctx, () => {
    ctx.arc(b.x, b.y, s.bw, ang - Math.PI / 2, ang + Math.PI / 2, false);
    ctx.arc(a.x, a.y, s.bw * 1.05, ang + Math.PI / 2, ang - Math.PI / 2, false);
    ctx.closePath();
  }, s.color, s);
  if (q.belly) {
    const c = add(add(j.hip, fwd, Math.hypot(j.shoulder.x - j.hip.x, j.shoulder.y - j.hip.y) * 0.5), up, -s.bw * 0.45);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, Math.hypot(j.shoulder.x - j.hip.x, j.shoulder.y - j.hip.y) * 0.42, s.bw * 0.42, ang, 0, Math.PI * 2);
    ctx.fillStyle = q.belly;
    ctx.fill();
  }

  // Near legs in front of the body.
  strokeLeg(ctx, [j.hip, j.rKnee, j.rFoot], s.color, s.lw, s);
  strokeLeg(ctx, [j.shoulder, j.rElbow, j.rHand], s.color, s.lw, s);

  // Collar round the neck, near the shoulders, with a bell.
  if (q.collar) {
    const nd = unit(j.shoulder, j.neckTop);
    const at = add(j.shoulder, nd, Math.hypot(j.neckTop.x - j.shoulder.x, j.neckTop.y - j.shoulder.y) * 0.55);
    const side = { x: -nd.y, y: nd.x };
    ctx.strokeStyle = q.collar;
    ctx.lineWidth = s.lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(at.x + side.x * s.bw * 0.62, at.y + side.y * s.bw * 0.62);
    ctx.lineTo(at.x - side.x * s.bw * 0.62, at.y - side.y * s.bw * 0.62);
    ctx.stroke();
    if (q.bell) {
      const low = s.facing === 1 ? side : { x: -side.x, y: -side.y };
      const bell = add(at, low.y > 0 ? low : { x: -low.x, y: -low.y }, s.bw * 0.7);
      fillShape(ctx, () => ctx.arc(bell.x, bell.y, s.lw * 0.5, 0, Math.PI * 2), q.bell, s);
    }
  }

  // Head: snout direction from the neck, turned down toward the front.
  const r = dims.headR * s.scale;
  const n = unit(j.neckTop, j.head);
  const f = turn(n, s.facing * SNOUT_TURN);
  const u = s.facing === 1 ? { x: f.y, y: -f.x } : { x: -f.y, y: f.x };
  const ax = { u, f };
  drawEar(ctx, j.head, r, ax, s, false, shade(earColor, 0.85));
  fillShape(ctx, () => ctx.arc(j.head.x, j.head.y, r, 0, Math.PI * 2), s.color, s);
  const snout = add(add(j.head, f, r * 0.82), u, -r * 0.28);
  fillShape(ctx, () => ctx.ellipse(snout.x, snout.y, r * 0.62, r * 0.42, Math.atan2(f.y, f.x), 0, Math.PI * 2), q.belly || s.color, s);
  if (q.patch) {
    const p = add(add(j.head, f, r * 0.5), u, r * 0.12);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = q.patch;
    ctx.fill();
  }
  if (s.face) drawFace(ctx, j.head, r, ax, s.face, { ...(s.faceOpts || {}), look: s.look });
  const nose = add(add(j.head, f, r * 1.38), u, -r * 0.12);
  fillShape(ctx, () => ctx.ellipse(nose.x, nose.y, r * 0.2, r * 0.15, Math.atan2(f.y, f.x), 0, Math.PI * 2), "#2a1a14", { ...s, outline: false });
  drawEar(ctx, j.head, r, ax, s, true, earColor);
  // A held thing sits in the mouth (the plan's grip).
  if (s.prop) drawProp(ctx, s.prop.data, propTransform(j, s.prop.data, s.prop.angle, s.facing, s.scale, s.grip || { offset: [r / s.scale, 4] }), s.scale, s.outlineColor);
  ctx.restore();
}
