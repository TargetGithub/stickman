// Particle drawing for the analytic FX log (spec 13.2). Milestone: M4. Drawn in world space.

import { particleAt, liveParticles } from "../fx.js";

function star(ctx, x, y, r, points = 8) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Small comic glyphs above heads: drop, anger, heart, exclaim, question. */
export function drawGlyph(ctx, name, x, y, size) {
  const s = size;
  if (name === "drop") {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s * 0.9, y + s * 0.2, x, y + s * 0.7);
    ctx.quadraticCurveTo(x - s * 0.9, y + s * 0.2, x, y - s);
    ctx.fill();
  } else if (name === "anger") {
    // Four corner arcs bulging toward the centre (the classic manga "vein" mark).
    ctx.lineWidth = s * 0.28;
    ctx.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const a = k * (Math.PI / 2) + Math.PI / 4;
      const a0 = a + (3 * Math.PI) / 4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9, s * 0.55, a0, a0 + Math.PI / 2);
      ctx.stroke();
    }
  } else if (name === "heart") {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.8);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.2, x, y + s * 0.8);
    ctx.fill();
  } else {
    ctx.font = `${Math.round(s * 2.2)}px Bangers`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name === "exclaim" ? "!" : "?", x, y);
    ctx.textBaseline = "alphabetic";
  }
}

/**
 * Draw live particles at fx time.
 * @param {(actorId:string, joint:string) => {x,y}|null} attachAt  joint positions for attached particles
 */
export function drawParticles(ctx, log, fxT, attachAt) {
  for (const p of liveParticles(log, fxT)) {
    const s = particleAt(p, fxT);
    if (!s || s.alpha <= 0.003) continue;
    let { x, y } = s;
    if (p.attach) {
      const base = attachAt(p.attach.actorId, p.attach.joint);
      if (!base) continue;
      x += base.x;
      y += base.y;
    }
    ctx.globalAlpha = Math.min(1, s.alpha);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    switch (p.shape) {
      case "line": {
        const a = p.vrot ? s.rot : Math.atan2(s.vy, s.vx) || p.rot0; // spinning debris follows its own rotation
        const dx = (Math.cos(a) * s.size) / 2;
        const dy = (Math.sin(a) * s.size) / 2;
        ctx.lineWidth = p.width;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
        break;
      }
      case "dot":
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, s.size / 2), 0, Math.PI * 2); ctx.fill();
        break;
      case "puff":
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, s.size), 0, Math.PI * 2); ctx.fill();
        break;
      case "ring":
        ctx.lineWidth = p.width;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, s.size), 0, Math.PI * 2); ctx.stroke();
        break;
      case "ellipse":
        ctx.lineWidth = p.width;
        ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, s.size), Math.max(0.5, s.size * 0.22), 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case "star":
        star(ctx, x, y, s.size);
        break;
      case "glow": {
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - s.size, y - s.size, s.size * 2, s.size * 2);
        break;
      }
      case "glyph":
        drawGlyph(ctx, p.glyph, x, y, s.size);
        break;
      default:
    }
  }
  ctx.globalAlpha = 1;
}
