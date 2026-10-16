// Applying a landed hit (spec 10.3 steps 4-7): damage, reaction, knockback, hitstop, events.
// Shared by melee (world.js) and projectiles (projectiles.js).

import { playMove } from "./actor.js";
import { launch } from "./physics.js";
import { evalParam } from "./expr.js";
import { COMBAT } from "./config.js";

const LAUNCH_SPIN = -540; // deg/s, backward
const MIN_LAUNCH_VY = -750;

export function reactionFor(world, hit, damage) {
  if (hit.reaction && world.moves.has(hit.reaction)) return hit.reaction;
  const t = COMBAT.reactionThresholds;
  const name = damage < t.light ? "hit_light" : damage < t.heavy ? "hit_heavy" : "hit_launch";
  return world.moves.has(name) ? name : "hit_light";
}

/** Value of a move flag window ([t0, t1, kind?]) at the move's current time, or null. */
export function inWindow(move, flag) {
  const w = move?.def.flags[flag];
  if (!w) return null;
  if (w === true) return true;
  return move.t >= w[0] && move.t <= w[1] ? (w[2] || true) : null;
}

/**
 * Apply one landed hit. kind: hit | blocked | parried.
 * @param {{ params, beatId, moveName, facing, ranged? }} src  the attack that landed (the attacker's move may have ended for projectiles)
 */
export function applyHit(world, attacker, target, hit, kind, point, src) {
  const f = src.facing;
  const damage = evalParam(hit.damage ?? 0, src.params);
  const knock = hit.knock || [0, 0];
  const events = [];
  let dealt = 0;
  target.facing = -f;
  if (kind === "parried") {
    if (!src.ranged) playMove(attacker, world.moves.has("stagger") ? "stagger" : "hit_light", world.moves, {});
    events.push({ type: "hitstop", seconds: 0.06 });
  } else if (kind === "blocked") {
    dealt = damage * COMBAT.blockDamageFactor;
    target.vx = f * knock[0] * 0.3;
    events.push({ type: "hitstop", seconds: (hit.hitstop ?? 0.06) * 0.6 });
  } else {
    dealt = damage;
    const reaction = reactionFor(world, hit, damage);
    playMove(target, reaction, world.moves, { blend: 0 });
    if (reaction === "hit_launch") launch(target, f * knock[0], Math.min(knock[1], MIN_LAUNCH_VY), LAUNCH_SPIN);
    else target.vx = f * knock[0];
    if (hit.hitstop) events.push({ type: "hitstop", seconds: hit.hitstop });
  }
  target.hp -= dealt;
  if (world.mode === "choreographed") target.hp = Math.max(1, target.hp);
  else if (target.hp <= 0 && target.alive) {
    target.alive = false;
    playMove(target, world.moves.has("ko_fall") ? "ko_fall" : "knockdown", world.moves, { blend: 0 });
  }
  const fx = kind === "hit" ? hit.fx || [] : ["block_spark"];
  const sfx = kind === "hit" ? hit.sfx : kind === "blocked" ? "block" : "parry";
  events.push({ type: "hit", kind, beatId: src.beatId, attacker: attacker.id, target: target.id, move: src.moveName, part: hit.part, damage: dealt, point, fx, shake: kind === "hit" ? hit.shake : null, sfx });
  events.push({ type: "anchor", beatId: src.beatId, anchor: "hit", actor: attacker.id, move: src.moveName });
  return events;
}
