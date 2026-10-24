// Travelling in depth (series/baaaana/PLAN.md task 10a): the lens `travel` channel moves the camera, and the
// characters with it, through the depth lane. Set pieces keep their world z, so as `travel` grows (toward the
// camera) the world recedes behind the walkers toward the vanishing point, and as it falls (away from the
// camera) the world comes toward them, grows and slides out of the sides of the frame. A v3 scene's `road`
// is drawn on the ground in perspective with dashes that stream past, and `roadside` repeats set pieces along
// it forever. Pure functions of the scene settings, the travel and the seed.

import { hash32 } from "./math.js";
import { projectScale } from "./depth.js";

/** Pieces closer than this share of the focal length have passed the camera and are not drawn. */
export const PASS = 0.85;
export const ROAD = Object.freeze({ width: 520, color: "#b9b2a3", edge: "#8f8778", line: "#fff7e0", dash: 160, gap: 240 });
export const ROADSIDE = Object.freeze({ every: 800, offset: 520, jitter: 0.3, reach: 9000 }); // reach: draw distance, px of depth

/** A scene's road settings with defaults (null: no road). */
export function roadOf(scene, stageWidth) {
  const r = scene?.road;
  if (!r) return null;
  return { x: r.x ?? stageWidth / 2, width: r.width ?? ROAD.width, color: r.color ?? ROAD.color, edge: r.edge ?? ROAD.edge, line: r.line === null ? null : r.line ?? ROAD.line, ground: r.ground ?? null };
}

/** Where a world node at depth z appears relative to the travelling camera; null once it has passed or is too far. */
export function relativeZ(z, travel, depth) {
  const rz = z - travel;
  if (rz > depth.focal * PASS || rz < depth.far) return null;
  return rz;
}

/**
 * The repeating roadside pieces whose relative depth is on screen at this travel: one per `every` px of world
 * depth on each side (or the one `side`), the object chosen and nudged by a hash of its slot, so the same slot
 * always shows the same thing. Ids are `roadside_<side>_<slot>`.
 * @param {{ objects:string[], every?, offset?, side? }} spec  the scene's `roadside`
 * @param {{ x:number }} road  the road (its centre x); without a road the stage centre
 */
export function roadsidePieces(spec, road, travel, depth, seed, centreX) {
  if (!spec?.objects?.length) return [];
  const every = spec.every ?? ROADSIDE.every;
  const offset = spec.offset ?? (road ? road.width / 2 + 160 : ROADSIDE.offset);
  const x0 = road?.x ?? centreX;
  const sides = spec.side === "left" ? [-1] : spec.side === "right" ? [1] : [-1, 1];
  // World depths z = -k * every (any whole k: the road runs both ways) whose relative z lies in [far, focal * PASS].
  const kMin = Math.ceil(-(depth.focal * PASS + travel) / every);
  const kMax = Math.floor(-(Math.max(depth.far, -(spec.reach ?? ROADSIDE.reach)) + travel) / every);
  const out = [];
  for (let k = kMin; k <= kMax; k++) {
    for (const side of sides) {
      const h = hash32(`roadside:${seed}:${side}:${k}`);
      const object = spec.objects[h % spec.objects.length];
      const nudge = (((h >>> 8) % 1000) / 1000 - 0.5) * ROADSIDE.jitter;
      out.push({ id: `roadside_${side < 0 ? "l" : "r"}_${k}`, object, x: x0 + side * offset * (1 + nudge), z: -k * every + nudge * every * 0.5, generated: true });
    }
  }
  return out;
}

/** A world ground point (x, z) on screen, in world units, for a camera about cam.x (as depth.js projects). */
export function groundPoint(x, z, cam, groundY, depth) {
  const s = projectScale(z, depth.focal);
  return { x: cam.x + (x - cam.x) * s, y: groundY - (1 - s) * depth.horizon };
}

/**
 * The road to draw: its outline (a quad from the far end to just past the camera) and the centre dashes at their
 * world depths, all in relative depth, so they stream as `travel` changes.
 * @returns {{ quad: {x,y}[], dashes: {x,y}[][], horizonY:number }}
 */
export function roadShapes(road, travel, cam, groundY, depth) {
  const zNear = depth.focal * PASS;
  const zFar = depth.far;
  const half = road.width / 2;
  const P = (x, z) => groundPoint(x, z, cam, groundY, depth);
  const quad = [P(road.x - half, zFar), P(road.x + half, zFar), P(road.x + half, zNear), P(road.x - half, zNear)];
  const dashes = [];
  if (road.line) {
    const period = ROAD.dash + ROAD.gap;
    const w = road.width * 0.035;
    // Dash k covers world z in [-k * period - dash, -k * period]; draw those whose span is on screen.
    const kMin = Math.floor(-(zNear + travel) / period) - 1;
    const kMax = Math.ceil(-(zFar + travel) / period) + 1;
    for (let k = kMin; k <= kMax; k++) {
      const z1 = Math.min(zNear, -k * period - travel);
      const z0 = Math.max(zFar, -k * period - ROAD.dash - travel);
      if (z1 <= z0) continue;
      dashes.push([P(road.x - w, z0), P(road.x + w, z0), P(road.x + w, z1), P(road.x - w, z1)]);
    }
  }
  return { quad, dashes, horizonY: groundY - depth.horizon };
}
