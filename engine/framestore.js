// Frame store (spec 15.3, STORY_SPEC 5.4): packed per-frame records, random access.
// Milestone: M5; segments added in S1. The store is a list of segments in video order:
//   - a scene segment stores one record per frame for the characters present in that scene;
//   - a hold segment (transition or card between scenes) stores no character data: its frames are
//     drawn from the neighbouring scene frames (ADR-016).
// A v1 script is one scene segment. Particles are not stored (ADR-003); overlays come from the event
// log (ADR-012).

import { packJoints } from "./skeleton.js";

export const MOUTHS = ["neutral", "shout", "grin"];
// 26 joint floats + facing, mouth index, hp, airborne, prop index (-1 none), prop angle, alpha,
// face index (-1: no face, the v1 look; S2)
export const CHAR_STRIDE = 34;
const CAM_STRIDE = 5; // x, y, zoom, shakeX, shakeY

function sceneSegment(store, chars, info, estFrames) {
  const cap = Math.max(16, estFrames);
  return {
    kind: "scene",
    start: store.length,
    scene: info.scene ?? 0,
    chars: chars.map((c) => ({ id: c.id, color: c.color, scale: c.scale, maxHp: c.maxHp })),
    capacity: cap,
    times: new Float64Array(cap * 2), // storyT, fxT
    cam: new Float32Array(cap * CAM_STRIDE),
    body: new Float32Array(cap * chars.length * CHAR_STRIDE),
    items: [], // sparse: local frame → [{ name, x, y, angle, flying }]
  };
}

/**
 * @param {Array<{ id, color, scale, maxHp }>|null} chars  characters of the first scene, in actor order
 *   (null: start empty and call startScene for each scene)
 * @param {number} estFrames  initial capacity of the first scene (grows by doubling)
 * @param {string[]} propNames  prop keys, for the per-character held-prop index
 * @param {string[]} faceNames  face names, for the per-character face index (story scripts)
 */
export function createStore(chars, estFrames = 600, propNames = [], faceNames = []) {
  const store = { propNames, faceNames, segments: [], length: 0, last: 0 };
  if (chars) store.segments.push(sceneSegment(store, chars, { scene: 0 }, estFrames));
  return store;
}

/** Begin a new scene segment at the next frame. info: { scene } */
export function startScene(store, chars, info = {}, estFrames = 600) {
  store.segments.push(sceneSegment(store, chars, info, estFrames));
}

/**
 * Add `frames` hold frames (a transition or card between scenes).
 * info: { type, ...transition fields, scene: index of the next scene or -1, storyT, fxT }
 */
export function addHold(store, frames, info) {
  if (frames <= 0) return;
  store.segments.push({ kind: "hold", start: store.length, frames, info });
  store.length += frames;
}

const current = (store) => store.segments[store.segments.length - 1];

function grow(seg) {
  const cap = seg.capacity * 2;
  const copy = (arr, Type, stride) => {
    const next = new Type(cap * stride);
    next.set(arr);
    return next;
  };
  seg.times = copy(seg.times, Float64Array, 2);
  seg.cam = copy(seg.cam, Float32Array, CAM_STRIDE);
  seg.body = copy(seg.body, Float32Array, seg.chars.length * CHAR_STRIDE);
  seg.capacity = cap;
}

/** Append the current world state as the next frame of the current scene. items: loose props this frame. */
export function writeFrame(store, actors, clock, cam, items = null) {
  const seg = current(store);
  if (!seg || seg.kind !== "scene") throw new Error("writeFrame: no scene segment (call startScene first)");
  const n = store.length - seg.start;
  if (n >= seg.capacity) grow(seg);
  seg.times[n * 2] = clock.storyT;
  seg.times[n * 2 + 1] = clock.fxT;
  const c = n * CAM_STRIDE;
  seg.cam[c] = cam.x;
  seg.cam[c + 1] = cam.y;
  seg.cam[c + 2] = cam.zoom;
  seg.cam[c + 3] = cam.shakeX;
  seg.cam[c + 4] = cam.shakeY;
  const base = n * seg.chars.length * CHAR_STRIDE;
  actors.forEach((a, i) => {
    const o = base + i * CHAR_STRIDE;
    packJoints(a.joints, seg.body, o);
    seg.body[o + 26] = a.facing;
    seg.body[o + 27] = Math.max(0, MOUTHS.indexOf(a.mouth));
    seg.body[o + 28] = a.hp;
    seg.body[o + 29] = a.airborne ? 1 : 0;
    seg.body[o + 30] = a.prop ? store.propNames.indexOf(a.prop.name) : -1;
    seg.body[o + 31] = a.propAngle || 0;
    seg.body[o + 32] = a.alpha ?? 1;
    seg.body[o + 33] = a.shownFace ? store.faceNames.indexOf(a.shownFace) : -1;
  });
  if (items && items.length) seg.items[n] = items;
  store.length++;
}

/** Index of the segment that holds frame n. */
export function segmentIndexAt(store, n) {
  const segs = store.segments;
  const end = (i) => (i + 1 < segs.length ? segs[i + 1].start : store.length);
  if (store.last < segs.length && n >= segs[store.last].start && n < end(store.last)) return store.last;
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid].start <= n) lo = mid;
    else hi = mid - 1;
  }
  store.last = lo;
  return lo;
}

/** Number of frames in segment i. */
export function segmentLength(store, i) {
  return (i + 1 < store.segments.length ? store.segments[i + 1].start : store.length) - store.segments[i].start;
}

function sceneAt(store, n) {
  const seg = store.segments[segmentIndexAt(store, n)];
  if (seg.kind !== "scene") throw new RangeError(`frame ${n} is a hold frame, not a scene frame`);
  return { seg, k: n - seg.start };
}

/** Packed joints of one character at frame n (zero-copy view). n must be a scene frame. */
export function jointsAt(store, n, charIndex) {
  const { seg, k } = sceneAt(store, n);
  const o = (k * seg.chars.length + charIndex) * CHAR_STRIDE;
  return seg.body.subarray(o, o + 26);
}

/** Story time of a scene frame (for story-rate checks). */
export function storyTimeAt(store, n) {
  const { seg, k } = sceneAt(store, n);
  return seg.times[k * 2];
}

/**
 * Frame n as a plain view.
 * Scene frames: { storyT, fxT, videoT, cam, chars[], items, scene, segment } (joints are zero-copy views).
 * Hold frames: { hold: info, u (0..1 through the hold), prevFrame, nextFrame (null at the end),
 *   storyT, fxT, videoT, scene, segment, chars: [], items: [] }.
 * @param {number} fps
 */
export function frameView(store, n, fps = 60) {
  if (n < 0 || n >= store.length) throw new RangeError(`frame ${n} is outside 0..${store.length - 1}`);
  const si = segmentIndexAt(store, n);
  const seg = store.segments[si];
  if (seg.kind === "hold") {
    const len = segmentLength(store, si);
    const next = seg.start + len;
    return {
      hold: seg.info,
      u: (n - seg.start + 0.5) / len,
      prevFrame: seg.start > 0 ? seg.start - 1 : null,
      nextFrame: next < store.length ? next : null,
      storyT: seg.info.storyT ?? 0,
      fxT: seg.info.fxT ?? 0,
      videoT: n / fps,
      scene: seg.info.scene,
      segment: si,
      chars: [],
      items: [],
    };
  }
  const k = n - seg.start;
  const c = k * CAM_STRIDE;
  return {
    storyT: seg.times[k * 2],
    fxT: seg.times[k * 2 + 1],
    videoT: n / fps,
    scene: seg.scene,
    segment: si,
    cam: { x: seg.cam[c], y: seg.cam[c + 1], zoom: seg.cam[c + 2], shakeX: seg.cam[c + 3], shakeY: seg.cam[c + 4] },
    chars: seg.chars.map((ch, i) => {
      const o = (k * seg.chars.length + i) * CHAR_STRIDE;
      return {
        ...ch,
        joints: seg.body.subarray(o, o + 26),
        facing: seg.body[o + 26],
        mouth: MOUTHS[seg.body[o + 27]],
        hp: seg.body[o + 28],
        airborne: seg.body[o + 29] === 1,
        alpha: seg.body[o + 32],
        face: seg.body[o + 33] >= 0 ? store.faceNames[seg.body[o + 33]] : null,
        prop: seg.body[o + 30] >= 0 ? { name: store.propNames[seg.body[o + 30]], angle: seg.body[o + 31] } : null,
      };
    }),
    items: seg.items[k] || [],
  };
}

/** Bytes used by the stored frames (for budget reporting). */
export function storeBytes(store) {
  return store.segments.reduce((sum, seg, i) => (seg.kind === "scene"
    ? sum + segmentLength(store, i) * (16 + CAM_STRIDE * 4 + seg.chars.length * CHAR_STRIDE * 4)
    : sum), 0);
}
