// Simulation loop: clock → director → world → events, one step per video frame (spec 3, 6).
// Milestone: M3, M4 (FX and camera via presentation.js), M5 (packed frame store).

import { createActor } from "./actor.js";
import { prepareCatalog } from "./moves.js";
import { createWorld, stepWorld } from "./world.js";
import { createClock, tick, requestHitstop, timeEffectsActive } from "./clock.js";
import { createDirector, stepDirector, onEvents, directorIdle, finishDirector } from "./director.js";
import { createStore, writeFrame, frameView } from "./framestore.js";
import { createPresentation, presentEvent, stepPresentation } from "./presentation.js";
import { FPS, STAGE, LIMITS } from "./config.js";

const prepared = new WeakMap();

/** Prepared move map for a catalog, cached per catalog object. */
export function movesFor(catalog) {
  if (!prepared.has(catalog)) prepared.set(catalog, prepareCatalog(catalog.moves, catalog.poses));
  return prepared.get(catalog);
}

/** Frame n of a simulation result as a plain view (see framestore.frameView). */
export function frameAt(sim, n) {
  return frameView(sim.store, n, FPS);
}

const settled = (a) => (!a.move || a.move.def.name === "idle" || a.holding) && !a.airborne;

/**
 * Run a whole script.
 * @param {object} script  schema-valid script
 * @param {object} catalog  data catalog (poses, moves, ...)
 * @param {{ dryRun?:boolean, maxSeconds?:number }} opts  dryRun skips the frame store (validator)
 * @returns {{ store, events, anchors, beats, issues, totalFrames, durationSec, clock, fx, format, meta }}
 *   fx: { log, trails, flashes } for the renderer; format: { width, height, groundScreenRatio }
 */
export function simulate(script, catalog, opts = {}) {
  const moves = movesFor(catalog);
  const meta = script.meta || {};
  const stageWidth = meta.stageWidth ?? STAGE.width;
  const actors = script.characters.map((c) =>
    createActor({ id: c.id, x: c.x, facing: c.facing, scale: c.scale ?? 1, hp: c.hp ?? 100, color: c.color, groundY: STAGE.groundY }));
  for (const [i, c] of script.characters.entries()) actors[i].prop = c.prop ? { kind: c.prop } : null;
  const world = createWorld({ actors, moves, mode: meta.mode ?? "choreographed", stageWidth });
  const clock = createClock();
  const director = createDirector(script, moves);
  const present = createPresentation(script, catalog);
  const log = []; // every event with its story/video time
  const emit = (e) => {
    log.push({ ...e, storyT: clock.storyT, videoT: clock.videoT });
    presentEvent(present, e, world, clock);
  };
  let cam = stepPresentation(present, world, clock, 0, 0);
  const store = opts.dryRun ? null : createStore(actors, Math.round(20 * FPS));
  if (store) writeFrame(store, world.actors, clock, cam);
  const maxFrames = Math.round((opts.maxSeconds ?? LIMITS.maxDuration + 5) * FPS);
  const tailFrames = Math.round((meta.tail ?? 0.5) * FPS);
  let quietFrames = 0;
  let overran = false;

  while (true) {
    const d = tick(clock);
    stepDirector(director, { world, clock, storyT: clock.storyT, emit });
    const events = stepWorld(world, d.storyDt);
    for (const e of events) {
      if (e.type === "hitstop") requestHitstop(clock, e.seconds);
      emit(e);
    }
    onEvents(director, events, clock.storyT);
    cam = stepPresentation(present, world, clock, d.fxDt, d.videoDt);
    if (store) writeFrame(store, world.actors, clock, cam);

    const quiet = directorIdle(director) && world.actors.every(settled) && !timeEffectsActive(clock);
    quietFrames = quiet ? quietFrames + 1 : 0;
    if (quietFrames >= tailFrames) break;
    if (clock.frame >= maxFrames) {
      overran = true;
      break;
    }
  }
  const issues = finishDirector(director);
  if (present.fx.dropped) {
    issues.push({ code: "W_PARTICLE_BUDGET", path: "beats", severity: "warning",
      message: `${present.fx.dropped} particles were dropped (more than ${LIMITS.particles} at once).`, fix: "Spread big effects out or use smaller impact presets." });
  }
  if (overran) {
    issues.push({ code: "E_SIM_DURATION", path: "beats", severity: "error",
      message: `The script is still running after ${(maxFrames / FPS).toFixed(0)}s of video.`, fix: `Keep videos under ${LIMITS.maxDuration}s; check for long waits or slowmo.` });
  }
  return {
    store,
    events: log,
    anchors: director.anchors,
    beats: director.beats,
    issues,
    totalFrames: clock.frame + 1,
    durationSec: clock.videoT,
    clock,
    fx: { log: present.fx.log, trails: present.fx.trails, flashes: present.fx.flashes },
    format: present.format,
    meta: { ...meta },
  };
}
