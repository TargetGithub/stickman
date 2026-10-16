// Simulation loop: clock → director → world → events, one step per video frame (spec 3, 6).
// Milestone: M3 (frames as plain snapshots; M5 replaces them with the packed frame store).

import { createActor } from "./actor.js";
import { prepareCatalog } from "./moves.js";
import { createWorld, stepWorld } from "./world.js";
import { createClock, tick, requestHitstop, timeEffectsActive } from "./clock.js";
import { createDirector, stepDirector, onEvents, directorIdle, finishDirector } from "./director.js";
import { packJoints } from "./skeleton.js";
import { FPS, STAGE, LIMITS } from "./config.js";

const prepared = new WeakMap();

/** Prepared move map for a catalog, cached per catalog object. */
export function movesFor(catalog) {
  if (!prepared.has(catalog)) prepared.set(catalog, prepareCatalog(catalog.moves, catalog.poses));
  return prepared.get(catalog);
}

function snapshot(world, clock) {
  return {
    storyT: clock.storyT,
    fxT: clock.fxT,
    videoT: clock.videoT,
    chars: world.actors.map((a) => ({
      id: a.id, joints: packJoints(a.joints, new Float32Array(26)), facing: a.facing, scale: a.scale,
      color: a.color, mouth: a.mouth, hp: a.hp, maxHp: a.maxHp, airborne: a.airborne,
    })),
  };
}

const settled = (a) => (!a.move || a.move.def.name === "idle" || a.holding) && !a.airborne;

/**
 * Run a whole script.
 * @param {object} script  schema-valid script
 * @param {object} catalog  data catalog (poses, moves, ...)
 * @param {{ dryRun?:boolean, maxSeconds?:number }} opts  dryRun skips frame snapshots (validator)
 * @returns {{ frames, events, anchors, beats, issues, totalFrames, durationSec, clock }}
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
  const frames = opts.dryRun ? null : [snapshot(world, clock)];
  const log = []; // every event with its story/video time
  const emit = (e) => log.push({ ...e, storyT: clock.storyT, videoT: clock.videoT });
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
    if (frames) frames.push(snapshot(world, clock));

    const quiet = directorIdle(director) && world.actors.every(settled) && !timeEffectsActive(clock);
    quietFrames = quiet ? quietFrames + 1 : 0;
    if (quietFrames >= tailFrames) break;
    if (clock.frame >= maxFrames) {
      overran = true;
      break;
    }
  }
  const issues = finishDirector(director);
  if (overran) {
    issues.push({ code: "E_SIM_DURATION", path: "beats", severity: "error",
      message: `The script is still running after ${(maxFrames / FPS).toFixed(0)}s of video.`, fix: `Keep videos under ${LIMITS.maxDuration}s; check for long waits or slowmo.` });
  }
  return {
    frames,
    events: log,
    anchors: director.anchors,
    beats: director.beats,
    issues,
    totalFrames: clock.frame + 1,
    durationSec: clock.videoT,
    clock,
  };
}
