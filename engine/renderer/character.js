// Stick figure, face, props, accessories.
// Milestone: M0 (body and face), M7 (props, accessories). Spec: section 14.2.

import { BODY } from "../skeleton.js";
import { propTransform } from "../props.js";
import { drawProp } from "./props.js";
import { drawFace } from "./face.js";
import { drawQuadruped } from "./quadruped.js";
import { drawTorso, drawOutfit, torsoPath } from "./bodies.js";
import { boxHeadPath, drawBolts } from "./robot.js";
import { drawHairBack, drawHair, drawMask, drawEyepatch, drawHeadTop, drawBowtie, drawBackpack } from "./appearance.js";
import { shadeStrokes, shadeHead, shadeTorso } from "./shading.js";

const DEFAULTS = { color: "#222222", outline: true, outlineColor: "#111111", farBrightness: 0.85, mouth: "neutral" };

/** Multiply a #rrggbb color's channels by k. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * k)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function polyline(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

/** Stroke a group of polylines: dark outline pass, then color pass, so each layer reads on its own; then the light's tones (V3.3). */
function strokeGroup(ctx, lines, color, lw, style, tones = style.light) {
  if (style.outline) {
    ctx.strokeStyle = style.outlineColor;
    ctx.lineWidth = lw * 1.45;
    for (const pts of lines) polyline(ctx, pts);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  for (const pts of lines) polyline(ctx, pts);
  if (tones) shadeStrokes(ctx, lines, lw, tones);
}

/** Axes turned by an angle (radians): the hair sways with secondary motion (V3.7). */
function turnAxes(ax, a) {
  if (!a) return ax;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const rot = (v) => ({ x: v.x * c - v.y * s, y: v.x * s + v.y * c });
  return { u: rot(ax.u), f: rot(ax.f) };
}

function drawHead(ctx, j, r, lw, style, facing) {
  const look = style.look;
  const ax = headAxes(j, facing);
  // wrap (turned views, V3.9): how far hair and hats wrap round the head (appearance.js mirrorAxes).
  const wrap = style.wrap || 0;
  const hairAx = { ...turnAxes(ax, style.hairTilt || 0), wrap, back: !!style.hideFace };
  if (look) drawHairBack(ctx, j.head, r, hairAx, look);
  if (style.draw === "box") {
    const hu = { x: j.head.x - j.neckTop.x, y: j.head.y - j.neckTop.y };
    const hl = Math.hypot(hu.x, hu.y) || 1;
    boxHeadPath(ctx, j.head, r, { x: hu.x / hl, y: hu.y / hl });
  } else {
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = style.color;
  ctx.fill();
  if (style.light && style.draw !== "box") {
    shadeHead(ctx, j.head, r, style.light);
    // The shading leaves its own last arc as the current path (paths are not part of save/restore): redo the head.
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, r, 0, Math.PI * 2);
  }
  if (style.outline) {
    ctx.lineWidth = lw * 0.45;
    ctx.strokeStyle = style.outlineColor;
    ctx.stroke();
  }

  // Face axes: u = neck→head ("up" for the face), f = forward (u rotated 90° toward facing).
  const ux = j.head.x - j.neckTop.x;
  const uy = j.head.y - j.neckTop.y;
  const ul = Math.hypot(ux, uy) || 1;
  const u = { x: ux / ul, y: uy / ul };
  const f = facing === 1 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };
  const at = (fa, ua) => ({ x: j.head.x + f.x * fa * r + u.x * ua * r, y: j.head.y + f.y * fa * r + u.y * ua * r });
  if (style.face) {
    const acc = look?.accessories || {};
    // Turnaround (V3.6): the face slides to the middle of the head as it turns to the front; from behind it is hidden.
    const shift = style.faceShift || 0;
    const fc = shift ? { x: j.head.x - f.x * shift * r, y: j.head.y - f.y * shift * r } : j.head;
    if (acc.mask && !style.hideFace) drawMask(ctx, fc, r, ax, acc.mask);
    if (!style.hideFace) drawFace(ctx, fc, r, { u, f }, style.face, { ...(style.faceOpts || {}), look });
    if (look) {
      drawHair(ctx, j.head, r, hairAx, look);
      if (acc.eyepatch && !style.hideFace) drawEyepatch(ctx, j.head, r, ax, acc.eyepatch);
      drawHeadTop(ctx, j.head, r, { ...ax, wrap, back: !!style.hideFace }, acc);
    }
    return;
  }

  ctx.fillStyle = style.outlineColor;
  for (const e of [at(0.5, 0.12), at(0.12, 0.12)]) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style.mouth === "shout") {
    const m = at(0.4, -0.38);
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.mouth === "grin") {
    const a = at(0.15, -0.3);
    const b = at(0.6, -0.3);
    const c = at(0.4, -0.5);
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = style.outlineColor;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();
  }
}

/** Face axes for a head: u = neck→head ("up" for the face), f = forward. */
function headAxes(j, facing) {
  const ux = j.head.x - j.neckTop.x;
  const uy = j.head.y - j.neckTop.y;
  const ul = Math.hypot(ux, uy) || 1;
  const u = { x: ux / ul, y: uy / ul };
  return { u, f: facing === 1 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x } };
}

/**
 * Draw one character.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("../types.js").Joints} j
 * @param {{ color?:string, outline?:boolean, outlineColor?:string, farBrightness?:number,
 *           mouth?:string, scale:number, facing:1|-1, alpha?:number,
 *           prop?:{ data:object, angle:number }, face?:object, faceOpts?:object }} style
 *   a held prop is drawn in its grip hand; face (catalog face data, story scripts) replaces the v1 dots and mouth
 *   Body plans (S3): dims (bone lengths, line width), draw (stick | capsule | trapezoid), torsoWidth, and
 *   look (appearance: eyes, brows, mouthStyle, cheeks, hair, hairColor, outfit, outfitColor, accessories)
 *   Quadrupeds (draw "quad"): quad, faceName, id, time, prevHip, prevHead (renderer/quadruped.js)
 *   light (V3.3): shadeTones() of the body colour under the scene's light rig; absent = the flat v2 look
 */
export function drawCharacter(ctx, j, style) {
  const s = { ...DEFAULTS, ...style };
  if (s.draw === "quad") return drawQuadruped(ctx, j, s, shade); // four-legged plans (ADR-020)
  const dims = s.dims || BODY;
  const lw = dims.lineWidth * s.scale;
  const acc = s.look?.accessories || {};
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const far = shade(s.color, s.farBrightness);
  // Under a light rig (V3.3) the far limbs take the same tones, a little darker, so both sides read as lit from one side.
  const farTones = s.light ? { ...s.light, base: far, lit: shade(s.light.lit, s.farBrightness), dark: shade(s.light.dark, s.farBrightness) } : null;
  const prop = s.prop ? propTransform(j, s.prop.data, s.prop.angle, s.facing, s.scale) : null;
  const headR = dims.headR * s.scale;
  if (acc.backpack) drawBackpack(ctx, j, headR, acc.backpack, s.facing);
  // Turned views (V3.6) give each side its own shoulder and hip; the side view uses the shared ones.
  strokeGroup(ctx, [[j.lHip || j.hip, j.lKnee, j.lFoot], [j.lShoulder || j.shoulder, j.lElbow, j.lHand]], far, lw, s, farTones);
  if (prop && s.prop.data.grip === "lHand") drawProp(ctx, s.prop.data, prop, s.scale, s.outlineColor);
  const torso = { draw: s.draw, torsoWidth: s.torsoWidth, color: s.color, outline: s.outline, outlineColor: s.outlineColor, lw, scale: s.scale };
  if (!drawTorso(ctx, j, torso)) {
    strokeGroup(ctx, [[j.hip, j.shoulder, j.neckTop]], s.color, lw, s);
  } else if (s.light) {
    shadeTorso(ctx, j, torso, s.light);
    // The shading covers the inner half of the outline: stroke it again on top, as wide as v1/v2 draw it.
    if (s.outline && s.draw !== "box") {
      ctx.strokeStyle = s.outlineColor;
      ctx.lineWidth = lw * 0.45;
      torsoPath(ctx, j, torso);
      ctx.stroke();
    }
  }
  if (s.look?.outfit) drawOutfit(ctx, j, { outfit: s.look.outfit, color: s.look.outfitColor || shade(s.color, 0.7), outlineColor: s.outlineColor, lw, scale: s.scale, torsoWidth: s.torsoWidth });
  if (acc.bowtie) drawBowtie(ctx, j, headR, acc.bowtie, s.facing);
  drawHead(ctx, j, headR, lw, s, s.facing);
  strokeGroup(ctx, [[j.rHip || j.hip, j.rKnee, j.rFoot]], s.color, lw, s);
  if (prop && s.prop.data.grip === "rHand") drawProp(ctx, s.prop.data, prop, s.scale, s.outlineColor);
  strokeGroup(ctx, [[j.rShoulder || j.shoulder, j.rElbow, j.rHand]], s.color, lw, s);
  if (s.draw === "box") drawBolts(ctx, j, lw, shade(s.color, 0.75));

  ctx.restore();
}
