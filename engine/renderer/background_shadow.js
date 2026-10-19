// Shadow lands layer kinds (Doopi & Friends batch C2): dead_trees (bare twisted trees with curly branches,
// friendly shapes), mirrors (rows of tall silver mirrors in purple frames with a moving shine) and castle
// (a gloomy castle with two horn-topped towers and a big round door). Same contract as background_kinds.js.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400];
const INK = "#140c1c";
const visible = (x, w, left, right) => x + w >= left && x <= right;

export const SHADOW_KINDS = {
  dead_trees: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, h: l.height * (0.7 + rng() * 0.6), lean: (rng() - 0.5) * 0.3, curl: rng() < 0.5 ? 1 : -1 });
      return out;
    },
    draw(ctx, layer, trees, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.strokeStyle = layer.color;
      ctx.lineCap = "round";
      for (const t of trees) {
        if (!visible(t.x - t.h * 0.6, t.h * 1.2, left, right)) continue;
        const top = { x: t.x + t.lean * t.h, y: -t.h };
        ctx.lineWidth = t.h * 0.07;
        ctx.beginPath();
        ctx.moveTo(t.x, 0);
        ctx.quadraticCurveTo(t.x - t.lean * t.h, -t.h * 0.5, top.x, top.y);
        ctx.stroke();
        // Curly branches: a few arcs that end in a little spiral.
        ctx.lineWidth = t.h * 0.03;
        for (const [u, side] of [[0.55, -1], [0.7, 1], [0.85, -1]]) {
          const bx = t.x + (top.x - t.x) * u;
          const by = top.y * u;
          const ex = bx + side * t.h * 0.28;
          const ey = by - t.h * 0.12;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + side * t.h * 0.15, by - t.h * 0.2, ex, ey);
          ctx.arc(ex - side * t.h * 0.04, ey, t.h * 0.04, 0, Math.PI * 1.5 * t.curl, t.curl < 0);
          ctx.stroke();
        }
      }
    },
  },
  mirrors: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) out.push({ x, h: l.height * (0.9 + rng() * 0.2), ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, mirrors, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const w = layer.width ?? 220;
      for (const m of mirrors) {
        if (!visible(m.x - w, w * 2, left, right)) continue;
        const x0 = m.x - w / 2;
        const g = ctx.createLinearGradient(x0, -m.h, x0 + w, 0);
        g.addColorStop(0, layer.glass);
        g.addColorStop(1, layer.glass2 ?? layer.glass);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x0, -m.h, w, m.h, [w / 2, w / 2, 8, 8]);
        ctx.fill();
        ctx.strokeStyle = layer.frame;
        ctx.lineWidth = 16;
        ctx.stroke();
        // A shine streak sliding slowly across the glass.
        const u = (view.fxT * 0.15 + m.ph) % 1;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x0, -m.h, w, m.h, [w / 2, w / 2, 8, 8]);
        ctx.clip();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        const sx = x0 - w + u * w * 3;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 40, 0);
        ctx.lineTo(sx + 40 + m.h * 0.4, -m.h);
        ctx.lineTo(sx + m.h * 0.4, -m.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    },
  },
  castle: {
    draw(ctx, layer, _g, view) {
      layerTransform(ctx, view, layer.factor);
      const x = layer.x ?? 1800;
      const w = layer.width ?? 1200;
      const h = layer.height ?? 700;
      ctx.fillStyle = layer.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      // The keep and two towers.
      ctx.fillRect(x - w / 2, -h, w, h);
      ctx.strokeRect(x - w / 2, -h, w, h);
      for (const side of [-1, 1]) {
        const tx = x + side * (w / 2 - 60);
        ctx.fillStyle = layer.tower ?? layer.color;
        ctx.fillRect(tx - 110, -h - 380, 220, h + 380);
        ctx.strokeRect(tx - 110, -h - 380, 220, h + 380);
        // Curly horns on the tower tops.
        ctx.fillStyle = layer.horn;
        ctx.beginPath();
        ctx.moveTo(tx - 90, -h - 380);
        ctx.quadraticCurveTo(tx - 160 * side * -1, -h - 620, tx + 20 * side, -h - 560);
        ctx.quadraticCurveTo(tx - 20, -h - 470, tx + 60, -h - 380);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = layer.window;
        ctx.fillRect(tx - 25, -h - 260, 50, 80);
      }
      // Battlements and the big round door.
      ctx.fillStyle = layer.color;
      for (let k = x - w / 2; k < x + w / 2; k += 120) ctx.fillRect(k, -h - 50, 60, 50);
      ctx.fillStyle = layer.door;
      ctx.beginPath();
      ctx.moveTo(x - 140, 0);
      ctx.lineTo(x - 140, -220);
      ctx.arc(x, -220, 140, Math.PI, 0);
      ctx.lineTo(x + 140, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = layer.window;
      for (const dx of [-340, 340]) ctx.fillRect(x + dx - 30, -h * 0.6, 60, 90);
    },
  },
};
