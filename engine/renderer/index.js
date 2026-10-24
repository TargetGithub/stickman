// Frame drawing (spec 14.1): background → world (shadows, afterimages, characters, particles)
// → post effects → overlays. Milestone: M4. renderFrame is a pure function of (sim result, n).

import { lowestPoint } from "../skeleton.js";
import { drawCharacter } from "./character.js";
import { drawItems, drawTrails as drawTrailsOf } from "./world_items.js";
import { createBackground, drawBackground } from "./background.js";
import { drawParticles } from "./particles.js";
import { drawPostWorld, drawOverlays } from "./overlays.js";
import { drawHold } from "./transitions.js";
import { drawGrade, gradeState } from "./grade.js";
import { gradeAt, worldFilter, drawWorldGrade, waveOrigin } from "./colour.js";
import { drawSetPieces, staticObjectsAt, drawMovingObjects } from "./objects.js";
import { lookFor } from "./looks.js";
import { drawExtras } from "./extras.js";
import { drawDepthWorld, projectedChars } from "./depth_draw.js";
import { lightAt, ambientTint, rgbText, pieceTones } from "../lighting.js";
import { letterboxBar } from "../camera3.js";
import { framedContext, scaledContext, deviceSize, blurFrame, drawVignette, drawLetterbox } from "./lens_draw.js";
import { sceneViews, frameLens } from "./scene_views.js";
import { hasMotion, compileMotion, composeAt, postAt, motionValuesAt } from "../compositor.js";
import { drawMotionLayers, motionAnchor } from "./motion.js";
import { applyPost, postActive } from "./post.js";
import { STAGE, FPS } from "../config.js";
import { frameView, storyTimeAt, segmentIndexAt } from "../framestore.js";
import { charsAt, drawChars, drawLayerChars } from "./draw_chars.js";
import { subtitlesOn } from "../story/pace.js";

/** Crowd excitement (S6): it jumps after a hit and fades over a second; a defeat hushes it briefly. */
function crowdReact(sv, f) {
  const t = f.storyT - (sv.storyStart ?? 0);
  if (sv.reactions.defeats.some((d) => d <= t && t - d < 1.2)) return 0.25;
  const hit = sv.reactions.hits.findLast((h) => h <= t);
  return hit !== undefined && t - hit < 1 ? 1 + 1.5 * (1 - (t - hit)) : 1;
}

/** A character's depth layer at video time t (the scene placement, then layer beats). */
function layerAt(sv, id, t) {
  let layer = sv.characters?.find((c) => c.id === id)?.layer ?? "mid";
  for (const e of sv.layerEvents) if (e.actor === id && e.videoT <= t) layer = e.layer;
  return layer;
}

/**
 * @param {object} catalog  for themes
 * @param {object} sim  result of simulate() (frames, events, fx, format, meta, scenes)
 * @param {{ createCanvas?: (w:number, h:number) => object, scale?: number }} opts  scratch canvases for dissolves
 *   (host-provided); scale: the render scale (ADR-039), output px per frame px (2: a 1080p frame as 4K)
 */
export function createRenderer(catalog, sim, opts = {}) {
  const meta = sim.meta || {};
  const scale = opts.scale ?? 1;
  const out = deviceSize(sim.format.width, sim.format.height, scale);
  return {
    scenes: sceneViews(sim, catalog),
    createCanvas: opts.createCanvas || null,
    scratch: null,
    catalog,
    sim,
    W: sim.format.width, // the logical frame: camera, layout and text
    H: sim.format.height,
    scale,
    PW: out.width, // the output canvas in device px (scratch canvases, blurs, post)
    PH: out.height,
    format: meta.format || "landscape",
    seed: meta.seed ?? 1,
    defaultTheme: meta.theme || "white_stage",
    hpBars: !!meta.hpBars,
    styles: new Map((sim.characters || []).map((c) => [c.id, c.style])),
    looks: new Map((sim.story?.legacy === false ? sim.story.cast : []).map((c) => [c.id, lookFor(catalog, c)])),
    lookChanges: sim.events.filter((e) => e.type === "world" && e.do === "set_appearance"),
    glowChanges: sim.events.filter((e) => e.type === "world" && e.do === "set_glow"),
    petrifyEvents: sim.events.filter((e) => (e.type === "defeat" && e.move === "petrify") || e.type === "thaw"),
    heldStates: sim.events.filter((e) => e.type === "object" && e.what === "state" && catalog.objects?.[e.kind]?.behavior === "holdable"),
    voices: new Map((sim.story?.cast || []).map((c) => [c.id, c.voice])),
    names: sim.story?.meta?.speakerNames ? new Map(sim.story.cast.map((c) => [c.id, c.name || c.id])) : null,
    syllables: new Map(), // say event → syllables (mouth flap)
    backgrounds: new Map(),
    castFilter: null, // "none" while the world is filtered grey and the cast keeps its colour (A3)
    charCache: new Map(), // frame index → unpacked characters (small LRU for afterimages)
    frameLight: null, // the light rig of the frame being drawn (V3.3; null: the flat look)
    // Motion graphics (V3.5): layers, text, shapes, tracks and post of a v3 script, compiled once.
    motion: hasMotion(sim.story) ? compileMotion(sim.story, (sim.scenes || []).map((sc) => ({ id: sc.id, t0: sc.startFrame / FPS, t1: (sc.startFrame + sc.frames) / FPS }))) : null,
    frameValues: null, // the keyed track values of the frame being drawn
  };
}

function background(r, name) {
  const key = r.catalog.themes[name] ? name : "white_stage";
  if (!r.backgrounds.has(key)) r.backgrounds.set(key, createBackground(r.catalog.themes[key], key, r.seed));
  return r.backgrounds.get(key);
}

function drawWorld(ctx, r, n, f, chars, sv) {
  const pieces = sv.objectEvents.length ? staticObjectsAt(r.catalog, sv.set, sv.objectEvents, f.videoT) : sv.set;
  if (sv.depth) return drawDepthScene(ctx, r, n, f, chars, sv, pieces);
  const layered = sv.layerEvents.length || sv.characters?.some((c) => c.layer && c.layer !== "mid");
  const inLayer = (layer) => (layered ? chars.filter((c) => layerAt(sv, c.id, f.videoT) === layer) : layer === "mid" ? chars : []);
  const mid = inLayer("mid");
  drawSetPieces(ctx, r.catalog, pieces, "back", f.fxT);
  if (sv.extras.length) drawExtras(ctx, r, sv, f, "back");
  drawLayerChars(ctx, r, n, f, chars, sv, inLayer("back"), "back");
  drawSetPieces(ctx, r.catalog, pieces, "mid", f.fxT);
  drawItems(ctx, r, f.items, false, sv, f.videoT);
  if (sv.extras.length) drawExtras(ctx, r, sv, f, "mid");
  for (const c of mid) {
    if (c.alpha <= 0.01) continue;
    const h = STAGE.groundY - lowestPoint(c.j, c.scale, c.dims);
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
  drawChars(ctx, r, n, f, chars, sv, mid);
  drawItems(ctx, r, f.items, true, sv, f.videoT);
  drawTrailsOf(ctx, n, sv, trails, r, charsAt);
  drawParticles(ctx, sv.fxLog, f.fxT, (actorId, joint) => {
    const c = chars.find((x) => x.id === actorId);
    if (!c) return null;
    return joint === "feet" ? { x: c.j.hip.x, y: STAGE.groundY } : c.j[joint] || c.j.hip;
  });
  drawMovingObjects(ctx, r.catalog, f.items); // balls, bubbles and vehicles pass in front of the characters
  drawSetPieces(ctx, r.catalog, pieces, "front", f.fxT);
  if (sv.extras.length) drawExtras(ctx, r, sv, f, "front");
  drawLayerChars(ctx, r, n, f, chars, sv, inLayer("front"), "front");
}

/**
 * A v3 scene (V3.2): nodes far to near in their depth transforms; the stage-line group keeps the v2 order.
 * Returns each character's z this frame (overlays and particle anchors use the projected joints).
 */
function drawDepthScene(ctx0, r, n, f, chars, sv, pieces) {
  const trails = sv.trails.filter((t) => f.fxT >= t.t0 && f.fxT < t.until);
  let depths = null;
  // `ctx` is the context the stage group draws into: the frame, or a depth-of-field layer (V3.4).
  const stage = (ctx = ctx0) => {
    drawItems(ctx, r, f.items, false, sv, f.videoT);
    for (const t of trails.filter((x) => x.kind === "afterimage")) {
      [12, 8, 4].forEach((back, i) => {
        if (n - back < 0) return;
        const ghost = charsAt(r, n - back).find((c) => c.id === t.actorId);
        if (ghost) drawCharacter(ctx, ghost.j, { color: ghost.color, scale: ghost.scale, facing: ghost.facing, alpha: 0.12 + 0.1 * i, outline: false });
      });
    }
    drawItems(ctx, r, f.items, true, sv, f.videoT);
    drawTrailsOf(ctx, n, sv, trails, r, charsAt);
    const shown = depths ? projectedChars(chars, depths, f.cam, sv.depth) : chars;
    drawParticles(ctx, sv.fxLog, f.fxT, (actorId, joint) => {
      const c = shown.find((x) => x.id === actorId);
      if (!c) return null;
      return joint === "feet" ? { x: c.j.hip.x, y: c.z ? c.j.lFoot.y : STAGE.groundY } : c.j[joint] || c.j.hip;
    });
    drawMovingObjects(ctx, r.catalog, f.items, r);
  };
  depths = drawDepthWorld(ctx0, r, f, chars, sv, pieces, { stage, character: (c, g = ctx0) => drawChars(g, r, n, f, chars, sv, [c]) });
  return depths;
}

/** Number of frames available. */
export function frameCount(r) {
  return r.sim.store.length;
}

/** Draw scene frame n (not a hold frame). */
export function renderScene(r, ctx, n) {
  const f0 = frameView(r.sim.store, n, FPS);
  const sv0 = r.scenes[f0.scene] || r.scenes[0];
  r.frameValues = r.motion ? motionValuesAt(r.motion, f0.videoT) : null;
  // A v3 scene draws through its lens (V3.4): a moved camera, tilt and roll on the frame, depth of field.
  const lens = sv0.depth ? frameLens(r, sv0, f0) : null;
  const f = lens ? { ...f0, cam: lens.lc.cam } : f0;
  const sv = lens ? { ...sv0, depth: lens.lc.depth, travel: lens.L.travel } : sv0; // travel: road.js (task 10a)
  const g = lens?.matrix ? framedContext(ctx, lens.matrix) : ctx;
  r.frameDof = lens?.dof ?? null;
  const cam = f.cam;
  const { W, H } = r;
  const theme = sv.themeChanges.filter((e) => e.videoT <= f.videoT).pop()?.params.theme || sv.theme || r.defaultTheme;
  // The scene's colour grade (A3): a canvas filter on the world when the cast keeps its colour, else a pass after it.
  const colourGrade = gradeAt(sv.look, sv.gradeEvents, f.videoT);
  const filter = worldFilter(colourGrade);
  r.castFilter = filter ? "none" : null;
  r.frameLight = sv.depth ? lightAt(sv.rig0, sv.lightEvents, f.videoT, r.catalog.lights) : null; // V3.3
  r.framePieceTones = r.frameLight ? pieceTones(r.frameLight) : null; // set pieces and props (ADR-035)
  g.save();
  if (filter) g.filter = filter;
  const grade = gradeState(sv.look, sv.looks, f.videoT);
  drawBackground(g, background(r, theme), lens ? { ...cam, zoom: lens.lc.bgZoom } : cam, W, H, f.fxT, r.sim.story?.legacy === false ? crowdReact(sv, f) : 1, grade?.time.night ?? 0, sv.heights ? cameraLift(r, cam) : 0);
  const ambient = ambientTint(r.frameLight);
  if (ambient) {
    // The key light's colour over the whole background (V3.3): a multiply tint, as the time-of-day grade does.
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = `rgba(${rgbText(ambient.color)},${ambient.alpha.toFixed(3)})`;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (lens?.bgBlur) blurFrame(g, r, lens.bgBlur); // the far background out of focus (V3.4)
  const chars = charsAt(r, n);
  r.frameN = n; // crowd behaviours read the leader's earlier frames (crowd_moves.js)
  const worldTransform = [cam.zoom, 0, 0, cam.zoom, W / 2 + (cam.shakeX - cam.x) * cam.zoom, H / 2 + (cam.shakeY - cam.y) * cam.zoom];
  const comp = r.motion ? composeAt(r.motion, f.videoT, (p, space) => motionAnchor(r, sv, f, chars, p, space, cam)) : null;
  const motionView = comp && { W, H, worldTransform, styles: r.catalog.textStyles, shapes: new Map((r.sim.story.shapes || []).map((x) => [x.id, x])) };
  if (comp?.back.length) drawMotionLayers(g, comp.back, motionView); // V3.5: layers behind the world
  g.setTransform(...worldTransform);
  const depths = drawWorld(g, r, n, f, chars, sv);
  if (filter) g.filter = "none";
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawWorldGrade(g, colourGrade, { W, H, origin: waveOrigin(colourGrade, chars, cam, W, H, STAGE.groundY) });
  if (grade) drawGrade(g, grade, { W, H, fxT: f.fxT, cam });
  g.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const prevSame = n > 0 && segmentIndexAt(r.sim.store, n - 1) === f.segment;
  const storyRate = prevSame ? (f.storyT - storyTimeAt(r.sim.store, n - 1)) * FPS : 1;
  const view = {
    W, H, format: r.format, t: f.videoT, fxT: f.fxT, cam, chars: depths ? projectedChars(chars, depths, cam, sv.depth) : chars,
    says: sv.says, worldEvents: sv.worldEvents, flashes: sv.flashes, hpBars: r.hpBars,
    slowness: storyRate > 0 && storyRate < 0.95 ? 1 - storyRate : 0,
    names: r.names,
    bubbleScale: sv.depth ? (r.sim.story?.look?.bubble ?? 1) * (sv.pace?.bubble ?? 1) : 1, // look.bubble (v3, V3.9) times a pace's (ADR-038)
    subtitles: subtitlesOn(sv.pace),
  };
  drawPostWorld(ctx, view);
  if (lens) {
    drawVignette(ctx, W, H, lens.L.vignette);
    drawLetterbox(ctx, W, H, letterboxBar(W, H, lens.L.letterbox));
  }
  if (comp?.over.length) drawMotionLayers(ctx, comp.over, motionView); // V3.5: titles and graphics over the world
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawOverlays(ctx, view);
  ctx.restore();
}

/** Draw frame n of a simulated script into ctx (a PW×PH 2D context). Hold frames draw transitions and cards. */
export function renderFrame(r, ctx, n) {
  const f = frameView(r.sim.store, n, FPS);
  const g = scaledContext(ctx, r.scale);
  if (f.hold) drawHold(r, g, f, renderScene);
  else renderScene(r, g, n);
  if (!r.motion) return;
  // Post effects over the finished frame, holds included (V3.5).
  const t = n / FPS;
  const p = postAt(r.motion, t, motionValuesAt(r.motion, t));
  if (postActive(p)) applyPost(ctx, r, p, n); // on the raw canvas, in device px
}

/** How far the camera stands above its usual ground framing (scenes with platforms, task 10c), world px. */
function cameraLift(r, cam) {
  const fmt = r.sim.format;
  if (!fmt) return 0;
  return Math.max(0, STAGE.groundY - (fmt.height * fmt.groundScreenRatio - fmt.height / 2) / cam.zoom - cam.y);
}
