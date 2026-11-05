// Toon face shapes drawn as thin layers on a round face (DumpyDoo): an anime eye (a cool dome-shaped white, shaded
// under the lid, sitting on
// a straight lower lash line, a tall iris toward the nose with a dark rim, a navy pupil that turns blue below, a
// tan crescent and two shines, a thin upper lid line and a thick lower one with an outer tail), a thin arched
// brow, and a wide grin with its own curved teeth and a tongue clipped to the mouth. All closed-form.
// Eye layers share one frame: width 1, inner corner (toward the nose) at +x, the lower lash line at y = -0.3;
// each layer sits at its own small z above a face curving away like a ball (EYE_BEND), so they hug it.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** How fast the face falls away from the eye's centre (z drop = EYE_BEND * (x² + y²), in eye widths). */
export const EYE_BEND = 0.18;
/** The eye's lower lash line (y) and the top of its white (y), in eye widths. */
export const EYE_LINE = { bottom: -0.3, top: 0.45 };

const TAU = Math.PI * 2;
const V2 = (x, y) => new THREE.Vector2(x, y);
const bend = (z, x, y) => z - EYE_BEND * (x * x + y * y);

/** The white's outline: a dome leaning toward the nose, on a straight bottom. t: 0 inner corner .. pi outer. */
export function eyeDome(t) {
  return [0.5 * Math.cos(t) + 0.1 * Math.sin(t), EYE_LINE.bottom + 0.75 * Math.sin(t)];
}

/** The white's left and right edge at height y (eye frame), or null above the dome / below the lash line. */
export function domeSpan(y) {
  const s = (y - EYE_LINE.bottom) / 0.75;
  if (s < 0 || s > 1) return null;
  const c = Math.sqrt(1 - s * s);
  return [-0.5 * c + 0.1 * s, 0.5 * c + 0.1 * s];
}

/**
 * A copy of an eye layer that can slide (a moving iris): move(dx, dy) shifts it by dx, dy eye widths in the
 * layer's own frame and squeezes whatever would leave the white back to its edge, so the iris rolls into the
 * corner instead of sliding onto the face. Each point keeps its height above the face's curve.
 * @returns {{ geometry: THREE.BufferGeometry, move: (dx: number, dy: number) => void }}
 */
export function movableLayer(source) {
  const geometry = source.clone();
  const p = geometry.attributes.position;
  const base = Float32Array.from(p.array);
  const margin = 0.015;
  return {
    geometry,
    move(dx, dy) {
      for (let i = 0; i < p.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1];
        const lift = base[i * 3 + 2] + EYE_BEND * (bx * bx + by * by);
        const y = Math.min(EYE_LINE.top - 0.03, Math.max(EYE_LINE.bottom + 0.005, by + dy));
        const span = domeSpan(y) ?? [0, 0];
        const x = Math.min(span[1] - margin, Math.max(span[0] + margin, bx + dx));
        p.setXYZ(i, x, y, bend(lift, x, y));
      }
      p.needsUpdate = true;
    },
  };
}

/**
 * A filled blob with interior rings (so it can follow the face's curve): `edge(u)` gives the outline point for
 * u in 0..1 going counterclockwise, and the fill fans out from `c`. Each point is lifted to layer z.
 */
function blob(edge, c, z, n = 64, rings = 6) {
  const pos = [c[0], c[1], bend(z, ...c)];
  for (let r = 1; r <= rings; r++) {
    for (let i = 0; i < n; i++) {
      const [ex, ey] = edge(i / n);
      const x = c[0] + (ex - c[0]) * (r / rings), y = c[1] + (ey - c[1]) * (r / rings);
      pos.push(x, y, bend(z, x, y));
    }
  }
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n));
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * n, b0 = 1 + r * n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      idx.push(a0 + i, b0 + i, b0 + j, a0 + i, b0 + j, a0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/** An ellipse (centre, radii, tilt in radians) cut off at the lower lash line. */
const ellipse = (cx, cy, rx, ry, tilt = 0) => (u) => {
  const a = u * TAU;
  const x = rx * Math.cos(a), y = ry * Math.sin(a);
  return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), Math.max(EYE_LINE.bottom + 0.005, cy + x * Math.sin(tilt) + y * Math.cos(tilt))];
};

/** A flat band (a line with thickness) from a list of [x, y, half-width]; bent onto the face at layer z. */
function band(points, z) {
  const s = new THREE.Shape();
  const n = points.length;
  const side = (k) => points.map(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)], [qx, qy] = points[Math.min(n - 1, i + 1)];
    const len = Math.hypot(qx - px, qy - py) || 1;
    const w = points[i][2] * k;
    return V2(x - ((qy - py) / len) * w, y + ((qx - px) / len) * w);
  });
  const left = side(1), right = side(-1).reverse();
  s.setFromPoints([...left, ...right]);
  const g = new THREE.ShapeGeometry(s, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, bend(z, p.getX(i), p.getY(i)));
  g.computeVertexNormals();
  return g;
}

const IRIS = { x: 0.25, y: 0.07, rx: 0.245, ry: 0.37 };

/** The eye's layers, by name, each its own geometry (painted apart): see the header for the frame. */
function eyeLayers() {
  const { bottom } = EYE_LINE;
  const white = blob((u) => (u < 0.5 ? eyeDome(u * 2 * Math.PI) : [-0.5 + (u - 0.5) * 2, bottom]), [0, 0.02], 0.0);
  const { x, y, rx, ry } = IRIS;
  // The upper lid: along the dome from the inner corner over the top to just above the outer corner.
  const upper = [];
  for (let i = 0; i <= 60; i++) {
    const t = 0.04 + (2.9 - 0.04) * (i / 60);
    const [px, py] = eyeDome(t);
    const k = 1 + 0.045 / Math.hypot(px, py - bottom);
    upper.push([px * k, bottom + (py - bottom) * k, 0.03 + 0.016 * Math.sin(t)]);
  }
  // The lower lash line: thick, a little higher toward the nose, running out past the outer corner in a tail.
  const lower = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const lx = -0.66 + 1.14 * u;
    lower.push([lx, bottom - 0.015 + 0.025 * lx - 0.015 * Math.max(0, -lx - 0.5) / 0.16, 0.034 * Math.sin(Math.PI * u) ** 0.5 + 0.002]);
  }
  // A cool shade just under the upper lid, inside the white (the lid's shadow).
  const shade = [];
  for (let i = 0; i <= 50; i++) {
    const t = 0.1 + (2.85 - 0.1) * (i / 50);
    const [px, py] = eyeDome(t);
    const k = 1 - 0.06 / Math.hypot(px, py - bottom);
    shade.push([px * k, bottom + (py - bottom) * k, 0.055 * Math.sin(t) ** 0.6 + 0.004]);
  }
  return {
    eye_white: white,
    eye_shade: band(shade, 0.006),
    eye_rim: blob(ellipse(x, y, rx + 0.028, ry + 0.028), [x, y], 0.012),
    eye_iris: blob(ellipse(x, y, rx, ry), [x, y], 0.018),
    eye_pupil_low: blob(ellipse(x + 0.01, y - 0.03, rx * 0.74, ry * 0.8), [x + 0.01, y - 0.03], 0.024),
    eye_pupil: blob(ellipse(x + 0.01, y + 0.02, rx * 0.72, ry * 0.7), [x + 0.01, y + 0.02], 0.03),
    eye_crescent: blob(ellipse(x + 0.15, y - 0.26, 0.026, 0.06, 0.5), [x + 0.15, y - 0.26], 0.033),
    eye_shine: mergeGeometries([
      blob(ellipse(x + 0.04, y + 0.15, 0.085, 0.1), [x + 0.04, y + 0.15], 0.04),
      blob(ellipse(x - 0.14, y - 0.16, 0.035, 0.035), [x - 0.14, y - 0.16], 0.04, 24, 2),
    ].map((g) => g.toNonIndexed())),
    eyelid: mergeGeometries([band(upper, 0.05), band(lower, 0.05)].map((g) => (g.index ? g.toNonIndexed() : g))),
  };
}

let eye;
/** One eye layer by shape name (cached). */
const eyeLayer = (name) => () => (eye ??= eyeLayers())[name].clone();

/** A thin arched eyebrow, width 1, peaking toward its inner end (+x) and dropping to a fine outer point. */
export function browThin() {
  const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, -0.28, 0), new THREE.Vector3(0.22, 0.5, 0), new THREE.Vector3(0.5, 0.04, 0));
  const tube = new THREE.TubeGeometry(c, 40, 0.05, 10, false);
  const p = tube.attributes.position;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const k = 0.15 + 0.85 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.05)) ** 0.7;
    const o = c.getPoint(t);
    for (let j = 0; j <= 10; j++) {
      const v = i * 11 + j;
      p.setXYZ(v, o.x + (p.getX(v) - o.x) * k, o.y + (p.getY(v) - o.y) * k, o.z + (p.getZ(v) - o.z) * k);
    }
  }
  tube.computeVertexNormals();
  return tube.center();
}

// The wide grin, its teeth and tongue share one frame: built raw, then moved by the mouth's centring offset.
const GRIN_TOP = (t) => [-0.5 + t, 0.1 - 0.44 * t * (1 - t)]; // the lip line, t 0..1 (left to right)
const GRIN_BOTTOM = new THREE.CubicBezierCurve(V2(0.5, 0.1), V2(0.6, -0.58), V2(-0.6, -0.58), V2(-0.5, 0.1));
let grinOffset;
function grinFrame() {
  if (!grinOffset) {
    const g = grinWide(true);
    g.computeBoundingBox();
    grinOffset = g.boundingBox.getCenter(new THREE.Vector3()).negate();
  }
  return grinOffset;
}

/** A big open grin, width 1: a lip line curving up at the corners, a deep round bottom; puffy, facing +z. */
export function grinWide(raw = false) {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.1);
  s.quadraticCurveTo(0, -0.12, 0.5, 0.1);
  s.bezierCurveTo(0.6, -0.58, -0.6, -0.58, -0.5, 0.1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelSegments: 6, curveSegments: 32 });
  if (raw) return g;
  const o = grinFrame();
  return g.translate(o.x, o.y, o.z);
}

/** The grin's top teeth: a thin white strip just under the middle of the lip line, following its curve. */
export function grinTeeth() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = 0.29 + 0.42 * (i / 24);
    const [x, y] = GRIN_TOP(t);
    pts.push([x, y - 0.035, 0.022 * Math.sin(Math.PI * (i / 24)) ** 0.4 + 0.004]);
  }
  const o = grinFrame();
  const g = band(pts, 0).translate(o.x, o.y, 0.085);
  // band() bends for eyes; undo that here (the grin is flat): set every z to the front.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.085);
  g.computeVertexNormals();
  return g;
}

/** The grin's tongue: a soft mound rising from the bottom of the mouth to about its middle, clipped to it. */
export function grinTongue() {
  const s = new THREE.Shape();
  const bottom = GRIN_BOTTOM.getPoints(120).filter((p) => Math.abs(p.x) <= 0.3);
  // The mouth's bottom between the tongue's sides, right to left, then the dome back over the top.
  const right = bottom[0], left = bottom[bottom.length - 1];
  s.moveTo(left.x, left.y);
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI - (i / 32) * Math.PI;
    s.lineTo(0.3 * Math.cos(a), Math.max(left.y, -0.37 + 0.27 * Math.sin(a) ** 0.7));
  }
  s.lineTo(right.x, right.y);
  for (const p of bottom) s.lineTo(p.x, p.y);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.02, bevelSegments: 5, curveSegments: 16 });
  const o = grinFrame();
  return g.translate(o.x, o.y, 0.035); // its front just ahead of the mouth's (no flicker)
}

/** Shapes this module adds, by catalog name. */
export const TOON_SHAPES = {
  eye_white: eyeLayer("eye_white"),
  eye_shade: eyeLayer("eye_shade"),
  eye_rim: eyeLayer("eye_rim"),
  eye_iris: eyeLayer("eye_iris"),
  eye_pupil_low: eyeLayer("eye_pupil_low"),
  eye_pupil: eyeLayer("eye_pupil"),
  eye_crescent: eyeLayer("eye_crescent"),
  eye_shine: eyeLayer("eye_shine"),
  eyelid: eyeLayer("eyelid"),
  brow_thin: browThin,
  grin_wide: () => grinWide(),
  grin_wide_teeth: grinTeeth,
  grin_wide_tongue: grinTongue,
};
