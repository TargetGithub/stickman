// Prop drawing (spec 12, 14.2). Milestone: M7. Props are drawn from butt/tip points so held,
// flying and lying props share one routine.

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
 * @param {object} prop  data/props.js entry
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
    default:
      line(ctx, t.butt, t.tip, w, prop.color);
  }
  ctx.restore();
}
