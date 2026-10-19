// Tracks and keyframes (ENGINE_V3_SPEC 6, ADR-026). Milestone: V3.5.
// A track keys one property of one node over time: { target: "text.title.y", scene?, keys: [{ t, v, ease? }] }.
// A key's ease shapes the segment arriving at it (the spec's example: { t: 2, v: 1.6, ease: "inOutCubic" }).
// Easing: the engine's table, "step", or a cubic-bezier as "cubic-bezier(x1, y1, x2, y2)" or [x1, y1, x2, y2].
// Times are video seconds from the start of the video, or from the start of `scene` when it is given.
// Values are numbers or #rrggbb colours (interpolated per channel). Pure: no clocks, no I/O.

import { easings, clamp, lerp } from "./math.js";

/** What a track may target: node kinds and their keyable properties. */
export const TRACK_PROPS = {
  layer: ["opacity", "x", "y", "scale", "rotation", "reveal"],
  text: ["opacity", "x", "y", "size", "scale", "rotation", "color", "reveal"],
  shape: ["opacity", "x", "y", "w", "h", "r", "scale", "rotation", "fill", "stroke", "lineWidth", "reveal"],
  lens: ["dolly", "truck", "crane", "tilt", "roll", "push", "handheld", "dof", "focusZ", "vignette", "letterbox"],
  post: ["exposure", "contrast", "saturation", "bloom", "grain", "chroma", "vignette", "letterbox", "gamma"],
};
const COLOR_PROPS = new Set(["color", "fill", "stroke"]);
const BEZIER = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;

/**
 * Parse a track target. "text.title.y" → { kind: "text", id: "title", prop: "y" }; "lens.dolly" and
 * "post.bloom" have no id. Null when the target is not one TRACK_PROPS allows.
 */
export function parseTarget(target) {
  if (typeof target !== "string") return null;
  const parts = target.split(".");
  const kind = parts[0];
  if (!TRACK_PROPS[kind]) return null;
  const global = kind === "lens" || kind === "post";
  if (parts.length !== (global ? 2 : 3)) return null;
  const prop = parts[parts.length - 1];
  if (!TRACK_PROPS[kind].includes(prop)) return null;
  return { kind, id: global ? null : parts[1], prop };
}

/** A cubic-bezier easing (CSS semantics: P0 = (0, 0), P3 = (1, 1)); x1 and x2 are clamped to [0, 1]. */
export function cubicBezier(x1, y1, x2, y2) {
  x1 = clamp(x1, 0, 1);
  x2 = clamp(x2, 0, 1);
  const c = (a, b, u) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  const dc = (a, b, u) => 3 * a * (1 - u) * (1 - u) + 6 * (b - a) * u * (1 - u) + 3 * (1 - b) * u * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const d = dc(x1, x2, u);
      if (Math.abs(d) < 1e-6) break;
      u = clamp(u - (c(x1, x2, u) - x) / d, 0, 1);
    }
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20 && Math.abs(c(x1, x2, u) - x) > 1e-7; i++) {
      // Bisection fallback when Newton stalls.
      if (c(x1, x2, u) < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return c(y1, y2, u);
  };
}

/** The easing function for a key's ease (null when it names no easing). */
export function easingOf(ease) {
  if (ease === undefined || ease === null) return easings.linear;
  if (ease === "step") return (u) => (u >= 1 ? 1 : 0);
  if (Array.isArray(ease)) return ease.length === 4 && ease.every(Number.isFinite) ? cubicBezier(...ease) : null;
  if (typeof ease === "string") {
    if (easings[ease]) return easings[ease];
    const m = ease.match(BEZIER);
    if (m) return cubicBezier(+m[1], +m[2], +m[3], +m[4]);
  }
  return null;
}

/** Interpolate two #rrggbb colours. */
function mixColor(a, b, u) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  return `#${A.map((v, i) => clamp(Math.round(lerp(v, B[i], u)), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

/** A track's value at local time t (seconds on the track's own base): before the first key, the first value. */
export function sampleTrack(keys, t) {
  if (!keys.length) return undefined;
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = (easingOf(b.ease) || easings.linear)((t - a.t) / (b.t - a.t));
  return typeof a.v === "string" ? mixColor(a.v, b.v, u) : lerp(a.v, b.v, u);
}

/**
 * Compile the tracks of a script: parsed targets, keys sorted by time (stable), and each scene's start.
 * @param {object[]} tracks  script `tracks`
 * @param {Map<string, number>} sceneStarts  scene id → video seconds
 */
export function compileTracks(tracks, sceneStarts) {
  return (tracks || []).map((tr) => ({
    ...parseTarget(tr.target),
    target: tr.target,
    t0: tr.scene ? sceneStarts.get(tr.scene) ?? 0 : 0,
    scene: tr.scene ?? null,
    keys: [...tr.keys].map((k, i) => [k, i]).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map(([k]) => k),
  })).filter((tr) => tr.kind);
}

/**
 * The keyed values at video time t, as { "text.title": { y: 300 }, lens: { dolly: 200 }, post: { bloom: 0.4 } }.
 * Later tracks on the same property win. A track bound to a scene only applies inside that scene's span.
 * @param {(scene: string) => boolean} inScene  whether time t is inside the named scene (null: no check)
 */
export function trackValuesAt(compiled, t, inScene = null) {
  const out = {};
  for (const tr of compiled) {
    if (tr.scene && inScene && !inScene(tr.scene)) continue;
    const key = tr.id ? `${tr.kind}.${tr.id}` : tr.kind;
    (out[key] ??= {})[tr.prop] = sampleTrack(tr.keys, t - tr.t0);
  }
  return out;
}

/** Whether a key's value suits a property (colours for colour props, numbers otherwise). */
export function valueFits(prop, v) {
  return COLOR_PROPS.has(prop) ? typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) : typeof v === "number" && Number.isFinite(v);
}
