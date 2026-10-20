// Drawing turnaround views (ENGINE_V3_SPEC 5.4, ADR-027). Milestone: V3.6.
// Humanoids: the side-view joints are turned (engine/turnaround.js turnJoints) and drawn by the usual
// character drawer, with the face slid across the head and hidden from behind. Quadrupeds: a front view of
// their own (a round body, four legs side by side, the head facing the camera); between side and front the
// two drawings cross-fade with a little squash so the turn reads.

import { drawFace } from "./face.js";
import { turnJoints, faceShiftOf, faceShows } from "../turnaround.js";

/** The joints and style changes for a humanoid at a yaw (null at the side view). */
export function turnedHumanoid(c, yaw, plan) {
  if (Math.abs(yaw - 90) < 0.5) return null;
  let j = turnJoints(c.j, c.facing, yaw, plan?.turn, c.scale);
  if (yaw > 90) {
    // From behind, the side that was far is near: swap the sides so it draws on top and in full colour.
    const swap = { ...j };
    for (const [a, b] of [["lElbow", "rElbow"], ["lHand", "rHand"], ["lKnee", "rKnee"], ["lFoot", "rFoot"], ["lShoulder", "rShoulder"], ["lHip", "rHip"]]) [swap[a], swap[b]] = [j[b], j[a]];
    j = swap;
  }
  const front = Math.abs(Math.cos((yaw * Math.PI) / 180));
  return { j, faceShift: faceShiftOf(yaw), hideFace: !faceShows(yaw), farBrightness: 0.85 + 0.15 * front };
}

const fill = (ctx, path, color, s) => {
  ctx.beginPath();
  path();
  ctx.fillStyle = color;
  ctx.fill();
  if (s.outline) {
    ctx.strokeStyle = s.outlineColor;
    ctx.lineWidth = s.olw;
    ctx.stroke();
  }
};

function leg(ctx, top, bottom, color, lw, s) {
  for (const [col, w] of s.outline ? [[s.outlineColor, lw * 1.45], [color, lw]] : [[color, lw]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }
  fill(ctx, () => ctx.ellipse(bottom.x, bottom.y, lw * 0.75, lw * 0.5, 0, 0, Math.PI * 2), color, s);
}

/**
 * A quadruped seen from the front, from its side-view joints (legs keep their heights, so steps still read).
 * @param {object} s0  the drawCharacter style (dims, quad, color, face, faceOpts, look, scale, facing, time)
 */
export function drawQuadFront(ctx, j, s0, shade) {
  const dims = s0.dims;
  const s = { ...s0, quad: s0.quad || {}, outline: s0.outline !== false, outlineColor: s0.outlineColor || "#111111" };
  const lw = dims.lineWidth * s.scale;
  s.olw = lw * 0.45;
  const bw = (dims.bodyWidth ?? 12) * s.scale;
  const q = s.quad;
  const c = { x: (j.hip.x + j.shoulder.x) / 2, y: (j.hip.y + j.shoulder.y) / 2 };
  const far = shade(s.color, 0.8);
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Back legs (behind, wider apart), the tail tip wagging over the back, the body, then the front legs.
  for (const [side, foot] of [[-1, j.lFoot], [1, j.rFoot]]) leg(ctx, { x: c.x + side * bw * 0.95, y: c.y }, { x: c.x + side * bw * 1.05, y: foot.y }, far, lw, s);
  if (q.tail !== "none") {
    const wag = Math.sin((s.time ?? 0) * 2 * Math.PI * 2.4) * bw * 0.5;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(c.x + bw * 0.4, c.y - bw * 0.6);
    ctx.quadraticCurveTo(c.x + bw * 0.9 + wag, c.y - bw * 1.6, c.x + bw * 0.6 + wag * 1.6, c.y - bw * 2.1);
    ctx.stroke();
  }
  fill(ctx, () => ctx.ellipse(c.x, c.y, bw * 1.3, bw * 1.15, 0, 0, Math.PI * 2), s.color, s);
  if (q.belly) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + bw * 0.3, bw * 0.7, bw * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = q.belly;
    ctx.fill();
  }
  for (const [side, paw] of [[-1, j.lHand], [1, j.rHand]]) leg(ctx, { x: c.x + side * bw * 0.5, y: c.y + bw * 0.3 }, { x: c.x + side * bw * 0.55, y: paw.y }, s.color, lw, s);
  // Head: over the chest, facing the camera.
  const r = dims.headR * s.scale;
  const h = { x: c.x, y: Math.min(j.head.y, c.y - bw * 1.2) };
  const earColor = q.earColor || shade(s.color, 0.6);
  for (const side of [-1, 1]) {
    const base = { x: h.x + side * r * 0.75, y: h.y - r * 0.55 };
    if (q.ears === "pointy") fill(ctx, () => { ctx.moveTo(base.x - r * 0.3, base.y); ctx.lineTo(base.x + side * r * 0.2, base.y - r * 0.85); ctx.lineTo(base.x + r * 0.3, base.y + r * 0.1); ctx.closePath(); }, earColor, s);
    else fill(ctx, () => ctx.ellipse(base.x + side * r * 0.25, base.y + r * 0.55, r * 0.3, r * 0.62, side * -0.35, 0, Math.PI * 2), earColor, s);
  }
  if (q.collar) {
    ctx.strokeStyle = q.collar;
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(h.x - r * 0.65, h.y + r * 0.95);
    ctx.quadraticCurveTo(h.x, h.y + r * 1.2, h.x + r * 0.65, h.y + r * 0.95);
    ctx.stroke();
    if (q.bell) fill(ctx, () => ctx.arc(h.x, h.y + r * 1.25, lw * 0.5, 0, Math.PI * 2), q.bell, s);
  }
  fill(ctx, () => ctx.arc(h.x, h.y, r, 0, Math.PI * 2), s.color, s);
  if (q.patch) {
    ctx.beginPath();
    ctx.arc(h.x - r * 0.38, h.y - r * 0.15, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = q.patch;
    ctx.fill();
  }
  const f = { x: s.facing, y: 0 };
  const u = { x: 0, y: -1 };
  if (s.face) drawFace(ctx, { x: h.x - f.x * r * 0.31, y: h.y - r * 0.05 }, r, { u, f }, s.face, { ...(s.faceOpts || {}), look: s.look });
  fill(ctx, () => ctx.ellipse(h.x, h.y + r * 0.42, r * 0.45, r * 0.3, 0, 0, Math.PI * 2), q.belly || s.color, s);
  fill(ctx, () => ctx.ellipse(h.x, h.y + r * 0.3, r * 0.17, r * 0.12, 0, 0, Math.PI * 2), "#2a1a14", { ...s, outline: false });
  ctx.restore();
}

/** How much of the front drawing shows at a yaw (0 side, 1 front), and the squash while turning. */
export function quadBlend(yaw) {
  const front = Math.max(0, Math.min(1, 1 - yaw / 90));
  return { front, squash: 1 - 0.18 * Math.sin(Math.PI * front) };
}
