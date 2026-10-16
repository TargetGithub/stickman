// Body integration: gravity, landing, friction, stage bounds, wall bounce, separation, projectiles.
// Milestone: M2. Spec: section 9. Bodies are actors (engine/actor.js): x, vx, vy, airY, airborne, launched, spinRot.

import { PHYSICS, STAGE } from "./config.js";

/**
 * Integrate one story tick for an actor's body.
 * @param {{ stageWidth?:number, margin?:number, wallBounce?:boolean }} opts
 * @returns {Array<object>} events: land, wall
 */
export function stepBody(actor, dt, opts = {}) {
  const events = [];
  if (dt <= 0) return events;
  const stageWidth = opts.stageWidth ?? STAGE.width;
  const margin = opts.margin ?? STAGE.margin;

  if (actor.airborne) {
    actor.vy += PHYSICS.gravity * dt;
    actor.airY += actor.vy * dt;
    actor.x += actor.vx * dt;
    if (actor.launched) actor.spinRot += actor.spin * dt;
    if (actor.airY >= 0 && actor.vy > 0) {
      const speed = actor.vy;
      actor.airY = 0;
      actor.vy = 0;
      actor.airborne = false;
      events.push({ type: "land", actor: actor.id, speed, launched: actor.launched });
      actor.launched = false;
    }
  } else if (actor.vx !== 0) {
    actor.x += actor.vx * dt;
    actor.vx *= PHYSICS.groundFriction ** (dt * 60);
    if (Math.abs(actor.vx) < 1) actor.vx = 0;
  }

  const lo = margin;
  const hi = stageWidth - margin;
  if (actor.x < lo || actor.x > hi) {
    const wall = actor.x < lo ? lo : hi;
    actor.x = wall;
    if (actor.launched && (opts.wallBounce ?? true)) {
      actor.vx = -actor.vx * PHYSICS.wallRestitution;
      events.push({ type: "wall", actor: actor.id, x: wall });
    } else actor.vx = 0;
  }
  return events;
}

/** Launch an actor with an initial velocity (spec 9.2). spin in deg/s; negative spins backward. */
export function launch(actor, vx, vy, spin) {
  actor.vx = vx;
  actor.vy = vy;
  actor.airborne = true;
  actor.launched = true;
  actor.spin = spin;
}

/**
 * Push apart grounded actors closer than minGap * max(scale) (spec 9.1 rule 6), symmetrically.
 * skip(a, b) lets the caller exempt pairs (passThrough moves, choreographed attacks between them).
 * @returns {Array<[object, number]>} per moved actor, the x shift applied
 */
export function separate(actors, skip = () => false) {
  const shifts = new Map();
  for (let i = 0; i < actors.length; i++) {
    for (let j = i + 1; j < actors.length; j++) {
      const a = actors[i];
      const b = actors[j];
      if (!a.alive || !b.alive || a.airborne || b.airborne || skip(a, b)) continue;
      const gap = PHYSICS.minGap * Math.max(a.scale, b.scale);
      const d = b.x - a.x;
      if (Math.abs(d) >= gap) continue;
      const dir = d === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(d);
      const push = (gap - Math.abs(d)) / 2;
      a.x -= dir * push;
      b.x += dir * push;
      shifts.set(a, (shifts.get(a) || 0) - dir * push);
      shifts.set(b, (shifts.get(b) || 0) + dir * push);
    }
  }
  return [...shifts.entries()];
}

/**
 * Advance projectiles { x, y, vx, vy, gravity, radius, life, ... }. Hit tests live in combat.js.
 * @returns {Array<object>} expire events; expired projectiles are removed from the list in place
 */
export function stepProjectiles(list, dt) {
  const events = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.prevX = p.x;
    p.prevY = p.y;
    p.vy += (p.gravity ?? 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      events.push({ type: "projectileExpire", projectile: p });
      list.splice(i, 1);
    }
  }
  return events;
}
