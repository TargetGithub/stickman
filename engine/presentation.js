// Presentation: turns simulation events into FX emissions and camera actions, and steps both
// each video frame (spec 10.3 step 7, 11.5, 13). Milestone: M4. Pure state, no drawing.

import { createFx, emitFx, stepFx } from "./fx.js";
import { createCamera, setCameraKey, cutCamera, addShake, addZoomPunch, stepCamera } from "./camera.js";
import { deriveRng } from "./math.js";
import { FORMATS, PHYSICS, STAGE } from "./config.js";

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
export function createPresentation(script, catalog) {
  const meta = script.meta || {};
  const format = FORMATS[meta.format] || FORMATS.landscape;
  const seed = meta.seed ?? 1;
  return {
    format,
    autoCamera: meta.autoCamera !== false,
    fx: createFx(deriveRng(seed, "fx"), catalog.fxPresets),
    cam: createCamera({
      width: format.width,
      height: format.height,
      groundScreenRatio: format.groundScreenRatio,
      stageWidth: meta.stageWidth ?? STAGE.width,
      groundY: STAGE.groundY,
      rng: deriveRng(seed, "camera"),
    }),
    pendingCut: false,
    lastKeyVideo: -Infinity,
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
  switch (e.type) {
    case "hit": {
      const attacker = world.byId.get(e.attacker);
      for (const name of e.fx || []) {
        emitFx(p.fx, name, e.point, { dir: attacker.facing, scale: attacker.scale, actorId: e.attacker, part: e.part }, fxT);
      }
      if (e.shake) addShake(p.cam, e.shake, fxT);
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
      break;
    }
    case "camera":
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

/** Advance sustained FX and the camera one video frame; returns the camera state for the frame. */
export function stepPresentation(p, world, clock, fxDt, videoDt) {
  // Projectiles are drawn as FX: a glow emitted at their position every frame leaves a trail.
  if (fxDt > 0) for (const pr of world.projectiles || []) if (!pr.item && !pr.falling) emitFx(p.fx, pr.kind, { x: pr.x, y: pr.y }, { dir: pr.facing, scale: pr.scale }, clock.fxT);
  stepFx(p.fx, fxDt, clock.fxT, (s) => {
    const actor = world.byId.get(s.opts.actorId);
    return actor ? anchorPoint(actor, p.fx.presets[s.name].anchor) : null;
  });
  return stepCamera(p.cam, videoDt, world.actors, clock.videoT, clock.fxT, { autoCamera: p.autoCamera });
}
