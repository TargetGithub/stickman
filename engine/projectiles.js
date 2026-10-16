// Projectiles (spec 9.3): spawned by move events, flown by physics, hit-tested with swept circles,
// and resolved with the same choreographed outcomes as melee. Milestone: M7.

import { applyHit, inWindow } from "./hit_apply.js";
import { sweptHit, buildHurtboxes, aimCandidates } from "./combat.js";
import { BODY } from "./skeleton.js";

/** Aim height on the target for an outcome: chest for hits, clearly over the head for whiffs. */
function aimY(target, outcome, radius) {
  const head = target.joints.head;
  if (outcome === "whiff") return head.y - BODY.headR * target.scale - radius - 20 * target.scale;
  if (outcome === "dodged") return head.y - BODY.headR * target.scale; // passes over the ducked head and guard
  return aimCandidates(target.joints).find((c) => c.name === "upperTorso").point.y;
}

/**
 * Spawn from a move event { projectile: { kind, from, speed, radius, damage, life, knock, hitstop, fx, shake, sfx } }.
 * Flies straight toward the target's aim height so any size pairing lines up.
 */
export function spawnProjectile(world, actor, spec, events) {
  const m = actor.move;
  const s = actor.scale;
  const from = actor.joints[spec.from || "rHand"];
  const vx = actor.facing * (spec.speed ?? 1000) * s;
  const target = m.target ? world.byId.get(m.target) : null;
  let vy = 0;
  const radius = (spec.radius ?? 26) * s;
  // A jumping defender gets a flat shot to leap over; otherwise aim for the outcome's height.
  if (target?.joints && world.mode === "choreographed" && m.defense !== "jump") {
    const t = Math.abs(target.x - from.x) / Math.abs(vx);
    if (t > 0) vy = (aimY(target, m.outcome, radius) - from.y) / t;
  }
  world.projectiles.push({
    x: from.x, y: from.y, prevX: from.x, prevY: from.y, vx, vy, gravity: 0,
    radius, life: spec.life ?? 2, kind: spec.kind || "energy_ball", scale: s,
    owner: actor.id, target: m.target, outcome: m.outcome, facing: actor.facing,
    src: { params: m.params, beatId: m.beatId, moveName: m.def.name, facing: actor.facing, ranged: true },
    hit: { ...spec, part: "projectile" },
  });
  events.push({ type: "windowOpen", beatId: m.beatId, actor: actor.id, move: m.def.name, index: 0 });
}

/** Advance projectiles one story tick and resolve their hits. Returns events. */
export function stepWorldProjectiles(world, dt) {
  const events = [];
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const p = world.projectiles[i];
    p.prevX = p.x;
    p.prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    const owner = world.byId.get(p.owner);
    const choreo = world.mode === "choreographed";
    const targets = choreo ? [world.byId.get(p.target)].filter(Boolean) : world.actors.filter((a) => a.id !== p.owner && a.alive);
    let done = p.life <= 0 || p.x < -200 || p.x > world.stageWidth + 200;
    for (const target of targets) {
      if (done) break;
      if (choreo && (p.outcome === "whiff" || p.outcome === "dodged")) continue;
      const touched = sweptHit({ x: p.prevX, y: p.prevY }, p, p.radius, buildHurtboxes(target.joints, target.scale));
      const crossed = choreo && Math.sign(p.x - target.x) === p.facing;
      if (!touched && !crossed) continue;
      let kind = "hit";
      if (choreo) kind = p.outcome === "blocked" ? "blocked" : p.outcome === "parried" ? "parried" : "hit";
      else {
        if (inWindow(target.move, "invulnerable")) continue;
        const guard = inWindow(target.move, "guard");
        kind = guard === "parry" ? "parried" : guard ? "blocked" : "hit";
      }
      events.push(...applyHit(world, owner, target, p.hit, kind, { x: p.x, y: p.y }, p.src));
      done = true;
    }
    if (done) {
      events.push({ type: "projectileEnd", kind: p.kind, x: p.x, y: p.y });
      world.projectiles.splice(i, 1);
    }
  }
  return events;
}

/** Seconds until a projectile spawned by this move reaches the target (for defender timing). */
export function projectileArrival(actor, target, def, m) {
  const ev = def.events.find((e) => e.projectile);
  const spawnIn = ((ev.t - m.t) * m.duration) / m.speed;
  return spawnIn + Math.abs(target.x - actor.x) / ((ev.projectile.speed ?? 1000) * actor.scale);
}
