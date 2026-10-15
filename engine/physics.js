// Bodies, gravity, friction, bounds, separation, projectiles.
// Milestone: M2. Spec: section 9. Interfaces: docs/ARCHITECTURE.md section 4.

/** New body at rest on the ground. */
export function createBody(x, y, scale) {
  throw new Error("not implemented: createBody");
}

/** Integrate one story tick; returns land/wall events. */
export function stepBody(body, dt, opts) {
  throw new Error("not implemented: stepBody");
}

/** Push overlapping grounded characters apart. */
export function separate(chars, minGapBase) {
  throw new Error("not implemented: separate");
}

/** Advance projectiles; returns hit/expire events. */
export function stepProjectiles(list, dt, ctx) {
  throw new Error("not implemented: stepProjectiles");
}
