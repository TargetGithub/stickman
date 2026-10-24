// Baaaana Meadow layer kinds (series/baaaana/PLAN.md task 9): mushroom_huts (a village of mushroom-cap houses
// on a hill) and meadow_flowers (flowers dotted over the grass, drawn over the floor). Same contract as
// background_kinds.js: gen(rng, layer) once per theme, draw(ctx, layer, geom, view) per frame, world y measured
// from the ground line (negative is up). The flowers nod in the breeze, a pure function of view.fxT.

import { layerTransform } from "./layer_util.js";
import { mushroomHouse } from "./object_shapes_meadow.js";

const SPAN = [-2400, 12400];
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const visible = (x, w, left, right) => x + w >= left && x <= right;

export const MEADOW_KINDS = {
  mushroom_huts: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.7 + rng() * 0.6)) {
        const w = l.size * (0.75 + rng() * 0.5);
        out.push({ x, w, h: w * (0.95 + rng() * 0.3), colors: { cap: pick(rng, l.caps), stem: pick(rng, l.stems), spots: l.spots, door: pick(rng, l.doors), window: l.window } });
      }
      return out;
    },
    draw(ctx, layer, huts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.save();
      ctx.translate(0, layer.y ?? 0);
      for (const h of huts) {
        if (!visible(h.x - h.w, h.w * 2, left, right)) continue;
        ctx.save();
        ctx.translate(h.x, 0);
        mushroomHouse(ctx, h.w, h.h, h.colors);
        ctx.restore();
      }
      ctx.restore();
    },
  },
  meadow_flowers: {
    onGround: true,
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.4 + rng() * 1.2)) {
        out.push({ x, y: 8 + rng() * (l.depth ?? 60), color: pick(rng, l.colors), s: l.size * (0.7 + rng() * 0.6), ph: rng() * 6.28 });
      }
      return out;
    },
    draw(ctx, layer, flowers, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor ?? 1);
      for (const f of flowers) {
        if (!visible(f.x - 20, 40, left, right)) continue;
        const sway = Math.sin(view.fxT * 1.6 + f.ph) * f.s * 0.25;
        ctx.strokeStyle = "#3f8f48";
        ctx.lineWidth = Math.max(1.5, f.s * 0.18);
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.quadraticCurveTo(f.x, f.y - f.s * 1.2, f.x + sway, f.y - f.s * 2);
        ctx.stroke();
        ctx.fillStyle = f.color;
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(f.x + sway + Math.cos(a) * f.s * 0.45, f.y - f.s * 2 + Math.sin(a) * f.s * 0.45, f.s * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(f.x + sway, f.y - f.s * 2, f.s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
};
