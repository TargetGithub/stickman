// Forest layer kinds (Doopi & Friends, batch B): vines (hanging and gently swaying) and ferns (fern
// clumps with the odd red mushroom). Same contract as background_kinds.js: gen(rng, layer) once per
// theme, draw(ctx, layer, geometry, view) per frame in world space through layerTransform.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400];
const visible = (x, w, left, right) => x + w >= left && x <= right;

export const FOREST_KINDS = {
  vines: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.5 + rng())) {
        out.push({ x, len: l.length * (0.55 + rng() * 0.6), ph: rng() * 6.28, leaves: 4 + Math.floor(rng() * 5) });
      }
      return out;
    },
    draw(ctx, layer, vines, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const top = layer.top ?? -1400;
      ctx.lineCap = "round";
      for (const v of vines) {
        if (!visible(v.x - 60, 120, left, right)) continue;
        const sway = Math.sin(view.fxT * 0.9 + v.ph) * (layer.sway ?? 14);
        const at = (u) => ({ x: v.x + sway * u * u, y: top + v.len * u });
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width ?? 6;
        ctx.beginPath();
        for (let u = 0; u <= 1.001; u += 0.1) {
          const p = at(u);
          if (u === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.fillStyle = layer.leaf ?? layer.color;
        for (let k = 1; k <= v.leaves; k++) {
          const p = at(k / (v.leaves + 0.5));
          const side = k % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.ellipse(p.x + side * 12, p.y, 14, 7, side * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
  ferns: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.5 + rng())) {
        out.push({ x, s: l.size * (0.7 + rng() * 0.6), fronds: 4 + Math.floor(rng() * 3), mushroom: rng() < (l.mushrooms ?? 0.25) });
      }
      return out;
    },
    draw(ctx, layer, clumps, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.lineCap = "round";
      for (const c of clumps) {
        if (!visible(c.x - c.s * 1.5, c.s * 3, left, right)) continue;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = Math.max(3, c.s * 0.08);
        for (let k = 0; k < c.fronds; k++) {
          const a = -Math.PI / 2 + (k - (c.fronds - 1) / 2) * 0.42;
          const ex = c.x + Math.cos(a) * c.s;
          const ey = Math.sin(a) * c.s;
          ctx.beginPath();
          ctx.moveTo(c.x, 0);
          ctx.quadraticCurveTo(c.x + Math.cos(a) * c.s * 0.5, ey * 0.75, ex, ey * 0.85);
          ctx.stroke();
        }
        if (!c.mushroom) continue;
        const mx = c.x + c.s * 0.6;
        const r = c.s * 0.28;
        ctx.fillStyle = layer.stem ?? "#f4ead2";
        ctx.fillRect(mx - r * 0.25, -r * 1.1, r * 0.5, r * 1.1);
        ctx.fillStyle = layer.cap ?? "#e63946";
        ctx.beginPath();
        ctx.ellipse(mx, -r * 1.1, r, r * 0.6, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        for (const [dx, dy] of [[-0.4, -0.25], [0.15, -0.45], [0.5, -0.2]]) {
          ctx.beginPath();
          ctx.arc(mx + dx * r, -r * 1.1 + dy * r, r * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
};
