// FX presets, analytic particle emit log, shake.
// Milestone: M4. Spec: section 13. Interfaces: docs/ARCHITECTURE.md section 4.

/** FX state with an empty emit log. */
export function createFx(rng, presets) {
  throw new Error("not implemented: createFx");
}

/** Run a preset; append particle records to the emit log. */
export function emitFx(fx, name, at, params, fxT) {
  throw new Error("not implemented: emitFx");
}

/** Advance continuous emitters (dust_run, aura, snow). */
export function stepFx(fx, fxDt, world) {
  throw new Error("not implemented: stepFx");
}

/** Evaluate live particles at fx time; returns count. */
export function liveParticles(emitLog, fxT, out) {
  throw new Error("not implemented: liveParticles");
}

/** Current camera shake offset. */
export function shakeOffset(fx, fxT) {
  throw new Error("not implemented: shakeOffset");
}
