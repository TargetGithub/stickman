// Hair kept off the face in turned views (ENGINE_V3_SPEC 5.4, V3.9). Hair masses are authored in profile,
// where the back of the head is behind the face; a turned head draws a mirrored copy too (mirrorAxes), which
// brings that back hair round to the face side, and from the front the copy itself reaches the far cheek. So
// in turned views (face showing) every point of a hair mass below the hairline is pushed up onto it. The
// hairline is flat at the brow line across the face and slopes down at the temples toward the rim of the
// head, so the mass keeps its ink outline, ends in a fringe above the eyes and tapers to sideburns. Side
// views (no wrap) and the back view are not touched. Pure.

import { FACE_SHIFT } from "../turnaround.js";

/** In head radii: the brow line, the half width of the flat part round the face centre, and the temple slope. */
export const BROW = 0.55;
export const FACE_HALF = 0.5;
export const TEMPLE_SLOPE = 2.2;
const MID = 0.31; // the face centre in profile, forward of the head centre (eyes at 0.12 and 0.5)
const STEP = 0.08; // radii: edges are split this fine so a long edge cannot cut across the box

/**
 * The hairline in the head's real face axes ({ mid, half, brow, slope }), or null when nothing is guarded.
 * @param {{ wrap?: number, back?: boolean }} ax  hair axes (wrap: 0 at the side, 1 from the front or back)
 */
export function faceBox(ax) {
  const w = ax.wrap || 0;
  if (w <= 0.05 || ax.back) return null;
  // The face slides toward the middle of the head by FACE_SHIFT * |cos yaw| = FACE_SHIFT * wrap.
  const mid = MID - FACE_SHIFT * w;
  return { mid, half: FACE_HALF, brow: BROW, slope: TEMPLE_SLOPE };
}

/** The hairline height (head radii, up) at a real forward position. */
export function hairlineAt(box, fr) {
  const d = Math.abs(fr - box.mid) - box.half;
  return d <= 0 ? box.brow : box.brow - d * box.slope;
}

/**
 * A closed hair outline kept above the hairline. Points are [forward, up] in head radii in the copy's own
 * axes; `s` maps the copy's forward to the real one (1 for the piece, -wrap for the mirrored copy).
 * @param {[number, number][]} pts @param {number} s @param {{ mid, half, brow, slope } | null} box
 * @returns {[number, number][]}
 */
export function guardOutline(pts, s, box) {
  if (!box) return pts;
  const out = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / STEP));
    for (let k = 0; k < n; k++) {
      const fa = p[0] + ((q[0] - p[0]) * k) / n;
      const ua = p[1] + ((q[1] - p[1]) * k) / n;
      out.push([fa, Math.max(ua, hairlineAt(box, fa * s))]);
    }
  });
  return out;
}
