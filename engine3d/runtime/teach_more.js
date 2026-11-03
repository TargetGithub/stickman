// three.js builders for more of the teaching kit: grids (area and perimeter), unit cubes (volume), pointers
// (3D arrows), callouts (a label card with a leader line) and angles. Driven each frame by the object's
// timeline props. Browser and Node.

import * as THREE from "three";
import { cubeXYZ, rowCol } from "./teach_layout.js";
import { localBox } from "./teach_marks.js";
import { blendColor, builder, clamp01, colorRGB, drawableTube, labelMaker, ownMaterial, roundedBox, setPiece, solid } from "./teach_common.js";

const UP = new THREE.Vector3(0, 1, 0);

/** Unit squares on a board: upright like a wall chart, or flat on the floor (row 1 at the back). */
export function buildGrid(o, group, { catalog, material }) {
  const c = o.cell;
  const [W, H] = [o.cols * c, o.rows * c];
  const m = 0.08; // board margin
  const tileT = Math.min(0.05, c * 0.12);
  // Chart coordinates (u right, v up from the bottom edge of the cells) → the grid's local space.
  const place = o.upright ? (u, v, lift = 0) => new THREE.Vector3(u, v + m, 0.03 + tileT / 2 + lift) : (u, v, lift = 0) => new THREE.Vector3(u, 0.04 + tileT / 2 + lift, H / 2 - v);
  const board = solid(o.upright ? roundedBox(W + 2 * m, H + 2 * m, 0.06, 0.04) : roundedBox(W + 2 * m, 0.04, H + 2 * m, 0.015), material("white", "toy"));
  board.position.copy(o.upright ? new THREE.Vector3(0, H / 2 + m, 0) : new THREE.Vector3(0, 0.02, 0));
  group.add(board);
  const tile = o.upright ? roundedBox(c * 0.9, c * 0.9, tileT, tileT * 0.4) : roundedBox(c * 0.9, tileT, c * 0.9, tileT * 0.4);
  const named = new Map();
  const cells = [];
  for (let i = 0; i < o.rows * o.cols; i++) {
    const [r, col] = rowCol(o, i);
    const mat = ownMaterial(material, o.color);
    const mesh = solid(tile, mat);
    mesh.position.copy(place(-W / 2 + c * (col + 0.5), H - c * (r + 0.5)));
    group.add(mesh);
    named.set(`c${i + 1}`, mesh);
    cells.push({ mesh, mat });
  }

  // Perimeter: unit edges clockwise from the top-left corner, each lit as the glowing dot passes it.
  const units = 2 * (o.rows + o.cols);
  const corners = [[-W / 2, H], [W / 2, H], [W / 2, 0], [-W / 2, 0]];
  const runs = [o.cols, o.rows, o.cols, o.rows];
  const glow = material("gold", "glow");
  const pointAt = (d) => {
    // d: distance in units from the top-left corner, clockwise.
    let k = Math.max(0, Math.min(units, d));
    for (let e = 0; e < 4; e++) {
      if (k <= runs[e] || e === 3) {
        const [a, b] = [corners[e], corners[(e + 1) % 4]];
        const f = Math.min(1, k / runs[e]);
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      k -= runs[e];
    }
  };
  const segs = [];
  for (let k = 0; k < units; k++) {
    const [a, b] = [pointAt(k), pointAt(k + 1)];
    const p = place(a[0], a[1], 0.06);
    const q = place(b[0], b[1], 0.06);
    const g = new THREE.Group();
    g.position.copy(p);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), q.clone().sub(p).normalize());
    const bar = new THREE.Mesh(roundedBox(c * 0.94, 0.05, 0.05, 0.02), glow);
    bar.position.x = c / 2;
    g.add(bar);
    group.add(g);
    segs.push(g);
  }
  const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.07, c * 0.16), 24, 16), glow);
  group.add(dot);
  const base = colorRGB(catalog, o.color);
  return {
    named,
    update(t, s) {
      const built = builder(o, s);
      cells.forEach(({ mesh, mat }, i) => {
        setPiece(mesh, built(i));
        blendColor(mat, base, s.shadeColor, (s.shaded ?? 0) - i);
      });
      board.visible = built(0) > 0;
      const d = (s.trace ?? 0) * units;
      segs.forEach((g, k) => {
        const u = clamp01(d - k);
        g.visible = u > 0.001;
        g.scale.set(Math.max(1e-4, u), 1, 1);
      });
      dot.visible = d > 0 && d < units;
      const [u, v] = pointAt(d);
      dot.position.copy(place(u, v, 0.1));
    },
  };
}

/** l × w × h unit cubes (layers stack up, alternate layers a little lighter); box: a clear box around them. */
export function buildCubes(o, group, { material }) {
  const c = o.cell;
  const geo = roundedBox(c * 0.94, c * 0.94, c * 0.94, c * 0.13);
  const dark = material(o.color, "toy");
  const light = dark.clone();
  light.color.lerp(new THREE.Color(0xffffff), 0.28);
  const named = new Map();
  const cubes = [];
  for (let i = 0; i < o.l * o.w * o.h; i++) {
    const [x, y, z] = cubeXYZ(o, i);
    const mesh = solid(geo, y % 2 ? light : dark);
    mesh.position.set((x - (o.l - 1) / 2) * c, c / 2 + y * c + 0.005, ((o.w - 1) / 2 - z) * c);
    group.add(mesh);
    named.set(`c${i + 1}`, mesh);
    cubes.push(mesh);
  }
  if (o.box) {
    const pad = c * 0.12;
    const box = new THREE.Mesh(roundedBox(o.l * c + pad, o.h * c + pad, o.w * c + pad, c * 0.1), material("white", "glass"));
    box.position.y = (o.h * c + pad) / 2;
    box.renderOrder = 2;
    group.add(box);
  }
  return {
    named,
    update(t, s) {
      const built = builder(o, s);
      cubes.forEach((m, i) => setPiece(m, built(i)));
    },
  };
}

/** A 3D arrow from `from` to `to` (relative to at), arched `bend` metres high; draw grows it tip first. */
export function buildPointer(o, group, { material }) {
  const a = new THREE.Vector3(...(o.from ?? [0, 0, 0]));
  const b = new THREE.Vector3(...(o.to ?? [1, 0, 0]));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const curve = new THREE.QuadraticBezierCurve3(a, mid.clone().addScaledVector(UP, 2 * (o.bend ?? 0)), b);
  const L = curve.getLength();
  const w = o.width;
  const headLen = Math.min(L * 0.45, w * 2.8);
  const mat = material(o.color, "toy");
  const tube = drawableTube(curve, w / 2, 64, 12);
  const shaft = solid(tube.geo, mat);
  const cap = solid(new THREE.SphereGeometry(w / 2, 16, 12), mat);
  cap.position.copy(a);
  const head = solid(new THREE.ConeGeometry(w * 1.35, headLen, 28).translate(0, -headLen / 2, 0), mat);
  group.add(shaft, cap, head);
  const tan = new THREE.Vector3();
  return {
    update(t, s) {
      const k = clamp01(s.drawn ?? 1);
      tube.show(Math.max(0, k - (headLen * 0.85) / L));
      head.visible = cap.visible = k > 0.005;
      curve.getPointAt(k, head.position);
      curve.getTangentAt(Math.max(0.001, k), tan);
      head.quaternion.setFromUnitVectors(UP, tan.normalize());
      head.scale.setScalar(Math.max(1e-4, Math.min(1, (k * L) / headLen)));
    },
  };
}

/** A label card at point + offset with a leader line and a dot at the point it names. */
export function buildCallout(o, group, { material, font, textGeometry, handles }) {
  const P = new THREE.Vector3(...(o.point ?? [0, 0, 0]));
  const target = o.target != null ? handles?.get(o.target) : null;
  if (target && o.targetAt) {
    // Point at the front of the target, 0.6 of the way up its rest-pose box.
    const b = localBox(target.group);
    const k = new THREE.Vector3(...(o.targetScale ?? [1, 1, 1]));
    P.set(b.getCenter(new THREE.Vector3()).x * k.x, (b.min.y + 0.6 * (b.max.y - b.min.y)) * k.y, b.max.z * k.z).add(new THREE.Vector3(...o.targetAt));
  }
  const C = P.clone().add(new THREE.Vector3(...o.offset));
  const text = solid(labelMaker(textGeometry, font, 0.2, 0.04)(o.text), material(o.color, "toy"));
  const tb = text.geometry.boundingBox;
  const [tw, th] = [tb.max.x - tb.min.x, tb.max.y - tb.min.y];
  const [cw, ch] = [tw + 0.36, Math.max(0.42, th + 0.26)];
  const card = new THREE.Group();
  card.position.copy(C);
  const board = solid(roundedBox(cw, ch, 0.07, 0.07), material(o.bg, "matte"));
  text.position.set(0, -th / 2, 0.04);
  card.add(board, text);
  // The leader runs from the point to the nearest spot on the card's edge.
  const end = new THREE.Vector3(Math.max(C.x - cw / 2, Math.min(C.x + cw / 2, P.x)), Math.max(C.y - ch / 2, Math.min(C.y + ch / 2, P.y)), C.z);
  const dir = end.clone().sub(P);
  const len = Math.max(0.001, dir.length());
  const mat = material(o.color, "toy");
  const leader = new THREE.Group();
  leader.position.copy(P);
  leader.quaternion.setFromUnitVectors(UP, dir.normalize());
  const rod = solid(new THREE.CylinderGeometry(0.022, 0.022, 1, 12).translate(0, 0.5, 0), mat);
  leader.add(rod);
  const dot = solid(new THREE.SphereGeometry(0.06, 20, 14), mat);
  dot.position.copy(P);
  group.add(leader, dot, card);
  return {
    update(t, s) {
      const k = clamp01(s.drawn ?? 1);
      dot.visible = k > 0.005;
      leader.visible = k > 0.005;
      rod.scale.set(1, Math.max(1e-4, len * clamp01(k / 0.55)), 1);
      setPiece(card, clamp01((k - 0.45) / 0.55));
    },
  };
}

/** Two rays from a vertex (at) with an arc between them and the degrees written outside it; open turns the second ray. */
export function buildAngle(o, group, { material, font, textGeometry }) {
  const R = o.radius;
  const th = Math.max(0.05, R * 0.05);
  const mat = material(o.color, "toy");
  const ray = () => {
    const m = solid(roundedBox(R, th, th, th * 0.45), mat);
    m.position.x = R / 2;
    return m;
  };
  const pivot = new THREE.Group();
  pivot.add(ray());
  group.add(ray(), pivot);
  const vertex = solid(new THREE.SphereGeometry(th * 0.95, 20, 14), material("ink", "glossy"));
  group.add(vertex);
  const ra = R * 0.38;
  const arcMat = material("orange", "toy");
  const circle = new (class extends THREE.Curve {
    getPoint(u, out = new THREE.Vector3()) {
      return out.set(Math.cos(u * 2 * Math.PI) * ra, Math.sin(u * 2 * Math.PI) * ra, 0);
    }
  })();
  const arc = drawableTube(circle, th * 0.32, 180, 8);
  const arcMesh = solid(arc.geo, arcMat);
  // A right angle gets the little square corner instead of an arc.
  const sq = ra * 0.62;
  const square = new THREE.Group();
  for (const [x, y, w, h] of [[sq, sq / 2, th * 0.6, sq], [sq / 2, sq, sq, th * 0.6]]) {
    const b = solid(roundedBox(w, h, th * 0.6, th * 0.25), arcMat);
    b.position.set(x, y, 0);
    square.add(b);
  }
  group.add(arcMesh, square);
  const size = Math.max(0.16, Math.min(0.3, R * 0.16));
  const make = labelMaker(textGeometry, font, size, size * 0.25);
  const label = solid(make("0°"), material("ink", "toy"));
  group.add(label);
  return {
    update(t, s) {
      const deg = s.degrees ?? o.degrees;
      pivot.rotation.z = (deg * Math.PI) / 180;
      const right = Math.abs(deg - 90) < 0.5;
      arcMesh.visible = o.arc && !right && deg > 0.5;
      square.visible = o.arc && right;
      arc.show(deg / 360);
      label.visible = o.label;
      if (!o.label) return;
      label.geometry = make(`${Math.round(deg)}°`);
      const b = label.geometry.boundingBox;
      const half = [(b.max.x - b.min.x) / 2, (b.max.y - b.min.y) / 2];
      const a = ((deg / 2) * Math.PI) / 180;
      // Far enough out along the bisector that the label's box clears the arc.
      const r = ra + th + Math.abs(Math.cos(a)) * half[0] + Math.abs(Math.sin(a)) * half[1] + 0.06;
      label.position.set(Math.cos(a) * r, Math.sin(a) * r - half[1], 0);
    },
  };
}
