// Move runtime: keys, root motion, events, hit windows, chaining.
// Milestone: M1. Spec: section 8. Interfaces: docs/ARCHITECTURE.md section 4.

/** Validate and normalize move data; derive reach (spec 8.1). */
export function prepareCatalog(rawMoves, poses) {
  throw new Error("not implemented: prepareCatalog");
}

/** Begin a move on a character with speed, params, target, outcome, blend. */
export function startMove(char, def, opts) {
  throw new Error("not implemented: startMove");
}

/** Advance the current move; returns pose, root delta, open windows, events. */
export function stepMove(char, dt, ctx) {
  throw new Error("not implemented: stepMove");
}

/** Root offset {dx, dy} at normalized time t. */
export function rootOffsetAt(def, t, params) {
  throw new Error("not implemented: rootOffsetAt");
}
