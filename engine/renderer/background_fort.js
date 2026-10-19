// Fort, kitchen and lake layer kinds (Doopi & Friends, batch B): fort_wall (a crenellated wall with gates
// and strings of drying chillies), shelves (kitchen shelves with spice jars and sacks), water (a lake band
// with lotus leaves, flowers and moving wave lines) and huts_stilts (fishing huts on stilts in the water).
// Same contract as background_kinds.js: gen(rng, layer) once per theme, draw per frame via layerTransform.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400];
const INK = "#2a1d14";
const visible = (x, w, left, right) => x + w >= left && x <= right;
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

function rect(ctx, x, y, w, h, fill, lw = 3) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

export const FORT_KINDS = {
  fort_wall: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) out.push({ x, gate: (l.gates || []).some((g) => g >= x && g < x + l.spacing), ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, segs, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const h = layer.height;
      const m = layer.merlon ?? 46;
      for (const s of segs) {
        if (!visible(s.x, layer.spacing, left, right)) continue;
        ctx.fillStyle = layer.color;
        ctx.fillRect(s.x, -h, layer.spacing + 1, h);
        // Merlons along the top.
        for (let x = s.x; x < s.x + layer.spacing; x += m * 2) ctx.fillRect(x, -h - m * 0.8, m, m * 0.8);
        // Stone courses.
        ctx.strokeStyle = layer.line ?? "rgba(0,0,0,0.18)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let y = -h + 60; y < 0; y += 60) { ctx.moveTo(s.x, y); ctx.lineTo(s.x + layer.spacing, y); }
        ctx.stroke();
        if (s.gate) {
          const gw = layer.gateW ?? 220;
          const gx = s.x + layer.spacing / 2 - gw / 2;
          ctx.fillStyle = layer.gate ?? "#6b4a2f";
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, -h * 0.55);
          ctx.arc(gx + gw / 2, -h * 0.55, gw / 2, Math.PI, 0);
          ctx.lineTo(gx + gw, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          for (let k = 1; k < 4; k++) { ctx.moveTo(gx + (gw * k) / 4, 0); ctx.lineTo(gx + (gw * k) / 4, -h * 0.55 - (k === 2 ? gw / 2 : gw * 0.43)); }
          ctx.stroke();
        }
        // A string of drying chillies, swaying a little.
        if (layer.chillies) {
          const y0 = -h * 0.72;
          ctx.strokeStyle = "#5a4632";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(s.x + u * layer.spacing, y0 + 30 * 4 * u * (1 - u));
          ctx.stroke();
          ctx.fillStyle = layer.chillies;
          for (let k = 1; k < 9; k++) {
            const u = k / 9;
            const cx = s.x + u * layer.spacing;
            const cy = y0 + 30 * 4 * u * (1 - u);
            const sw = Math.sin(view.fxT * 1.6 + s.ph + k) * 0.15;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(sw);
            ctx.beginPath();
            ctx.ellipse(0, 18, 6, 18, 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    },
  },
  shelves: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) {
        const items = [];
        for (let row = 0; row < (l.rows ?? 3); row++) {
          for (let ix = 20; ix < l.spacing - 70; ix += 50 + rng() * 30) items.push({ row, ix, kind: rng() < 0.7 ? "jar" : "sack", color: pick(rng, l.colors), h: 34 + rng() * 26 });
        }
        out.push({ x, items });
      }
      return out;
    },
    draw(ctx, layer, units, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const top = layer.top ?? -700;
      const gap = layer.gap ?? 150;
      for (const u of units) {
        if (!visible(u.x, layer.spacing, left, right)) continue;
        for (const it of u.items) {
          const base = top + (it.row + 1) * gap;
          const x = u.x + it.ix;
          if (it.kind === "jar") {
            rect(ctx, x, base - it.h, 36, it.h, it.color, 2);
            rect(ctx, x - 3, base - it.h - 9, 42, 9, layer.lid ?? "#8a6442", 2);
          } else {
            ctx.fillStyle = layer.sack ?? "#c9a46c";
            ctx.strokeStyle = INK;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x + 22, base - it.h * 0.5, 24, it.h * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = it.color;
            ctx.beginPath();
            ctx.ellipse(x + 22, base - it.h * 0.95, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        for (let row = 1; row <= (layer.rows ?? 3); row++) rect(ctx, u.x, top + row * gap, layer.spacing - 30, 14, layer.color, 3);
      }
    },
  },
  water: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, y: rng(), flower: rng() < (l.flowers ?? 0.4), r: 22 + rng() * 22, ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, pads, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const top = layer.top ?? -260;
      const bottom = layer.bottom ?? 0;
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, layer.color);
      g.addColorStop(1, layer.color2 ?? layer.color);
      ctx.fillStyle = g;
      ctx.fillRect(left, top, right - left, bottom - top);
      // Wave lines drifting sideways.
      ctx.strokeStyle = layer.wave ?? "rgba(255,255,255,0.45)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      const drift = (view.fxT * 30) % 240;
      for (let row = 0; row < 4; row++) {
        const y = top + (bottom - top) * (0.18 + row * 0.22);
        ctx.beginPath();
        for (let x = Math.floor(left / 240) * 240 - 240 + drift + row * 60; x < right; x += 240) { ctx.moveTo(x, y); ctx.lineTo(x + 70, y); }
        ctx.stroke();
      }
      for (const p of pads) {
        if (!visible(p.x - 60, 120, left, right)) continue;
        const y = top + (bottom - top) * (0.15 + p.y * 0.75) + Math.sin(view.fxT * 1.2 + p.ph) * 3;
        ctx.fillStyle = layer.leaf ?? "#3f9a4a";
        ctx.beginPath();
        ctx.ellipse(p.x, y, p.r, p.r * 0.35, 0, 0.25, Math.PI * 2 - 0.25);
        ctx.lineTo(p.x, y);
        ctx.fill();
        if (!p.flower) continue;
        ctx.fillStyle = layer.flower ?? "#ff8fc0";
        for (const a of [-0.9, -0.3, 0.3, 0.9]) {
          ctx.beginPath();
          ctx.ellipse(p.x + Math.sin(a) * 9, y - 12 - Math.cos(a) * 6, 6, 13, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(p.x, y - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  huts_stilts: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.7 + rng() * 0.6)) out.push({ x, w: l.size * (0.8 + rng() * 0.4), door: pick(rng, l.doors ?? ["#2f7de1"]) });
      return out;
    },
    draw(ctx, layer, huts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const y0 = layer.y ?? -120;
      for (const h of huts) {
        if (!visible(h.x - h.w, h.w * 2, left, right)) continue;
        const legH = h.w * 0.5;
        ctx.strokeStyle = layer.wood ?? "#6b4a2f";
        ctx.lineWidth = 8;
        ctx.beginPath();
        for (const dx of [-0.4, -0.1, 0.2, 0.45]) { ctx.moveTo(h.x + dx * h.w, y0); ctx.lineTo(h.x + dx * h.w, y0 - legH); }
        ctx.stroke();
        rect(ctx, h.x - h.w * 0.5, y0 - legH - 10, h.w, 10, layer.wood ?? "#6b4a2f", 2);
        rect(ctx, h.x - h.w * 0.4, y0 - legH - 10 - h.w * 0.5, h.w * 0.8, h.w * 0.5, layer.wall ?? "#c49a62", 3);
        rect(ctx, h.x - h.w * 0.08, y0 - legH - 10 - h.w * 0.32, h.w * 0.16, h.w * 0.32, h.door, 2);
        ctx.fillStyle = layer.roof ?? "#9a6a38";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(h.x - h.w * 0.55, y0 - legH - 10 - h.w * 0.5);
        ctx.lineTo(h.x, y0 - legH - 10 - h.w * 0.95);
        ctx.lineTo(h.x + h.w * 0.55, y0 - legH - 10 - h.w * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    },
  },
};
