// Light rigs (ENGINE_V3_SPEC 5.2, ADR-024). Milestone: V3.3.
// A v3 scene has a light rig: a key light (direction, colour, strength), a fill, a rim, an ambient tint, the
// cast shadow look and fog by depth. It comes from the scene or location `light` (a preset name, or a
// preset with overrides), else from the time of day (catalog lights.byTime); `set_light` changes it over
// time. Pure functions of catalog data, the event log and the frame time; the renderer draws the result.

import { clamp, lerp } from "./math.js";

/** Which rig fields are tints ({ color, strength }) and which are numbers, for interpolation. */
const TINTS = ["key", "fill", "rim", "ambient"];
const RIM_WIDTH = 0.28; // of the limb width
export const SHADOW_BASE = 44; // px: the contact ellipse half-width at scale 1 (the v2 ellipse)

// ---------- colours ----------

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = (c) => `#${c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;

/** a mixed toward b by u (0..1). */
export function mixHex(a, b, u) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => lerp(v, B[i], u)));
}

/** "r, g, b" of a hex colour, for rgba() strings. */
export const rgbText = (hex) => hexToRgb(hex).join(",");

// ---------- the rig ----------

/**
 * The rig a scene starts with, or null for the flat (v2) look.
 * @param {{ lights?: { byTime, rigs } }} catalog
 * @param {object} scene  the scene (its `light`), @param {object|null} location (its `light`), @param {{ time }} look
 */
export function lightRigOf(catalog, scene, location, look) {
  const lights = catalog.lights;
  if (!lights) return null;
  const want = scene?.light ?? location?.light ?? lights.byTime[look?.time ?? "day"];
  return resolveRig(lights, want);
}

/** A `light` value (a preset name, or { preset?, ...overrides }) as a rig object, or null for flat. */
export function resolveRig(lights, want) {
  if (want === undefined || want === null) return null;
  const name = typeof want === "string" ? want : want.preset ?? "noon";
  const base = lights.rigs[name];
  if (!base || base.flat) return null;
  const { description, tags, ...rig } = base;
  const over = typeof want === "object" ? want : {};
  const out = { ...rig, name };
  for (const k of [...TINTS, "shadow", "fog"]) if (over[k]) out[k] = { ...rig[k], ...over[k] };
  return out;
}

/** Linear blend of two rigs (tints: colour and strength; shadow and fog: numbers; cast and name: b's past half). */
export function blendRigs(a, b, u) {
  if (!a) a = flatLike(b);
  if (!b) b = flatLike(a);
  const tint = (k) => ({ color: mixHex(a[k].color, b[k].color, u), strength: lerp(a[k].strength, b[k].strength, u) });
  return {
    name: u < 0.5 ? a.name : b.name,
    ...Object.fromEntries(TINTS.map((k) => [k, tint(k)])),
    key: { ...tint("key"), angle: lerp(a.key.angle, b.key.angle, u) },
    shadow: { alpha: lerp(a.shadow.alpha, b.shadow.alpha, u), length: lerp(a.shadow.length, b.shadow.length, u), cast: u < 0.5 ? a.shadow.cast : b.shadow.cast },
    fog: { color: mixHex(a.fog.color, b.fog.color, u), density: lerp(a.fog.density, b.fog.density, u) },
  };
}

/** A rig with the same colours as r but no visible effect, so a blend from or to flat fades cleanly. */
function flatLike(r) {
  return { ...r, name: "flat", key: { ...r.key, strength: 0 }, fill: { ...r.fill, strength: 0 }, rim: { ...r.rim, strength: 0 }, ambient: { ...r.ambient, strength: 0 }, shadow: { ...r.shadow, alpha: 0 }, fog: { ...r.fog, density: 0 } };
}

/**
 * The rig at video time t: the scene's rig, then every set_light event (preset and overrides) blended over its dur.
 * @param {object|null} rig0  the scene's starting rig
 * @param {object[]} events  set_light world events of the scene, in order ({ videoT, params })
 * @param {{ rigs }} lights  the catalog's lights
 */
export function lightAt(rig0, events, t, lights) {
  let rig = rig0;
  for (const e of events) {
    if (e.videoT > t) break;
    const { dur = 0, preset, angle, strength, fog } = e.params;
    // set_light params are flat (preset, angle, strength, fog); overrides apply to the current preset.
    const want = { ...(preset ? { preset } : rig ? { preset: rig.name } : {}) };
    if (angle !== undefined || strength !== undefined) want.key = { ...(angle !== undefined ? { angle } : {}), ...(strength !== undefined ? { strength } : {}) };
    if (fog !== undefined) want.fog = { density: fog };
    const next = Object.keys(want).length ? resolveRig(lights, want) : null;
    const u = dur > 0 ? clamp((t - e.videoT) / dur, 0, 1) : 1;
    rig = u >= 1 ? next : blendRigs(rig, next, u);
  }
  if (rig && rig.key.strength === 0 && rig.shadow.alpha === 0 && rig.fog.density === 0 && rig.ambient.strength === 0) return null;
  return rig;
}

// ---------- shading ----------

/** Unit vector toward the light in screen space (y down) for a key angle in degrees (0 right, 90 up, 180 left). */
export function lightDir(angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a), y: -Math.sin(a) };
}

/**
 * The tones a body colour takes under a rig: lit (toward the key), base, dark (the fill side), the rim colour
 * and alpha, and the light direction. Cartoon stepped: three flat tones, no gradients.
 */
export function shadeTones(hex, rig) {
  const lit = mixHex(mixHex(hex, rig.key.color, 0.35 * rig.key.strength), "#ffffff", 0.45 * rig.key.strength);
  const dark = mixHex(mixHex(hex, rig.fill.color, 0.6 * rig.fill.strength), "#000000", 0.3 * (rig.key.strength + rig.fill.strength));
  return { lit, base: hex, dark, rim: rig.rim.color, rimAlpha: rig.rim.strength, rimWidth: RIM_WIDTH, dir: lightDir(rig.key.angle) };
}

/**
 * The contact shadow under a character: the v2 ellipse stretched away from the light.
 * @param {number} height  the body's height in world px (feet to head top)
 * @returns {{ dx, rx, ry, alpha }}  offset of the ellipse centre from the feet, radii and alpha
 */
export function contactShadow(rig, scale, height) {
  const dir = lightDir(rig.key.angle);
  const len = rig.shadow.length * height * 0.5;
  const along = -dir.x * len; // the shadow falls away from the light
  return { dx: along * 0.5, rx: SHADOW_BASE * scale + Math.abs(along) * 0.5, ry: 8 * scale, alpha: rig.shadow.alpha };
}

/**
 * The transform of a cast shadow silhouette about the feet (x, groundY): `ground` lies the figure flat away
 * from the light; `wall` flattens it upright behind. Null when the rig casts none.
 * @returns {{ a, b, c, d, tx, ty, alpha }|null}  the 2x2 part of a transform about the feet, and the feet offset (px at scale 1)
 */
export function castShadow(rig) {
  if (!rig.shadow || rig.shadow.cast === "none" || rig.shadow.alpha <= 0) return null;
  const dir = lightDir(rig.key.angle);
  const alpha = rig.shadow.alpha * 0.8;
  // About the feet, points above the floor have y < 0, so a positive shear c moves the silhouette away from the light.
  // tx, ty: where the silhouette's feet sit relative to the character's (px at scale 1): a wall shadow stands beside and
  // a little above the figure, where the wall behind it is.
  if (rig.shadow.cast === "wall") return { a: 0.92, b: 0, c: dir.x * 0.35, d: 0.9, tx: -dir.x * 110 - 40 * Math.sign(dir.x || 1), ty: -26, alpha: alpha * 0.7 };
  const sy = -clamp(rig.shadow.length, 0.1, 1.2) * 0.45; // flipped: the silhouette lies on the floor in front of the feet
  return { a: 1, b: 0, c: dir.x * 0.9, d: sy, tx: 0, ty: 0, alpha };
}

// ---------- fog and tint ----------

/** The share of the fog colour over a node at z (0 at the stage line and nearer; density at the far end). */
export function fogAt(rig, z, depth) {
  if (!rig?.fog || rig.fog.density <= 0 || z >= 0) return 0;
  return rig.fog.density * clamp(z / depth.far, 0, 1);
}

/**
 * Veils to draw between depth-sorted nodes so that everything behind node k ends up fogged by fog(z_k):
 * before node k draw a veil of alpha (F(prev) - F(k)) / (1 - F(k)), where F(prev) is the fog of the node
 * before it (the background counts as the far end).
 * @param {number[]} fogs  fog share per node, far to near (non-increasing)
 * @returns {number[]} veil alpha to draw before each node
 */
export function fogVeils(fogs, background) {
  const out = [];
  let prev = background;
  for (const f of fogs) {
    const fk = Math.min(f, prev);
    out.push(fk >= 1 ? 0 : clamp((prev - fk) / (1 - fk), 0, 1));
    prev = fk;
  }
  return out;
}

/** The ambient tint over the background: null when the rig has none. */
export function ambientTint(rig) {
  return rig?.ambient && rig.ambient.strength > 0.002 ? { color: rig.ambient.color, alpha: rig.ambient.strength } : null;
}
