// Shared helpers for background layer kinds (spec 14.3). Milestone: M4; split out in S1.

import { STAGE } from "../config.js";

/** Screen transform for a layer: world x scrolls by `factor`, y is measured from the ground line. */
export function layerTransform(ctx, view, factor) {
  const { cam, W, H } = view;
  const z = 1 + (cam.zoom - 1) * factor;
  // A camera raised by view.lift (task 10c) sees near layers drop the whole way and far ones (low factor) less.
  const groundScreen = H / 2 + (STAGE.groundY - cam.y + cam.shakeY) * cam.zoom - (view.lift || 0) * cam.zoom * (1 - factor);
  ctx.setTransform(z, 0, 0, z, W / 2 - (cam.x - cam.shakeX) * factor * z, groundScreen);
  const left = (cam.x - cam.shakeX) * factor - W / (2 * z) - 50;
  const right = (cam.x - cam.shakeX) * factor + W / (2 * z) + 50;
  return { z, left, right };
}

export const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

export function glowDisc(ctx, x, y, r, color, glow) {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function polygonBand(ctx, pts, left, right, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(left, 4000);
  for (const p of pts) if (p.x >= left - 400 && p.x <= right + 400) ctx.lineTo(p.x, p.y);
  ctx.lineTo(right, 4000);
  ctx.closePath();
  ctx.fill();
}

