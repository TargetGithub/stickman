// Shapes for the silent-movie props (catalog/models/silent_movie.json): a bowler hat's round crown and curled
// brim, and a walking stick's hooked handle. Unit sizes, centred on the origin like every catalog shape.
// geometry.js registers them by name (SILENT_SHAPES). Browser and Node; no randomness.

import * as THREE from "three";

const V2 = (x, y) => new THREE.Vector2(x, y);

/** A body of revolution from [radius, y] points, centred. */
const lathe = (pts, segments = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), segments).center();

/**
 * A bowler hat's crown: 1 wide and 1 tall, straight-ish sides swelling a little, then a round dome, closed on top
 * and at the bottom (it sits on a brim).
 */
export function bowlerCrown() {
  const pts = [[0.001, 0], [0.46, 0], [0.48, 0.25], [0.5, 0.45]];
  for (let i = 1; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2);
    pts.push([0.5 * Math.cos(a), 0.45 + 0.55 * Math.sin(a)]);
  }
  pts[pts.length - 1][0] = 0.001;
  return lathe(pts);
}

/** A bowler hat's brim: a flat ring 1 across with a rolled lip all round, as a closed profile (about 0.2 tall). */
export function bowlerBrim() {
  const pts = [[0.3, 0.03], [0.3, 0], [0.42, 0], [0.47, 0.03], [0.5, 0.1], [0.5, 0.17], [0.475, 0.2], [0.455, 0.15], [0.43, 0.08], [0.39, 0.05], [0.3, 0.03]];
  return lathe(pts);
}

/** A walking stick's hook: half a ring (radius 0.5, tube 0.1) over the top, its two ends level at y = 0. */
export function crook() {
  return new THREE.TorusGeometry(0.5, 0.1, 16, 48, Math.PI);
}

/** Shapes this module adds, by catalog name. */
export const SILENT_SHAPES = {
  bowler_crown: bowlerCrown,
  bowler_brim: bowlerBrim,
  crook,
};
