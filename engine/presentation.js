// Presentation: turns simulation events into FX emissions and camera actions, and steps both
// each video frame (spec 10.3 step 7, 11.5, 13). Milestone: M4. Pure state, no drawing.

import { createFx, emitFx, stepFx } from "./fx.js";
import { createCamera, setCameraKey, cutCamera, addShake, addZoomPunch, stepCamera } from "./camera.js";
import { deriveRng } from "./math.js";
import { shotKey, createStoryAuto, storyAutoEvent, storyAutoKey } from "./camera_story.js";
import { FORMATS, PHYSICS, STAGE } from "./config.js";

const POP_GAP = 0.6; // fx seconds between two impact words

/** World point for an FX anchor on an actor. */
export function anchorPoint(actor, anchor) {
  const j = actor.joints;
  if (anchor === "head") return j.head;
  if (anchor === "feet") return { x: (j.lFoot.x + j.rFoot.x) / 2, y: Math.max(j.lFoot.y, j.rFoot.y) };
  return j.hip;
}

/**
 * @param {object} script  for meta (format, seed, stageWidth, autoCamera)
 * @param {object} catalog  for fxPresets
 */
export function createPresentation(script, catalog, opts = {}) {
  const meta = script.meta || {};
  const format = FORMATS[meta.format] || FORMATS.landscape;
  const seed = meta.seed ?? 1;
  // Scenes (ADR-016): RNG streams are scoped per scene (suffix "@<sceneId>"); one fx log is shared.
  const suffix = opts.suffix ?? "";
  const fxRng = deriveRng(seed, `fx${suffix}`);
  if (opts.fx) opts.fx.rng = fxRng;
  return {
    format,
    autoCamera: meta.autoCamera !== false,
    fx: opts.fx ?? createFx(fxRng, catalog.fxPresets),
    cam: createCamera({
      width: format.width,
      height: format.height,
      groundScreenRatio: format.groundScreenRatio,
      stageWidth: meta.stageWidth ?? STAGE.width,
      groundY: STAGE.groundY,
      rng: deriveRng(seed, `camera${suffix}`),
    }),
    pendingCut: false,
    lastKeyVideo: -Infinity,
    // Kids audience (STORY_SPEC 13): cartoon impact words on hits, cycling through the internal pop_* presets.
    pops: opts.kids ? Object.keys(catalog.fxPresets).filter((n) => n.startsWith("pop_") && catalog.fxPresets[n].internal) : [],
    popCount: 0,
    lastPop: -Infinity,
    // Story camera (S6): a `shot` beat holds its key until `until` (story s), then the key before it comes back.
    shot: null,
    lasting: false,
    // meta.autoCamera "story" in a scene without camera keys of its own
    storyAuto: opts.storyCamera ? createStoryAuto(opts.t0 ?? 0) : null,
    autoKey: null,
    baseKey: null,
  };
}

function emitAt(p, world, name, actorId, fxT, extra = {}) {
  const actor = world.byId.get(actorId);
  const preset = p.fx.presets[name];
  if (!actor || !preset) return;
  emitFx(p.fx, name, anchorPoint(actor, preset.anchor), { dir: actor.facing, scale: actor.scale, actorId, ...extra }, fxT);
}

/** React to one event (world or director). clock gives fx/video time. */
export function presentEvent(p, e, world, clock) {
  const fxT = clock.fxT;
  if (p.storyAuto) storyAutoEvent(p.storyAuto, e, clock.storyT);
  switch (e.type) {
    case "hit": {
      const attacker = world.byId.get(e.attacker);
      for (const name of e.fx || []) {
        emitFx(p.fx, name, e.point, { dir: attacker.facing, scale: attacker.scale, actorId: e.attacker, part: e.part }, fxT);
      }
      if (e.shake) addShake(p.cam, e.shake, fxT);
      if (p.pops.length && e.kind === "hit" && fxT - p.lastPop > POP_GAP) {
        emitFx(p.fx, p.pops[p.popCount++ % p.pops.length], e.point, { dir: 1, scale: 1 }, fxT);
        p.lastPop = fxT;
      }
      if (p.autoCamera && e.kind === "hit" && e.damage > 15 && clock.videoT - p.lastKeyVideo > 0.3) addZoomPunch(p.cam, 0.12, 0.22, clock.videoT);
      break;
    }
    case "moveEvent":
      for (const name of e.fx || []) emitAt(p, world, name, e.actor, fxT, e.part ? { part: e.part } : {});
      if (e.shake) addShake(p.cam, e.shake, fxT);
      break;
    case "land":
      if (e.speed > PHYSICS.dustImpactSpeed) emitAt(p, world, "dust_land", e.actor, fxT);
      if (e.speed > PHYSICS.shakeImpactSpeed) addShake(p.cam, "small", fxT);
      break;
    case "fx":
      for (const name of e.names) {
        if (e.at) emitFx(p.fx, name, e.at, { dir: world.byId.get(e.actor)?.facing ?? 1, scale: world.byId.get(e.actor)?.scale ?? 1, color: e.color }, fxT);
        else emitAt(p, world, name, e.actor, fxT);
      }
      break;
    case "world": {
      const q = e.params || {};
      if (e.do === "shake") addShake(p.cam, q.preset, fxT);
      else if (e.do === "zoom_punch") addZoomPunch(p.cam, q.amount ?? 0.15, q.dur ?? 0.2, clock.videoT);
      else if (e.do === "explosion") {
        emitFx(p.fx, "explosion", { x: q.x, y: q.y ?? STAGE.groundY - 40 }, { dir: 1, scale: 1 }, fxT);
        addShake(p.cam, "big", fxT);
      } else if (e.do === "cut") p.pendingCut = true;
      else if (e.do === "shot") {
        // A timed shot inside another timed shot returns to the framing before both; after a lasting shot
        // (no dur), it returns to that shot's framing.
        const prev = p.shot && p.shot.until !== Infinity ? p.shot.prev : p.cam.key;
        p.shot = { prev, until: q.dur !== undefined ? clock.storyT + q.dur : Infinity };
        if (q.dur === undefined) p.lasting = true; // an explicit framing from here on: no auto camera
        setCameraKey(p.cam, shotKey(q), clock.videoT);
        p.lastKeyVideo = clock.videoT;
      }
      break;
    }
    case "object":
      // Object events (S4): effects at the object's position (heights are measured up from the floor);
      // feet-anchored presets (the Gloom Horn's mist) start on the floor below it.
      for (const name of e.fx || []) {
        const floor = p.fx.presets[name]?.anchor === "feet";
        emitFx(p.fx, name, { x: e.x, y: STAGE.groundY - (floor ? 0 : e.y || 0) }, { dir: 1, scale: 1 }, fxT);
      }
      break;
    case "camera":
      p.shot = null; // a camera key ends any shot
      p.baseKey = e.key;
      setCameraKey(p.cam, e.key, clock.videoT);
      p.lastKeyVideo = clock.videoT;
      if (p.pendingCut) {
        cutCamera(p.cam);
        p.pendingCut = false;
      }
      break;
    default:
  }
}

/** Shots that run out, and the story auto camera (S6). */
function storyCamera(p, world, clock) {
  if (p.shot && clock.storyT >= p.shot.until - 1e-9) {
    setCameraKey(p.cam, p.shot.prev, clock.videoT);
    p.shot = null;
  }
  if (!p.storyAuto || p.shot || p.lasting) return;
  const key = storyAutoKey(p.storyAuto, world.actors, clock.storyT);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (same(key, p.autoKey)) return;
  p.autoKey = key;
  setCameraKey(p.cam, key ?? p.baseKey ?? { mode: "follow" }, clock.videoT);
}

/** Advance sustained FX and the camera one video frame; returns the camera state for the frame. */
export function stepPresentation(p, world, clock, fxDt, videoDt) {
  storyCamera(p, world, clock);
  // Projectiles are drawn as FX: a glow emitted at their position every frame leaves a trail.
  if (fxDt > 0) for (const pr of world.projectiles || []) if (!pr.item && !pr.falling) emitFx(p.fx, pr.kind, { x: pr.x, y: pr.y }, { dir: pr.facing, scale: pr.scale }, clock.fxT);
  stepFx(p.fx, fxDt, clock.fxT, (s) => {
    const actor = world.byId.get(s.opts.actorId);
    return actor ? anchorPoint(actor, p.fx.presets[s.name].anchor) : null;
  });
  return stepCamera(p.cam, videoDt, world.actors, clock.videoT, clock.fxT, { autoCamera: p.autoCamera });
}
