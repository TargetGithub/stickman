// Prop drawing (spec 12, 14.2). Milestone: M7. Props are drawn from butt/tip points so held,
// flying and lying props share one routine.

import { drawMoreProp, MORE_PROP_SHAPES } from "./props_more.js";
import { drawSeriesProp, SERIES_PROP_SHAPES } from "./props_series.js";
import { drawBaaaanaProp, BAAAANA_PROP_SHAPES } from "./props_baaaana.js";

/** Shapes a prop's `shape` may name (v1 weapons and the S4 holdables). */
export const PROP_SHAPES = ["sword", "club", "bat", "staff", "disc", "blaster", "racket", "wand", "phone", "book", "ice_cream", "flower", "rope", "cane", "balloon", ...MORE_PROP_SHAPES, ...SERIES_PROP_SHAPES, ...BAAAANA_PROP_SHAPES];

function line(ctx, a, b, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/**
 * Draw a prop between butt and tip.
 * @param {object} prop  catalog/world/props.json entry
 * @param {{ butt, tip, grip? }} t  from propTransform (or built for flying/lying props)
 */
export function drawProp(ctx, prop, t, scale, outline = "#111111") {
  const w = prop.width * scale;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (prop.shape) {
    case "sword": {
      const guard = lerpPt(t.butt, t.tip, prop.gripAt + 0.02);
      line(ctx, t.butt, guard, w * 1.6 + 3, outline);
      line(ctx, guard, t.tip, w + 3, outline);
      line(ctx, t.butt, guard, w * 1.4, prop.trim);
      line(ctx, guard, t.tip, w, prop.color);
      const dx = t.tip.y - t.butt.y;
      const dy = -(t.tip.x - t.butt.x);
      const l = Math.hypot(dx, dy) || 1;
      const half = w * 1.6;
      const g1 = { x: guard.x + (dx / l) * half, y: guard.y + (dy / l) * half };
      const g2 = { x: guard.x - (dx / l) * half, y: guard.y - (dy / l) * half };
      line(ctx, g1, g2, w * 0.9 + 3, outline);
      line(ctx, g1, g2, w * 0.9, prop.trim);
      break;
    }
    case "club":
    case "bat": {
      // Tapered: thin handle, thick head.
      for (let i = 0; i < 6; i++) {
        const a = lerpPt(t.butt, t.tip, i / 6);
        const b = lerpPt(t.butt, t.tip, (i + 1) / 6);
        const k = 0.45 + (0.55 * (i + 1)) / 6;
        line(ctx, a, b, w * k + 3, outline);
      }
      for (let i = 0; i < 6; i++) {
        const a = lerpPt(t.butt, t.tip, i / 6);
        const b = lerpPt(t.butt, t.tip, (i + 1) / 6);
        const k = 0.45 + (0.55 * (i + 1)) / 6;
        line(ctx, a, b, w * k, i === 0 ? prop.trim : prop.color);
      }
      break;
    }
    case "staff":
      line(ctx, t.butt, t.tip, w + 3, outline);
      line(ctx, t.butt, t.tip, w, prop.color);
      line(ctx, lerpPt(t.butt, t.tip, 0.04), t.butt, w + 1, prop.trim);
      line(ctx, lerpPt(t.butt, t.tip, 0.96), t.tip, w + 1, prop.trim);
      break;
    case "disc": {
      const c = t.grip || lerpPt(t.butt, t.tip, 0.5);
      ctx.fillStyle = prop.color;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(c.x, c.y, prop.len * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = prop.trim;
      ctx.beginPath();
      ctx.arc(c.x, c.y, prop.len * scale * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "blaster": {
      line(ctx, t.butt, t.tip, w + 3, outline);
      line(ctx, t.butt, t.tip, w, prop.color);
      line(ctx, lerpPt(t.butt, t.tip, 0.85), t.tip, w * 0.6, prop.trim);
      break;
    }
    // ---- story holdables (S4) ----
    case "racket": {
      const neck = lerpPt(t.butt, t.tip, 0.45);
      line(ctx, t.butt, neck, w + 3, outline);
      line(ctx, t.butt, neck, w, prop.trim);
      const c = lerpPt(t.butt, t.tip, 0.72);
      const ang = Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);
      const len = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3 * scale + 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.28, len * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = prop.trim;
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,60,60,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(k * len * 0.09, -len * 0.18);
        ctx.lineTo(k * len * 0.09, len * 0.18);
        ctx.moveTo(-len * 0.26, k * len * 0.065);
        ctx.lineTo(len * 0.26, k * len * 0.065);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "wand": {
      line(ctx, t.butt, t.tip, w + 2, outline);
      line(ctx, t.butt, t.tip, w, prop.color);
      ctx.strokeStyle = prop.trim;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(t.tip.x, t.tip.y, 9 * scale, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "phone":
    case "book": {
      const c = lerpPt(t.butt, t.tip, 0.5);
      const ang = Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(ang);
      const L = prop.len * scale;
      ctx.fillStyle = prop.color;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-L / 2, -w / 2, L, w, 2 * scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = prop.trim;
      if (prop.shape === "phone") ctx.fillRect(-L / 2 + 2, -w / 2 + 2, L - 4, w - 4);
      else ctx.fillRect(-L / 2 + 2, -w / 2 + 2, L - 4, w * 0.18);
      ctx.restore();
      break;
    }
    case "ice_cream": {
      const top = lerpPt(t.butt, t.tip, 0.75);
      ctx.fillStyle = prop.trim;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      const dx = t.tip.y - t.butt.y;
      const dy = -(t.tip.x - t.butt.x);
      const l = Math.hypot(dx, dy) || 1;
      const half = w * 0.6;
      ctx.beginPath();
      ctx.moveTo(t.butt.x, t.butt.y);
      ctx.lineTo(top.x + (dx / l) * half, top.y + (dy / l) * half);
      ctx.lineTo(top.x - (dx / l) * half, top.y - (dy / l) * half);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = prop.color;
      ctx.beginPath();
      ctx.arc(top.x, top.y, w * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "flower": {
      line(ctx, t.butt, t.tip, w, prop.trim);
      ctx.fillStyle = prop.color;
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(t.tip.x + Math.cos(a) * 6 * scale, t.tip.y + Math.sin(a) * 6 * scale, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.arc(t.tip.x, t.tip.y, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rope": {
      const c = t.grip || lerpPt(t.butt, t.tip, 0.5);
      ctx.strokeStyle = prop.color;
      ctx.lineWidth = 4 * scale;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(c.x + k * 3 * scale, c.y, prop.width * 0.55 * scale, prop.width * 0.4 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "cane": {
      line(ctx, t.butt, t.tip, w + 3, outline);
      line(ctx, t.butt, t.tip, w, prop.color);
      // The hook at the handle end.
      ctx.strokeStyle = prop.color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(t.butt.x + 7 * scale, t.butt.y, 7 * scale, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case "balloon": {
      // Held by its string: the balloon floats above the hand, whatever the arm does.
      const g = t.grip || t.butt;
      const top = { x: g.x + 6 * scale, y: g.y - prop.len * scale };
      ctx.strokeStyle = prop.trim;
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + 14 * scale, (g.y + top.y) / 2, top.x, top.y + 26 * scale);
      ctx.stroke();
      ctx.fillStyle = prop.color;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(top.x, top.y, 22 * scale, 28 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    default:
      if (!drawMoreProp(ctx, prop, t, scale, outline) && !drawSeriesProp(ctx, prop, t, scale, outline) && !drawBaaaanaProp(ctx, prop, t, scale, outline)) line(ctx, t.butt, t.tip, w, prop.color);
  }
  ctx.restore();
}
