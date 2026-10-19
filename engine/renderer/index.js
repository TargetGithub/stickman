// Frame drawing (spec 14.1): background → world (shadows, afterimages, characters, particles)
// → post effects → overlays. Milestone: M4. renderFrame is a pure function of (sim result, n).

import { unpackJoints, lowestPoint } from "../skeleton.js";
import { drawCharacter } from "./character.js";
import { drawProp } from "./props.js";
import { drawBehind, drawFront, squashAt } from "./accessories.js";
import { drawLookBehind, drawLookFront } from "./accessories_more.js";
import { propTransform } from "../props.js";
import { createBackground, drawBackground } from "./background.js";
import { drawParticles } from "./particles.js";
import { drawPostWorld, drawOverlays } from "./overlays.js";
import { drawHold } from "./transitions.js";
import { drawGrade, gradeState } from "./grade.js";
import { glowAt, drawGlow, gradeAt, worldFilter, drawWorldGrade, waveOrigin, petrifyAt, stoneFilter, thawLine } from "./colour.js";
import { drawSetPieces, staticObjectsAt, drawMovingObjects } from "./objects.js";
import { holdableData } from "../objects.js";
import { faceStyle } from "./face_state.js";
import { lookFor, lookAt } from "./looks.js";
import { bodyPlan } from "../story/bodies.js";
import { drawExtras, withLayer } from "./extras.js";
import { drawDepthWorld, projectedChars } from "./depth_draw.js";
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
      gradeEvents: world.filter((e) => e.do === "set_grade"),
      says: ev.filter((e) => e.type === "say"),
      objectEvents: ev.filter((e) => e.type === "object"),
      squashEvents: ev.filter((e) => e.type === "land" || e.type === "hit"),
      // Depth layers and extras (S6): layer changes, and what crowds react to (scene story seconds).
      layerEvents: ev.filter((e) => e.type === "layer"),
      // The depth lane (V3.2): a v3 scene's depth settings, each character's placement z and depth events (scene story seconds).
      depth: sc.depth || null,
      placementZ: new Map((sc.characters || []).map((c) => [c.id, c.z ?? 0])),
      depthEvents: groupDepth(ev.filter((e) => e.type === "depth"), sc.storyStart ?? 0),
      extras: sc.extras || [],
      reactions: reactionsOf(ev, sc),
      fxLog: sc.fxStart === 0 && sc.fxEnd === sim.fx.log.length ? sim.fx.log : sim.fx.log.slice(sc.fxStart, sc.fxEnd),
      trails: sim.fx.trails.filter((t) => inRange(t.t0)),
      flashes: sim.fx.flashes.filter((f) => inRange(f.t0)),
    };
  });
}

/** Depth events by character, with their start in scene story seconds (the sim lerps the same way). */
function groupDepth(events, t0) {
  const by = new Map();
  for (const e of events) {
    if (!by.has(e.actor)) by.set(e.actor, []);
    by.get(e.actor).push({ storyT: e.storyT - t0, z0: e.z0, z1: e.z1, dur: e.dur });
  }
  return by;
}

/** Hit and defeat times (scene story seconds) for cheering and fleeing extras. */
function reactionsOf(ev, sc) {
  const t0 = sc.storyStart ?? 0;
  const hits = ev.filter((e) => e.type === "hit" && e.kind === "hit").map((e) => e.storyT - t0);
  const defeats = ev.filter((e) => e.type === "defeat").map((e) => e.storyT - t0);
  const first = [...hits, ...defeats].sort((a, b) => a - b)[0] ?? null;
  return { hits, defeats, first, center: (sc.stageWidth ?? STAGE.width) / 2 };
}

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
      const data = c.prop ? holdableData(r.catalog, c.prop.name) : null;
      const plan = c.plan ? r.catalog.bodies?.[c.plan] : null; // story body plans (S3)
      if (data) j.propTip = propTransform(j, data, c.prop.angle, c.facing, c.scale, plan?.grip).tip; // slash trails follow the tip
      const body = plan ? { dims: bodyPlan(r.catalog, c.plan).dims, draw: plan.draw, torsoWidth: plan.torsoWidth, ...(plan.quad ? { quad: plan.quad, grip: plan.grip } : {}) } : {};
      return { ...c, ...body, j, propStyle: data ? { data, angle: c.prop.angle } : undefined };
    }));
    if (r.charCache.size > 64) r.charCache.delete(r.charCache.keys().next().value);
  }
  return r.charCache.get(n);
}

const order = (chars) => [...chars].sort((a, b) => b.scale - a.scale);

/** A holdable with states (the rainbow crystal) shows its latest state, carried across scenes. */
function withState(r, sv, name, data, t) {
  const def = r.catalog.objects?.[name];
  if (!def?.states || def.behavior !== "holdable") return data;
  const e = r.heldStates.findLast((x) => x.kind === name && x.videoT <= t);
  return { ...data, state: e?.state ?? sv.set?.find((p) => p.object === name && p.state)?.state ?? def.states[0] };
}

/** Loose props: lying ones before the characters, thrown (flying) ones after. */
function drawItems(ctx, r, items, flying, sv, t) {
  for (const it of items.filter((i) => i.flying === flying)) {
    if (it.obj) continue; // moving objects are drawn by drawMovingObjects
    const held = holdableData(r.catalog, it.name);
    if (!held) continue;
    const data = withState(r, sv, it.name, held, t);
    const scale = 1;
    const half = (data.len * scale) / 2;
    const dx = Math.cos(it.angle) * half;
    const dy = Math.sin(it.angle) * half;
    drawProp(ctx, data, { butt: { x: it.x - dx, y: it.y - dy }, tip: { x: it.x + dx, y: it.y + dy }, grip: { x: it.x, y: it.y } }, scale);
  }
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
  drawTrails(ctx, n, sv, trails, r);
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
function drawDepthScene(ctx, r, n, f, chars, sv, pieces) {
  const trails = sv.trails.filter((t) => f.fxT >= t.t0 && f.fxT < t.until);
  let depths = null;
  const stage = () => {
    drawItems(ctx, r, f.items, false, sv, f.videoT);
    for (const t of trails.filter((x) => x.kind === "afterimage")) {
      [12, 8, 4].forEach((back, i) => {
        if (n - back < 0) return;
        const ghost = charsAt(r, n - back).find((c) => c.id === t.actorId);
        if (ghost) drawCharacter(ctx, ghost.j, { color: ghost.color, scale: ghost.scale, facing: ghost.facing, alpha: 0.12 + 0.1 * i, outline: false });
      });
    }
    drawItems(ctx, r, f.items, true, sv, f.videoT);
    drawTrails(ctx, n, sv, trails, r);
    const shown = depths ? projectedChars(chars, depths, f.cam, sv.depth) : chars;
    drawParticles(ctx, sv.fxLog, f.fxT, (actorId, joint) => {
      const c = shown.find((x) => x.id === actorId);
      if (!c) return null;
      return joint === "feet" ? { x: c.j.hip.x, y: c.z ? c.j.lFoot.y : STAGE.groundY } : c.j[joint] || c.j.hip;
    });
    drawMovingObjects(ctx, r.catalog, f.items);
  };
  depths = drawDepthWorld(ctx, r, f, chars, sv, pieces, { stage, character: (c) => drawChars(ctx, r, n, f, chars, sv, [c]) });
  return depths;
}

/** Characters on a back or front layer, scaled about their feet (STORY_SPEC 14). */
function drawLayerChars(ctx, r, n, f, chars, sv, list, layer) {
  for (const c of list) withLayer(ctx, layer, c.j.hip.x, () => drawChars(ctx, r, n, f, chars, sv, [c]));
}

/** Draw characters (largest first), with their looks, accessories and squash; glowing, petrified or thawing (A3). */
function drawChars(ctx, r, n, f, chars, sv, list) {
  for (const c of order(list)) {
    if (c.alpha <= 0.01) continue;
    const glow = r.glowChanges.length ? glowAt(r.glowChanges.filter((e) => e.params.who === c.id), f.videoT) : null;
    if (glow) {
      ctx.save();
      if (r.castFilter) ctx.filter = r.castFilter; // the glow keeps its colour with the cast
      drawGlow(ctx, c, glow, f.videoT);
      ctx.restore();
    }
    const stone = r.petrifyEvents.length ? petrifyAt(r.petrifyEvents.filter((e) => e.actor === c.id), f.videoT) : null;
    if (!stone) {
      drawOne(ctx, r, n, f, chars, sv, c, r.castFilter);
      continue;
    }
    drawOne(ctx, r, n, f, chars, sv, c, stoneFilter(stone.grey));
    if (stone.thaw === null) continue;
    // Thawing: the colour floods back up from the feet over the grey body.
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.j.hip.x - 2000, thawLine(c, stone.thaw), 4000, 4000);
    ctx.clip();
    drawOne(ctx, r, n, f, chars, sv, c, "none");
    ctx.restore();
  }
}

/** One character; filter: a canvas filter for it (stone grey, or "none" inside a greyed world). */
function drawOne(ctx, r, n, f, chars, sv, c, filter) {
  const look = lookAt(r.looks.get(c.id), r.lookChanges.filter((e) => e.params.who === c.id), f.videoT);
  const style = look?.style || r.styles.get(c.id) || {};
  const index = chars.indexOf(c);
  // Frame history (cape and scarf lag) stays inside the scene's segment.
  const past = (k) => (n - k >= 0 && segmentIndexAt(r.sim.store, n - k) === f.segment ? charsAt(r, n - k)[index].j : null);
  ctx.save();
  if (filter) ctx.filter = filter;
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
  drawLookBehind(ctx, c, look, f.videoT);
  const face = c.face ? faceStyle(r, c, chars, sv, f) : null;
  drawCharacter(ctx, c.j, { color: c.color, scale: c.scale, facing: c.facing, mouth: c.mouth, prop: c.propStyle && { ...c.propStyle, data: withState(r, sv, c.prop.name, c.propStyle.data, f.videoT) }, alpha: c.alpha, outline: style.outline !== false, ...face,
    ...(c.dims ? { dims: c.dims, draw: c.draw, torsoWidth: c.torsoWidth } : {}), ...(look ? { look } : {}),
    ...(c.quad ? { quad: c.quad, grip: c.grip, faceName: c.face, id: c.id, time: f.videoT, prevHip: past(1)?.hip, prevHead: past(1)?.head } : {}) });
  ctx.shadowBlur = 0;
  drawFront(ctx, c, past, style);
  drawLookFront(ctx, c, look);
  ctx.restore();
}

/** Slash trails behind weapon tips. */
function drawTrails(ctx, n, sv, trails, r) {
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
  // The scene's colour grade (A3): a canvas filter on the world when the cast keeps its colour, else a pass after it.
  const colourGrade = gradeAt(sv.look, sv.gradeEvents, f.videoT);
  const filter = worldFilter(colourGrade);
  r.castFilter = filter ? "none" : null;
  ctx.save();
  if (filter) ctx.filter = filter;
  drawBackground(ctx, background(r, theme), cam, W, H, f.fxT, r.sim.story?.legacy === false ? crowdReact(sv, f) : 1);
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 + (cam.shakeX - cam.x) * cam.zoom, H / 2 + (cam.shakeY - cam.y) * cam.zoom);
  const chars = charsAt(r, n);
  const depths = drawWorld(ctx, r, n, f, chars, sv);
  if (filter) ctx.filter = "none";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawWorldGrade(ctx, colourGrade, { W, H, origin: waveOrigin(colourGrade, chars, cam, W, H, STAGE.groundY) });
  const grade = gradeState(sv.look, sv.looks, f.videoT);
  if (grade) drawGrade(ctx, grade, { W, H, fxT: f.fxT, cam });
  const prevSame = n > 0 && segmentIndexAt(r.sim.store, n - 1) === f.segment;
  const storyRate = prevSame ? (f.storyT - storyTimeAt(r.sim.store, n - 1)) * FPS : 1;
  const view = {
    W, H, format: r.format, t: f.videoT, fxT: f.fxT, cam, chars: depths ? projectedChars(chars, depths, cam, sv.depth) : chars,
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
