// Simulation loop: clock → director → world → events, one step per video frame (spec 3, 6).
// Milestone: M3, M4 (FX and camera via presentation.js), M5 (packed frame store), S1 (scenes).
// A script is normalized to a v2 story; scenes run one after another in one clock (ADR-016), with
// hold frames for transitions between them. A v1 script is one scene and runs exactly as before.

import { createActor } from "./actor.js";
import { prepareCatalog, STORY_ONLY, isIdleMove } from "./moves.js";
import { createWorld, stepWorld } from "./world.js";
import { createClock, tick, holdTick, requestHitstop, timeEffectsActive } from "./clock.js";
import { createDirector, stepDirector, onEvents, directorIdle, finishDirector } from "./director.js";
import { createStore, startScene, addHold, writeFrame, frameView } from "./framestore.js";
import { createPresentation, presentEvent, stepPresentation } from "./presentation.js";
import { normalize, flatScene, transitionInto, transitionDuration } from "./story/normalize.js";
import { compileStory } from "./story/compile.js";
import { faceEvents, updateFaces } from "./story/faces.js";
import { bodyPlan } from "./story/bodies.js";
import { updatePairs, pairMoveEvent } from "./story/pairs.js";
import { defeatMoveEvent, updateDefeats } from "./story/defeat.js";
import { createObjects, stepObjects, useHeld, movingItems, holdableData, holdableNames, objectsBusy, holdableProps, popNear } from "./objects.js";
import { updateActivities, activityMoveEvent } from "./story/activities.js";
import { updateExits } from "./story/destinations.js";
import { planExtras, EXTRA_MOVES } from "./story/extras.js";
import { FPS, STAGE, LIMITS, LIMITS_V2 } from "./config.js";

const prepared = new WeakMap();

/** Prepared move map for a catalog, cached per catalog object. */
export function movesFor(catalog) {
  if (!prepared.has(catalog)) prepared.set(catalog, prepareCatalog(catalog.moves, catalog.poses, holdableProps(catalog)));
  return prepared.get(catalog);
}

/**
 * Moves a v1 script may use: not paired moves (v1 has no partner) or defeat styles, and not moves that need a story
 * holdable (a racket, a wand). The v1 schema, prompt tables and semantic checks use this list.
 */
export function v1MoveNames(catalog) {
  return [...movesFor(catalog).values()]
    .filter((d) => !STORY_ONLY.includes(d.category) && (!d.needsProp || d.needsProp === "any" || Object.values(catalog.props).some((p) => p.kind === d.needsProp)))
    .map((d) => d.name);
}

/** Frame n of a simulation result as a plain view (see framestore.frameView). */
export function frameAt(sim, n) {
  return frameView(sim.store, n, FPS);
}

const settled = (a) => (!a.move || isIdleMove(a.move.def) || a.holding) && !a.airborne;

/** Actors for one scene, with hp, held prop and (story scripts) face carried over from earlier scenes. */
function sceneActors(flat, catalog, carry, faces) {
  return flat.characters.map((c) => {
    const kept = carry.get(c.id);
    const placed = (flat.scene.cast || []).find((p) => p.id === c.id) || {};
    const a = createActor({ id: c.id, x: c.x, facing: c.facing, scale: c.scale ?? 1, hp: c.hp ?? 100, color: c.color, groundY: STAGE.groundY });
    if (c.body && c.body !== "stickman") Object.assign(a, bodyPlan(catalog, c.body)); // dims, stride, posture, plan
    if (kept && placed.hp === undefined) a.hp = kept.hp;
    // A character with a spawn beat, or placed hidden, starts invisible until it appears.
    if (flat.hidden.has(c.id) || flat.beats.some((b) => b.who === c.id && b.do === "spawn")) {
      a.hidden = true;
      a.alpha = 0;
    }
    if (faces) {
      a.face = placed.face ?? kept?.face ?? "neutral";
      a.layer = placed.layer ?? "mid";
    }
    const name = kept && placed.prop === undefined ? kept.prop : c.prop;
    const data = name ? holdableData(catalog, name) : null;
    a.prop = data ? { name, kind: data.kind, data } : null;
    return a;
  });
}

/** Characters riding a vehicle move with it (seat point) and face its way (S4). */
function ridersFollow(world) {
  for (const a of world.actors) {
    if (!a.riding) continue;
    const v = world.objects.byId.get(a.riding);
    if (!v || !v.alive) {
      a.riding = null;
      continue;
    }
    a.facing = v.facing;
    a.x = v.x + (v.def.seat?.x ?? 0) * v.facing;
    a.vx = 0;
  }
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
  const moves = movesFor(catalog);
  const story = compileStory(normalize(script), catalog, moves).story; // macros → beats (S6)
  const meta = story.meta || {};
  const limit = story.legacy ? LIMITS.maxDuration : LIMITS_V2.maxDuration;
  const maxFrames = Math.round((opts.maxSeconds ?? limit + 5) * FPS);
  const clock = createClock();
  const store = opts.dryRun ? null : createStore(null, 0, holdableNames(catalog), Object.keys(catalog.faces || {}));
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
    const scenePath = flat.scene.srcPath ?? `scenes[${si}]`; // the authored scene (a scene macro's scenes share it)
    const suffix = story.legacy ? "" : `@${sid}`;
    const t = transitionInto(story, si);
    if (t && t.type !== "cut") hold(t, si);

    const actors = sceneActors(flat, catalog, carry, !story.legacy);
    const world = createWorld({ actors, moves, mode: meta.mode ?? "choreographed", stageWidth: flat.meta.stageWidth });
    // Objects (S4): set pieces and spawned objects; holdable set pieces lie on the floor as props.
    const pieces = [...(flat.location?.set || []), ...(flat.scene.set || [])];
    for (const p of pieces.filter((q) => catalog.objects?.[q.object]?.behavior === "holdable")) {
      const hold = catalog.objects[p.object].hold;
      world.groundProps.push({ name: p.object, kind: hold.kind, data: hold, x: p.x, y: STAGE.groundY - 4 - (p.y ?? 0), angle: 0 });
    }
    // Holdables with states (the rainbow crystal) are also objects, so set_object can change them.
    const asObject = (q) => catalog.objects?.[q.object]?.behavior !== "holdable" || !!catalog.objects[q.object].states;
    world.objects = story.legacy ? null : createObjects(pieces.filter(asObject),
      { catalog, seed: meta.seed ?? 1, sceneId: sid, groundY: STAGE.groundY, stageWidth: flat.meta.stageWidth });
    world.onMoveEvent = (actor, e, events) => {
      if (e.use && world.objects && actor.prop) events.push(...useHeld(world.objects, actor, actor.joints.propTip || actor.joints.rHand, clock.storyT));
      if (e.unseat) actor.seatY = actor.seatId = null;
      if (e.detach || e.give) pairMoveEvent(world, actor, e, events);
      if (e.fade || e.reform || e.cage) defeatMoveEvent(world, actor, e, events, clock.storyT);
      if (e.poke && world.objects) events.push(...popNear(world.objects, actor.joints.rHand, 160 * actor.scale, STAGE.groundY));
      if (e.contact && actor.activity) activityMoveEvent(world, actor, e, events, clock.storyT);
    };
    const t0 = clock.storyT;
    // A placement that sets hp starts the character fresh: it is no longer knocked out (fight card rounds).
    const fresh = new Set((flat.scene.cast || []).filter((p) => p.hp !== undefined).map((p) => p.id));
    const director = createDirector(flat, moves, { t0, prefix: story.legacy ? "" : `${scenePath}.`, tag: story.legacy ? "" : `${sid}.`, dead: [...dead].filter((id) => !fresh.has(id)), story: !story.legacy });
    present = createPresentation(flat, catalog, { suffix, fx, kids: !story.legacy && (meta.audience ?? "kids") === "kids",
      storyCamera: !story.legacy && meta.autoCamera === "story" && !(flat.scene.camera || []).length, t0 });
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
      ...(world.objects ? movingItems(world.objects, STAGE.groundY) : []),
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
      if (world.objects) {
        events.push(...stepObjects(world.objects, d.storyDt, clock.storyT));
        ridersFollow(world);
      }
      if (world.pairs?.length) events.push(...updatePairs(world));
      if (!story.legacy) {
        updateExits(world, events, clock.storyT);
        updateDefeats(world, events, clock.storyT);
      }
      if (world.activities?.length) events.push(...updateActivities(world, clock.storyT));
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
        const quiet = directorIdle(director) && world.actors.every(settled) && !timeEffectsActive(clock) && !(world.objects && objectsBusy(world.objects));
        quietFrames = quiet ? quietFrames + 1 : 0;
        if (quietFrames >= tailFrames) break;
      }
      if (clock.frame >= maxFrames || (!story.legacy && clock.frame - startFrame >= sceneMax)) {
        overran = clock.frame >= maxFrames;
        break;
      }
    }
    for (const e of log.filter((x) => x.scene === si && x.type === "object" && x.what === "offstage")) {
      issues.push({ code: "E_SIM_OBJECT_OFFSTAGE", path: scenePath, severity: "error",
        message: `'${e.id}' (${e.kind}) left the stage at x=${e.x.toFixed(0)} (stage 0-${flat.meta.stageWidth}).`,
        fix: e.kind && catalog.objects?.[e.kind]?.behavior === "vehicle" ? 'Use "exit": "left" or "right" to drive off, or a toX inside the stage.' : "Aim toX inside the stage, or lower the speed or height." });
    }
    const frames = clock.frame - startFrame + 1;
    if (!story.legacy && frames > LIMITS_V2.sceneMax * FPS) {
      issues.push({ code: "E_SIM_SCENE_LENGTH", path: scenePath, severity: "error",
        message: `Scene '${sid}' runs ${(frames / FPS).toFixed(0)}s (max ${LIMITS_V2.sceneMax}s).`, fix: "Split it into two scenes, or shorten its beats and waits." });
    }
    issues.push(...finishDirector(director));
    anchors.push(...director.anchors);
    beats.push(...director.beats.map((b) => ({ ...b, scene: si })));
    dead = director.dead;
    for (const a of actors) carry.set(a.id, { hp: a.hp, prop: a.prop ? a.prop.name : null, face: a.face, hidden: !!a.hidden, scene: sid });
    scenes.push({
      index: si, id: sid, theme: flat.meta.theme, stageWidth: flat.meta.stageWidth, look: flat.look,
      location: flat.location, set: [...(flat.location?.set || []), ...(flat.scene.set || [])],
      startFrame, frames, storyStart: t0, fxStart: fxLogStart, fxEnd: fx.log.length, fxT0: clock.fxAt[startFrame],
      characters: flat.characters.map((c) => ({ id: c.id, style: c.style || {}, layer: (flat.scene.cast || []).find((p) => p.id === c.id)?.layer ?? "mid" })),
      extras: story.legacy ? [] : planExtras(flat.scene, flat.location, catalog, meta.seed ?? 1, flat.meta.stageWidth),
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
    // Where everyone was when they last appeared (S8: the next scene's writer starts from here).
    endState: Object.fromEntries([...carry].map(([id, c]) => [id, { ...c, hp: Math.round(c.hp), defeated: dead.has(id) }])),
    extraMoves: scenes.some((sc) => sc.extras.length) ? Object.fromEntries(EXTRA_MOVES.map((n) => [n, moves.get(n)])) : null,
    characters: story.cast.map((c) => ({ id: c.id, style: c.style || {} })),
  };
}
