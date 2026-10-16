// Frame drawing (spec 14.1): background → world (shadows, afterimages, characters, particles)
// → post effects → overlays. Milestone: M4. renderFrame is a pure function of (sim result, n).

import { unpackJoints, lowestPoint } from "../skeleton.js";
import { drawCharacter } from "./character.js";
import { createBackground, drawBackground } from "./background.js";
import { drawParticles } from "./particles.js";
import { drawPostWorld, drawOverlays } from "./overlays.js";
import { STAGE, FPS } from "../config.js";
import { frameView } from "../framestore.js";

/**
 * @param {object} catalog  for themes
 * @param {object} sim  result of simulate() (frames, events, fx, format, meta)
 */
export function createRenderer(catalog, sim) {
  const meta = sim.meta || {};
  const worldEvents = sim.events.filter((e) => e.type === "world");
  return {
    catalog,
    sim,
    W: sim.format.width,
    H: sim.format.height,
    format: meta.format || "landscape",
    seed: meta.seed ?? 1,
    defaultTheme: meta.theme || "white_stage",
    hpBars: !!meta.hpBars,
    worldEvents,
    themeChanges: worldEvents.filter((e) => e.do === "set_theme"),
    says: sim.events.filter((e) => e.type === "say"),
    backgrounds: new Map(),
    charCache: new Map(), // frame index → unpacked characters (small LRU for afterimages)
  };
}

function background(r, name) {
  const key = r.catalog.themes[name] ? name : "white_stage";
  if (!r.backgrounds.has(key)) r.backgrounds.set(key, createBackground(r.catalog.themes[key], key, r.seed));
  return r.backgrounds.get(key);
}

function charsAt(r, n) {
  if (!r.charCache.has(n)) {
    r.charCache.set(n, frameView(r.sim.store, n, FPS).chars.map((c) => ({ ...c, j: unpackJoints(c.joints) })));
    if (r.charCache.size > 64) r.charCache.delete(r.charCache.keys().next().value);
  }
  return r.charCache.get(n);
}

const order = (chars) => [...chars].sort((a, b) => b.scale - a.scale);

function drawWorld(ctx, r, n, f, chars) {
  for (const c of chars) {
    const h = STAGE.groundY - lowestPoint(c.j, c.scale);
    const k = Math.max(0, 1 - h / 400);
    ctx.fillStyle = `rgba(0,0,0,${0.18 * k})`;
    ctx.beginPath();
    ctx.ellipse(c.j.hip.x, STAGE.groundY + 3, 44 * c.scale * (0.6 + 0.4 * k), 8 * c.scale * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const trails = r.sim.fx.trails.filter((t) => f.fxT >= t.t0 && f.fxT < t.until);
  for (const t of trails.filter((x) => x.kind === "afterimage")) {
    [12, 8, 4].forEach((back, i) => {
      if (n - back < 0) return;
      const ghost = charsAt(r, n - back).find((c) => c.id === t.actorId);
      if (ghost) drawCharacter(ctx, ghost.j, { color: ghost.color, scale: ghost.scale, facing: ghost.facing, alpha: 0.12 + 0.1 * i, outline: false });
    });
  }
  for (const c of order(chars)) drawCharacter(ctx, c.j, { color: c.color, scale: c.scale, facing: c.facing, mouth: c.mouth });
  for (const t of trails.filter((x) => x.kind === "slash" && x.part)) {
    const pts = [];
    for (let back = 8; back >= 0; back--) {
      if (n - back < 0) continue;
      const c = charsAt(r, n - back).find((x) => x.id === t.actorId);
      if (c && c.j[t.part]) pts.push(c.j[t.part]);
    }
    ctx.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${(i / pts.length) * 0.85})`;
      ctx.lineWidth = 3 + 9 * (i / pts.length);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  }
  drawParticles(ctx, r.sim.fx.log, f.fxT, (actorId, joint) => {
    const c = chars.find((x) => x.id === actorId);
    if (!c) return null;
    return joint === "feet" ? { x: c.j.hip.x, y: STAGE.groundY } : c.j[joint] || c.j.hip;
  });
}

/** Number of frames available. */
export function frameCount(r) {
  return r.sim.store.length;
}

/** Draw frame n of a simulated script into ctx (a W×H 2D context). */
export function renderFrame(r, ctx, n) {
  const f = frameView(r.sim.store, n, FPS);
  const cam = f.cam;
  const { W, H } = r;
  const theme = r.themeChanges.filter((e) => e.videoT <= f.videoT).pop()?.params.theme || r.defaultTheme;
  ctx.save();
  drawBackground(ctx, background(r, theme), cam, W, H);
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 + (cam.shakeX - cam.x) * cam.zoom, H / 2 + (cam.shakeY - cam.y) * cam.zoom);
  const chars = charsAt(r, n);
  drawWorld(ctx, r, n, f, chars);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const storyRate = n > 0 ? (f.storyT - r.sim.store.times[(n - 1) * 2]) * FPS : 1;
  const view = {
    W, H, format: r.format, t: f.videoT, fxT: f.fxT, cam, chars,
    says: r.says, worldEvents: r.worldEvents, flashes: r.sim.fx.flashes, hpBars: r.hpBars,
    slowness: storyRate > 0 && storyRate < 0.95 ? 1 - storyRate : 0,
  };
  drawPostWorld(ctx, view);
  drawOverlays(ctx, view);
  ctx.restore();
}
