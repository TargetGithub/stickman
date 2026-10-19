// Moon layer kinds (Doopi & Friends batch D): moon (a huge full moon disc in the sky with craters, the
// Grey Moon) and moon_surface (standing on the moon: a curved horizon of grey dust with craters, and far
// below a tiny glowing valley with a tree). Same contract as background_kinds.js.

import { layerTransform, screen } from "./layer_util.js";

const SPAN = [-2400, 12400];
const visible = (x, w, left, right) => x + w >= left && x <= right;

export const MOON_KINDS = {
  moon: {
    gen: (rng, l) => Array.from({ length: l.craters ?? 9 }, () => ({ a: rng() * 6.28, d: rng() * 0.75, r: 0.06 + rng() * 0.12 })),
    draw(ctx, layer, craters, view) {
      screen(ctx);
      const r = (layer.r ?? 0.22) * view.H;
      const x = (layer.x ?? 0.5) * view.W - view.cam.x * (layer.factor ?? 0.02) * 0.05;
      const y = (layer.y ?? 0.28) * view.H;
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
      g.addColorStop(0, layer.glow ?? "rgba(200,200,210,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = layer.crater ?? "rgba(0,0,0,0.15)";
      for (const c of craters) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(c.a) * c.d * r, y + Math.sin(c.a) * c.d * r, c.r * r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  moon_surface: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.5 + rng())) out.push({ x, r: l.size * (0.4 + rng() * 0.8) });
      return out;
    },
    draw(ctx, layer, craters, view) {
      // The valley far below, seen past the horizon: a tiny glowing tree.
      screen(ctx);
      const vx = (layer.valleyX ?? 0.3) * view.W;
      const vy = view.H * (layer.valleyY ?? 0.55);
      const glow = ctx.createRadialGradient(vx, vy, 4, vx, vy, 70);
      glow.addColorStop(0, layer.valleyGlow ?? "rgba(255,240,160,0.8)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(vx, vy, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = layer.tree ?? "#3a6a3a";
      ctx.beginPath();
      ctx.arc(vx, vy - 8, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(vx - 2, vy - 4, 4, 14);
      // Craters on the near ground.
      const { left, right } = layerTransform(ctx, view, layer.factor ?? 0.6);
      for (const c of craters) {
        if (!visible(c.x - c.r, c.r * 2, left, right)) continue;
        ctx.fillStyle = layer.crater;
        ctx.beginPath();
        ctx.ellipse(c.x, -6, c.r, c.r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = layer.rim ?? "rgba(255,255,255,0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(c.x, -8, c.r, c.r * 0.22, 0, Math.PI, 0);
        ctx.stroke();
      }
    },
  },
};
