// Camera modes, framing, smoothing, zoom punch.
// Milestone: M4. Spec: section 11.5. Interfaces: docs/ARCHITECTURE.md section 4.

/** Camera for a format. */
export function createCamera(format) {
  throw new Error("not implemented: createCamera");
}

/** Apply a resolved camera key. */
export function setCameraKey(cam, key) {
  throw new Error("not implemented: setCameraKey");
}

/** Advance smoothing and framing one video frame. */
export function stepCamera(cam, videoDt, world) {
  throw new Error("not implemented: stepCamera");
}

/** Current { x, y, zoom }. */
export function cameraState(cam) {
  throw new Error("not implemented: cameraState");
}
