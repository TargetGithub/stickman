// Story layer kinds (STORY_SPEC 5.1): clouds, trees, bushes, buildings, lampposts, fence, bricks,
// interior_wall, windows, furniture, cave, crystals, puddles. Milestone: S1.
// Same contract as the kinds in background.js: gen(rng, layer) once per theme, draw(ctx, layer, geom,
// view) per frame. World y is measured from the ground line (negative is up).

import { layerTransform, screen, polygonBand } from "./layer_util.js";

const SPAN = [-2400, 12400]; // story stages go up to 12,000 px

const visible = (x, w, left, right) => x + w >= left && x <= right;

function blob(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export const STORY_KINDS = {
  clouds: {
    gen: (rng, l) => Array.from({ length: l.count ?? 7 }, () => ({ x: rng(), y: (l.top ?? 0.08) + rng() * (l.band ?? 0.25), s: 0.6 + rng() * 0.8, speed: 4 + rng() * 8 })),
    draw(ctx, layer, clouds, view) {
      screen(ctx);
      ctx.fillStyle = layer.color;
      const wrapW = view.W + 600;
      for (const c of clouds) {
        const x = ((((c.x * wrapW + view.fxT * c.speed - view.cam.x * layer.factor) % wrapW) + wrapW) % wrapW) - 300;
        const y = c.y * view.H;
        const r = 46 * c.s * (view.H / 1080);
        blob(ctx, x, y, r);
        blob(ctx, x + r * 1.1, y + r * 0.15, r * 0.85);
        blob(ctx, x - r * 1.05, y + r * 0.2, r * 0.75);
        blob(ctx, x + r * 0.4, y - r * 0.45, r * 0.8);
      }
    },
  },
  trees: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.7 + rng() * 0.6)) out.push({ x, h: l.height * (0.75 + rng() * 0.5), r: l.crown * (0.8 + rng() * 0.4), tone: rng() < 0.5 });
      return out;
    },
    draw(ctx, layer, trees, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const t of trees) {
        if (!visible(t.x - t.r * 1.4, t.r * 2.8, left, right)) continue;
        ctx.fillStyle = layer.trunk;
        ctx.fillRect(t.x - t.r * 0.12, -t.h, t.r * 0.24, t.h + 4);
        ctx.fillStyle = t.tone ? layer.color : layer.color2 ?? layer.color;
        blob(ctx, t.x, -t.h, t.r);
        blob(ctx, t.x - t.r * 0.7, -t.h + t.r * 0.35, t.r * 0.7);
        blob(ctx, t.x + t.r * 0.7, -t.h + t.r * 0.3, t.r * 0.75);
      }
    },
  },
  bushes: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, r: l.size * (0.7 + rng() * 0.6) });
      return out;
    },
    draw(ctx, layer, bushes, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      for (const b of bushes) {
        if (!visible(b.x - b.r * 2, b.r * 4, left, right)) continue;
        ctx.beginPath();
        ctx.arc(b.x, (layer.y ?? 0), b.r, Math.PI, 0);
        ctx.arc(b.x + b.r * 0.9, (layer.y ?? 0), b.r * 0.7, Math.PI, 0);
        ctx.fill();
      }
    },
  },
  buildings: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1];) {
        const w = l.minW + rng() * (l.maxW - l.minW);
        const h = l.minH + rng() * (l.maxH - l.minH);
        out.push({ x, w, h, color: l.palette[Math.floor(rng() * l.palette.length) % l.palette.length], door: rng() < 0.6, doorAt: 0.2 + rng() * 0.5, awning: rng() < 0.4, rows: Math.floor((h - 160) / 110) });
        x += w + (l.gap ?? 0);
      }
      return out;
    },
    draw(ctx, layer, blocks, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const b of blocks) {
        if (!visible(b.x, b.w, left, right)) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, -b.h, b.w, b.h + 4000);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(b.x, -b.h, b.w, 14);
        ctx.fillStyle = layer.window;
        const cols = Math.max(1, Math.floor((b.w - 40) / 80));
        for (let r = 0; r < b.rows; r++) {
          for (let c = 0; c < cols; c++) ctx.fillRect(b.x + 30 + c * ((b.w - 60) / cols), -b.h + 40 + r * 110, 46, 62);
        }
        if (b.door) {
          ctx.fillStyle = layer.door;
          ctx.fillRect(b.x + b.w * b.doorAt, -150, 70, 150);
        }
        if (b.awning) {
          ctx.fillStyle = layer.awning;
          ctx.fillRect(b.x + 10, -200, b.w - 20, 26);
        }
      }
    },
  },
  lampposts: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
        const g = ctx.createRadialGradient(x, -layer.height, 6, x, -layer.height, 120);
        g.addColorStop(0, layer.glow);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 120, -layer.height - 120, 240, 240);
        ctx.fillStyle = layer.color;
        ctx.fillRect(x - 7, -layer.height, 14, layer.height);
        ctx.fillRect(x - 22, -layer.height - 14, 44, 14);
        ctx.fillStyle = layer.light;
        ctx.fillRect(x - 16, -layer.height, 32, 18);
      }
    },
  },
  fence: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      ctx.fillRect(left, -layer.height * 0.75, right - left, 10);
      ctx.fillRect(left, -layer.height * 0.35, right - left, 10);
      for (let x = Math.floor(left / layer.spacing) * layer.spacing; x < right; x += layer.spacing) {
        ctx.beginPath();
        ctx.moveTo(x - 9, 0); ctx.lineTo(x - 9, -layer.height); ctx.lineTo(x, -layer.height - 14); ctx.lineTo(x + 9, -layer.height); ctx.lineTo(x + 9, 0);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  bricks: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      ctx.fillRect(left, layer.top, right - left, 4000);
      ctx.strokeStyle = layer.mortar;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let y = layer.top, row = 0; y < 0; y += 44, row++) {
        ctx.moveTo(left, y); ctx.lineTo(right, y);
        const off = row % 2 ? 50 : 0;
        for (let x = Math.floor(left / 100) * 100 + off; x < right; x += 100) { ctx.moveTo(x, y); ctx.lineTo(x, y + 44); }
      }
      ctx.stroke();
      if (layer.escape) {
        // Fire escapes: railings and ladders at intervals.
        ctx.strokeStyle = layer.escape;
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = Math.floor(left / 900) * 900 + 300; x < right; x += 900) {
          for (const y of [layer.top + 120, layer.top + 320]) { ctx.moveTo(x, y); ctx.lineTo(x + 320, y); ctx.moveTo(x, y - 60); ctx.lineTo(x + 320, y - 60); }
          for (let k = 0; k <= 320; k += 40) { ctx.moveTo(x + k, layer.top + 60); ctx.lineTo(x + k, layer.top + 120); ctx.moveTo(x + k, layer.top + 260); ctx.lineTo(x + k, layer.top + 320); }
        }
        ctx.stroke();
      }
    },
  },
  interior_wall: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      ctx.fillRect(left, -4000, right - left, 4000);
      ctx.fillStyle = layer.stripe;
      for (let x = Math.floor(left / 80) * 80; x < right; x += 80) ctx.fillRect(x, -4000, 30, 4000);
      ctx.fillStyle = layer.trim;
      ctx.fillRect(left, -36, right - left, 36);
      ctx.fillRect(left, layer.ceiling, right - left, 26);
    },
  },
  windows: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
        const g = ctx.createLinearGradient(0, layer.y, 0, layer.y + layer.h);
        g.addColorStop(0, layer.skyTop);
        g.addColorStop(1, layer.skyBottom);
        ctx.fillStyle = layer.frame;
        ctx.fillRect(x - layer.w / 2 - 14, layer.y - 14, layer.w + 28, layer.h + 28);
        ctx.fillStyle = g;
        ctx.fillRect(x - layer.w / 2, layer.y, layer.w, layer.h);
        ctx.fillStyle = layer.frame;
        ctx.fillRect(x - 5, layer.y, 10, layer.h);
        ctx.fillRect(x - layer.w / 2, layer.y + layer.h / 2 - 5, layer.w, 10);
        ctx.fillStyle = layer.curtain;
        ctx.fillRect(x - layer.w / 2 - 40, layer.y - 20, 40, layer.h + 60);
        ctx.fillRect(x + layer.w / 2, layer.y - 20, 40, layer.h + 60);
      }
    },
  },
  furniture: {
    gen(rng, l) {
      const kinds = ["shelf", "sofa", "lamp", "plant"];
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.8 + rng() * 0.5)) out.push({ x, kind: kinds[Math.floor(rng() * kinds.length) % kinds.length] });
      return out;
    },
    draw(ctx, layer, items, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const it of items) {
        if (!visible(it.x - 200, 400, left, right)) continue;
        ctx.fillStyle = layer.color;
        if (it.kind === "shelf") {
          ctx.fillRect(it.x - 90, -380, 180, 380);
          ctx.fillStyle = layer.accent;
          for (let y = -340; y < -20; y += 80) ctx.fillRect(it.x - 76, y, 152, 8);
        } else if (it.kind === "sofa") {
          ctx.fillRect(it.x - 170, -110, 340, 110);
          ctx.fillRect(it.x - 170, -170, 340, 70);
          ctx.fillStyle = layer.accent;
          ctx.fillRect(it.x - 190, -130, 40, 130);
          ctx.fillRect(it.x + 150, -130, 40, 130);
        } else if (it.kind === "lamp") {
          ctx.fillRect(it.x - 6, -300, 12, 300);
          ctx.fillStyle = layer.accent;
          ctx.beginPath(); ctx.moveTo(it.x - 50, -300); ctx.lineTo(it.x + 50, -300); ctx.lineTo(it.x + 32, -370); ctx.lineTo(it.x - 32, -370); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(it.x - 34, -70, 68, 70);
          ctx.fillStyle = layer.leaf;
          blob(ctx, it.x, -120, 54);
          blob(ctx, it.x - 40, -96, 34);
          blob(ctx, it.x + 40, -100, 36);
        }
      }
    },
  },
  cave: {
    gen(rng, l) {
      const top = [];
      for (let x = SPAN[0]; x <= SPAN[1]; x += l.step) top.push({ x, d: l.depth * (0.4 + rng() * 0.6) });
      const rocks = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += 120 + rng() * 260) rocks.push({ x, w: 120 + rng() * 260, h: l.rocks * (0.4 + rng() * 0.6) });
      return { top, rocks };
    },
    draw(ctx, layer, g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.wall;
      ctx.fillRect(left, layer.ceiling, right - left, 4000);
      ctx.fillStyle = layer.color;
      for (const r of g.rocks) {
        if (!visible(r.x, r.w, left, right)) continue;
        ctx.beginPath();
        ctx.moveTo(r.x, 0); ctx.lineTo(r.x + r.w * 0.3, -r.h); ctx.lineTo(r.x + r.w * 0.7, -r.h * 0.8); ctx.lineTo(r.x + r.w, 0);
        ctx.closePath();
        ctx.fill();
      }
      // Ceiling with stalactites.
      ctx.beginPath();
      ctx.moveTo(left, -4000);
      for (const p of g.top) if (p.x >= left - 200 && p.x <= right + 200) { ctx.lineTo(p.x, layer.ceiling); ctx.lineTo(p.x + layer.step / 2, layer.ceiling + p.d); }
      ctx.lineTo(right, layer.ceiling);
      ctx.lineTo(right, -4000);
      ctx.closePath();
      ctx.fill();
    },
  },
  crystals: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.6 + rng() * 0.8)) out.push({ x, h: l.height * (0.6 + rng() * 0.6), ph: rng() * 6.28, lean: (rng() - 0.5) * 0.5 });
      return out;
    },
    draw(ctx, layer, list, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const c of list) {
        if (!visible(c.x - 120, 240, left, right)) continue;
        const pulse = 0.65 + 0.35 * Math.sin(view.fxT * 1.6 + c.ph);
        const g = ctx.createRadialGradient(c.x, -c.h / 2, 4, c.x, -c.h / 2, c.h);
        g.addColorStop(0, layer.glow.replace("A", (0.45 * pulse).toFixed(3)));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(c.x - c.h, -c.h * 1.5, c.h * 2, c.h * 2);
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(c.x - 22, 0); ctx.lineTo(c.x + c.lean * c.h, -c.h); ctx.lineTo(c.x + 22, 0);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  puddles: {
    onGround: true,
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1]; x += l.spacing * (0.5 + rng())) out.push({ x, w: 80 + rng() * 160, y: 30 + rng() * 140 });
      return out;
    },
    draw(ctx, layer, list, view) {
      const { left, right } = layerTransform(ctx, view, 1);
      ctx.fillStyle = layer.color;
      for (const p of list) {
        if (!visible(p.x - p.w, p.w * 2, left, right)) continue;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w, p.w * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  hills: {
    gen(rng, l) {
      const pts = [];
      for (let x = SPAN[0]; x <= SPAN[1]; x += l.step) pts.push({ x, y: -l.height * (0.55 + 0.45 * Math.sin(x / (l.step * 3) + rng() * 0.6)) });
      return pts;
    },
    draw(ctx, layer, pts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      polygonBand(ctx, pts, left, right, layer.color);
    },
  },
};
