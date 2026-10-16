// Stick figure, face, props, accessories.
// Milestone: M0 (body and face), M7 (props, accessories). Spec: section 14.2.

import { BODY } from "../skeleton.js";
import { propTransform } from "../props.js";
import { drawProp } from "./props.js";

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

/** Stroke a group of polylines: dark outline pass, then color pass, so each layer reads on its own. */
function strokeGroup(ctx, lines, color, lw, style) {
  if (style.outline) {
    ctx.strokeStyle = style.outlineColor;
    ctx.lineWidth = lw * 1.45;
    for (const pts of lines) polyline(ctx, pts);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  for (const pts of lines) polyline(ctx, pts);
}

function drawHead(ctx, j, r, lw, style, facing) {
  ctx.beginPath();
  ctx.arc(j.head.x, j.head.y, r, 0, Math.PI * 2);
  ctx.fillStyle = style.color;
  ctx.fill();
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

/**
 * Draw one character.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("../types.js").Joints} j
 * @param {{ color?:string, outline?:boolean, outlineColor?:string, farBrightness?:number,
 *           mouth?:string, scale:number, facing:1|-1, alpha?:number,
 *           prop?:{ data:object, angle:number } }} style  a held prop is drawn in its grip hand
 */
export function drawCharacter(ctx, j, style) {
  const s = { ...DEFAULTS, ...style };
  const lw = BODY.lineWidth * s.scale;
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const far = shade(s.color, s.farBrightness);
  const prop = s.prop ? propTransform(j, s.prop.data, s.prop.angle, s.facing, s.scale) : null;
  strokeGroup(ctx, [[j.hip, j.lKnee, j.lFoot], [j.shoulder, j.lElbow, j.lHand]], far, lw, s);
  if (prop && s.prop.data.grip === "lHand") drawProp(ctx, s.prop.data, prop, s.scale, s.outlineColor);
  strokeGroup(ctx, [[j.hip, j.shoulder, j.neckTop]], s.color, lw, s);
  drawHead(ctx, j, BODY.headR * s.scale, lw, s, s.facing);
  strokeGroup(ctx, [[j.hip, j.rKnee, j.rFoot]], s.color, lw, s);
  if (prop && s.prop.data.grip === "rHand") drawProp(ctx, s.prop.data, prop, s.scale, s.outlineColor);
  strokeGroup(ctx, [[j.shoulder, j.rElbow, j.rHand]], s.color, lw, s);

  ctx.restore();
}
