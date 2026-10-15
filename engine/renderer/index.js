// Frame drawing orchestration and draw order.
// Milestone: M0/M4. Spec: section 14.1. Interfaces: docs/ARCHITECTURE.md section 4.

/** Renderer with cached background layers. */
export function createRenderer(ctxFactory, themes, fonts) {
  throw new Error("not implemented: createRenderer");
}

/** Draw frame n. Pure with respect to (store, n). */
export function renderFrame(renderer, ctx, store, n) {
  throw new Error("not implemented: renderFrame");
}
