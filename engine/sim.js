// Simulation loop: clock → director → world → events, one step per video frame (spec 3, 6).
// Milestone: M3, M4 (FX and camera via presentation.js), M5 (packed frame store), S1 (scenes).
// A script is normalized to a v2 story; scenes run one after another in one clock (ADR-016), with
// hold frames for transitions between them. A v1 script is one scene and runs exactly as before.

import { createActor } from "./actor.js";
import { prepareCatalog } from "./moves.js";
import { createWorld, stepWorld } from "./world.js";
import { createClock, tick, holdTick, requestHitstop, timeEffectsActive } from "./clock.js";
import { createDirector, stepDirector, onEvents, directorIdle, finishDirector } from "./director.js";
import { createStore, startScene, addHold, writeFrame, frameView } from "./framestore.js";
import { createPresentation, presentEvent, stepPresentation } from "./presentation.js";
import { normalize, flatScene, transitionInto, transitionDuration } from "./story/normalize.js";
import { faceEvents, updateFaces } from "./story/faces.js";
import { FPS, STAGE, LIMITS, LIMITS_V2 } from "./config.js";

const prepared = new WeakMap();

/** Prepared move map for a catalog, cached per catalog object. */
export function movesFor(catalog) {
  if (!prepared.has(catalog)) prepared.set(catalog, prepareCatalog(catalog.moves, catalog.poses, catalog.props));
  return prepared.get(catalog);
}

/** Frame n of a simulation result as a plain view (see framestore.frameView). */
export function frameAt(sim, n) {
  return frameView(sim.store, n, FPS);
}

const settled = (a) => (!a.move || a.move.def.name === "idle" || a.holding) && !a.airborne;

/** Actors for one scene, with hp, held prop and (story scripts) face carried over from earlier scenes. */
function sceneActors(flat, catalog, carry, faces) {
  return flat.characters.map((c) => {
    const kept = carry.get(c.id);
    const placed = (flat.scene.cast || []).find((p) => p.id === c.id) || {};
    const a = createActor({ id: c.id, x: c.x, facing: c.facing, scale: c.scale ?? 1, hp: c.hp ?? 100, color: c.color, groundY: STAGE.groundY });
    if (kept && placed.hp === undefined) a.hp = kept.hp;
    // A character with a spawn beat, or placed hidden, starts invisible until it appears.
    if (flat.hidden.has(c.id) || flat.beats.some((b) => b.who === c.id && b.do === "spawn")) {
      a.hidden = true;
      a.alpha = 0;
    }
    if (faces) a.face = placed.face ?? kept?.face ?? "neutral";
    const name = kept && placed.prop === undefined ? kept.prop : c.prop;
    const data = name ? catalog.props[name] : null;
    a.prop = data ? { name, kind: data.kind, data } : null;
    return a;
  });
}

/**
 * Run a whole script (v1 or v2).
 * @param {object} script  schema-valid script
 * @param {object} catalog  data catalog (poses, moves, ...)
 * @param {{ dryRun?:boolean, maxSeconds?:number }} opts  dryRun skips the frame store (validator)
 * @returns {{ store, events, anchors, beats, issues, totalFrames, durationSec, clock, fx, format, meta, characters, scenes }}
 *   scenes: [{ index, id, theme, stageWidth, look, location, startFrame, frames, storyStart }]
 */
export function simulate(script, catalog, opts = {}) {
  const story = normalize(script);
  const moves = movesFor(catalog);
  const meta = story.meta || {};
  const limit = story.legacy ? LIMITS.maxDuration : LIMITS_V2.maxDuration;
  const maxFrames = Math.round((opts.maxSeconds ?? limit + 5) * FPS);
  const clock = createClock();
  const store = opts.dryRun ? null : createStore(null, 0, Object.keys(catalog.props || {}), Object.keys(catalog.faces || {}));
  const log = [];
  const anchors = [];
  const beats = [];
  const issues = [];
  const scenes = [];
  const carry = new Map(); // id → { hp, prop } at the end of the last scene it was in
  let dead = new Set();
  let fx = null;
  let present = null;
  let format = null;
  let started = false; // frame 0 exists before the first tick
  let overran = false;
  const frame = () => {
    if (started) holdTick(clock);
    started = true;
  };
  const hold = (t, nextScene) => {
    const frames = Math.round(transitionDuration(t) * FPS);
    if (!frames) return;
    if (store) addHold(store, frames, { ...t, scene: nextScene, storyT: clock.storyT, fxT: clock.fxT });
    for (let i = 0; i < frames; i++) frame();
  };

  for (let si = 0; si < story.scenes.length && !overran; si++) {
    const flat = flatScene(story, si, catalog);
    const sid = flat.scene.id;
    const suffix = story.legacy ? "" : `@${sid}`;
    const t = transitionInto(story, si);
    if (t && t.type !== "cut") hold(t, si);

    const actors = sceneActors(flat, catalog, carry, !story.legacy);
    const world = createWorld({ actors, moves, mode: meta.mode ?? "choreographed", stageWidth: flat.meta.stageWidth });
    const t0 = clock.storyT;
    const director = createDirector(flat, moves, { t0, prefix: story.legacy ? "" : `scenes[${si}].`, tag: story.legacy ? "" : `${sid}.`, dead, story: !story.legacy });
    present = createPresentation(flat, catalog, { suffix, fx });
    fx = present.fx;
    format = present.format;
    const fxLogStart = fx.log.length;
    const emit = (e) => {
      log.push({ ...e, storyT: clock.storyT, videoT: clock.videoT, scene: si });
      presentEvent(present, e, world, clock);
    };
    const items = () => [
      ...world.groundProps.map((g) => ({ name: g.name, x: g.x, y: g.y, angle: g.angle, flying: false })),
      ...world.projectiles.filter((p) => p.item).map((p) => ({ name: p.item.name, x: p.x, y: p.y, angle: p.angle, flying: true })),
    ];
    frame();
    const startFrame = clock.frame;
    let cam = stepPresentation(present, world, clock, 0, 0);
    updateFaces(world, director.dead, clock.storyT);
    if (store) {
      startScene(store, actors, { scene: si }, si === 0 ? Math.round(20 * FPS) : 600);
      writeFrame(store, world.actors, clock, cam, items());
    }
    const tailFrames = Math.round((flat.meta.tail ?? 0.5) * FPS);
    const fixed = flat.scene.duration;
    const sceneMax = Math.round((LIMITS_V2.sceneMax + 5) * FPS);
    let quietFrames = 0;

    while (true) {
      const d = tick(clock);
      stepDirector(director, { world, clock, catalog, storyT: clock.storyT, emit });
      const events = stepWorld(world, d.storyDt);
      for (const e of events) {
        if (e.type === "hitstop") requestHitstop(clock, e.seconds);
        emit(e);
      }
      onEvents(director, events, clock.storyT);
      faceEvents(world, events, clock.storyT);
      updateFaces(world, director.dead, clock.storyT);
      cam = stepPresentation(present, world, clock, d.fxDt, d.videoDt);
      if (!Number.isFinite(cam.x) || !Number.isFinite(cam.zoom)) {
        // Fail with a clear message instead of handing NaN to a native canvas later.
        throw new Error(`simulation produced a non-finite camera at frame ${clock.frame}; check actor joints and props`);
      }
      if (store) writeFrame(store, world.actors, clock, cam, items());

      if (fixed !== undefined) {
        if (clock.storyT - t0 >= fixed - 1e-9) break;
      } else {
        const quiet = directorIdle(director) && world.actors.every(settled) && !timeEffectsActive(clock);
        quietFrames = quiet ? quietFrames + 1 : 0;
        if (quietFrames >= tailFrames) break;
      }
      if (clock.frame >= maxFrames || (!story.legacy && clock.frame - startFrame >= sceneMax)) {
        overran = clock.frame >= maxFrames;
        break;
      }
    }
    const frames = clock.frame - startFrame + 1;
    if (!story.legacy && frames > LIMITS_V2.sceneMax * FPS) {
      issues.push({ code: "E_SIM_SCENE_LENGTH", path: `scenes[${si}]`, severity: "error",
        message: `Scene '${sid}' runs ${(frames / FPS).toFixed(0)}s (max ${LIMITS_V2.sceneMax}s).`, fix: "Split it into two scenes, or shorten its beats and waits." });
    }
    issues.push(...finishDirector(director));
    anchors.push(...director.anchors);
    beats.push(...director.beats.map((b) => ({ ...b, scene: si })));
    dead = director.dead;
    for (const a of actors) carry.set(a.id, { hp: a.hp, prop: a.prop ? a.prop.name : null, face: a.face });
    scenes.push({
      index: si, id: sid, theme: flat.meta.theme, stageWidth: flat.meta.stageWidth, look: flat.look,
      location: flat.location, set: [...(flat.location?.set || []), ...(flat.scene.set || [])],
      startFrame, frames, storyStart: t0, fxStart: fxLogStart, fxEnd: fx.log.length, fxT0: clock.fxAt[startFrame],
      characters: flat.characters.map((c) => ({ id: c.id, style: c.style || {} })),
    });
  }
  const last = story.scenes[story.scenes.length - 1];
  if (!overran && last.transitionOut) hold(last.transitionOut, -1);

  if (fx.dropped) {
    issues.push({ code: "W_PARTICLE_BUDGET", path: story.legacy ? "beats" : "scenes", severity: "warning",
      message: `${fx.dropped} particles were dropped (more than ${LIMITS.particles} at once).`, fix: "Spread big effects out or use smaller impact presets." });
  }
  if (overran) {
    issues.push({ code: "E_SIM_DURATION", path: story.legacy ? "beats" : "scenes", severity: "error",
      message: `The script is still running after ${(maxFrames / FPS).toFixed(0)}s of video.`, fix: `Keep videos under ${limit}s; check for long waits or slowmo.` });
  }
  const outMeta = story.legacy ? { ...script.meta } : { ...meta, theme: scenes[0]?.theme };
  return {
    store,
    events: log,
    anchors,
    beats,
    issues,
    totalFrames: clock.frame + 1,
    durationSec: clock.videoT,
    clock,
    fx: { log: fx.log, trails: fx.trails, flashes: fx.flashes },
    format,
    meta: outMeta,
    story,
    scenes,
    characters: story.cast.map((c) => ({ id: c.id, style: c.style || {} })),
  };
}
