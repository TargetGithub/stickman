// Frame drawing (spec 14.1): background → world (shadows, afterimages, characters, particles)
// → post effects → overlays. Milestone: M4. renderFrame is a pure function of (sim result, n).

import { unpackJoints, lowestPoint } from "../skeleton.js";
import { drawCharacter } from "./character.js";
import { drawProp } from "./props.js";
import { drawBehind, drawFront, squashAt } from "./accessories.js";
import { propTransform } from "../props.js";
import { createBackground, drawBackground } from "./background.js";
import { drawParticles } from "./particles.js";
import { drawPostWorld, drawOverlays } from "./overlays.js";
import { drawHold } from "./transitions.js";
import { drawGrade, gradeState } from "./grade.js";
import { drawSetPieces } from "./objects.js";
import { STAGE, FPS } from "../config.js";
import { frameView, storyTimeAt, segmentIndexAt } from "../framestore.js";

/** Per-scene views of the event log and fx records (overlays and particles never leak across scenes). */
function sceneViews(sim) {
  const scenes = sim.scenes || [{ index: 0, theme: sim.meta?.theme, fxStart: 0, fxEnd: sim.fx.log.length, fxT0: 0, set: [] }];
  return scenes.map((sc, i) => {
    const ev = sim.events.filter((e) => (e.scene ?? 0) === sc.index);
    const world = ev.filter((e) => e.type === "world");
    const fxT1 = i + 1 < scenes.length ? scenes[i + 1].fxT0 : Infinity;
    const inRange = (t) => t >= sc.fxT0 && t < fxT1;
    return {
      ...sc,
      worldEvents: world,
      themeChanges: world.filter((e) => e.do === "set_theme"),
      looks: world.filter((e) => e.do === "set_time" || e.do === "set_weather"),
      says: ev.filter((e) => e.type === "say"),
      squashEvents: ev.filter((e) => e.type === "land" || e.type === "hit"),
      fxLog: sc.fxStart === 0 && sc.fxEnd === sim.fx.log.length ? sim.fx.log : sim.fx.log.slice(sc.fxStart, sc.fxEnd),
      trails: sim.fx.trails.filter((t) => inRange(t.t0)),
      flashes: sim.fx.flashes.filter((f) => inRange(f.t0)),
    };
  });
}

/**
 * @param {object} catalog  for themes
 * @param {object} sim  result of simulate() (frames, events, fx, format, meta, scenes)
 * @param {{ createCanvas?: (w:number, h:number) => object }} opts  scratch canvases for dissolves (host-provided)
 */
export function createRenderer(catalog, sim, opts = {}) {
  const meta = sim.meta || {};
  return {
    scenes: sceneViews(sim),
    createCanvas: opts.createCanvas || null,
    scratch: null,
    catalog,
    sim,
    W: sim.format.width,
    H: sim.format.height,
    format: meta.format || "landscape",
    seed: meta.seed ?? 1,
    defaultTheme: meta.theme || "white_stage",
    hpBars: !!meta.hpBars,
    styles: new Map((sim.characters || []).map((c) => [c.id, c.style])),
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
    r.charCache.set(n, frameView(r.sim.store, n, FPS).chars.map((c) => {
      const j = unpackJoints(c.joints);
      const data = c.prop ? r.catalog.props[c.prop.name] : null;
      if (data) j.propTip = propTransform(j, data, c.prop.angle, c.facing, c.scale).tip; // slash trails follow the tip
      return { ...c, j, propStyle: data ? { data, angle: c.prop.angle } : undefined };
    }));
    if (r.charCache.size > 64) r.charCache.delete(r.charCache.keys().next().value);
  }
  return r.charCache.get(n);
}

const order = (chars) => [...chars].sort((a, b) => b.scale - a.scale);

/** Loose props: lying ones before the characters, thrown (flying) ones after. */
function drawItems(ctx, r, items, flying) {
  for (const it of items.filter((i) => i.flying === flying)) {
    const data = r.catalog.props[it.name];
    if (!data) continue;
    const scale = 1;
    const half = (data.len * scale) / 2;
    const dx = Math.cos(it.angle) * half;
    const dy = Math.sin(it.angle) * half;
    drawProp(ctx, data, { butt: { x: it.x - dx, y: it.y - dy }, tip: { x: it.x + dx, y: it.y + dy }, grip: { x: it.x, y: it.y } }, scale);
  }
}

function drawWorld(ctx, r, n, f, chars, sv) {
  drawSetPieces(ctx, r.catalog, sv.set, "back");
  drawSetPieces(ctx, r.catalog, sv.set, "mid");
  drawItems(ctx, r, f.items, false);
  for (const c of chars) {
    if (c.alpha <= 0.01) continue;
    const h = STAGE.groundY - lowestPoint(c.j, c.scale);
    const k = Math.max(0, 1 - h / 400);
    ctx.fillStyle = `rgba(0,0,0,${0.18 * k * c.alpha})`;
    ctx.beginPath();
    ctx.ellipse(c.j.hip.x, STAGE.groundY + 3, 44 * c.scale * (0.6 + 0.4 * k), 8 * c.scale * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const trails = sv.trails.filter((t) => f.fxT >= t.t0 && f.fxT < t.until);
  for (const t of trails.filter((x) => x.kind === "afterimage")) {
    [12, 8, 4].forEach((back, i) => {
      if (n - back < 0) return;
      const ghost = charsAt(r, n - back).find((c) => c.id === t.actorId);
      if (ghost) drawCharacter(ctx, ghost.j, { color: ghost.color, scale: ghost.scale, facing: ghost.facing, alpha: 0.12 + 0.1 * i, outline: false });
    });
  }
  for (const c of order(chars)) {
    if (c.alpha <= 0.01) continue;
    const style = r.styles.get(c.id) || {};
    const index = chars.indexOf(c);
    // Frame history (cape and scarf lag) stays inside the scene's segment.
    const past = (k) => (n - k >= 0 && segmentIndexAt(r.sim.store, n - k) === f.segment ? charsAt(r, n - k)[index].j : null);
    ctx.save();
    if (style.squash) {
      // Flatten around the feet briefly after a landing or a hit.
      const k = squashAt(sv.squashEvents, c.id, f.videoT);
      if (k < 1) ctx.transform(1 / k, 0, 0, k, (c.j.hip.x) * (1 - 1 / k), STAGE.groundY * (1 - k));
    }
    if (style.glow) {
      ctx.shadowColor = style.glow;
      ctx.shadowBlur = 22 * c.scale;
    }
    drawBehind(ctx, c, past, style);
    drawCharacter(ctx, c.j, { color: c.color, scale: c.scale, facing: c.facing, mouth: c.mouth, prop: c.propStyle, alpha: c.alpha, outline: style.outline !== false });
    ctx.shadowBlur = 0;
    drawFront(ctx, c, past, style);
    ctx.restore();
  }
  drawItems(ctx, r, f.items, true);
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
  drawParticles(ctx, sv.fxLog, f.fxT, (actorId, joint) => {
    const c = chars.find((x) => x.id === actorId);
    if (!c) return null;
    return joint === "feet" ? { x: c.j.hip.x, y: STAGE.groundY } : c.j[joint] || c.j.hip;
  });
  drawSetPieces(ctx, r.catalog, sv.set, "front");
}

/** Number of frames available. */
export function frameCount(r) {
  return r.sim.store.length;
}

/** Draw scene frame n (not a hold frame). */
export function renderScene(r, ctx, n) {
  const f = frameView(r.sim.store, n, FPS);
  const sv = r.scenes[f.scene] || r.scenes[0];
  const cam = f.cam;
  const { W, H } = r;
  const theme = sv.themeChanges.filter((e) => e.videoT <= f.videoT).pop()?.params.theme || sv.theme || r.defaultTheme;
  ctx.save();
  drawBackground(ctx, background(r, theme), cam, W, H, f.fxT);
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 + (cam.shakeX - cam.x) * cam.zoom, H / 2 + (cam.shakeY - cam.y) * cam.zoom);
  const chars = charsAt(r, n);
  drawWorld(ctx, r, n, f, chars, sv);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const grade = gradeState(sv.look, sv.looks, f.videoT);
  if (grade) drawGrade(ctx, grade, { W, H, fxT: f.fxT, cam });
  const prevSame = n > 0 && segmentIndexAt(r.sim.store, n - 1) === f.segment;
  const storyRate = prevSame ? (f.storyT - storyTimeAt(r.sim.store, n - 1)) * FPS : 1;
  const view = {
    W, H, format: r.format, t: f.videoT, fxT: f.fxT, cam, chars,
    says: sv.says, worldEvents: sv.worldEvents, flashes: sv.flashes, hpBars: r.hpBars,
    slowness: storyRate > 0 && storyRate < 0.95 ? 1 - storyRate : 0,
    names: r.names,
  };
  drawPostWorld(ctx, view);
  drawOverlays(ctx, view);
  ctx.restore();
}

/** Draw frame n of a simulated script into ctx (a W×H 2D context). Hold frames draw transitions and cards. */
export function renderFrame(r, ctx, n) {
  const f = frameView(r.sim.store, n, FPS);
  if (f.hold) drawHold(r, ctx, f, renderScene);
  else renderScene(r, ctx, n);
}
