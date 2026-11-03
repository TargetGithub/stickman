// `look`: a critter turns its head (Robo his head bone) toward an object or a point, eased, and keeps looking
// there until the next look. The angle is worked out when the look is recorded, from where both are when the
// turn ends, and kept to what a neck can do. Timeline prop "look" = [yaw, pitch] in degrees, relative to the
// body: yaw + turns the face toward +x (for a body facing +z), pitch + looks down.
// Pure: no three.js, no clocks.

import { focusPoint } from "./bounds.js";

/** How far a head turns, in degrees: [yaw, pitch down, pitch up]. */
export const LOOK_LIMITS = { critter: [70, 30, 25], character: [60, 25, 20] };

const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Head angles to look from `eye` at `point` for a body turned `bodyYaw` degrees (about y; 0 faces +z).
 * @returns {[number, number]} [yaw, pitch] in degrees, clamped to the kind's limits
 */
export function lookAngles(eye, point, bodyYaw, kind = "critter") {
  const [dx, dy, dz] = [point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]];
  const flat = Math.hypot(dx, dz);
  const [maxYaw, down, up] = LOOK_LIMITS[kind] ?? LOOK_LIMITS.critter;
  const yaw = flat < 1e-6 ? 0 : wrap((Math.atan2(dx, dz) * 180) / Math.PI - bodyYaw);
  const pitch = (Math.atan2(-dy, Math.max(flat, 1e-6)) * 180) / Math.PI;
  return [Math.round(clamp(yaw, -maxYaw, maxYaw) * 100) / 100, Math.round(clamp(pitch, -up, down) * 100) / 100];
}

/**
 * Add look to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, V }} k  director internals
 */
export function installLook(d, { catalog, tl, obj, now }) {
  const based = new Set();
  Object.assign(d, {
    /** at: an object id or [x, y, z]; "ahead" (or null) looks straight ahead again. */
    look(id, { at: t = 0, to, dur = 0.6, ease = "quadInOut" } = {}) {
      const o = obj(id);
      if (o.kind !== "critter" && o.kind !== "character") throw new Error(`look needs a critter or a character, "${id}" is a ${o.kind}`);
      const end = t + dur;
      let want = [0, 0];
      if (to != null && to !== "ahead") {
        const point = Array.isArray(to) ? to : focusPoint(obj(to), catalog, now, (p) => obj(p), end);
        const eye = focusPoint(o, catalog, now, (p) => obj(p), end);
        want = lookAngles(eye, point, (now(id, "rotation", end) ?? [0, 0, 0])[1], o.kind);
      }
      if (!based.has(id)) {
        based.add(id);
        tl.base(id, "look", [0, 0]);
      }
      tl.tween(id, "look", { start: t, dur, to: want, ease });
      return d;
    },
  });
}
