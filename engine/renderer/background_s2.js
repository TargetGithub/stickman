// Season 2 layer kinds (Doopi & Friends, "The Whispering Horn"): clock_window (the back of a tower clock's round
// glass face, seen from inside), stands (sports stands with a cheering crowd and pennants), scoreboard, pines
// (snowy pine trees) and ice_river (a frozen river across the floor between two snowy banks). Same contract as
// background_kinds.js: gen(rng, layer) once per theme, draw(ctx, layer, geom, view) per frame; world y is measured
// from the ground line (negative is up); motion is a pure function of view.fxT.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400];
const INK = "#2a2230";
const visible = (x, w, left, right) => x + w >= left && x <= right;

function disc(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Numeral ticks round a clock face, seen from behind (mirrored): bold bars at the hours. */
function clockTicks(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.lineWidth = k % 3 ? r * 0.025 : r * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
}

export const S2_KINDS = {
  clock_window: {
    // One huge round window at `x` (world px at this layer's factor): sky glass, mirrored hour bars, the backs of
    // the hands turning slowly (one turn a minute), a stone frame and spokes.
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const x of layer.at ?? [layer.x ?? 1600]) {
        const r = layer.r ?? 420;
        if (!visible(x - r, r * 2, left, right)) continue;
        const y = layer.y ?? -760;
        disc(ctx, x, y, r * 1.12, layer.frame);
        const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, layer.glassTop);
        g.addColorStop(1, layer.glassBottom);
        disc(ctx, x, y, r, g);
        clockTicks(ctx, x, y, r, layer.ticks);
        ctx.strokeStyle = layer.frame;
        ctx.lineWidth = r * 0.03;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.stroke();
        }
        const t = view.fxT * (layer.speed ?? 1);
        ctx.strokeStyle = layer.hands;
        ctx.lineCap = "round";
        for (const [len, w, turn] of [[0.55, 0.05, t / 720], [0.75, 0.03, t / 60]]) {
          const a = -Math.PI / 2 - turn * Math.PI * 2; // mirrored from behind: the hands turn the other way
          ctx.lineWidth = r * w;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len);
          ctx.stroke();
        }
        disc(ctx, x, y, r * 0.07, layer.hands);
      }
    },
  },
  stands: {
    // Tiered stands along the back: coloured rows, a crowd of round heads bobbing, pennants on poles.
    gen(rng, l) {
      const fans = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += 34 + rng() * 22) fans.push({ x, row: Math.floor(rng() * (l.rows ?? 4)), c: Math.floor(rng() * l.fans.length), ph: rng() * 6.28 });
      return fans;
    },
    draw(ctx, layer, fans, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const rows = layer.rows ?? 4;
      const step = layer.step ?? 70;
      const base = layer.y ?? -60;
      for (let k = 0; k < rows; k++) {
        ctx.fillStyle = layer.tiers[k % layer.tiers.length];
        ctx.fillRect(left, base - (k + 1) * step, right - left, step);
      }
      ctx.fillStyle = layer.roof;
      ctx.fillRect(left, base - rows * step - 40, right - left, 40);
      for (const f of fans) {
        if (f.x < left - 20 || f.x > right + 20) continue;
        const hop = Math.max(0, Math.sin(view.fxT * 4 * (view.react ?? 1) + f.ph)) * 8;
        const y = base - f.row * step - step * 0.55 - hop;
        ctx.fillStyle = layer.fans[f.c];
        ctx.fillRect(f.x - 11, y, 22, step * 0.5);
        disc(ctx, f.x, y - 9, 11, layer.skin);
      }
      const pole = layer.poleSpacing ?? 600;
      for (let x = Math.floor(left / pole) * pole; x < right + pole; x += pole) {
        const top = base - rows * step - 200;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, base - rows * step - 40);
        ctx.lineTo(x, top);
        ctx.stroke();
        const wave = Math.sin(view.fxT * 3 + x * 0.01) * 10;
        ctx.fillStyle = layer.pennants[Math.abs(Math.round(x / pole)) % layer.pennants.length];
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + 50, top + 12 + wave, x + 100, top + 26 + wave);
        ctx.lineTo(x, top + 52);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  scoreboard: {
    // A big scoreboard on legs: two team panels with round score lights.
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const x = layer.x ?? 1600;
      const w = layer.w ?? 520;
      if (!visible(x - w / 2, w, left, right)) return;
      const y = layer.y ?? -560;
      const h = w * 0.42;
      ctx.fillStyle = INK;
      ctx.fillRect(x - w * 0.3, y + h / 2, 16, -y - h / 2);
      ctx.fillRect(x + w * 0.3 - 16, y + h / 2, 16, -y - h / 2);
      ctx.fillStyle = layer.color;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeStyle = layer.trim;
      ctx.lineWidth = 8;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      for (const [side, c] of [[-1, layer.home], [1, layer.away]]) {
        ctx.fillStyle = c;
        ctx.fillRect(x + side * w * 0.25 - w * 0.18, y - h * 0.32, w * 0.36, h * 0.2);
        for (let k = 0; k < 3; k++) disc(ctx, x + side * w * 0.25 + (k - 1) * w * 0.1, y + h * 0.15, w * 0.035, k < (side < 0 ? 2 : 1) ? layer.light : "#3a3a44");
      }
    },
  },
  pines: {
    // Snowy pine trees: stacked triangles with white caps.
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, h: l.height * (0.7 + rng() * 0.6) });
      return out;
    },
    draw(ctx, layer, trees, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const t of trees) {
        const w = t.h * 0.42;
        if (!visible(t.x - w, w * 2, left, right)) continue;
        ctx.fillStyle = layer.trunk;
        ctx.fillRect(t.x - w * 0.08, -t.h * 0.18, w * 0.16, t.h * 0.18);
        for (let k = 0; k < 3; k++) {
          const top = -t.h + k * t.h * 0.24;
          const bw = w * (0.55 + k * 0.25);
          const by = top + t.h * 0.42;
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          ctx.moveTo(t.x, top);
          ctx.lineTo(t.x + bw, by);
          ctx.lineTo(t.x - bw, by);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = layer.snow;
          ctx.beginPath();
          ctx.moveTo(t.x, top);
          ctx.lineTo(t.x + bw * 0.45, top + t.h * 0.19);
          ctx.quadraticCurveTo(t.x, top + t.h * 0.24, t.x - bw * 0.45, top + t.h * 0.19);
          ctx.closePath();
          ctx.fill();
        }
      }
    },
  },
  ice_river: {
    onGround: true,
    // A frozen river across the floor from x0 to x1: pale ice with shine streaks and hairline cracks, snowy banks
    // on both sides, and the river running back toward the horizon.
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, 1);
      const { x0, x1 } = layer;
      if (!visible(x0 - 200, x1 - x0 + 400, left, right)) return;
      const far = layer.far ?? 0.35; // how much narrower the river is at the horizon
      const mid = (x0 + x1) / 2;
      const half = (x1 - x0) / 2;
      ctx.fillStyle = layer.ice;
      ctx.beginPath();
      ctx.moveTo(mid - half * far, 0);
      ctx.lineTo(mid + half * far, 0);
      ctx.lineTo(x1 + half * 0.25, 600);
      ctx.lineTo(x0 - half * 0.25, 600);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = layer.shine;
      ctx.lineCap = "round";
      ctx.lineWidth = 6;
      for (let k = 0; k < 6; k++) {
        const u = (k + 0.5) / 6;
        const y = 30 + u * 380;
        const s = Math.sin(view.fxT * 0.6 + k) * 30;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(mid - half * 0.4 + s - k * 20, y);
        ctx.lineTo(mid - half * 0.1 + s - k * 20, y + 12);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = layer.crack;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b, c] of [[-0.5, 120, 0.1], [0.3, 220, -0.3], [-0.1, 340, 0.45]]) {
        ctx.moveTo(mid + half * a, b);
        ctx.lineTo(mid + half * (a + 0.15), b + 30);
        ctx.lineTo(mid + half * c, b + 55);
      }
      ctx.stroke();
      ctx.fillStyle = layer.bank;
      for (const [edge, dir] of [[x0, -1], [x1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(mid + dir * half * far, 0);
        for (let k = 0; k <= 6; k++) {
          const u = k / 6;
          const top = mid + dir * half * far;
          ctx.lineTo(top + (edge + dir * half * 0.25 - top) * u + (k && k < 6 ? Math.sin(k * 1.7) * 14 : 0), u * 600);
        }
        ctx.lineTo(edge + dir * 2000, 600);
        ctx.lineTo(edge + dir * 2000, 0);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
};
