// The v3 camera lens (ENGINE_V3_SPEC 5.3, ADR-025). Milestone: V3.4.
// The stored camera (camera.js: x, y, zoom, shake per frame) keeps doing framing. A v3 scene adds a lens on
// top, evaluated at render time from the event log, so frames stay random access and the frame store is
// unchanged: channels for dolly, truck, crane, tilt, roll, push (a zoom multiplier), handheld sway, focus and
// depth of field, vignette and letterbox, and travel (road.js: the camera and the characters move through
// depth). Camera keys and `set_camera` beats blend channels over `dur`; named moves (catalog cameraMoves) are
// keyframe curves added to the channels; close-up shots pull focus by themselves. Pure: no I/O, no clocks;
// handheld noise comes from a deriveRng stream.

import { clamp, lerp, easings, valueNoise1D } from "./math.js";

/** Channels and their resting values. */
export const LENS_DEFAULTS = Object.freeze({ dolly: 0, truck: 0, crane: 0, tilt: 0, roll: 0, push: 1, handheld: 0, dof: 0, focusZ: null, focus: null, vignette: 0.18, letterbox: 0, travel: 0 });
/** Channels a key, a set_camera beat or a move may set (numbers). */
export const LENS_CHANNELS = ["dolly", "truck", "crane", "tilt", "roll", "push", "handheld", "dof", "vignette", "letterbox", "travel"];
const MOVE_CHANNELS = ["dolly", "truck", "crane", "tilt", "roll", "push", "handheld"];
const AUTO_FOCUS = { close_up: 0.65, over_shoulder: 0.45, two_shot: 0.3 }; // dof a story shot pulls by itself
const AUTO_FADE = 0.35; // s in and out
const HANDHELD = { x: 16, y: 11, roll: 0.7, speed: [0.85, 1.1, 0.6] }; // px, px, degrees at handheld 1
const BLUR_MAX = 9; // px at 1080p for dof 1 at RANGE from the focus
const BLUR_RANGE = 1400; // depth px from the focus to full blur
const BLUR_STEP = 1.5; // px: blur levels are quantized so neighbouring nodes share a pass

const isLensKey = (k) => LENS_CHANNELS.some((c) => typeof k[c] === "number") || k.move || k.focus !== undefined || k.focusZ !== undefined;

/**
 * The lens changes of one scene, in video order: camera events whose key sets lens fields, and set_camera
 * world events. Each: { t0, dur, ease, set: { channel: value }, move?, focus?, focusZ? }.
 * @param {object[]} events  the scene's events (type camera with key; type world do set_camera with params)
 */
export function lensChanges(events) {
  const out = [];
  for (const e of events) {
    const src = e.type === "camera" ? e.key : e.type === "world" && e.do === "set_camera" ? e.params : null;
    if (!src || !isLensKey(src)) continue;
    const set = {};
    for (const c of LENS_CHANNELS) if (typeof src[c] === "number") set[c] = src[c];
    out.push({ t0: e.videoT, dur: src.dur ?? 0, ease: src.ease, set, move: src.move ?? null, focus: src.focus, focusZ: src.focusZ });
  }
  return out;
}

/** A move curve's channel values at u (0..1): keys { t, channel..., ease } with the leaving ease of each key. */
export function sampleMove(move, u) {
  const keys = move.keys;
  const out = {};
  for (const c of MOVE_CHANNELS) {
    const ks = keys.filter((k) => typeof k[c] === "number");
    if (!ks.length) continue;
    if (u <= ks[0].t) { out[c] = ks[0][c]; continue; }
    const last = ks[ks.length - 1];
    if (u >= last.t) { out[c] = last[c]; continue; }
    let i = 0;
    while (ks[i + 1].t < u) i++;
    const a = ks[i];
    const b = ks[i + 1];
    const ease = easings[b.ease] || easings.linear;
    out[c] = lerp(a[c], b[c], ease((u - a.t) / (b.t - a.t)));
  }
  return out;
}

/**
 * The lens at video time t.
 * @param {object[]} changes  lensChanges()
 * @param {object} moves  catalog cameraMoves
 * @param {object} base  the scene's lens defaults (LENS_DEFAULTS with the scene `lens` block)
 * @returns {object}  every channel, plus focus (a character id or null) and focusZ (a number or null)
 */
export function lensAt(changes, t, moves, base = LENS_DEFAULTS) {
  const L = { ...LENS_DEFAULTS, ...base };
  for (const ch of changes) {
    if (ch.t0 > t) break;
    const move = ch.move ? moves?.[ch.move] : null;
    const dur = ch.dur > 0 ? ch.dur : move?.dur ?? 0;
    const raw = dur > 0 ? clamp((t - ch.t0) / dur, 0, 1) : 1;
    const u = (easings[ch.ease] || easings.inOutCubic)(raw);
    for (const [c, v] of Object.entries(ch.set)) L[c] = lerp(L[c], v, u);
    if (ch.focus !== undefined) { L.focus = ch.focus; L.focusZ = null; }
    if (ch.focusZ !== undefined) { L.focusZ = ch.focusZ; L.focus = null; }
    if (!move) continue;
    if (move.absolute) {
      // Targets blended from the current values with the last key's ease.
      const end = move.keys[move.keys.length - 1];
      const e = (easings[end.ease] || easings.linear)(raw);
      for (const c of MOVE_CHANNELS) if (typeof end[c] === "number") L[c] = lerp(L[c], end[c], e);
    } else {
      // Offsets: the curve is added to the channel (push multiplies), so a move that starts high (crane_down)
      // starts high, and one that ends at 0 returns to the lens it began from.
      for (const [c, v] of Object.entries(sampleMove(move, raw))) L[c] = c === "push" ? L[c] * v : L[c] + v;
    }
  }
  return L;
}

/**
 * Spans in which a story shot pulls focus by itself (v3 scenes): close-ups, over-the-shoulder and two-shots.
 * A shot lasts its dur, or until the next shot or camera key.
 * @returns {Array<{ t0, t1, target, targets, dof }>}
 */
export function autoFocusSpans(events) {
  const out = [];
  const keys = events.filter((e) => (e.type === "world" && e.do === "shot") || e.type === "camera");
  keys.forEach((e, i) => {
    if (e.type !== "world") return;
    const dof = AUTO_FOCUS[e.params.mode];
    const next = keys[i + 1]?.videoT ?? Infinity;
    const t1 = Math.min(next, e.params.dur !== undefined ? e.videoT + e.params.dur : Infinity);
    if (dof) out.push({ t0: e.videoT, t1, target: e.params.target ?? null, targets: e.params.targets ?? null, dof });
  });
  return out;
}

/** The auto focus at t: { dof, ids } faded in and out, or null. */
export function autoFocusAt(spans, t) {
  for (const s of spans) {
    if (t < s.t0 || t > s.t1 + AUTO_FADE) continue;
    const k = Math.min(1, (t - s.t0) / AUTO_FADE, s.t1 === Infinity ? 1 : (s.t1 + AUTO_FADE - t) / AUTO_FADE);
    return { dof: s.dof * clamp(k, 0, 1), ids: s.target ? [s.target] : s.targets || [] };
  }
  return null;
}

/** Handheld sway generators for one scene (from its own rng stream). */
export function createHandheld(rng) {
  return { x: valueNoise1D(rng), y: valueNoise1D(rng), roll: valueNoise1D(rng) };
}

/** Handheld offsets at video time t for an amount 0..1: { x, y (world px), roll (degrees) }. */
export function handheldAt(h, amount, t) {
  if (!h || amount <= 0) return { x: 0, y: 0, roll: 0 };
  const [sx, sy, sr] = HANDHELD.speed;
  return { x: amount * HANDHELD.x * h.x(t * sx), y: amount * HANDHELD.y * h.y(t * sy + 17), roll: amount * HANDHELD.roll * h.roll(t * sr + 31) };
}

/**
 * The camera a v3 frame is drawn with: the stored camera moved by the lens.
 * @param {{ x, y, zoom, shakeX, shakeY }} cam  the stored camera state
 * @param {object} L  lensAt()
 * @param {{ focal, horizon }} depth  the scene's depth settings; groundY: the stage floor (world y)
 * @returns {{ cam, bgZoom, depth, tiltPx, roll }}  cam for the world, the background's zoom, the depth settings
 *   with the dolly folded into the focal length, the screen shift for tilt (px at 1080p) and roll (radians)
 */
export function lensCamera(cam, L, depth, hh = { x: 0, y: 0, roll: 0 }, groundY = 880) {
  const focal = depth.focal;
  const dolly = clamp(L.dolly, -focal * 0.8, focal * 0.6);
  const mul = focal / (focal - dolly); // the stage line grows as the camera dollies in
  const zoom = cam.zoom * L.push * mul;
  // Dolly and push keep the ground line where the framing put it (the camera moves level, it does not zoom
  // about the frame centre), so feet stay planted and heads are not cropped.
  const y = groundY - ((groundY - cam.y) * cam.zoom) / zoom;
  return {
    cam: { ...cam, x: cam.x + L.truck + hh.x, y: y + L.crane + hh.y, zoom },
    // Far layers barely change in a dolly; they still follow a zoom (push).
    bgZoom: cam.zoom * L.push * (1 + (mul - 1) * 0.25),
    depth: { ...depth, focal: focal - dolly, horizon: clamp(depth.horizon - L.crane * 0.5, 0, 800) },
    tiltPx: Math.tan((L.tilt * Math.PI) / 180) * 1200,
    roll: ((L.roll + hh.roll) * Math.PI) / 180,
  };
}

/** Depth-of-field blur (px at 1080p, quantized) of a node at z when the focus is at zf. */
export function blurFor(z, zf, dof) {
  if (dof <= 0.01) return 0;
  const px = dof * BLUR_MAX * Math.min(1, Math.abs(z - zf) / BLUR_RANGE);
  const q = Math.round(px / BLUR_STEP) * BLUR_STEP;
  return q < BLUR_STEP ? 0 : q;
}

/** The scale that keeps a W x H frame rotated by roll radians covering the whole frame. */
export function coverScale(W, H, roll) {
  const c = Math.abs(Math.cos(roll));
  const s = Math.abs(Math.sin(roll));
  return Math.max(c + (H / W) * s, c + (W / H) * s);
}

/** Letterbox bar height (px) for an amount 0..1: 1 crops the frame to 2.39:1 (never more than a quarter of H). */
export function letterboxBar(W, H, amount) {
  if (amount <= 0.001) return 0;
  return Math.min(H / 4, Math.max(0, (H - W / 2.39) / 2) * amount + (W < H ? H * 0.06 * amount : 0));
}
