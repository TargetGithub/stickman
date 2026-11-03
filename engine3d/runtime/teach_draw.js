// three.js builders for things drawn along a path: strokes (a tube drawn start to end, with an optional pencil
// or dot at the tip), flows (evenly spaced dots running along a path while shown) and pointers (an arrow,
// line, ray or segment, whose ends may follow moving objects). Every frame is set from t and the timeline
// state alone. Browser and Node.

import * as THREE from "three";
import { localBox } from "./teach_marks.js";
import { clamp01, colorRGB, drawableTube, solid } from "./teach_common.js";

const UP = new THREE.Vector3(0, 1, 0);

/** The path through `points`: a smooth curve through them (smooth) or straight lines; closed joins the ends. */
export function pathCurve(o) {
  const pts = (o.points ?? [[0, 0, 0], [1, 0, 0]]).map((p) => new THREE.Vector3(...p));
  if (o.smooth) return new THREE.CatmullRomCurve3(pts, !!o.closed, "centripetal");
  const path = new THREE.CurvePath();
  const all = o.closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i + 1 < all.length; i++) path.add(new THREE.LineCurve3(all[i], all[i + 1]));
  return path;
}

/**
 * A stroke: a round tube along the path (smooth curves as one tube; straight runs as rods with round joints, so
 * zigzag corners stay sharp). draw reveals it by length; pen shows a pencil ("pencil" or true) or a glowing dot
 * ("dot") at the tip while it is drawn.
 */
export function buildStroke(o, group, { material }) {
  const r = o.width / 2;
  const mat = material(o.color, "toy");
  const curve = pathCurve(o);
  const L = Math.max(1e-6, curve.getLength());
  const ball = new THREE.SphereGeometry(r, 20, 14);
  let show;
  if (o.smooth) {
    const tube = drawableTube(curve, r, Math.min(800, Math.max(64, Math.ceil(L / (r * 0.6)))), 14);
    group.add(solid(tube.geo, mat));
    show = (k) => tube.show(k);
  } else {
    const rod = new THREE.CylinderGeometry(r, r, 1, 16).translate(0, 0.5, 0);
    let cum = 0;
    const segs = curve.curves.map((c) => {
      const len = c.v1.distanceTo(c.v2);
      const g = new THREE.Group();
      g.position.copy(c.v1);
      if (len > 1e-9) g.quaternion.setFromUnitVectors(UP, c.v2.clone().sub(c.v1).normalize());
      const m = solid(rod, mat);
      const joint = solid(ball, mat);
      joint.position.copy(c.v1);
      g.add(m);
      group.add(g, joint);
      const s = { m, joint, len, cum };
      cum += len;
      return s;
    });
    show = (k) => {
      const d = k * L;
      for (const s of segs) {
        const f = s.len > 1e-9 ? clamp01((d - s.cum) / s.len) : d >= s.cum ? 1 : 0;
        s.m.visible = f > 1e-4;
        s.m.scale.set(1, Math.max(1e-4, f * s.len), 1);
        s.joint.visible = d >= s.cum && k > 0.001;
      }
    };
  }
  const tip = solid(ball, mat); // the round end where the drawing has reached
  const start = solid(ball, mat); // and the round start
  curve.getPointAt(0, start.position);
  group.add(tip, start);
  const pen = o.pen ? (o.pen === "dot" ? dotPen(r, material) : pencil(o, material)) : null;
  if (pen) group.add(pen);
  return {
    update(t, s) {
      const k = clamp01(s.drawn ?? 1);
      show(k);
      tip.visible = start.visible = k > 0.001;
      curve.getPointAt(Math.min(1, k), tip.position);
      if (pen) {
        pen.visible = k > 0.001 && k < 0.999;
        pen.position.copy(tip.position);
      }
    },
  };
}

/** A yellow pencil with a wooden tip in the stroke's colour, leaning toward the camera like a hand holds it. */
function pencil(o, material) {
  const g = new THREE.Group();
  const len = Math.max(0.75, o.width * 9);
  const R = Math.max(0.065, o.width * 0.8);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(R * 0.4, R * 1.1, 16).translate(0, R * 0.55, 0), material(o.color, "toy"));
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.4, R, R * 2.2, 16).translate(0, R * 1.1 + R * 1.0, 0), material("sand", "toy"));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 6).translate(0, R * 3.2 + len / 2, 0), material("yellow", "toy"));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, R * 1.2, 16).translate(0, R * 3.2 + len + R * 0.6, 0), material("grey", "metal"));
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(R, R, R * 1.4, 16).translate(0, R * 3.2 + len + R * 1.9, 0), material("pink", "matte"));
  for (const m of [lead, wood, body, band, eraser]) {
    m.castShadow = true;
    g.add(m);
  }
  g.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0.35, 0.5, 0.8).normalize());
  // Lift the tip just in front of the stroke so it never sinks into the tube.
  g.children.forEach((m) => m.position.set(0, o.width * 0.4, 0));
  return g;
}

/** A glowing dot that leads the stroke. */
function dotPen(r, material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r * 1.7, 0.06), 24, 16), material("gold", "glow"));
  return m;
}

/**
 * Evenly spaced dots running along a path at `speed` m/s for as long as the object is shown (blood, air,
 * energy). changes: [{ at: 0-1 along the path, color }] turn the dots another colour from there on (a short
 * blend). On an open path dots shrink in at the start and out at the end; on a closed one they loop.
 */
export function buildFlow(o, group, { material, catalog }) {
  const curve = pathCurve(o);
  const L = Math.max(1e-6, curve.getLength());
  const n = o.count;
  const mat = material("white", "glossy").clone();
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 20, 14), mat, n);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  if (o.track) {
    const tm = material(o.color, "toy").clone();
    tm.transparent = true;
    tm.opacity = 0.3;
    tm.depthWrite = false;
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(600, Math.ceil(L * 40)), o.size * 0.22, 8, !!o.closed), tm));
  }
  const stops = [...(o.changes ?? [])].sort((a, b) => a.at - b.at).map((c) => ({ at: c.at, rgb: colorRGB(catalog, c.color) }));
  const base = colorRGB(catalog, o.color);
  const BLEND = 0.04;
  const colorAt = (u) => {
    let c = base;
    for (const s of stops) {
      if (u < s.at) break;
      const k = clamp01((u - s.at) / BLEND);
      c = c.map((x, i) => x + (s.rgb[i] - x) * k);
    }
    return c;
  };
  const m4 = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const col = new THREE.Color();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  return {
    update(t) {
      for (let i = 0; i < n; i++) {
        const u = (((t * o.speed) / L + i / n) % 1 + 1) % 1;
        const k = o.closed ? 1 : clamp01(Math.min(u, 1 - u) / 0.04);
        curve.getPointAt(u, p);
        mesh.setMatrixAt(i, m4.compose(p, q, sc.setScalar(Math.max(1e-4, o.size * k))));
        const c = colorAt(u);
        mesh.setColorAt(i, col.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace));
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
  };
}

/**
 * A 3D pointer from `from` to `to` (relative to at), arched `bend` metres high. head (the `to` end): arrow,
 * dot or none; tail (the `from` end): none, arrow or dot. So it is also a line (none/none), a ray (arrow/dot)
 * or a segment (dot/dot). fromTarget / toTarget: the end follows that object (the centre of its rest box, plus
 * from / to as an offset in metres), worked out each frame from where the object is posed at t.
 */
export function buildPointer(o, group, { material, handles }) {
  const w = o.width;
  const mat = material(o.color, "toy");
  const headLen0 = w * 2.8;
  const cone = (len) => solid(new THREE.ConeGeometry(w * 1.35, len, 28).translate(0, -len / 2, 0), mat);
  const ball = (r) => solid(new THREE.SphereGeometry(r, 16, 12), mat);
  const ends = { from: o.fromTarget, to: o.toTarget };
  const anchor = {};
  for (const k of ["from", "to"]) {
    const h = ends[k] != null ? handles?.get(ends[k]) : null;
    if (h) anchor[k] = { h, c: localBox(h.group).getCenter(new THREE.Vector3()).add(new THREE.Vector3(...(o[k] ?? [0, 0, 0]))) };
  }
  const a = new THREE.Vector3(...(anchor.from ? [0, 0, 0] : o.from ?? [0, 0, 0]));
  const b = new THREE.Vector3(...(anchor.to ? [1, 0, 0] : o.to ?? [1, 0, 0]));
  const shaft = solid(new THREE.BufferGeometry(), mat);
  const cap = ball(w / 2);
  const tailMesh = o.tail === "arrow" ? cone(headLen0) : o.tail === "dot" ? ball(w * 1.1) : null;
  group.add(shaft, cap, ...(tailMesh ? [tailMesh] : []));
  let head = null;
  let geo = { curve: null, L: 1, headLen: headLen0, tube: null, key: "" };
  const build = () => {
    const key = [a, b].map((v) => v.toArray().map((x) => x.toFixed(4)).join(",")).join("|");
    if (key === geo.key) return;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid.addScaledVector(UP, 2 * (o.bend ?? 0)), b.clone());
    const L = Math.max(1e-6, curve.getLength());
    const headLen = Math.min(L * 0.45, headLen0);
    geo.tube?.geo.dispose();
    const tube = drawableTube(curve, w / 2, anchor.from || anchor.to ? 32 : 64, 12);
    shaft.geometry = tube.geo;
    if (o.head === "arrow") {
      if (!head || Math.abs(geo.headLen - headLen) > 1e-6 || !geo.curve) {
        if (head) group.remove(head);
        head = cone(headLen);
        group.add(head);
      }
    } else if (!head) {
      head = ball(o.head === "dot" ? w * 1.1 : w / 2);
      group.add(head);
    }
    geo = { curve, L, headLen, tube, key };
  };
  build();
  const tan = new THREE.Vector3();
  const world = new THREE.Vector3();
  const follow = (k, v) => {
    const { h, c } = anchor[k];
    h.group.updateWorldMatrix(true, false);
    h.group.localToWorld(world.copy(c));
    v.copy(group.worldToLocal(world));
  };
  return {
    update(t, s) {
      if (anchor.from || anchor.to) {
        group.updateWorldMatrix(true, false);
        if (anchor.from) follow("from", a);
        if (anchor.to) follow("to", b);
        build();
      }
      const { curve, L, headLen, tube } = geo;
      const k = clamp01(s.drawn ?? 1);
      tube.show(o.head === "arrow" ? Math.max(0, k - (headLen * 0.85) / L) : k);
      head.visible = cap.visible = k > 0.005;
      curve.getPointAt(k, head.position);
      cap.position.copy(a);
      if (o.head === "arrow") {
        curve.getTangentAt(Math.max(0.001, k), tan);
        head.quaternion.setFromUnitVectors(UP, tan.normalize());
        head.scale.setScalar(Math.max(1e-4, Math.min(1, (k * L) / headLen)));
      }
      if (tailMesh) {
        tailMesh.visible = k > 0.005;
        tailMesh.position.copy(a);
        if (o.tail === "arrow") {
          curve.getTangentAt(0, tan);
          tailMesh.quaternion.setFromUnitVectors(UP, tan.normalize().negate());
          tailMesh.scale.setScalar(Math.max(1e-4, Math.min(1, (k * L) / headLen)));
        }
      }
    },
  };
}
