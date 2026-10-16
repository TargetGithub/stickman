// Actor: one character's move state, queue, body (physics fields) and ground contact.
// Milestone: M1, extended in M2. Spec: sections 5.4, 8.2, 9.
// Used by the editor and catalog page directly (stepActor) and by world.js, which runs physics
// between advanceMove and poseActor.

import { computeJoints, lowestPoint, dimsOf, withPosture } from "./skeleton.js";
import { fillPose } from "./pose.js";
import { startMove, stepMove } from "./moves.js";
import { MOTION, STAGE } from "./config.js";
import { propTransform } from "./props.js";

/**
 * @param {{ id?:string, x:number, facing?:1|-1, scale?:number, groundY?:number, hp?:number, color?:string }} opts
 */
export function createActor(opts) {
  return {
    id: opts.id ?? "actor",
    color: opts.color ?? "#22aaff",
    x: opts.x,
    groundY: opts.groundY ?? STAGE.groundY,
    facing: opts.facing ?? 1,
    scale: opts.scale ?? 1,
    hp: opts.hp ?? 100,
    maxHp: opts.hp ?? 100,
    alive: true,
    hidden: false, // spawned later, despawned, or mid-teleport: not drawn, framed, collided or hit
    alpha: 1, // fades toward hidden ? 0 : 1
    move: null,
    queue: [],
    holding: false, // a move with flags.hold ended: keep its last pose until the next command
    pose: null,
    rootDy: 0,
    snapOffset: 0,
    snapReady: false,
    // body (spec 9): airY is height offset above contact (negative = up)
    vx: 0,
    vy: 0,
    airY: 0,
    airborne: false,
    launched: false,
    spinRot: 0,
    mouth: "neutral",
    prop: null, // { name, kind, data } while holding a prop
    propAngle: 0,
    joints: null,
  };
}

/**
 * Play a move now (interrupting) or queue it after the current one.
 * @param {Map<string, object>} moves  prepared catalog
 * @param {{ queue?:boolean, speed?:number, params?:object, blend?:number, beatId?:string, target?:string, outcome?:string }} opts
 */
export function playMove(actor, name, moves, opts = {}) {
  const def = moves.get(name);
  if (!def) throw new Error(`unknown move '${name}'`);
  if (opts.queue && (actor.move || actor.holding)) {
    actor.queue.push({ def, opts });
    return;
  }
  actor.holding = false;
  startMove(actor, def, opts);
}

function startNext(actor, moves) {
  const ended = actor.move;
  actor.move = null;
  if (ended && ended.def.chain) return startMove(actor, moves.get(ended.def.chain));
  const next = actor.queue.shift();
  if (next) {
    actor.holding = false;
    return startMove(actor, next.def, next.opts);
  }
  if (ended && ended.def.flags.hold) {
    actor.holding = true;
    return;
  }
  if (!actor.holding && moves.has("idle")) startMove(actor, moves.get("idle"));
}

/**
 * Advance the current move (or start the next one). Applies root motion to x.
 * @returns {{ events, openWindows, snapHard }}
 */
export function advanceMove(actor, dt, moves) {
  if (!actor.move && (!actor.holding || actor.queue.length)) startNext(actor, moves);
  if (!actor.move) {
    actor.pose ||= fillPose({}, {});
    return { events: [], openWindows: [], snapHard: false };
  }
  const r = stepMove(actor, dt);
  const events = r.events;
  // Move events with `turn: true` flip the character mid-move (spinning attacks).
  for (const e of events) if (e.type === "moveEvent" && e.turn) actor.facing = -actor.facing;
  actor.x += actor.facing * r.rootDx;
  actor.rootDy = r.rootDy;
  actor.mouth = r.mouth;
  actor.pose = r.pose;
  if (r.propAngle !== null) actor.propAngle = r.propAngle;
  if (r.ended) {
    actor.move.endAnnounced = true;
    events.push({ type: "moveEnd", actor: actor.id, move: actor.move.def.name, beatId: actor.move.beatId });
    startNext(actor, moves);
  }
  return { events, openWindows: r.openWindows, snapHard: r.snapHard };
}

/**
 * Ground contact (spec 5.4): keep the lowest point of the body on the ground while grounded.
 * Upward corrections (feet below ground) apply at once; downward ones are rate-limited so the hip
 * does not pop when the lowest joint switches. While the root is lifted (rootDy < 0) or the body is
 * airborne in physics, the offset is held and only corrected upward, so the body never sinks into the ground.
 */
function groundContact(actor, pose, dt, snapHard) {
  const dims = dimsOf(actor);
  const hipBase = actor.groundY - (dims.thigh + dims.shin) * actor.scale;
  const rootY = hipBase + actor.rootDy + actor.airY;
  const raw = computeJoints(pose, { x: actor.x, y: rootY }, actor.facing, actor.scale, dims);
  const target = actor.groundY - lowestPoint(raw, actor.scale, dims);
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

/** Pose shown this tick: the move pose plus launch spin and the body plan's posture (S3). */
export function displayPose(actor) {
  const pose = actor.spinRot ? { ...actor.pose, rot: actor.pose.rot + actor.spinRot } : actor.pose;
  return withPosture(pose, actor.posture, actor.postureW ?? 1);
}

/** Forward kinematics + ground contact for the current pose and body position. */
export function poseActor(actor, dt, snapHard = false) {
  // A posture (the elder's stoop) eases out while attacking: strikes use the plan's plain geometry,
  // which is what reach derivation and positioning assume.
  if (actor.posture) {
    const want = actor.move?.def.category === "attack" ? 0 : 1;
    const w = actor.postureW ?? want;
    actor.postureW = w + Math.sign(want - w) * Math.min(Math.abs(want - w), dt * 6);
  }
  const pose = displayPose(actor);
  const rootY = groundContact(actor, pose, dt, snapHard);
  actor.joints = withPropTip(actor, computeJoints(pose, { x: actor.x, y: rootY }, actor.facing, actor.scale, dimsOf(actor)));
  return actor.joints;
}

/** Add the held prop's tip to a joint set (a hit part and a slash-trail source). */
export function withPropTip(actor, joints) {
  if (actor.prop) joints.propTip = propTransform(joints, actor.prop.data, actor.propAngle, actor.facing, actor.scale).tip;
  return joints;
}

/**
 * Advance one tick without physics (editor, catalog page).
 * @param {Map<string, object>} moves  prepared catalog
 * @returns {{ joints, events, openWindows }}
 */
export function stepActor(actor, dt, moves) {
  const r = advanceMove(actor, dt, moves);
  const joints = poseActor(actor, dt, r.snapHard);
  return { joints, events: r.events, openWindows: r.openWindows };
}
