// Drawing motion-graphics layers (ENGINE_V3_SPEC 6, ADR-026). Milestone: V3.5.
// composeAt() (engine/compositor.js) gives layers in draw order with their items; this draws them: screen
// layers in frame pixels (1920 x 1080 units, scaled to the frame), world layers inside the camera transform.
// Text layout is renderer-only (CLAUDE.md): measureText here, never in the simulation.

import { drawPaths } from "./paths.js";
import { projectJoints, depthAt } from "../depth.js";
import { STAGE } from "../config.js";

const REF_H = 1080; // screen layers are authored for a 1080-high frame

/** The canvas fill for a colour or a gradient { type: linear|radial, stops: [[at, colour]], angle? } at a box. */
function paint(ctx, p, box) {
  if (!p || typeof p === "string") return p;
  const { x, y, w, h } = box;
  let g;
  if (p.type === "radial") g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 2);
  else {
    const a = ((p.angle ?? 90) * Math.PI) / 180; // 90: top to bottom
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2;
    g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  for (const [at, c] of p.stops) g.addColorStop(at, c);
  return g;
}

/** The path of a shape in its own coordinates (origin at x, y; rect and ellipse centred). */
function shapePath(ctx, s) {
  ctx.beginPath();
  const w = s.w ?? 100;
  const h = s.h ?? 100;
  if (s.type === "rect") {
    const r = Math.min(s.r ?? 0, w / 2, h / 2);
    if (r > 0 && ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
    else ctx.rect(-w / 2, -h / 2, w, h);
  } else if (s.type === "circle") ctx.arc(0, 0, s.r ?? 50, 0, Math.PI * 2);
  else if (s.type === "ellipse") ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (s.type === "line") {
    ctx.moveTo(0, 0);
    ctx.lineTo(s.x2 - s.x, s.y2 - s.y);
  }
  return { x: -w / 2, y: -h / 2, w, h };
}

/** Clip to the part of a box an in/out wipe or iris has revealed. */
function clipReveal(ctx, clip, box) {
  if (!clip) return;
  ctx.beginPath();
  const { x, y, w, h } = box;
  const u = clip.u;
  if (clip.iris) ctx.arc(x + w / 2, y + h / 2, (Math.hypot(w, h) / 2) * u, 0, Math.PI * 2);
  else if (clip.wipe === "left") ctx.rect(x, y, w * u, h);
  else if (clip.wipe === "right") ctx.rect(x + w * (1 - u), y, w * u, h);
  else if (clip.wipe === "up") ctx.rect(x, y + h * (1 - u), w, h * u);
  else ctx.rect(x, y, w, h * u);
  ctx.clip();
}

function place(ctx, e) {
  ctx.translate(e.x ?? 0, e.y ?? 0);
  if (e.rotation) ctx.rotate((e.rotation * Math.PI) / 180);
  if (e.scale !== undefined && e.scale !== 1) ctx.scale(e.scale, e.scale);
}

function drawShape(ctx, s) {
  ctx.save();
  place(ctx, s);
  ctx.globalAlpha *= s.opacity;
  if (s.type === "path") {
    const box = { x: -(s.w ?? 200) / 2, y: -(s.h ?? 200) / 2, w: s.w ?? 200, h: s.h ?? 200 };
    clipReveal(ctx, s.clip || (s.reveal < 1 ? { wipe: "left", u: s.reveal } : null), box);
    drawPaths(ctx, [{ d: s.d, fill: typeof s.fill === "string" ? s.fill : undefined, stroke: s.stroke, width: s.lineWidth }]);
    ctx.restore();
    return;
  }
  const box = s.type === "circle" ? { x: -(s.r ?? 50), y: -(s.r ?? 50), w: 2 * (s.r ?? 50), h: 2 * (s.r ?? 50) } : shapePath(ctx, { ...s, type: "rect" });
  clipReveal(ctx, s.clip || (s.reveal < 1 ? { wipe: "left", u: s.reveal } : null), box);
  shapePath(ctx, s);
  if (s.fill && s.type !== "line") {
    ctx.fillStyle = paint(ctx, s.fill, box);
    ctx.fill();
  }
  if (s.stroke) {
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = s.lineWidth ?? 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  ctx.restore();
}

/** The text with its style filled in (style from the catalog, then the element's own fields). */
export function textLook(e, styles) {
  const st = (e.style && styles?.[e.style]) || {};
  return {
    font: e.font ?? st.font ?? "Inter", size: e.size ?? st.size ?? 48, color: e.color ?? st.color ?? "#ffffff",
    outline: e.outline ?? st.outline ?? null, outlineWidth: e.outlineWidth ?? st.outlineWidth ?? 0, shadow: e.shadow ?? st.shadow ?? null,
    box: e.box ?? st.box ?? null, padding: e.padding ?? st.padding ?? 0, align: e.align ?? "center",
  };
}

function drawText(ctx, e, styles) {
  const look = textLook(e, styles);
  const chars = Math.round(e.text.length * e.reveal); // typewriter
  if (chars <= 0) return;
  const lines = e.text.slice(0, chars).split("\n");
  ctx.save();
  place(ctx, e);
  ctx.globalAlpha *= e.opacity;
  ctx.font = `${look.size}px ${look.font}`;
  ctx.textAlign = look.align;
  ctx.textBaseline = "middle";
  const lh = look.size * 1.15;
  const widths = e.text.split("\n").map((l) => ctx.measureText(l).width); // the box keeps its full size while typing
  const w = Math.max(...widths);
  const h = lh * e.text.split("\n").length;
  const left = look.align === "left" ? 0 : look.align === "right" ? -w : -w / 2;
  const box = { x: left - look.padding, y: -h / 2 - look.padding, w: w + 2 * look.padding, h: h + 2 * look.padding };
  clipReveal(ctx, e.clip, box);
  if (look.box) {
    ctx.fillStyle = look.box;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(box.x, box.y, box.w, box.h, Math.min(24, look.padding + 6));
    else ctx.rect(box.x, box.y, box.w, box.h);
    ctx.fill();
  }
  lines.forEach((line, i) => {
    const y = -h / 2 + lh * (i + 0.5);
    if (look.shadow) {
      ctx.fillStyle = look.shadow;
      ctx.fillText(line, look.size * 0.05, y + look.size * 0.07);
    }
    if (look.outline && look.outlineWidth > 0) {
      ctx.strokeStyle = look.outline;
      ctx.lineWidth = look.outlineWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(line, 0, y);
    }
    ctx.fillStyle = look.color;
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

/** Clip to a mask shape (a shape id from the script's shapes; `invert` keeps what is outside it). */
function clipMask(ctx, mask, shapes) {
  const s = shapes.get(mask.shape);
  if (!s) return;
  ctx.save();
  place(ctx, s);
  const big = 1e5;
  if (s.type === "path") {
    ctx.beginPath();
    for (const c of s.d) if (c[0] === "M") ctx.moveTo(c[1], c[2]); else if (c[0] === "L") ctx.lineTo(c[1], c[2]); else if (c[0] === "C") ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]); else if (c[0] === "Q") ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]); else if (c[0] === "Z") ctx.closePath();
  } else shapePath(ctx, s);
  if (mask.invert) ctx.rect(-big, -big, 2 * big, 2 * big);
  ctx.restore();
  ctx.clip(mask.invert ? "evenodd" : "nonzero");
}

/**
 * Draw layers (one place: back or over).
 * @param {{ W, H, worldTransform: number[], styles, shapes: Map }} view  worldTransform: the camera's [a,b,c,d,e,f]
 */
export function drawMotionLayers(ctx, layers, view) {
  const k = view.H / REF_H;
  for (const l of layers) {
    ctx.save();
    if (l.space === "world") ctx.setTransform(...view.worldTransform);
    else ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalCompositeOperation = l.blend;
    ctx.globalAlpha = l.opacity;
    if (l.mask) clipMask(ctx, l.mask, view.shapes);
    place(ctx, l);
    if (l.clip) clipReveal(ctx, l.clip, l.space === "world" ? { x: -2000, y: -2000, w: 4000, h: 4000 } : { x: -l.x, y: -l.y, w: (REF_H * view.W) / view.H, h: REF_H });
    for (const it of l.items) {
      if (it.kind === "shape") drawShape(ctx, it);
      else drawText(ctx, it, view.styles);
    }
    ctx.restore();
  }
}

/** Where a character joint is for a layer parent: world px (projected in depth), or 1080-high screen px. */
export function motionAnchor(r, sv, f, chars, parent, space, cam) {
  const c = chars.find((x) => x.id === parent.char);
  if (!c || c.alpha <= 0.01) return null;
  let j = c.j;
  if (sv.depth) {
    const z = depthAt(sv.depthEvents.get(c.id) || [], sv.placementZ.get(c.id) ?? 0, f.storyT - (sv.storyStart ?? 0));
    j = projectJoints(c.j, z, c.j.hip.x, cam, STAGE.groundY, sv.depth);
  }
  const p = j[parent.joint ?? "head"] || j.head;
  if (space === "world") return { x: p.x, y: p.y };
  const k = 1080 / r.H;
  return { x: (r.W / 2 + (p.x - cam.x + cam.shakeX) * cam.zoom) * k, y: (r.H / 2 + (p.y - cam.y + cam.shakeY) * cam.zoom) * k };
}
