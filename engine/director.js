// Beat scheduling, anchors, approach insertion, queue/interrupt.
// Milestone: M3. Spec: section 11. Interfaces: docs/ARCHITECTURE.md section 4.

/** Static schedule: ids, references, absolute beats sorted. */
export function resolveSchedule(script, catalog) {
  throw new Error("not implemented: resolveSchedule");
}

/** Fire beats due at the current story time. */
export function stepDirector(director, world, clock) {
  throw new Error("not implemented: stepDirector");
}

/** Record an anchor and release beats waiting on it. */
export function onAnchor(director, beatId, anchor, storyT) {
  throw new Error("not implemented: onAnchor");
}
