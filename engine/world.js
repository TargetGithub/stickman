// World: actors + physics + aiming + hit resolution + choreographed outcomes, one story tick at a time.
// Milestone: M2. Spec: sections 9, 10, 11.4. sim.js (M3) wraps this with clocks, director, FX and camera.
//
//   const world = createWorld({ actors, moves });
//   command(world, "hero", "jab", { target: "boss", outcome: "hit" });
//   const events = stepWorld(world, 1 / 60);   // dt = 0 during hitstop: poses only

import { advanceMove, poseActor, playMove, displayPose } from "./actor.js";
import { computeJoints, BODY } from "./skeleton.js";
import { stepBody, separate } from "./physics.js";
import { applyHit, inWindow } from "./hit_apply.js";
import { spawnProjectile, stepWorldProjectiles, projectileArrival } from "./projectiles.js";
import {
  deriveReach, requiredStartX, whiffGap, canReach, limbReach, MAX_ASSIST_LEAN, resolveAimPoint, aimPointByName, aimCandidates, applyAimIK, ikWeight, sweptHit, buildHurtboxes,
} from "./combat.js";
import { rootOffsetAt } from "./moves.js";
import { COMBAT, STAGE } from "./config.js";

export const OUTCOMES = ["hit", "whiff", "blocked", "parried", "dodged"];

/**
 * @param {{ actors:object[], moves:Map, mode?:"choreographed"|"simulated", stageWidth?:number }} opts
 */
export function createWorld({ actors, moves, mode = "choreographed", stageWidth = STAGE.width }) {
  for (const a of actors) {
    advanceMove(a, 0, moves); // start idle (or a pre-queued move) so every actor has a pose
    poseActor(a, 0);
  }
  return { actors, byId: new Map(actors.map((a) => [a.id, a])), moves, mode, stageWidth, time: 0, scheduled: [], seq: 0, current: new Map(), projectiles: [] };
}

const toward = (from, to) => Math.sign(to.x - from.x) || from.facing;

/**
 * Command an actor to perform a move.
 * @param {{ target?:string, outcome?:string, params?:object, speed?:number, queue?:boolean, beatId?:string, blend?:number }} opts
 */
export function command(world, actorId, name, opts = {}) {
  const actor = world.byId.get(actorId);
  if (!actor) throw new Error(`unknown actor '${actorId}'`);
  const target = opts.target ? world.byId.get(opts.target) : null;
  if (!opts.queue && target) actor.facing = toward(actor, target);
  playMove(actor, name, world.moves, opts);
}

/** Run a command at a later story time (used for defender reactions to choreographed outcomes). */
function schedule(world, at, actorId, name, opts) {
  world.scheduled.push({ at, seq: world.seq++, actorId, name, opts });
  world.scheduled.sort((a, b) => a.at - b.at || a.seq - b.seq);
}

const DEFENSE_LEAD = { block: 0.12, parry: 0.1, dodge_back: 0.16, duck: 0.12 }; // s before contact

/** First tick of a targeted attack: positioning nudge (spec 11.4) and defender timing (spec 10.5). */
function setupAttack(world, actor, events) {
  const m = actor.move;
  m.setup = true;
  if (m.def.category !== "attack" || !m.target) return;
  const target = world.byId.get(m.target);
  if (!target) return;
  actor.facing = toward(actor, target);
  m.outcome = world.mode === "choreographed" ? m.outcome || "hit" : null;
  m.aims = [];
  m.prevPart = {};
  m.hitIds = new Set();
  if (world.mode !== "choreographed") return;
  if (m.def.flags.ranged) return setupRanged(world, actor, target, m, events);

  const d = deriveReach(m.def)[0];
  const required = requiredStartX(actor, target, m.def, m.params, m.outcome);
  const error = required - actor.x;
  const max = COMBAT.maxNudge * actor.scale;
  // Judge reachability against the plain hit spot; dodged spacing is a refinement the nudge aims for.
  const judged = m.outcome === "dodged" ? requiredStartX(actor, target, m.def, m.params, "hit") - actor.x : error;
  if (Math.abs(judged) > max) events.push({ type: "positionError", actor: actor.id, move: m.def.name, beatId: m.beatId, error: judged });
  m.nudge = { total: Math.max(-max, Math.min(max, error)), applied: 0, until: d.tmid };
  if (m.outcome !== "whiff" && !canReach(actor, target, m.def, m.params)) {
    events.push({ type: "reachWarning", actor: actor.id, target: target.id, move: m.def.name, beatId: m.beatId });
  }

  const secondsToHit = ((m.def.hits[0].t0 - m.t) * m.def.duration) / m.speed;
  const defense = { blocked: "block", parried: "parry" }[m.outcome]
    || (m.outcome === "dodged" ? dodgeFor(actor, target, m) : null);
  m.defense = defense;
  if (defense && world.moves.has(defense)) {
    // Small defenders dodge further (in their own units) so a bigger attacker's limb clearly misses.
    // distance_back is in the defender's units: at least its own 120, and far enough to clear the attacker's reach.
    const params = defense === "dodge_back" ? { distance_back: Math.max(120, (180 * actor.scale) / target.scale) } : undefined;
    // Dodges start up to 0.35 s ahead so the attacker's windup never grazes the defender.
    const lead = defense === "dodge_back" || defense === "duck" ? Math.max(DEFENSE_LEAD[defense], Math.min(secondsToHit, 0.35)) : DEFENSE_LEAD[defense];
    schedule(world, world.time + Math.max(0, secondsToHit - lead), target.id, defense, { target: actor.id, params });
  }
}

/** Ranged attacks: no contact positioning, just a distance band; defenders react to the projectile's arrival. */
function setupRanged(world, actor, target, m, events) {
  const [min, max] = m.def.flags.ranged.map((v) => v * actor.scale);
  const dist = Math.abs(target.x - actor.x);
  if (dist < min || dist > max) events.push({ type: "positionError", actor: actor.id, move: m.def.name, beatId: m.beatId, error: dist < min ? dist - min : dist - max });
  // Dodging a projectile: duck under it, or (a much bigger defender, hit low) jump over a flat shot.
  const dodge = target.scale > actor.scale * 1.3 ? "jump" : "duck";
  const defense = { blocked: "block", parried: "parry", dodged: dodge }[m.outcome];
  m.defense = defense;
  if (defense && world.moves.has(defense)) {
    // Projectiles reach the body surface before its centre line: defend a little earlier than melee.
    const at = projectileArrival(actor, target, m.def, m) - (defense === "jump" ? 0.5 : DEFENSE_LEAD[defense] + 0.15);
    schedule(world, world.time + Math.max(0, at), target.id, defense, { target: actor.id });
  }
}

/** Duck under head-height hand strikes; step back from everything else (kicks rise through a duck). */
function dodgeFor(actor, target, m) {
  const declared = m.def.hits[0].dodge; // moves may declare it (an uppercut rises into a duck)
  if (declared) return declared === "duck" ? "duck" : "dodge_back";
  const handStrike = ["rHand", "lHand", "rElbow", "lElbow"].includes(m.def.hits[0].part);
  return handStrike && predictAimName(actor, target, m) === "head" ? "duck" : "dodge_back";
}

/** Where an auto-aimed hit would land, judged from the authored contact height. */
function predictAimName(actor, target, m) {
  const d = deriveReach(m.def)[0];
  const y = actor.groundY - d.height * actor.scale;
  const cands = aimCandidates(target.joints);
  return cands.reduce((b, c) => (Math.abs(c.point.y - y) < Math.abs(b.point.y - y) ? c : b)).name;
}

function applyNudge(actor) {
  const n = actor.move?.nudge;
  if (!n) return;
  const frac = Math.min(1, actor.move.t / n.until);
  const delta = n.total * frac - n.applied;
  actor.x += delta;
  n.applied += delta;
}

/** Blend attack limbs toward their aim points around hit windows (spec 8.3). */
function aimLimbs(world, actor) {
  const m = actor.move;
  if (!m || !m.aims || !m.target) return;
  const target = world.byId.get(m.target);
  m.def.hits.forEach((hit, i) => {
    const w = ikWeight(m.t, hit);
    if (w <= 0 || !target.joints) return;
    const s = actor.scale;
    if (!m.aims[i]) {
      const d = deriveReach(m.def)[i];
      const travelLeft = (rootOffsetAt(m.def, d.tmid, m.params).dx - rootOffsetAt(m.def, m.t, m.params).dx) * s;
      const nudgeLeft = m.nudge ? (m.nudge.total - m.nudge.applied) * actor.facing : 0;
      const fk = { x: actor.x + actor.facing * (d.reach * s + travelLeft + nudgeLeft), y: actor.groundY - d.height * s };
      const shift = actor.facing * (travelLeft + nudgeLeft);
      m.aims[i] = resolveAimPoint(actor.joints, hit.part, s, target.joints, hit.aim || "auto", fk, target.scale, -actor.facing, shift).name;
    }
    const near = () => aimPointByName(target.joints, m.aims[i], target.scale, -actor.facing);
    // Dodges lock the aim where the target was, so the limb does not follow it out of the way.
    // A ducked swing aims just over the head so it clearly passes above.
    const lock = () => {
      const p = near();
      return m.defense === "duck" ? { x: p.x, y: p.y - BODY.headR * target.scale * 1.3 } : p;
    };
    let point = m.outcome === "dodged" ? ((m.aimLock ||= {})[i] ||= lock()) : near();
    if (m.outcome === "whiff") point = { x: point.x - actor.facing * whiffGap(actor, target), y: point.y };
    reachAssist(actor, hit.part, point, w);
    actor.joints = applyAimIK(actor.joints, hit.part, point, w, s);
  });
}

/**
 * When the aim point is below the limb's reach (a giant punching a small fighter), lean the torso
 * into the strike, up to MAX_ASSIST_LEAN degrees, just enough to bring the point into reach.
 */
function reachAssist(actor, part, point, w) {
  const s = actor.scale;
  const limb = limbReach(actor.joints, part, s);
  if (!limb) return;
  const out = (j) => Math.hypot(point.x - limbReach(j, part, s).root.x, point.y - limbReach(j, part, s).root.y) - limbReach(j, part, s).len;
  if (out(actor.joints) <= 0 || point.y < limb.root.y) return; // reachable already, or the target is above (no ducking help)
  const pose = displayPose(actor);
  const hip = actor.joints.hip;
  const root = { x: hip.x - actor.facing * (pose.dx || 0), y: hip.y - (pose.dy || 0) };
  let best = actor.joints;
  for (let extra = 8; extra <= MAX_ASSIST_LEAN; extra += 8) {
    best = computeJoints({ ...pose, lean: pose.lean + extra * w }, root, actor.facing, s);
    if (out(best) <= 0) break;
  }
  actor.joints = best;
}

/** Resolve open hit windows in stable order (spec 10.3). */
function resolveHits(world, windowsByActor) {
  const events = [];
  for (const attacker of world.actors) {
    const m = attacker.move;
    const windows = windowsByActor.get(attacker);
    if (!m || !windows?.length || !m.hitIds) continue;
    for (const { index, hit } of windows) {
      const part = attacker.joints[hit.part] || attacker.joints.rHand;
      const prev = m.prevPart[index] || part;
      m.prevPart[index] = part;
      const targets = world.mode === "choreographed" ? [world.byId.get(m.target)] : world.actors.filter((t) => t !== attacker && t.alive);
      for (const target of targets) {
        const key = `${index}:${target.id}`;
        if (m.hitIds.has(key)) continue;
        let kind = null;
        if (world.mode === "choreographed") {
          if (m.outcome === "whiff" || m.outcome === "dodged") continue;
          const touched = sweptHit(prev, part, COMBAT.hitRadius * attacker.scale, buildHurtboxes(target.joints, target.scale));
          const forced = m.t >= deriveReach(m.def)[index].tmid;
          if (touched || forced) kind = m.outcome === "blocked" ? "blocked" : m.outcome === "parried" ? "parried" : "hit";
        } else {
          if (inWindow(target.move, "invulnerable")) continue;
          if (!sweptHit(prev, part, COMBAT.hitRadius * attacker.scale, buildHurtboxes(target.joints, target.scale))) continue;
          const guard = inWindow(target.move, "guard");
          kind = guard === "parry" ? "parried" : guard ? "blocked" : "hit";
        }
        if (!kind) continue;
        m.hitIds.add(key);
        events.push(...applyHit(world, attacker, target, hit, kind, { x: part.x, y: part.y }, { params: m.params, beatId: m.beatId, moveName: m.def.name, facing: attacker.facing }));
        if (kind === "parried") break;
      }
      if (attacker.move !== m) break; // parried: the attack was cut
    }
  }
  return events;
}

/** On landing from a launch: lie down (knockdown), keeping the spin's visual angle continuous. */
function onLand(world, actor, e) {
  if (!e.launched) return;
  const pose = displayPose(actor);
  actor.pose = { ...pose, rot: pose.rot - 360 * Math.round((pose.rot + 90) / 360) };
  actor.spinRot = 0;
  if (actor.alive) playMove(actor, "knockdown", world.moves, { blend: 0.12 });
  else playMove(actor, world.moves.has("ko_fall") ? "ko_fall" : "knockdown", world.moves, { blend: 0.12 });
}

/**
 * Report beat-tagged moves starting, and moves that were replaced before finishing (interrupted by a
 * reaction or a new command) as ended, so the director's start/end anchors always fire.
 */
function announce(world, events) {
  for (const actor of world.actors) {
    const prev = world.current.get(actor);
    const cur = actor.move;
    if (prev && prev !== cur && prev.beatId && !prev.endAnnounced) {
      prev.endAnnounced = true;
      events.push({ type: "moveEnd", actor: actor.id, move: prev.def.name, beatId: prev.beatId, interrupted: true });
    }
    if (cur && cur.beatId && !cur.startAnnounced) {
      cur.startAnnounced = true;
      events.push({ type: "anchor", anchor: "start", actor: actor.id, move: cur.def.name, beatId: cur.beatId });
    }
    world.current.set(actor, cur);
  }
}

function separationSkip(a, b) {
  const engaged = (x, y) => x.move && x.move.target === y.id && x.move.def.category === "attack";
  const ghost = (x) => x.move?.def.flags.passThrough || x.holding || x.launched;
  return engaged(a, b) || engaged(b, a) || ghost(a) || ghost(b);
}

/**
 * Advance the world by dt story seconds (spec 6). dt = 0 (hitstop, freeze) only re-poses.
 * @returns {Array<object>} events: moveEvent, windowOpen, moveEnd, anchor, hit, hitstop, land, wall, positionError
 */
export function stepWorld(world, dt) {
  const events = [];
  const windowsByActor = new Map();
  const snapHard = new Map();
  if (dt > 0) {
    world.time += dt;
    while (world.scheduled.length && world.scheduled[0].at <= world.time + 1e-9) {
      const s = world.scheduled.shift();
      command(world, s.actorId, s.name, s.opts);
    }
    announce(world, events);
    for (const actor of world.actors) {
      const r = advanceMove(actor, dt, world.moves);
      for (const e of r.events) {
        events.push({ ...e, actor: actor.id });
        if (e.type === "moveEvent" && e.projectile && actor.move) spawnProjectile(world, actor, e.projectile, events);
      }
      windowsByActor.set(actor, r.openWindows);
      snapHard.set(actor, r.snapHard);
      if (actor.move && !actor.move.setup) setupAttack(world, actor, events);
      applyNudge(actor);
      for (const e of stepBody(actor, dt, { stageWidth: world.stageWidth })) {
        events.push(e);
        if (e.type === "land") onLand(world, actor, e);
      }
    }
    separate(world.actors, separationSkip);
  }
  for (const actor of world.actors) poseActor(actor, dt, snapHard.get(actor));
  for (const actor of world.actors) aimLimbs(world, actor);
  if (dt > 0) {
    events.push(...resolveHits(world, windowsByActor));
    events.push(...stepWorldProjectiles(world, dt));
    announce(world, events);
  }
  return events;
}
