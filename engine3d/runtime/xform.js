// Small rigid-transform maths for the director (no three.js): Euler angles in degrees with three.js's XYZ
// order, 3 × 3 matrices as row-major arrays of 9, and affine transforms { m, p } (x' = m·x + p). Used by
// reparent (keep a world position when the parent changes) and point (aim a part). Pure.

const DEG = Math.PI / 180;

/** Rotation matrix of Euler angles [x, y, z] in degrees, order XYZ (R = Rx · Ry · Rz, as three.js). */
export function eulerMat(e) {
  const [a, b, c] = e.map((v) => v * DEG);
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [
    cb * cc, -cb * sc, sb,
    ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb,
    sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb,
  ];
}

/** Euler angles [x, y, z] in degrees (XYZ) of a rotation matrix (three.js setFromRotationMatrix). */
export function matEuler(m) {
  const y = Math.asin(Math.max(-1, Math.min(1, m[2])));
  const [x, z] = Math.abs(m[2]) < 0.9999999 ? [Math.atan2(-m[5], m[8]), Math.atan2(-m[1], m[0])] : [Math.atan2(m[7], m[4]), 0];
  return [x, y, z].map((v) => round(v / DEG));
}

const round = (v) => Math.round(v * 1e6) / 1e6;

export const mul = (a, b) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
export const apply = (m, v) => [0, 1, 2].map((r) => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2]);
export const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const scaleMat = (s) => [s[0], 0, 0, 0, s[1], 0, 0, 0, s[2]];
const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};

/** The shortest rotation taking unit direction a to b. */
export function rotBetween(a, b) {
  [a, b] = [norm(a), norm(b)];
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (c < -0.999999) {
    // Opposite: half a turn about any axis square to a.
    const ax = norm(Math.abs(a[0]) < 0.9 ? [0, -a[2], a[1]] : [-a[1], a[0], 0]);
    return [0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => 2 * ax[r] * ax[k] - (r === k ? 1 : 0)));
  }
  const k = 1 / (1 + c);
  const vx = [0, -v[2], v[1], v[2], 0, -v[0], -v[1], v[0], 0];
  const vx2 = mul(vx, vx);
  return [1, 0, 0, 0, 1, 0, 0, 0, 1].map((x, i) => x + vx[i] + vx2[i] * k);
}

/** An affine transform from position, Euler degrees and scale (three.js: T · R · S). */
export const compose = (p, e, s) => ({ m: mul(eulerMat(e), scaleMat(s)), p: [...p] });
/** a then b in a's frame: (a · b). */
export const chain = (a, b) => ({ m: mul(a.m, b.m), p: apply(a.m, b.p).map((x, i) => x + a.p[i]) });
export const point = (a, v) => apply(a.m, v).map((x, i) => x + a.p[i]);

/** Inverse of an affine transform (its matrix must be invertible). */
export function invert(a) {
  const m = a.m;
  const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const inv = [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ].map((x) => x / det);
  return { m: inv, p: apply(inv, a.p).map((x) => -x) };
}

/**
 * Split an affine transform into position, Euler degrees and scale (no shear: a parent scaled unevenly and
 * turned gives an approximation).
 */
export function decompose(a) {
  const m = a.m;
  const s = [0, 1, 2].map((c) => Math.hypot(m[c], m[3 + c], m[6 + c]));
  const r = m.map((x, i) => x / (s[i % 3] || 1));
  return { position: a.p.map(round), rotation: matEuler(r), scale: s.map(round) };
}
