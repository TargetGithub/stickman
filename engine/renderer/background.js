// Procedural theme backgrounds with parallax (spec 14.1 step 1, 14.3). Milestone: M4, M7.
// Each layer kind has a generator (geometry, once per theme, from a seeded stream) and a drawer
// (a pure function of camera and fx time). Layers with onGround draw over the floor.

import { mulberry32, hash32 } from "../math.js";
import { STAGE } from "../config.js";
import { layerTransform, screen, glowDisc, polygonBand } from "./layer_util.js";
import { STORY_KINDS } from "./background_kinds.js";
import { VILLAGE_KINDS } from "./background_village.js";
import { FOREST_KINDS } from "./background_forest.js";
import { FORT_KINDS } from "./background_fort.js";
import { SEA_KINDS } from "./background_sea.js";
import { IRON_KINDS } from "./background_iron.js";
import { SHADOW_KINDS } from "./background_shadow.js";
import { MOON_KINDS } from "./background_moon.js";
import { nightLook, drawNightBackground } from "./night.js";

const SPAN = [-2400, 8000]; // world x range covered by generated geometry (any stage up to 8000 px)

const KINDS = {
  sun: {
    draw(ctx, layer, _g, view) {
      screen(ctx);
      const x = layer.x * view.W - (view.cam.x - STAGE.width / 2) * layer.factor;
      glowDisc(ctx, x, layer.y * view.H, layer.r, layer.color, layer.glow);
    },
  },
  stars: {
    gen: (rng, l) => Array.from({ length: l.count }, () => ({ x: rng(), y: rng() * (l.top ?? 0.6), r: 0.8 + rng() * 1.8, ph: rng() * 6.28 })),
    draw(ctx, layer, stars, view) {
      screen(ctx);
      ctx.fillStyle = layer.color;
      for (const s of stars) {
        ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(view.fxT * 2.2 + s.ph));
        ctx.beginPath();
        ctx.arc(s.x * view.W, s.y * view.H, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },
  mountains: {
    gen(rng, l) {
      const pts = [];
      for (let x = SPAN[0]; x <= SPAN[1]; x += l.step) pts.push({ x, y: -l.height * (1 - l.rough + l.rough * rng()) });
      return pts;
    },
    draw(ctx, layer, pts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      polygonBand(ctx, pts, left, right, layer.color);
      if (layer.caps) {
        // Snow caps: a lighter triangle over each peak above the cap line.
        ctx.fillStyle = layer.caps;
        pts.forEach((p, i) => {
          if (p.x < left - 400 || p.x > right + 400 || -p.y < layer.height * 0.82) return;
          const prev = pts[i - 1] || p;
          const next = pts[i + 1] || p;
          const capY = p.y * 0.86; // only the top of tall peaks is snowy
          const lerpTo = (q) => ({ x: p.x + (q.x - p.x) * ((capY - p.y) / (q.y - p.y || 1)), y: capY });
          const a = lerpTo(prev);
          const b = lerpTo(next);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(p.x, capY + 8);
          ctx.closePath();
          ctx.fill();
        });
      }
    },
  },
  dunes: {
    gen(rng, l) {
      const pts = [];
      for (let x = SPAN[0]; x <= SPAN[1]; x += l.wavelength / 8) {
        pts.push({ x, y: -l.height * (0.55 + 0.45 * Math.sin((x / l.wavelength) * Math.PI * 2 + rng() * 0.15)) });
      }
      return pts;
    },
    draw(ctx, layer, pts, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      polygonBand(ctx, pts, left, right, layer.color);
    },
  },
  skyline: {
    gen(rng, l) {
      const out = [];
      for (let x = SPAN[0]; x < SPAN[1];) {
        const w = l.minW + rng() * (l.maxW - l.minW);
        const h = l.minH + rng() * (l.maxH - l.minH);
        const lit = [];
        for (let wy = 20; wy < h - 20; wy += 34) for (let wx = 14; wx < w - 20; wx += 26) if (rng() < (l.lit ?? 0.35)) lit.push({ x: wx, y: wy });
        out.push({ x, w, h, lit });
        x += w + 6 + rng() * 30;
      }
      return out;
    },
    draw(ctx, layer, blocks, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (const b of blocks) {
        if (b.x + b.w < left || b.x > right) continue;
        ctx.fillStyle = layer.color;
        ctx.fillRect(b.x, -b.h, b.w, b.h + 4000);
        if (!layer.windows) continue;
        ctx.fillStyle = layer.windows;
        for (const w of b.lit) ctx.fillRect(b.x + w.x, -b.h + w.y, 10, 14);
      }
    },
  },
  wall: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      ctx.fillRect(left, layer.top, right - left, 4000);
      ctx.fillStyle = layer.beam;
      ctx.fillRect(left, layer.top, right - left, 18);
      for (let x = Math.floor(left / layer.spacing) * layer.spacing; x < right; x += layer.spacing) ctx.fillRect(x - 9, layer.top, 18, -layer.top);
    },
  },
  lanterns: {
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
        const g = ctx.createRadialGradient(x, layer.y, 6, x, layer.y, 90);
        g.addColorStop(0, layer.glow);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 90, layer.y - 90, 180, 180);
        ctx.strokeStyle = "#1a0f14";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, layer.y - 60); ctx.lineTo(x, layer.y - 26); ctx.stroke();
        ctx.fillStyle = layer.color;
        ctx.beginPath(); ctx.ellipse(x, layer.y, 18, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a0f14";
        ctx.fillRect(x - 12, layer.y - 28, 24, 5);
        ctx.fillRect(x - 12, layer.y + 23, 24, 5);
      }
    },
  },
  crowd: {
    gen(rng, l) {
      const out = [];
      for (let row = 0; row < l.rows; row++) for (let x = SPAN[0]; x < SPAN[1]; x += 34 + rng() * 14) out.push({ x, row, ph: rng() * 6.28, s: 0.85 + rng() * 0.3 });
      return out;
    },
    draw(ctx, layer, people, view) {
      const { left, right } = layerTransform(ctx, view, layer.factor);
      ctx.fillStyle = layer.color;
      for (const p of people) {
        if (p.x < left - 40 || p.x > right + 40) continue;
        const bob = Math.max(0, Math.sin(view.fxT * 7 + p.ph)) * 8 * (layer.excite ?? 1) * (view.react ?? 1);
        const y = layer.y - p.row * 42 - bob;
        ctx.beginPath();
        ctx.arc(p.x, y - 30 * p.s, 13 * p.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(p.x, y, 22 * p.s, 18 * p.s, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(p.x - 22 * p.s, y, 44 * p.s, 120);
      }
    },
  },
  spotlights: {
    draw(ctx, layer, _g, view) {
      screen(ctx);
      for (const sx of layer.at) {
        const x = sx * view.W;
        const g = ctx.createLinearGradient(x, 0, x, view.H);
        g.addColorStop(0, layer.color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 30, 0);
        ctx.lineTo(x + 30, 0);
        ctx.lineTo(x + view.W * 0.18, view.H);
        ctx.lineTo(x - view.W * 0.18, view.H);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  floorGrid: {
    onGround: true,
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, 1);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2;
      const cx = view.cam.x - view.cam.shakeX;
      for (let x = Math.floor(left / layer.spacing) * layer.spacing; x < right; x += layer.spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (x - cx) * 0.8, 500); ctx.stroke();
      }
      for (let y = 18; y < 500; y *= 1.55) {
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      }
    },
  },
  floorStripes: {
    onGround: true,
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, 1);
      ctx.fillStyle = layer.color;
      for (const y of layer.at) ctx.fillRect(left, y, right - left, layer.width);
    },
  },
  snowfall: {
    gen: (rng, l) => Array.from({ length: l.count }, () => ({ x: rng(), y: rng(), r: 1.5 + rng() * 3, sp: 0.5 + rng(), ph: rng() * 6.28 })),
    draw(ctx, layer, flakes, view) {
      screen(ctx);
      ctx.fillStyle = layer.color;
      for (const f of flakes) {
        const y = (((f.y + (view.fxT * layer.speed * f.sp) / view.H) % 1) + 1) % 1;
        const x = ((((f.x * view.W + Math.sin(view.fxT * 0.8 + f.ph) * 18) % view.W) + view.W) % view.W);
        ctx.beginPath();
        ctx.arc(x, y * view.H, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  planks: {
    onGround: true,
    draw(ctx, layer, _g, view) {
      const { left, right } = layerTransform(ctx, view, 1);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 3;
      const cx = view.cam.x - view.cam.shakeX;
      for (let x = Math.floor(left / layer.spacing) * layer.spacing; x < right; x += layer.spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - (x - cx) * 0.35, 400); ctx.stroke();
      }
    },
  },
};

Object.assign(KINDS, STORY_KINDS, VILLAGE_KINDS, FOREST_KINDS, FORT_KINDS, SEA_KINDS, IRON_KINDS, SHADOW_KINDS, MOON_KINDS);

export const LAYER_KINDS = Object.keys(KINDS);

/** Background for one theme: cached geometry plus the theme data. */
export function createBackground(theme, name, seed = 1) {
  const rng = mulberry32((seed ^ hash32(`bg:${name}`)) >>> 0);
  const geom = theme.layers.map((layer) => (KINDS[layer.kind]?.gen ? KINDS[layer.kind].gen(rng, layer) : null));
  return { theme, geom };
}

/**
 * Draw sky, parallax layers, floor and floor layers for a camera state at fx time fxT.
 * night (0..1): the share of night in the time of day (grade.js gradeState); the theme goes dark with lit windows,
 * stars and a moon by its night look (night.js, ADR-037). Leaves the transform reset; the caller sets the world
 * transform afterwards. lift (task 10c): how far the camera has risen above its usual ground framing; layers
 * then drop by lift x their parallax factor (the sky stays, far hills move a little, the floor all the way).
 */
export function drawBackground(ctx, bg, cam, W, H, fxT = 0, react = 1, night = 0, lift = 0) {
  const t = bg.theme;
  const view = { cam, W, H, fxT, react, lift }; // lift: px the camera is above its ground framing (task 10c) // react: crowd excitement (story scripts: up after hits, down after a defeat)
  const nl = night > 0.001 ? nightLook(t) : null;
  if (nl) return drawNightBackground(ctx, bg, KINDS, view, night * nl.amount, nl.sky);
  screen(ctx);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, t.sky.top);
  sky.addColorStop(1, t.sky.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const draw = (onGround) => t.layers.forEach((layer, i) => {
    const kind = KINDS[layer.kind];
    if (kind && !!kind.onGround === onGround) kind.draw(ctx, layer, bg.geom[i], view);
  });
  draw(false);
  const { left, right } = layerTransform(ctx, view, 1);
  ctx.fillStyle = t.ground.color;
  ctx.fillRect(left, 0, right - left, 4000);
  draw(true);
  layerTransform(ctx, view, 1);
  ctx.strokeStyle = t.ground.line;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(right, 0); ctx.stroke();
  screen(ctx);
}
