// Camera moves computed from the scene: `shot` frames objects (from their approximate boxes, bounds.js) so
// nothing is cropped at 16:9 with the camera's fov, and `orbit` arcs round a point starting from wherever the
// camera is. Both only add camera segments, so they mix with `camera`: a later segment takes over from the
// value the camera has when it starts. Pure: no three.js, no clocks.

import { unionBounds } from "./bounds.js";
import { padBox, shotBounds } from "./bounds_teach.js";

const DEG = Math.PI / 180;
export const ASPECT = 16 / 9;
/** Share of the frame the targets fill (width or height, whichever is tighter). */
export const FRAMING = { wide: 0.64, medium: 0.78, close: 0.9 };
const LIFT = 0.06; // targets sit this share of the half-frame above the centre (subtitles live at the bottom)

const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const round = (v) => v.map((x) => Math.round(x * 1e4) / 1e4);

/** Camera elevation (degrees) for flat shot targets. */
export const FLAT_HEIGHT = 35;

/**
 * Where to put the camera to frame a box.
 * @param {{ min:number[], max:number[] }} box  world box
 * @param {{ framing?: "wide"|"medium"|"close", yaw?: number, height?: number, fov?: number, aspect?: number }} o
 *   yaw: degrees round the box (0 = from the front, +z; 90 = from the right, +x); height: elevation in degrees
 * @returns {{ position:number[], lookAt:number[], distance:number }}
 */
export function frameBox(box, { framing = "medium", yaw = 0, height = 8, fov = 40, aspect = ASPECT } = {}) {
  const fill = FRAMING[framing] ?? FRAMING.medium;
  const c = box.min.map((x, i) => (x + box.max[i]) / 2);
  const [y, e] = [yaw * DEG, Math.max(-30, Math.min(75, height)) * DEG];
  const dir = [Math.sin(y) * Math.cos(e), Math.sin(e), Math.cos(y) * Math.cos(e)]; // from the centre to the camera
  const right = [Math.cos(y), 0, -Math.sin(y)];
  const up = [-Math.sin(e) * Math.sin(y), Math.cos(e), -Math.sin(e) * Math.cos(y)];
  const tanV = Math.tan((fov * DEG) / 2);
  const tanH = tanV * aspect;
  const fv = fill * (1 - LIFT); // a little room above and below for the lift
  let dist = 0.8;
  for (const cx of [box.min[0], box.max[0]]) {
    for (const cy of [box.min[1], box.max[1]]) {
      for (const cz of [box.min[2], box.max[2]]) {
        const q = sub([cx, cy, cz], c);
        const along = dot(q, dir);
        dist = Math.max(dist, along + Math.abs(dot(q, right)) / (tanH * fill), along + Math.abs(dot(q, up)) / (tanV * fv));
      }
    }
  }
  const shift = LIFT * fill * dist * tanV; // move the view down so the targets sit a little high
  const lookAt = c.map((x, i) => x - up[i] * shift);
  const position = lookAt.map((x, i) => x + dir[i] * dist);
  if (position[1] < 0.25) position[1] = 0.25; // never under the floor
  return { position: round(position), lookAt: round(lookAt), distance: Math.round(dist * 1e4) / 1e4 };
}

/**
 * The camera position on an orbit: `from` turned round `around` by k × degrees (anticlockwise seen from above,
 * so positive degrees move the camera to its right), with its radius and height above `around` blending to
 * `radius` / `height` when they are given.
 */
export function orbitPoint(from, around, k, { degrees, radius, height }) {
  const rel = sub(from, around);
  const r0 = Math.hypot(rel[0], rel[2]);
  const a = Math.atan2(rel[0], rel[2]) + degrees * DEG * k;
  const r = radius == null ? r0 : r0 + (radius - r0) * k;
  const h = height == null ? rel[1] : rel[1] + (height - rel[1]) * k;
  return [around[0] + r * Math.sin(a), around[1] + h, around[2] + r * Math.cos(a)];
}

/**
 * Add shot and orbit to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, V }} k  director internals
 */
export function installCameraMoves(d, { catalog, tl, obj, now, V, objects }) {
  Object.assign(d, {
    /** Frame one or more objects (wide, medium or close) from a direction, easing there over dur (0 = a cut). */
    shot({ at: t = 0, target, framing = "medium", yaw = 0, height, dur = 1.5, ease = "sineInOut", pad = 0, fit } = {}) {
      const ids = Array.isArray(target) ? target : [target];
      if (!ids.length) throw new Error("shot needs a target");
      // Frame where the targets are when the move ends (they may still be walking into place).
      const end = t + dur;
      // Children (words on cards) and teaching-kit labels count; pad grows the box about its centre.
      const list = [...objects.values()];
      const box = padBox(unionBounds(ids.map((id) => shotBounds(obj(id), catalog, now, (p) => obj(p), end, list, fit === "exact"))), pad);
      // Flat targets (water, a mat, lily pads, a table top) seen from the usual 8° are a sliver in a field of floor:
      // unless the script sets height, look down at 35° when the real box is much lower than it is wide or deep.
      if (height == null) {
        const real = unionBounds(ids.map((id) => shotBounds(obj(id), catalog, now, (p) => obj(p), end, list, true)));
        const [w, h, dpt] = real.min.map((x, i) => real.max[i] - x);
        // Lying flat: low compared with its width or depth, and deep (an upright card or sign is low but thin).
        height = h < 0.3 * Math.max(w, dpt) && dpt > 2 * h ? FLAT_HEIGHT : 8;
      }
      // framing "cover" (a hook's push-in): close on a small cover, medium on a big one (a curtain, a wall) so the
      // camera does not end up nose to nose with it (#85).
      if (framing === "cover") {
        const real = unionBounds(ids.map((id) => shotBounds(obj(id), catalog, now, (p) => obj(p), end, list, true)));
        framing = Math.max(real.max[0] - real.min[0], real.max[1] - real.min[1]) > 1.6 ? "medium" : "close";
      }
      const f = frameBox(box, { framing, yaw, height, fov: now("camera", "fov", t) ?? 40 });
      tl.tween("camera", "position", { start: t, dur, to: f.position, ease });
      tl.tween("camera", "lookAt", { start: t, dur, to: f.lookAt, ease });
      return d;
    },

    /** Arc the camera round a point by `degrees`, starting from where it is; it turns to look at the point. */
    orbit({ at: t = 0, around, degrees = 90, dur = 4, radius, height, ease = "sineInOut" } = {}) {
      const c = V(around);
      const o = { degrees, radius, height };
      tl.tween("camera", "position", { start: t, dur, to: c, ease, curve: (from, k) => orbitPoint(from, c, k, o) });
      tl.tween("camera", "lookAt", { start: t, dur: Math.min(dur, 1.2), to: c, ease: "sineInOut" });
      return d;
    },
  });
}
