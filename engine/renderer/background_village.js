// Village and palace layer kinds (Doopi & Friends, batch A4): huts, bunting, banyan, pillars, mist.
// Same contract as background_kinds.js: gen(rng, layer) once per theme, draw(ctx, layer, geom, view)
// per frame, world y measured from the ground line (negative is up). Motion (flags, roots, mist) is a
// pure function of view.fxT.

import { layerTransform } from "./layer_util.js";

const SPAN = [-2400, 12400]; // story stages go up to 12,000 px

const visible = (x, w, left, right) => x + w >= left && x <= right;
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];

function blob(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** One round mud hut standing on y=0 at x: wall w wide, h tall, a cone of thatch, an arched door. */
function hut(ctx, layer, h) {
  const { x, w, wallH } = h;
  const roofH = wallH * 0.9;
  ctx.fillStyle = h.wall;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, 0);
  ctx.lineTo(x - w / 2, -wallH);
  ctx.quadraticCurveTo(x, -wallH + w * 0.08, x + w / 2, -wallH);
  ctx.lineTo(x + w / 2, 0);
  ctx.quadraticCurveTo(x, w * 0.06, x - w / 2, 0);
  ctx.fill();
  // Painted band and dots near the floor (kolam style).
  ctx.fillStyle = layer.band ?? "#f4e3c1";
  ctx.fillRect(x - w / 2, -wallH * 0.22, w, wallH * 0.06);
  for (let k = -2; k <= 2; k++) blob(ctx, x + (k * w) / 6, -wallH * 0.1, Math.max(1.5, w * 0.018));
  // Door (arched) with a frame.
  const dw = w * 0.26;
  const dh = wallH * 0.66;
  const dx = x + h.doorAt * w * 0.3;
  ctx.fillStyle = layer.frame ?? "#6b4a2f";
  ctx.beginPath();
  ctx.moveTo(dx - dw / 2 - 4, 0);
  ctx.lineTo(dx - dw / 2 - 4, -dh);
  ctx.arc(dx, -dh, dw / 2 + 4, Math.PI, 0);
  ctx.lineTo(dx + dw / 2 + 4, 0);
  ctx.fill();
  ctx.fillStyle = h.door;
  ctx.beginPath();
  ctx.moveTo(dx - dw / 2, 0);
  ctx.lineTo(dx - dw / 2, -dh);
  ctx.arc(dx, -dh, dw / 2, Math.PI, 0);
  ctx.lineTo(dx + dw / 2, 0);
  ctx.fill();
  if (h.window) {
    ctx.fillStyle = layer.frame ?? "#6b4a2f";
    const wx = x - h.doorAt * w * 0.28;
    blob(ctx, wx, -wallH * 0.62, w * 0.07);
  }
  // Thatched roof: a cone with an overhang and a tuft on top, darker straw lines.
  const over = w * 0.12;
  ctx.fillStyle = layer.thatch;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - over, -wallH + 6);
  ctx.quadraticCurveTo(x - w * 0.25, -wallH - roofH * 0.55, x, -wallH - roofH);
  ctx.quadraticCurveTo(x + w * 0.25, -wallH - roofH * 0.55, x + w / 2 + over, -wallH + 6);
  ctx.quadraticCurveTo(x, -wallH + 22, x - w / 2 - over, -wallH + 6);
  ctx.fill();
  ctx.strokeStyle = layer.thatch2 ?? layer.thatch;
  ctx.lineWidth = Math.max(1.5, w * 0.012);
  ctx.beginPath();
  for (let k = -3; k <= 3; k++) {
    ctx.moveTo(x + k * w * 0.02, -wallH - roofH * 0.95);
    ctx.lineTo(x + (k * (w + over * 2)) / 7, -wallH + 10);
  }
  ctx.moveTo(x - w / 2 - over * 0.6, -wallH - roofH * 0.08);
  ctx.quadraticCurveTo(x, -wallH - roofH * 0.02, x + w / 2 + over * 0.6, -wallH - roofH * 0.08);
  ctx.stroke();
  blob(ctx, x, -wallH - roofH, w * 0.035);
}

/** Catenary-ish sag: y offset at u in [0,1] along a span. */
const sag = (u, depth) => 4 * depth * u * (1 - u);

export const VILLAGE_KINDS = {
  huts: {
    gen(rng, l) {
      const out = [];
      const s = l.scale ?? 1;
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * s * (0.75 + rng() * 0.5)) {
        const w = l.size * s * (0.8 + rng() * 0.4);
        out.push({ x, w, wallH: w * (0.62 + rng() * 0.16), wall: pick(rng, l.walls), door: pick(rng, l.doors), doorAt: rng() - 0.5, window: rng() < 0.6 });
      }
      return out;
    },
    draw(ctx, layer, huts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.save();
      ctx.translate(0, layer.y ?? 0);
      for (const h of huts) if (visible(h.x - h.w, h.w * 2, left, right)) hut(ctx, layer, h);
      ctx.restore();
    },
  },
  bunting: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing) out.push({ x, dy: (rng() - 0.5) * (l.vary ?? 40), ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, spans, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const size = layer.flag ?? 26;
      const depth = layer.sag ?? 60;
      spans.forEach((s, i) => {
        if (!visible(s.x, layer.spacing, left, right)) return;
        const y0 = layer.y + s.dy;
        const y1 = layer.y + (spans[i + 1]?.dy ?? 0);
        if (layer.pole) {
          ctx.fillStyle = layer.pole;
          ctx.fillRect(s.x - 5, y0 - 10, 10, -y0 + 10);
        }
        ctx.strokeStyle = layer.line ?? "#5a4632";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(s.x + u * layer.spacing, y0 + (y1 - y0) * u + sag(u, depth));
        ctx.stroke();
        const n = Math.max(2, Math.floor(layer.spacing / (size * 1.5)));
        for (let k = 1; k < n; k++) {
          const u = k / n;
          const fx = s.x + u * layer.spacing;
          const fy = y0 + (y1 - y0) * u + sag(u, depth);
          const sway = Math.sin(view.fxT * 2.4 + s.ph + k * 0.9) * size * 0.18;
          ctx.fillStyle = layer.colors[(i * 3 + k) % layer.colors.length];
          ctx.beginPath();
          ctx.moveTo(fx - size / 2, fy);
          ctx.lineTo(fx + size / 2, fy);
          ctx.lineTo(fx + sway, fy + size * 1.15);
          ctx.closePath();
          ctx.fill();
        }
      });
    },
  },
  banyan: {
    gen(rng, l) {
      return (l.at || [0]).map((x) => {
        const s = l.scale ?? 1;
        const spread = l.spread * s;
        const top = l.height * s;
        const blobs = Array.from({ length: 40 }, () => {
          const dx = (rng() * 2 - 1) * spread;
          const dome = 1 - (dx / spread) ** 2; // a wide, flat dome: higher in the middle
          return { dx, dy: -top - top * (0.08 + 0.3 * dome) * rng(), r: spread * (0.09 + rng() * 0.08), front: rng() < 0.5 };
        });
        const roots = [];
        for (let dx = -spread * 0.92; dx < spread * 0.92; dx += spread * (0.035 + rng() * 0.05)) {
          const full = Math.abs(dx) > spread * 0.3 && rng() < 0.28; // a few reach the ground and become pillars
          roots.push({ dx, y0: -top + rng() * top * 0.12, len: full ? 1 : 0.25 + rng() * 0.45, w: full ? 6 + rng() * 6 : 1.5 + rng() * 2, ph: rng() * 6.28 });
        }
        return { x, s, spread, top, blobs, roots };
      });
    },
    draw(ctx, layer, trees, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const t of trees) {
        if (!visible(t.x - t.spread * 1.3, t.spread * 2.6, left, right)) continue;
        const { x, s, top } = t;
        ctx.fillStyle = layer.color2 ?? layer.color;
        for (const b of t.blobs) if (!b.front) blob(ctx, x + b.dx, b.dy, b.r);
        // Main trunk: several fused stems, a flared base and big roots across the ground.
        ctx.fillStyle = layer.trunk;
        const tw = 70 * s;
        ctx.beginPath();
        ctx.moveTo(x - tw * 2.6, 0);
        ctx.quadraticCurveTo(x - tw * 1.1, -tw * 0.4, x - tw, -top * 0.45);
        ctx.lineTo(x - tw * 0.8, -top * 0.95);
        ctx.lineTo(x + tw * 0.8, -top * 0.95);
        ctx.lineTo(x + tw, -top * 0.45);
        ctx.quadraticCurveTo(x + tw * 1.1, -tw * 0.4, x + tw * 2.6, 0);
        ctx.closePath();
        ctx.fill();
        // Branches out to the canopy edges.
        ctx.strokeStyle = layer.trunk;
        ctx.lineCap = "round";
        for (const [ex, ey, wd] of [[-0.85, -0.98, 0.5], [0.85, -0.96, 0.5], [-0.45, -1.15, 0.4], [0.5, -1.12, 0.4]]) {
          ctx.lineWidth = tw * wd;
          ctx.beginPath();
          ctx.moveTo(x, -top * 0.8);
          ctx.quadraticCurveTo(x + ex * t.spread * 0.4, -top * 0.95, x + ex * t.spread, top * ey);
          ctx.stroke();
        }
        ctx.fillStyle = layer.trunk2 ?? layer.trunk;
        ctx.fillRect(x - tw * 0.35, -top * 0.9, tw * 0.16, top * 0.75);
        ctx.fillRect(x + tw * 0.25, -top * 0.85, tw * 0.12, top * 0.7);
        // Aerial roots hanging from the branches, swaying a little.
        ctx.strokeStyle = layer.roots ?? layer.trunk;
        for (const r of t.roots) {
          const len = r.len * -r.y0;
          const sway = r.len < 1 ? Math.sin(view.fxT * 1.1 + r.ph) * 4 * s : 0;
          ctx.lineWidth = r.w * s;
          ctx.beginPath();
          ctx.moveTo(x + r.dx, r.y0);
          ctx.quadraticCurveTo(x + r.dx + sway * 0.5, r.y0 + len * 0.5, x + r.dx + sway, r.y0 + len);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
        ctx.fillStyle = layer.color;
        for (const b of t.blobs) if (b.front) blob(ctx, x + b.dx, b.dy + b.r * 0.2, b.r * 0.85);
        if (layer.color3) {
          ctx.fillStyle = layer.color3;
          for (const b of t.blobs) if (b.front && b.r > t.spread * 0.22) blob(ctx, x + b.dx - b.r * 0.25, b.dy - b.r * 0.15, b.r * 0.4);
        }
      }
    },
  },
  pillars: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      const top = layer.top;
      const pw = layer.width ?? 90;
      ctx.fillStyle = layer.wall;
      ctx.fillRect(left, top, right - left, -top + 4);
      const start = Math.floor(left / layer.spacing) * layer.spacing;
      // Glowing arched windows between the pillars.
      if (layer.window) {
        const ww = layer.windowW ?? 120;
        const wy = layer.windowY ?? top * 0.75;
        const wh = layer.windowH ?? 260;
        for (let x = start + layer.spacing / 2; x < right + layer.spacing; x += layer.spacing) {
          if (layer.glow) {
            const g = ctx.createRadialGradient(x, wy + wh / 2, 10, x, wy + wh / 2, wh);
            g.addColorStop(0, layer.glow);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x - wh, wy - wh / 2, wh * 2, wh * 2);
          }
          ctx.fillStyle = layer.window;
          ctx.beginPath();
          ctx.moveTo(x - ww / 2, wy + wh);
          ctx.lineTo(x - ww / 2, wy + ww / 2);
          ctx.arc(x, wy + ww / 2, ww / 2, Math.PI, 0);
          ctx.lineTo(x + ww / 2, wy + wh);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = layer.wall;
          ctx.fillRect(x - 4, wy + 10, 8, wh - 10);
          ctx.fillRect(x - ww / 2, wy + wh * 0.55, ww, 8);
        }
      }
      for (let x = start; x < right + layer.spacing; x += layer.spacing) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(x - pw / 2, top, pw, -top);
        ctx.fillStyle = layer.color2 ?? layer.color;
        ctx.fillRect(x - pw / 2 + pw * 0.62, top, pw * 0.22, -top);
        ctx.fillStyle = layer.cap ?? layer.color;
        ctx.fillRect(x - pw * 0.7, top, pw * 1.4, 34);
        ctx.fillRect(x - pw * 0.62, top + 34, pw * 1.24, 14);
        ctx.fillRect(x - pw * 0.7, -36, pw * 1.4, 36);
        ctx.fillRect(x - pw * 0.62, -50, pw * 1.24, 14);
      }
      if (layer.beam) {
        ctx.fillStyle = layer.beam;
        ctx.fillRect(left, top - 40, right - left, 40);
      }
    },
  },
  mist: {
    onGround: true,
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += (l.spacing ?? 160) * (0.6 + rng() * 0.8)) out.push({ x, y: (rng() - 0.6) * (l.depth ?? 60), r: (l.size ?? 120) * (0.7 + rng() * 0.6), ph: rng() * 6.28 });
      return out;
    },
    draw(ctx, layer, puffs, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor ?? 1);
      const drift = view.fxT * (layer.speed ?? 12);
      ctx.fillStyle = layer.color;
      for (const p of puffs) {
        const x = p.x + drift + Math.sin(view.fxT * 0.5 + p.ph) * 20;
        if (!visible(x - p.r, p.r * 2, left, right)) continue;
        ctx.beginPath();
        ctx.ellipse(x, p.y, p.r, p.r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
};
