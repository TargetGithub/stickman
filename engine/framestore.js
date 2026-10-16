// Frame store (spec 15.3): one packed record per video frame, random access, ~300 bytes per frame.
// Milestone: M5. Particles are not stored (analytic emit log, ADR-003); overlays come from the
// event log (ADR-012). Only per-frame state lives here: clocks, camera, character joints and status.

import { packJoints } from "./skeleton.js";

export const MOUTHS = ["neutral", "shout", "grin"];
const CHAR_STRIDE = 33; // 26 joint floats + facing, mouth index, hp, airborne, prop index (-1 none), prop angle, alpha
const CAM_STRIDE = 5; // x, y, zoom, shakeX, shakeY

/**
 * @param {Array<{ id, color, scale, maxHp }>} chars  constant per-character data, in actor order
 * @param {number} estFrames  initial capacity (grows by doubling)
 * @param {string[]} propNames  prop keys, for the per-character held-prop index
 */
export function createStore(chars, estFrames = 600, propNames = []) {
  const cap = Math.max(16, estFrames);
  return {
    chars: chars.map((c) => ({ id: c.id, color: c.color, scale: c.scale, maxHp: c.maxHp })),
    propNames,
    items: [], // sparse: frame → [{ name, x, y, angle, flying }] (props lying on the floor or thrown)
    length: 0,
    capacity: cap,
    times: new Float64Array(cap * 2), // storyT, fxT
    cam: new Float32Array(cap * CAM_STRIDE),
    body: new Float32Array(cap * chars.length * CHAR_STRIDE),
  };
}

function grow(store) {
  const cap = store.capacity * 2;
  const copy = (arr, Type, stride) => {
    const next = new Type(cap * stride);
    next.set(arr);
    return next;
  };
  store.times = copy(store.times, Float64Array, 2);
  store.cam = copy(store.cam, Float32Array, CAM_STRIDE);
  store.body = copy(store.body, Float32Array, store.chars.length * CHAR_STRIDE);
  store.capacity = cap;
}

/** Append the current world state as the next frame. items: loose props this frame. */
export function writeFrame(store, actors, clock, cam, items = null) {
  if (store.length >= store.capacity) grow(store);
  const n = store.length;
  store.times[n * 2] = clock.storyT;
  store.times[n * 2 + 1] = clock.fxT;
  const c = n * CAM_STRIDE;
  store.cam[c] = cam.x;
  store.cam[c + 1] = cam.y;
  store.cam[c + 2] = cam.zoom;
  store.cam[c + 3] = cam.shakeX;
  store.cam[c + 4] = cam.shakeY;
  const base = n * store.chars.length * CHAR_STRIDE;
  actors.forEach((a, i) => {
    const o = base + i * CHAR_STRIDE;
    packJoints(a.joints, store.body, o);
    store.body[o + 26] = a.facing;
    store.body[o + 27] = Math.max(0, MOUTHS.indexOf(a.mouth));
    store.body[o + 28] = a.hp;
    store.body[o + 29] = a.airborne ? 1 : 0;
    store.body[o + 30] = a.prop ? store.propNames.indexOf(a.prop.name) : -1;
    store.body[o + 31] = a.propAngle || 0;
    store.body[o + 32] = a.alpha ?? 1;
  });
  if (items && items.length) store.items[n] = items;
  store.length++;
}

/** Packed joints of one character at frame n (zero-copy view). */
export function jointsAt(store, n, charIndex) {
  const o = (n * store.chars.length + charIndex) * CHAR_STRIDE;
  return store.body.subarray(o, o + 26);
}

/**
 * Frame n as a plain view: { storyT, fxT, videoT, cam, chars[] } (joints are zero-copy views).
 * @param {number} fps
 */
export function frameView(store, n, fps = 60) {
  if (n < 0 || n >= store.length) throw new RangeError(`frame ${n} is outside 0..${store.length - 1}`);
  const c = n * CAM_STRIDE;
  return {
    storyT: store.times[n * 2],
    fxT: store.times[n * 2 + 1],
    videoT: n / fps,
    cam: { x: store.cam[c], y: store.cam[c + 1], zoom: store.cam[c + 2], shakeX: store.cam[c + 3], shakeY: store.cam[c + 4] },
    chars: store.chars.map((k, i) => {
      const o = (n * store.chars.length + i) * CHAR_STRIDE;
      return {
        ...k,
        joints: store.body.subarray(o, o + 26),
        facing: store.body[o + 26],
        mouth: MOUTHS[store.body[o + 27]],
        hp: store.body[o + 28],
        airborne: store.body[o + 29] === 1,
        alpha: store.body[o + 32],
        prop: store.body[o + 30] >= 0 ? { name: store.propNames[store.body[o + 30]], angle: store.body[o + 31] } : null,
      };
    }),
    items: store.items[n] || [],
  };
}

/** Bytes used by the stored frames (for budget reporting). */
export function storeBytes(store) {
  return store.length * (16 + CAM_STRIDE * 4 + store.chars.length * CHAR_STRIDE * 4);
}
