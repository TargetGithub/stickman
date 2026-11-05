// Unit geometries for catalog shapes and model parts. Solids fit a 1 m box; flat shapes are puffy cut-outs
// (circle, square, triangle...) standing in the x/y plane facing the camera, for teaching 2D shape names.
// Every geometry is centred on the origin; builders lift it so objects stand on y = 0. Browser only.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DOUGH_SHAPES } from "./dough.js";
import { CLOTHES_SHAPES } from "./bao_clothes.js";

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

/**
 * A sorting hoop: a thin flat band lying on the floor (outer radius 0.5, inner 0.45, 0.03 tall), its edges
 * rounded: a soft rounded-rectangle cross-section turned round the y axis, counterclockwise like `tube`.
 */
function hoop(n = 28) {
  const pts = [];
  const sg = (v) => Math.sign(v) * Math.abs(v) ** 0.45;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    pts.push([0.475 + 0.025 * sg(Math.cos(a)), 0.015 + 0.015 * sg(Math.sin(a))]);
  }
  return lathe(pts, 96);
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

/** An open-mouthed grin (a D: lip line curving up at the corners, round below), width 1, facing +z. */
function grin() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.1);
  s.quadraticCurveTo(0, -0.02, 0.5, 0.1);
  s.bezierCurveTo(0.44, -0.42, -0.44, -0.42, -0.5, 0.1);
  return s;
}

/** A thick arched eyebrow: a tube along a gentle arch with round ends, width 1. */
function brow() {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, -0.08, 0), new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0.5, -0.08, 0));
  const parts = [new THREE.TubeGeometry(curve, 24, 0.1, 12, false)];
  for (const t of [0, 1]) parts.push(new THREE.SphereGeometry(0.1, 12, 8).translate(...curve.getPoint(t).toArray()));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g))).center();
}

/** A cap brim: a flat rounded peak, its inner edge hugging the crown, pointing +z and curving down a little. */
function brim() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.bezierCurveTo(-0.5, 0.42, -0.25, 0.62, 0, 0.62);
  s.bezierCurveTo(0.25, 0.62, 0.5, 0.42, 0.5, 0);
  s.quadraticCurveTo(0, 0.16, -0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 32 });
  g.rotateX(Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - 0.14 * p.getZ(i) * p.getZ(i));
  g.computeVertexNormals();
  return g.center();
}

/**
 * The same surface seen from both sides: the geometry plus an inset copy facing inward (flipped triangles),
 * so a cape or a mask has a solid back without double-sided materials.
 */
function twoSided(geo, inset) {
  // Smooth normals from the shared vertices first (a non-indexed geometry would get flat ones).
  if (geo.index) geo.computeVertexNormals();
  const a = geo.index ? geo.toNonIndexed() : geo;
  if (!a.attributes.normal) a.computeVertexNormals();
  const b = a.clone();
  const p = b.attributes.position;
  const n = b.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) - n.getX(i) * inset, p.getY(i) - n.getY(i) * inset, p.getZ(i) - n.getZ(i) * inset);
  for (let i = 0; i < p.count; i += 3) {
    for (const attr of Object.values(b.attributes)) {
      const w = attr.itemSize;
      for (let c = 0; c < w; c++) {
        const t = attr.array[(i + 1) * w + c];
        attr.array[(i + 1) * w + c] = attr.array[(i + 2) * w + c];
        attr.array[(i + 2) * w + c] = t;
      }
    }
  }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return mergeGeometries([a, b]);
}

/** A cape: the back two thirds of a flared cone, open in front, hanging from the top (1 tall, 1 wide at the hem). */
function cape() {
  const g = new THREE.CylinderGeometry(0.3, 0.5, 1, 40, 8, true, Math.PI * 0.62, Math.PI * 0.76);
  // A soft wave along the hem.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const down = 0.5 - p.getY(i);
    const a = Math.atan2(p.getX(i), p.getZ(i));
    const k = 1 + 0.06 * down * Math.sin(a * 7);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  return twoSided(g, 0.02).center();
}

/** A domino eye mask: two eye holes, pointed wings, bent round a head (width 1). */
function mask() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.1);
  s.bezierCurveTo(-0.36, 0.22, -0.12, 0.2, 0, 0.1);
  s.bezierCurveTo(0.12, 0.2, 0.36, 0.22, 0.5, 0.1);
  s.bezierCurveTo(0.44, -0.14, 0.18, -0.2, 0.04, -0.08);
  s.quadraticCurveTo(0, -0.05, -0.04, -0.08);
  s.bezierCurveTo(-0.18, -0.2, -0.44, -0.14, -0.5, 0.1);
  for (const x of [-0.21, 0.21]) {
    const h = new THREE.Path();
    h.absellipse(x, 0.02, 0.12, 0.1, 0, Math.PI * 2, true, 0);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 });
  return bend(g, 0.42);
}

/** Wrap a flat geometry (in x/y, facing +z) round a vertical cylinder of radius r, its front at z = 0. */
function bend(g, r) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) / r;
    const rr = r + p.getZ(i);
    p.setX(i, rr * Math.sin(a));
    p.setZ(i, rr * Math.cos(a) - r);
  }
  g.computeVertexNormals();
  return g.center();
}

/** A pleated dumpling (bao): a squat ball whose top gathers in twisting pleats to a little point. */
function bao() {
  const g = new THREE.SphereGeometry(0.5, 96, 64);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const up = Math.max(0, y / 0.5); // 0 at the middle, 1 at the top
    const a = Math.atan2(z, x) + up * 0.9;
    const pleat = 1 + 0.07 * up * up * Math.cos(a * 14);
    // Gathered to a point at the top, a soft flat belly at the bottom.
    const pinch = 1 - 0.25 * up ** 3;
    const k = pleat * pinch;
    p.setXYZ(i, x * k, y < 0 ? y * 0.82 : y * (1 + 0.12 * up * up), z * k);
  }
  g.computeVertexNormals();
  return g.center();
}

/** A gumdrop (Yogurt Man's soft body): round top, sides widening a little to a rounded base, 1 tall. */
function gumdrop() {
  const curve = new THREE.SplineCurve([[0, 0], [0.38, 0.005], [0.49, 0.08], [0.5, 0.25], [0.47, 0.55], [0.4, 0.78], [0.25, 0.94], [0.001, 1]].map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.LatheGeometry(curve.getPoints(48), 64).center();
}

const EGG = new THREE.SplineCurve([[0, 0], [0.2, 0.01], [0.34, 0.06], [0.44, 0.16], [0.49, 0.29], [0.5, 0.4], [0.47, 0.6], [0.4, 0.76], [0.27, 0.9], [0.12, 0.98], [0.001, 1]].map(([x, y]) => new THREE.Vector2(x, y)));

/** An egg (Fluffy's body): a narrow round bottom, widest 40% of the way up, a narrower round top, 1 tall. */
function egg() {
  return new THREE.LatheGeometry(EGG.getPoints(64), 72).center();
}

/**
 * A band of the egg body between two heights (shares of its height, 0 bottom .. 1 top). Not centred: it sits
 * where the egg does, so give it the egg's centre and a slightly bigger scale. closed: a flat lid on top (the
 * seat of a pair of shorts); otherwise an open band with a solid inside (a shirt).
 */
function eggBand(lo, hi, closed) {
  const pts = EGG.getPoints(256).filter((p) => p.y >= lo && p.y <= hi);
  if (closed) {
    const rim = pts[pts.length - 1];
    pts.push(new THREE.Vector2(rim.x * 0.6, hi), new THREE.Vector2(0.001, hi));
    return new THREE.LatheGeometry(pts, 72).translate(0, -0.5, 0);
  }
  return twoSided(new THREE.LatheGeometry(pts, 72), 0.012).translate(0, -0.5, 0);
}

function make(name) {
  // Dough character shapes (DumpyDoo) live in dough.js.
  if (Object.hasOwn(DOUGH_SHAPES, name)) return DOUGH_SHAPES[name]();
  if (Object.hasOwn(CLOTHES_SHAPES, name)) return CLOTHES_SHAPES[name]();
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
    // A tick mark (right answers): a short arm down to the joint and a long arm up to the right.
    case "tick": return bars([[0.42, 0.2, -45, -0.21, -0.07], [0.78, 0.2, 48, 0.13, 0.05]]);
    // Plush character parts (Fluffy): a grin, arched brows, a cap brim, a cape, an eye mask, body shapes and a shirt band.
    case "grin": return puffy(grin(), 0.06, 0.03);
    case "brow": return brow();
    case "brim": return brim();
    case "cape": return cape();
    case "mask": return mask();
    case "bao": return bao();
    case "gumdrop": return gumdrop();
    case "egg": return egg();
    case "egg_seat": return eggBand(0, 0.23, true);
    case "egg_shirt": return eggBand(0.08, 0.35, false);
    case "snowflake": return snowflake();
    case "drop": return puffy(drop());
    case "leaf": return puffy(leaf(), 0.08, 0.04);
    case "ring": return puffy(ring());
    case "hoop": return hoop();
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
