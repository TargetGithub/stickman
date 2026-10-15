// Per-frame snapshot storage and accessors.
// Milestone: M5. Spec: section 15.3. Interfaces: docs/ARCHITECTURE.md section 4.

/** Allocate a growable store. */
export function createStore(charCount, estFrames) {
  throw new Error("not implemented: createStore");
}

/** Append the current world state as a frame. */
export function writeFrame(store, world, clock) {
  throw new Error("not implemented: writeFrame");
}

/** Zero-copy view of frame n. */
export function frameView(store, n) {
  throw new Error("not implemented: frameView");
}

/** Packed joints of one character at frame n. */
export function jointsAt(store, n, charIndex) {
  throw new Error("not implemented: jointsAt");
}
