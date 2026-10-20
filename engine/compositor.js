// The compositor (ENGINE_V3_SPEC 6, ADR-026). Milestone: V3.5.
// A v3 script may add motion-graphics blocks next to its story: `layers`, `text`, `shapes`, `tracks` and
// `post`. compileMotion() prepares them once; composeAt() resolves them at a video time into an ordered
// list of layers, each with its transform, opacity, blend, clip (in/out wipes), mask and items (text and
// shapes with their final properties after tracks and in/out animations). Pure: the renderer draws it.

import { clamp, easings } from "./math.js";
import { compileTracks, trackValuesAt } from "./timeline.js";

export const BLENDS = { normal: "source-over", multiply: "multiply", screen: "screen", add: "lighter", overlay: "overlay" };
export const ANIMS = ["fade", "pop", "slide_up", "slide_down", "slide_left", "slide_right", "wipe_left", "wipe_right", "wipe_up", "wipe_down", "iris", "typewriter"];
export const DEFAULT_LAYER = "_over";
const SLIDE = 140; // px an element slides in from
export const POST_DEFAULTS = Object.freeze({ exposure: 0, contrast: 1, saturation: 1, gamma: 1, bloom: 0, grain: 0, chroma: 0, vignette: 0, letterbox: 0 });

/** Does the script carry motion-graphics blocks? */
export const hasMotion = (story) => !!story?.v3 && ["layers", "text", "shapes", "tracks", "post"].some((k) => story[k] && (Array.isArray(story[k]) ? story[k].length : true))
  || !!story?.scenes?.some((s) => s.post);

/**
 * @param {object} story  the normalized v3 story (top-level blocks, scenes with ids and `post`)
 * @param {Array<{ id, t0, t1 }>} spans  each scene's span in video seconds
 */
export function compileMotion(story, spans) {
  const span = new Map(spans.map((s) => [s.id, s]));
  const starts = new Map(spans.map((s) => [s.id, s.t0]));
  const layers = [{ id: DEFAULT_LAYER, place: "over", space: "screen" }, ...(story.layers || [])];
  const item = (kind) => (e, i) => ({ ...e, kind, order: i, layer: e.layer ?? DEFAULT_LAYER });
  // A shape used as a mask is drawn only when it is also placed on a layer of its own.
  const masks = new Set((story.layers || []).filter((l) => l.mask).map((l) => l.mask.shape));
  return {
    span,
    layers: layers.map((l, i) => ({ place: "over", space: "screen", ...l, order: i })).sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || a.order - b.order),
    items: [...(story.shapes || []).map(item("shape")).filter((e, i) => !(masks.has(e.id) && !story.shapes[i].layer)), ...(story.text || []).map(item("text"))],
    tracks: compileTracks(story.tracks, starts),
    post: { ...POST_DEFAULTS, ...(story.post || {}) },
    scenePost: new Map((story.scenes || []).filter((s) => s.post).map((s) => [s.id, s.post])),
  };
}

/** The scene id whose span holds t (null in a hold frame or outside every scene). */
export function sceneAt(m, t) {
  for (const s of m.span.values()) if (t >= s.t0 && t < s.t1) return s.id;
  return null;
}

/**
 * Visibility of an element at video time t: { on, pIn, pOut, local } where pIn/pOut run 0 to 1 over the
 * in and out animations and local is the time on the element's own base (its scene, or the video).
 */
export function lifeOf(m, e, t) {
  const sc = e.scene ? m.span.get(e.scene) : null;
  if (e.scene && (!sc || t < sc.t0 || t >= sc.t1)) return { on: false };
  const local = t - (sc?.t0 ?? 0);
  const from = e.from ?? 0;
  const to = e.to ?? Infinity;
  if (local < from || local >= to) return { on: false };
  const pIn = e.in ? clamp((local - from) / (e.in.dur ?? 0.4), 0, 1) : 1;
  const pOut = e.out && to !== Infinity ? clamp((to - local) / (e.out.dur ?? 0.4), 0, 1) : 1;
  return { on: true, pIn, pOut, local };
}

/** What an in/out animation at progress p (0 hidden, 1 settled) does: opacity, scale, offset, clip, reveal. */
export function animState(anim, p) {
  const out = { opacity: 1, scale: 1, dx: 0, dy: 0, clip: null, reveal: 1 };
  if (!anim || p >= 1) return out;
  const e = easings.outCubic(p);
  switch (anim.type) {
    case "fade": out.opacity = p; break;
    case "pop": out.scale = Math.max(0.01, easings.outBack(p)); out.opacity = Math.min(1, p * 3); break;
    case "slide_up": out.dy = (1 - e) * SLIDE; out.opacity = Math.min(1, p * 2); break;
    case "slide_down": out.dy = -(1 - e) * SLIDE; out.opacity = Math.min(1, p * 2); break;
    case "slide_left": out.dx = (1 - e) * SLIDE; out.opacity = Math.min(1, p * 2); break;
    case "slide_right": out.dx = -(1 - e) * SLIDE; out.opacity = Math.min(1, p * 2); break;
    case "wipe_left": case "wipe_right": case "wipe_up": case "wipe_down": out.clip = { wipe: anim.type.slice(5), u: e }; break;
    case "iris": out.clip = { iris: true, u: e }; break;
    case "typewriter": out.reveal = p; break;
    default:
  }
  return out;
}

/** Combine the in and out animation states (each multiplies or adds). */
function combined(life, e) {
  const a = animState(e.in, life.pIn);
  const b = animState(e.out, life.pOut);
  return { opacity: a.opacity * b.opacity, scale: a.scale * b.scale, dx: a.dx + b.dx, dy: a.dy + b.dy, clip: a.clip || b.clip, reveal: Math.min(a.reveal, b.reveal) };
}

/** An element's properties with its tracks applied. */
const keyed = (e, values, key) => ({ ...e, ...(values[key] || {}) });

/**
 * The composition at video time t.
 * @param {object} m  compileMotion()
 * @param {(parent: { char, joint }, space: string) => {x,y}|null} anchorOf  where a character joint is (renderer)
 * @returns {{ back: object[], over: object[], values: object }}  layers in draw order; values: the keyed values
 *   (lens and post tracks for the renderer)
 */
export function composeAt(m, t, anchorOf = () => null) {
  const values = trackValuesAt(m.tracks, t, (id) => { const s = m.span.get(id); return !!s && t >= s.t0 && t < s.t1; });
  const byId = new Map();
  const layers = [];
  for (const l0 of m.layers) {
    const life = lifeOf(m, l0, t);
    if (!life.on) continue;
    const l = keyed(l0, values, `layer.${l0.id}`);
    const a = combined(life, l);
    const reveal = Math.min(a.reveal, l.reveal ?? 1);
    const out = {
      id: l.id, place: l.place, space: l.space, blend: BLENDS[l.blend] || BLENDS.normal, mask: l.mask ?? null,
      opacity: clamp((l.opacity ?? 1) * a.opacity, 0, 1),
      x: (l.x ?? 0) + a.dx, y: (l.y ?? 0) + a.dy, scale: (l.scale ?? 1) * a.scale, rotation: l.rotation ?? 0,
      clip: a.clip || (reveal < 1 ? { wipe: "left", u: reveal } : null), items: [],
    };
    byId.set(l.id, out);
    layers.push(out);
  }
  // Parents: a layer follows a character joint (in its own space) or another layer (offset, scale, opacity).
  for (const l of layers) {
    const p = m.layers.find((x) => x.id === l.id).parent;
    if (!p) continue;
    if (p.char) {
      const at = anchorOf(p, l.space);
      if (!at) { l.opacity = 0; continue; }
      l.x += at.x;
      l.y += at.y;
    } else if (p.layer && byId.has(p.layer)) {
      const q = byId.get(p.layer);
      l.x += q.x;
      l.y += q.y;
      l.scale *= q.scale;
      l.rotation += q.rotation;
      l.opacity *= q.opacity;
    }
  }
  for (const e0 of m.items) {
    const layer = byId.get(e0.layer);
    if (!layer || layer.opacity <= 0.001) continue;
    const life = lifeOf(m, e0, t);
    if (!life.on) continue;
    const e = keyed(e0, values, `${e0.kind}.${e0.id}`);
    const a = combined(life, e);
    const opacity = clamp((e.opacity ?? 1) * a.opacity, 0, 1);
    if (opacity <= 0.001) continue;
    layer.items.push({ ...e, opacity, x: (e.x ?? 0) + a.dx, y: (e.y ?? 0) + a.dy, scale: (e.scale ?? 1) * a.scale, clip: a.clip,
      reveal: clamp(Math.min(a.reveal, e.reveal ?? 1), 0, 1), local: life.local });
  }
  for (const l of layers) l.items.sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || (a.kind === b.kind ? a.order - b.order : a.kind === "shape" ? -1 : 1));
  const shown = layers.filter((l) => l.items.length && l.opacity > 0.001);
  return { back: shown.filter((l) => l.place === "back"), over: shown.filter((l) => l.place !== "back"), values };
}

/** The keyed track values at video time t (scene-bound tracks only inside their scene). */
export function motionValuesAt(m, t) {
  return trackValuesAt(m.tracks, t, (id) => { const s = m.span.get(id); return !!s && t >= s.t0 && t < s.t1; });
}

/** The post settings at t: the script's, the current scene's on top, then post tracks. */
export function postAt(m, t, values) {
  const scene = sceneAt(m, t);
  return { ...m.post, ...(scene ? m.scenePost.get(scene) || {} : {}), ...(values.post || {}) };
}

/** Lens channels keyed by tracks override the lens (lens.dolly ...). */
export function withLensTracks(L, values) {
  return values.lens ? { ...L, ...values.lens } : L;
}

