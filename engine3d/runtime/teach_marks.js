// Marks and glows (the internal _mark and _glow objects the mark and highlight actions add): they ride on
// their target (or one of its pieces) and fit themselves to its bounding box as posed at time t (an angle
// that has opened, a critter mid-bob), so a frame depends only on t, never on the frames drawn before it.
// Browser and Node.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";
import { clamp01, solid } from "./teach_common.js";

const FALLBACK = new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 0.6, 0.3));

/** The bounding box of a node's visible meshes in its own space, leaving out marks and glows. */
export function localBox(root) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const m = new THREE.Matrix4();
  const walk = (n) => {
    if (n.userData.overlay || (n !== root && !n.visible)) return;
    if (n.isMesh && n.geometry) {
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      box.union(n.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inv, n.matrixWorld)));
    }
    for (const c of n.children) walk(c);
  };
  walk(root);
  return box.isEmpty() ? FALLBACK.clone() : box;
}

/** The node a helper rides on: its parent's named piece, else the parent itself. */
function host(o, handles) {
  const h = handles?.get(o.parent);
  return h ? (o.part ? h.named?.get(o.part) ?? h.group : h.group) : null;
}

/** Product of the scales from a node's parent up to the scene (to keep a badge round on a squashed target). */
function worldScale(node, out) {
  out.set(1, 1, 1);
  for (let n = node.parent; n; n = n.parent) out.multiply(n.scale);
  return out;
}

/**
 * A round badge: a white tick on green (correct) or a white cross on soft coral (incorrect), with a ring that
 * widens and fades once. Over a whole object it floats above it; on a piece it sits in front of the piece.
 */
export function buildMark(o, group, { material, handles }) {
  group.userData.overlay = true;
  const ok = o.result !== "incorrect";
  const face = material(ok ? "green" : "red", "glossy").clone();
  if (!ok) face.color.lerp(new THREE.Color(0xffffff), 0.25); // a soft coral, not an alarm red
  const inner = new THREE.Group();
  const disc = solid(shapeGeometry("cylinder"), face);
  disc.scale.set(1, 0.14, 1);
  disc.rotation.x = Math.PI / 2;
  const rim = solid(new THREE.TorusGeometry(0.5, 0.045, 12, 64), material("white", "glossy"));
  const sign = solid(shapeGeometry(ok ? "tick" : "cross"), material("white", "glossy"));
  sign.scale.set(ok ? 0.62 : 0.5, ok ? 0.62 : 0.5, 0.45);
  sign.position.z = 0.08;
  const ringMat = face.clone();
  ringMat.transparent = true;
  ringMat.depthWrite = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 10, 64), ringMat);
  inner.add(disc, rim, sign, ring);
  group.add(inner);
  const k = new THREE.Vector3();
  const size = new THREE.Vector3();
  const c = new THREE.Vector3();
  return {
    update(t, s) {
      const n = host(o, handles);
      const box = n ? localBox(n) : FALLBACK;
      box.getSize(size);
      box.getCenter(c);
      worldScale(group, k);
      const D = o.part ? Math.max(0.35, Math.min(0.6, Math.max(size.x * k.x, size.y * k.y) * 0.9)) : Math.max(0.5, Math.min(0.8, Math.max(size.x * k.x, size.y * k.y) * 0.45));
      inner.scale.set(D / k.x, D / k.y, D / k.z);
      if (o.part) inner.position.set(c.x, c.y, box.max.z + (D * 0.12) / k.z);
      else inner.position.set(c.x, box.max.y + (0.14 + D / 2) / k.y, c.z + size.z * 0.25);
      const u = s.ping >= 0 ? t - s.ping : -1;
      ring.visible = u >= 0 && u < 0.9;
      const f = clamp01(u / 0.9);
      ring.scale.setScalar(1 + 0.9 * f);
      ringMat.opacity = 0.8 * (1 - f);
    },
  };
}

/** A rounded rectangle path (half width hw, from y0 to y1) as points in the x/y plane. */
function hoopPoints(hw, y0, y1) {
  const r = Math.min(0.4, hw * 0.9, ((y1 - y0) / 2) * 0.9);
  const s = new THREE.Shape();
  s.moveTo(-hw + r, y0);
  s.lineTo(hw - r, y0);
  s.absarc(hw - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, y1 - r);
  s.absarc(hw - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, y1);
  s.absarc(-hw + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, y0 + r);
  s.absarc(-hw + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s.getSpacedPoints(220).slice(0, -1);
}

/**
 * A glowing rounded hoop hugging the target that pulses gently: upright in front of standing things, flat
 * round flat ones (a grid on the floor). Rebuilt only when the target's box changes.
 */
export function buildGlow(o, group, { catalog, handles }) {
  group.userData.overlay = true;
  const hex = catalog.colors[o.color ?? "gold"].hex;
  const mat = (opacity) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity, depthWrite: false, toneMapped: false });
  const core = new THREE.Mesh(undefined, mat(0.9));
  const halo = new THREE.Mesh(undefined, mat(0.25));
  core.renderOrder = halo.renderOrder = 3;
  const hoop = new THREE.Group();
  hoop.add(core, halo);
  group.add(hoop);
  const cache = new Map();
  const size = new THREE.Vector3();
  const c = new THREE.Vector3();
  const fit = (box) => {
    box.getSize(size);
    box.getCenter(c);
    const flat = size.y < 0.3 * Math.min(size.x, size.z);
    const m = 0.12;
    const hw = size.x / 2 + m;
    // Standing things (box from the floor up): the hoop's bottom stays just above the floor.
    const [y0, y1] = flat ? [box.min.z - m, box.max.z + m] : [box.min.y >= -0.01 && !o.part ? box.min.y + 0.04 : box.min.y - m, box.max.y + m];
    const key = [flat, hw, y0, y1].map((x) => (typeof x === "number" ? x.toFixed(2) : x)).join("|");
    if (!cache.has(key)) {
      const mid = (y0 + y1) / 2;
      const pts = hoopPoints(hw, y0 - mid, y1 - mid).map((p) => (flat ? new THREE.Vector3(p.x, 0, -p.y) : new THREE.Vector3(p.x, p.y, 0)));
      const path = new THREE.CatmullRomCurve3(pts, true);
      cache.set(key, [new THREE.TubeGeometry(path, 220, 0.03, 8, true), new THREE.TubeGeometry(path, 220, 0.085, 8, true)]);
    }
    [core.geometry, halo.geometry] = cache.get(key);
    hoop.position.set(c.x, flat ? box.max.y + 0.03 : (y0 + y1) / 2, flat ? (y0 + y1) / 2 : box.max.z + 0.04);
  };
  return {
    update(t, s) {
      const n = host(o, handles);
      fit(n ? localBox(n) : FALLBACK);
      const u = s.since >= 0 ? t - s.since : 0;
      const w = Math.sin(2 * Math.PI * 1.1 * u);
      hoop.scale.setScalar(1 + 0.03 * w);
      core.material.opacity = 0.75 + 0.2 * w;
      halo.material.opacity = 0.22 + 0.12 * w;
    },
  };
}
