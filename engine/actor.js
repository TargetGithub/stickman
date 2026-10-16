// Actor: one character's move state, queue and ground contact, without physics or combat.
// Milestone: M1. Spec: sections 5.4, 8.2. Used by the editor, the catalog page and (from M3) sim.js.

import { computeJoints, lowestPoint, BODY } from "./skeleton.js";
import { fillPose } from "./pose.js";
import { startMove, stepMove } from "./moves.js";
import { MOTION, STAGE } from "./config.js";

/**
 * @param {{ id?:string, x:number, facing?:1|-1, scale?:number, groundY?:number }} opts
 */
export function createActor(opts) {
  return {
    id: opts.id ?? "actor",
    x: opts.x,
    groundY: opts.groundY ?? STAGE.groundY,
    facing: opts.facing ?? 1,
    scale: opts.scale ?? 1,
    move: null,
    queue: [],
    pose: null,
    rootDy: 0,
    snapOffset: 0,
    snapReady: false,
    airborne: false, // set by physics from M2
    mouth: "neutral",
    joints: null,
  };
}

/**
 * Play a move now (interrupting) or queue it after the current one.
 * @param {Map<string, object>} moves  prepared catalog
 * @param {{ queue?:boolean, speed?:number, params?:object, blend?:number, beatId?:string }} opts
 */
export function playMove(actor, name, moves, opts = {}) {
  const def = moves.get(name);
  if (!def) throw new Error(`unknown move '${name}'`);
  if (opts.queue && actor.move) actor.queue.push({ def, opts });
  else startMove(actor, def, opts);
}

function startNext(actor, moves) {
  const ended = actor.move;
  actor.move = null;
  if (ended && ended.def.chain) return startMove(actor, moves.get(ended.def.chain));
  const next = actor.queue.shift();
  if (next) return startMove(actor, next.def, next.opts);
  if (moves.has("idle")) startMove(actor, moves.get("idle"));
}

/**
 * Ground contact (spec 5.4): keep the lowest point of the body on the ground while grounded.
 * Upward corrections (feet below ground) apply at once; downward ones are rate-limited so the hip
 * does not pop when the lowest joint switches. While the root is lifted (rootDy < 0) or the body is
 * airborne in physics, the offset is held and only corrected upward, so the body never sinks into the ground.
 */
function groundContact(actor, pose, dt, snapHard) {
  const hipBase = actor.groundY - (BODY.thigh + BODY.shin) * actor.scale;
  const rootY = hipBase + actor.rootDy;
  const raw = computeJoints(pose, { x: actor.x, y: rootY }, actor.facing, actor.scale);
  const target = actor.groundY - lowestPoint(raw, actor.scale);
  if (actor.rootDy < 0 || actor.airborne) {
    if (target < actor.snapOffset) actor.snapOffset = target;
    return rootY + actor.snapOffset;
  }
  if (!actor.snapReady || snapHard || target < actor.snapOffset) {
    actor.snapOffset = target;
    actor.snapReady = true;
  } else {
    actor.snapOffset = Math.min(target, actor.snapOffset + MOTION.snapRate * actor.scale * dt * 60);
  }
  return rootY + actor.snapOffset;
}

/**
 * Advance one tick.
 * @param {Map<string, object>} moves  prepared catalog
 * @returns {{ joints, events, openWindows }}
 */
export function stepActor(actor, dt, moves) {
  if (!actor.move) startNext(actor, moves);
  let pose;
  let events = [];
  let openWindows = [];
  let snapHard = false;
  if (actor.move) {
    const r = stepMove(actor, dt);
    pose = r.pose;
    events = r.events;
    openWindows = r.openWindows;
    snapHard = r.snapHard;
    actor.x += actor.facing * r.rootDx;
    actor.rootDy = r.rootDy;
    actor.mouth = r.mouth;
    actor.pose = pose;
    if (r.ended) {
      events.push({ type: "moveEnd", move: actor.move.def.name, beatId: actor.move.beatId });
      startNext(actor, moves);
    }
  } else {
    pose = actor.pose || fillPose({}, {});
    actor.pose = pose;
  }
  const rootY = groundContact(actor, pose, dt, snapHard);
  actor.joints = computeJoints(pose, { x: actor.x, y: rootY }, actor.facing, actor.scale);
  return { joints: actor.joints, events, openWindows };
}
