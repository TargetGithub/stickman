// Defeat styles at runtime (STORY_SPEC 13, S5.5). Milestone: S5.
// The moves live in catalog/moves/defeat.json; their event flags are handled here:
//   fade { to, dur }  opacity over story time (to 0: the character is hidden at the end)
//   reform            a vanished character reappears (return); a petrified one thaws instead (a "thaw" event)
//   cage              a cage object drops over the character (captured; params.net 1: a fishing net instead)
// flee runs to the nearer stage edge away from the closest character, then fades out.
// A defeated character keeps the move's face (scared in a cage) instead of the knocked-out face.
// petrify (A3) holds the pose (keepPose) and marks the actor petrified; the renderer greys it from the
// "defeat" event and floods the colour back from the "thaw" event. Both carry over between scenes.

import { spawnObject } from "../objects.js";
import { STAGE } from "../config.js";

const FLEE_FADE = 0.4; // s

/** Story move events of defeat moves (world.onMoveEvent). */
export function defeatMoveEvent(world, actor, e, events, t) {
  if (e.fade) actor.fade = { a0: actor.alpha, a1: e.fade.to, t0: t, dur: e.fade.dur };
  if (e.reform && actor.petrified) {
    actor.petrified = false;
    events.push({ type: "thaw", actor: actor.id });
  } else if (e.reform) {
    actor.hidden = false;
    actor.alpha = 0;
    actor.fade = { a0: 0, a1: 1, t0: t, dur: 1 };
  }
  const net = !!actor.move?.params.net && !!world.objects?.ctx.catalog.objects?.fishing_net;
  if (e.cage && world.objects && (net || (actor.move?.params.cage ?? 1))) {
    const object = net ? "fishing_net" : "cage";
    events.push(...spawnObject(world.objects, { object, id: `${actor.id}_${object}`, x: actor.x, layer: "front", state: "closed" }, t));
  }
}

/**
 * Before a defeat move (or return) starts: its face while defeated, and for flee the side and distance.
 * @returns {object} the command options to use
 */
export function defeatStart(world, actor, def, opts) {
  actor.defeatFace = def.flags.defeat ? def.face ?? null : null;
  if (def.flags.petrify) actor.petrified = true;
  if (def.name !== "flee") return opts;
  let nearest = null;
  for (const a of world.actors) {
    if (a === actor || a.hidden) continue;
    if (!nearest || Math.abs(a.x - actor.x) < Math.abs(nearest.x - actor.x)) nearest = a;
  }
  const away = nearest ? Math.sign(actor.x - nearest.x) : 0;
  // Away from the closest character; with nobody around (or level with them), toward the nearer edge.
  actor.facing = away || (actor.x > world.stageWidth / 2 ? 1 : -1);
  const edge = actor.facing > 0 ? world.stageWidth - STAGE.margin : STAGE.margin;
  return { ...opts, params: { ...opts.params, distance: Math.max(1, Math.abs(edge - actor.x)) } };
}

/** After each world step: opacity fades, and fleeing characters fade out at the edge. */
export function updateDefeats(world, events, t) {
  for (const e of events) {
    if (e.type !== "moveEnd" || e.move !== "flee" || e.interrupted) continue;
    const a = world.byId.get(e.actor);
    if (a) a.fade = { a0: a.alpha, a1: 0, t0: t, dur: FLEE_FADE };
  }
  for (const a of world.actors) {
    const f = a.fade;
    if (!f) continue;
    const u = f.dur > 0 ? Math.min(1, Math.max(0, (t - f.t0) / f.dur)) : 1;
    a.alpha = f.a0 + (f.a1 - f.a0) * u;
    if (u < 1) continue;
    if (f.a1 <= 0) a.hidden = true;
    if (f.a1 <= 0 || f.a1 >= 1) a.fade = null; // a partial fade (a ghost) keeps holding its opacity
  }
}
