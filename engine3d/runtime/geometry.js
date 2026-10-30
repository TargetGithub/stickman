// Unit geometries for catalog shapes and model parts. Solids fit a 1 m box; flat shapes are puffy cut-outs
// (circle, square, triangle...) standing in the x/y plane facing the camera, for teaching 2D shape names.
// Every geometry is centred on the origin; builders lift it so objects stand on y = 0. Browser only.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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
    default: throw new Error(`unknown shape "${name}"`);
  }
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
