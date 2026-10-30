// Unit geometries for catalog shapes and model parts. Solids fit a 1 m box; flat shapes are puffy cut-outs
// (circle, square, triangle...) standing in the x/y plane facing the camera, for teaching 2D shape names.
// Every geometry is centred on the origin; builders lift it so objects stand on y = 0. Browser only.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const cache = new Map();

function puffy(shape, depth = 0.16, bevel = 0.08) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel * 1.5, bevelSize: bevel, bevelSegments: 6, curveSegments: 32 });
  g.center();
  return g;
}

function polygon(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

/** A polygon with rounded corners (radius r), so flat shapes look like soft toys, not blades. */
function rounded(points, r) {
  const s = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(...points[i]);
    const a = new THREE.Vector2(...points[(i + n - 1) % n]).sub(p).normalize();
    const b = new THREE.Vector2(...points[(i + 1) % n]).sub(p).normalize();
    const p1 = p.clone().addScaledVector(a, r);
    const p2 = p.clone().addScaledVector(b, r);
    i ? s.lineTo(p1.x, p1.y) : s.moveTo(p1.x, p1.y);
    s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath();
  return s;
}

function star(points = 5, inner = 0.21) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : 0.5;
    const a = Math.PI / 2 + (i * Math.PI) / points;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return polygon(pts);
}

function heart() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.45);
  s.bezierCurveTo(0.1, -0.3, 0.5, -0.1, 0.5, 0.15);
  s.bezierCurveTo(0.5, 0.42, 0.18, 0.5, 0, 0.28);
  s.bezierCurveTo(-0.18, 0.5, -0.5, 0.42, -0.5, 0.15);
  s.bezierCurveTo(-0.5, -0.1, -0.1, -0.3, 0, -0.45);
  return s;
}

/** A crescent: the outer circle's left arc, then back along a second circle's arc (no holes to triangulate). */
function crescent() {
  const s = new THREE.Shape();
  const a = Math.PI / 3;
  s.absarc(0, 0, 0.5, a, 2 * Math.PI - a, false);
  // The inner circle (centre 0.3, 0) passes through both tips (0.25, ±0.433).
  const r = Math.hypot(0.25 - 0.3, 0.433);
  const tip = Math.atan2(0.433, 0.25 - 0.3);
  s.absarc(0.3, 0, r, 2 * Math.PI - tip, tip, true);
  return s;
}

/** A regular polygon with soft corners, point up (pentagon, hexagon, octagon). */
function regular(n, r = 0.5, start = Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([r * Math.cos(start + (i * 2 * Math.PI) / n), r * Math.sin(start + (i * 2 * Math.PI) / n)]);
  return rounded(pts, 0.07);
}

/** A pie slice of a circle (half or quarter), as a polygon so it triangulates cleanly: for fair-share lessons. */
function slice(angle, n = 32) {
  const pts = [[0, 0]];
  for (let i = 0; i <= n; i++) pts.push([0.5 * Math.cos((i * angle) / n), 0.5 * Math.sin((i * angle) / n)]);
  return polygon(angle < Math.PI ? pts : pts.slice(1));
}

/** A water drop: round at the bottom, pointed at the top. */
function drop() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0.12, 0.3, 0.36, 0.08, 0.36, -0.14);
  s.absarc(0, -0.14, 0.36, 0, Math.PI, true);
  s.bezierCurveTo(-0.36, 0.08, -0.12, 0.3, 0, 0.5);
  return s;
}

/** A leaf: two arcs meeting in a point at each end. */
function leaf() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.quadraticCurveTo(0, 0.42, 0.5, 0);
  s.quadraticCurveTo(0, -0.42, -0.5, 0);
  return s;
}

/** A ring cut-out (a flat doughnut): the hole is centred, so it triangulates cleanly. */
function ring() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, 0.28, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

/** A body of revolution from a profile [[radius, y], ...] going up the outside and back down the inside, centred. */
function lathe(profile, segments = 56) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments).center();
}

/**
 * Profile points on a quarter circle of radius r, from the side up to the top (dir 2), from the bottom out to
 * the side (dir -1, a bowl's outside) or from the side back to the middle (dir 1, a bowl's inside), lifted by y0.
 */
function arc(r, y0, n, dir) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((dir === 1 ? n - i : i) * Math.PI) / (2 * n);
    if (dir === 2) pts.push([r * Math.cos(a), r * Math.sin(a)]);
    else pts.push([r * Math.sin(a), y0 + 0.5 - r * Math.cos(a)]);
  }
  return pts;
}

/** Puffy bars merged into one geometry (snowflake arms, an X mark). */
function bars(list) {
  const parts = list.map(([w, h, deg, x = 0, y = 0]) => {
    const g = puffy(rounded([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], Math.min(w, h) * 0.45), 0.12, 0.05);
    return g.rotateZ((deg * Math.PI) / 180).translate(x, y, 0);
  });
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function snowflake() {
  const list = [];
  for (const a of [90, 150, 210, 270, 330, 30]) {
    const r = (a * Math.PI) / 180;
    list.push([0.5, 0.09, a, Math.cos(r) * 0.25, Math.sin(r) * 0.25]);
    // A little V near the tip of each arm.
    for (const side of [-1, 1]) {
      const b = r + side * 0.5;
      list.push([0.16, 0.07, a + side * 50, Math.cos(r) * 0.36 + Math.cos(b) * 0.05, Math.sin(r) * 0.36 + Math.sin(b) * 0.05]);
    }
  }
  return bars(list);
}

function ellipse(rx, ry) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
}

function make(name) {
  switch (name) {
    // Solids.
    case "cube": return new THREE.BoxGeometry(1, 1, 1);
    case "block": return new RoundedBoxGeometry(1, 1, 1, 5, 0.12);
    case "box": return new RoundedBoxGeometry(1, 1, 1, 3, 0.08);
    // A thin slab built at its true thickness (1 × 0.04 × 1), so boards, mats, signs and plates stay solid
    // when scaled: box and block round their corners by a share of the unit cube and turn to slivers below ~0.05.
    case "plate": return new RoundedBoxGeometry(1, 0.04, 1, 2, 0.012);
    case "sphere": return new THREE.SphereGeometry(0.5, 48, 32);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
    case "cone": return new THREE.ConeGeometry(0.5, 1, 48);
    case "capsule": return new THREE.CapsuleGeometry(0.25, 0.5, 8, 24).scale(2, 1, 2);
    case "pyramid": return new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
    case "torus": return new THREE.TorusGeometry(0.35, 0.15, 32, 96);
    // A smile: a third of a thin ring, for faces (x = width, y = curve height).
    case "smile": return new THREE.TorusGeometry(0.5, 0.09, 12, 32, Math.PI * 0.7).rotateZ(Math.PI + Math.PI * 0.15);
    // Puffy cut-outs.
    case "star": return puffy(star());
    case "heart": return puffy(heart());
    case "crescent": return puffy(crescent(), 0.2);
    case "circle": return puffy(ellipse(0.5, 0.5));
    case "oval": return puffy(ellipse(0.62, 0.42));
    case "square": return puffy(rounded([[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]], 0.08));
    case "rectangle": return puffy(rounded([[-0.7, -0.38], [0.7, -0.38], [0.7, 0.38], [-0.7, 0.38]], 0.08));
    case "triangle": return puffy(rounded([[-0.55, -0.45], [0.55, -0.45], [0, 0.5]], 0.1));
    case "diamond": return puffy(rounded([[0, -0.6], [0.42, 0], [0, 0.6], [-0.42, 0]], 0.07));
    case "pentagon": return puffy(regular(5));
    case "hexagon": return puffy(regular(6, 0.5, 0));
    case "octagon": return puffy(regular(8, 0.52, Math.PI / 8));
    case "half_circle": return puffy(slice(Math.PI));
    case "quarter_circle": return puffy(slice(Math.PI / 2));
    case "arrow": return puffy(rounded([[-0.5, -0.13], [0.12, -0.13], [0.12, -0.3], [0.5, 0], [0.12, 0.3], [0.12, 0.13], [-0.5, 0.13]], 0.04));
    case "cross": return bars([[1, 0.24, 45], [1, 0.24, -45]]);
    case "snowflake": return snowflake();
    case "drop": return puffy(drop());
    case "leaf": return puffy(leaf(), 0.08, 0.04);
    case "ring": return puffy(ring());
    // Open containers and round solids (lathed), 1 m tall unless noted.
    case "cup": return lathe([[0, 0], [0.5, 0], [0.5, 1], [0.45, 1], [0.45, 0.07], [0, 0.07]]);
    case "pot": return lathe([[0, 0], [0.36, 0], [0.46, 0.82], [0.52, 0.84], [0.52, 1], [0.44, 1], [0.41, 0.84], [0.32, 0.08], [0, 0.08]]);
    case "bowl": return lathe([...arc(0.5, 0, 12, -1), ...arc(0.45, 0, 12, 1)]); // 0.5 tall, 1 wide
    case "tube": return lathe([[0.5, 0], [0.5, 1], [0.44, 1], [0.44, 0], [0.5, 0]]);
    case "bottle": return lathe([[0, 0], [0.4, 0], [0.42, 0.04], [0.42, 0.6], [0.36, 0.72], [0.16, 0.82], [0.16, 1], [0.12, 1], [0.12, 0.84], [0, 0.84]]);
    case "dome": return lathe([[0, 0], ...arc(0.5, 0, 16, 2)]); // half a ball, 0.5 tall (igloos, dens)
    case "disc": return lathe([[0, 0], [0.47, 0], [0.5, 0.03], [0.5, 0.09], [0.47, 0.12], [0.4, 0.12], [0.4, 0.105], [0, 0.105]], 64); // a coin, 0.12 thick
    case "wedge": {
      const g = new THREE.ExtrudeGeometry(polygon([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]), { depth: 1, bevelEnabled: false });
      return g.translate(0, 0, -0.5);
    }
    default: throw new Error(`unknown shape "${name}"`);
  }
}

/**
 * Let a mesh cast and receive shadows, except a see-through one (opacity under 0.5: glass), which casts none,
 * so a clear cup leaves no black shadow. Water and ice (0.6 and more) keep theirs.
 */
export function shadowed(m) {
  m.castShadow = !(m.material?.transparent && m.material.opacity < 0.5);
  m.receiveShadow = true;
  return m;
}

/** Shared unit geometry for a shape name (do not dispose: it is cached). */
export function shapeGeometry(name) {
  if (!cache.has(name)) {
    const g = make(name);
    g.computeBoundingBox();
    cache.set(name, g);
  }
  return cache.get(name);
}
