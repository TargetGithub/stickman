// Ship and underwater layer kinds (Doopi & Friends, batch B3): ship_rail (a pirate deck's rail, mast,
// patched sail with a fish flag, barrels and the steering wheel), seaweed (swaying strands from the lake
// floor) and bubbles_bg (bubbles rising across the screen). Same contract as background_kinds.js.

import { layerTransform, screen } from "./layer_util.js";

const SPAN = [-2400, 12400];
const INK = "#2a1d14";
const visible = (x, w, left, right) => x + w >= left && x <= right;

function box(ctx, x, y, w, h, fill, lw = 3) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

export const SEA_KINDS = {
  ship_rail: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) out.push({ x, mast: (l.masts || []).some((m) => m >= x && m < x + l.spacing), barrels: rng() < 0.6, wheel: (l.wheel ?? -99999) >= x && (l.wheel ?? -99999) < x + l.spacing, ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, segs, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const railY = -(layer.rail ?? 120);
      for (const s of segs) {
        if (!visible(s.x - 400, layer.spacing + 800, left, right)) continue;
        if (s.mast) {
          const mx = s.x + layer.spacing / 2;
          box(ctx, mx - 22, -980, 44, 980, layer.wood, 4);
          // A patched sail billowing a little, and a fish flag on top.
          const bil = 30 + 12 * Math.sin(view.fxT * 1.3 + s.ph);
          ctx.fillStyle = layer.sail;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(mx + 22, -880);
          ctx.quadraticCurveTo(mx + 240 + bil, -650, mx + 22, -400);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(mx - 22, -880);
          ctx.quadraticCurveTo(mx - 220 - bil, -650, mx - 22, -400);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          box(ctx, mx + 90, -700, 54, 54, layer.patch ?? "#c9a46c", 2);
          ctx.fillStyle = layer.flag ?? "#1d3557";
          ctx.fillRect(mx + 22, -980, 150, 80);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(mx + 95, -940, 30, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(mx + 65, -940); ctx.lineTo(mx + 45, -955); ctx.lineTo(mx + 45, -925);
          ctx.closePath();
          ctx.fill();
          // Rope ladders down to the rail.
          ctx.strokeStyle = layer.rope ?? "#c9a46c";
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (const side of [-1, 1]) { ctx.moveTo(mx + side * 22, -900); ctx.lineTo(mx + side * 300, railY); }
          ctx.stroke();
        }
        if (s.barrels) {
          for (const [dx, h] of [[90, 110], [180, 90]]) {
            ctx.fillStyle = layer.barrel ?? "#9a6a38";
            ctx.strokeStyle = INK;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(s.x + dx, -h / 2, 42, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            for (const f of [-0.25, 0.25]) { ctx.moveTo(s.x + dx - 40, -h / 2 + f * h); ctx.lineTo(s.x + dx + 40, -h / 2 + f * h); }
            ctx.stroke();
          }
        }
        if (s.wheel) {
          const wx = s.x + layer.spacing * 0.7;
          box(ctx, wx - 10, -220, 20, 220, layer.wood, 3);
          ctx.strokeStyle = layer.wood;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(wx, -240, 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 6;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4;
            ctx.moveTo(wx, -240);
            ctx.lineTo(wx + Math.cos(a) * 95, -240 + Math.sin(a) * 95);
          }
          ctx.stroke();
        }
        // The rail: a top beam and posts.
        box(ctx, s.x, railY - 16, layer.spacing + 1, 16, layer.wood, 3);
        for (let x = s.x + 40; x < s.x + layer.spacing; x += 120) box(ctx, x - 7, railY, 14, -railY, layer.wood, 2);
      }
    },
  },
  seaweed: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.4 + rng())) out.push({ x, h: l.height * (0.5 + rng() * 0.7), ph: rng() * 6.28, tone: rng() < 0.5 });
      return out;
    },
    draw(ctx, layer, strands, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.lineCap = "round";
      for (const s of strands) {
        if (!visible(s.x - 80, 160, left, right)) continue;
        ctx.strokeStyle = s.tone ? layer.color : layer.color2 ?? layer.color;
        ctx.lineWidth = layer.width ?? 14;
        ctx.beginPath();
        ctx.moveTo(s.x, 0);
        for (let u = 0.1; u <= 1.001; u += 0.1) ctx.lineTo(s.x + Math.sin(view.fxT * 1.1 + s.ph + u * 4) * 24 * u, -s.h * u);
        ctx.stroke();
      }
    },
  },
  bubbles_bg: {
    gen: (rng, l) => Array.from({ length: l.count }, () => ({ x: rng(), y: rng(), r: 3 + rng() * 9, sp: 0.5 + rng(), ph: rng() * 6.28 })),
    draw(ctx, layer, bubbles, view) {
      screen(ctx);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2;
      for (const b of bubbles) {
        const y = 1 - ((((b.y + (view.fxT * layer.speed * b.sp) / view.H) % 1) + 1) % 1);
        const x = b.x * view.W + Math.sin(view.fxT * 1.5 + b.ph) * 10;
        ctx.beginPath();
        ctx.arc(x, y * view.H, b.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
};
