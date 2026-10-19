// Iron layer kinds (Doopi & Friends batch C): gears_bg (giant rusty gears half buried in rock, turning
// very slowly) and machines (a workshop wall of pipes, pistons that pump and steam puffs). Same contract
// as background_kinds.js: gen(rng, layer) once per theme, draw per frame through layerTransform.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400];
const INK = "#1f1f24";
const visible = (x, w, left, right) => x + w >= left && x <= right;

function gear(ctx, x, y, r, teeth, angle, color, hub) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 0; k < teeth * 2; k++) {
    const a = (k * Math.PI) / teeth;
    const rr = k % 2 ? r : r * 1.14;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const IRON_KINDS = {
  gears_bg: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, r: l.size * (0.6 + rng() * 0.7), teeth: 8 + Math.floor(rng() * 6), dir: rng() < 0.5 ? -1 : 1, ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, gears, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const g of gears) {
        if (!visible(g.x - g.r * 1.2, g.r * 2.4, left, right)) continue;
        gear(ctx, g.x, -g.r * 0.35 + (layer.y ?? 0), g.r, g.teeth, g.ph + g.dir * view.fxT * (layer.speed ?? 0.05), layer.color, layer.hub ?? INK);
      }
      // Rock over the gears' lower halves.
      ctx.fillStyle = layer.rock;
      ctx.fillRect(left, (layer.y ?? 0) - 40, right - left, 400);
    },
  },
  machines: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) out.push({ x, ph: rng() * 6.28, pistons: 1 + Math.floor(rng() * 2) });
      return out;
    },
    draw(ctx, layer, units, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const top = layer.top ?? -900;
      // Pipes running along the wall.
      ctx.strokeStyle = layer.pipe;
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(left, top + 80);
      ctx.lineTo(right, top + 80);
      ctx.moveTo(left, top + 150);
      ctx.lineTo(right, top + 150);
      ctx.stroke();
      for (const u of units) {
        if (!visible(u.x, layer.spacing, left, right)) continue;
        // A vertical pipe with a valve wheel.
        ctx.strokeStyle = layer.pipe;
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.moveTo(u.x + 60, top + 80);
        ctx.lineTo(u.x + 60, 0);
        ctx.stroke();
        ctx.strokeStyle = layer.light ?? "#b05cff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(u.x + 60, -360, 30, 0, Math.PI * 2);
        ctx.stroke();
        // Pistons pumping.
        for (let k = 0; k < u.pistons; k++) {
          const px = u.x + 200 + k * 160;
          const lift = 60 + 50 * Math.sin(view.fxT * 2.4 + u.ph + k * 1.7);
          ctx.fillStyle = layer.color;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          ctx.fillRect(px - 50, -260, 100, 260);
          ctx.strokeRect(px - 50, -260, 100, 260);
          ctx.fillStyle = layer.rod ?? "#c8ccd8";
          ctx.fillRect(px - 14, -260 - lift - 120, 28, lift + 120);
          ctx.strokeRect(px - 14, -260 - lift - 120, 28, lift + 120);
          ctx.fillRect(px - 60, -260 - lift - 150, 120, 34);
          ctx.strokeRect(px - 60, -260 - lift - 150, 120, 34);
          // A puff of steam at the top of each stroke.
          const u2 = (view.fxT * 0.7 + u.ph + k) % 1;
          ctx.fillStyle = `rgba(230,230,240,${(0.5 * (1 - u2)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px + 70, -300 - u2 * 200, 24 + u2 * 30, 0, Math.PI * 2);
          ctx.fill();
        }
        // A purple warning light.
        const on = Math.sin(view.fxT * 4 + u.ph) > 0;
        ctx.fillStyle = on ? (layer.light ?? "#b05cff") : "#4a3a5a";
        ctx.beginPath();
        ctx.arc(u.x + layer.spacing - 80, top + 220, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
};
