// The progress tracker's three.js builder (retention kit): a train, a checklist, a row of stars or a path, laid out
// by retain_layout.js trackerLayout and fitted into the tracker band. Each slot has an empty look and a filled
// look; a slot fills (popping in) at its "f<i>" time, and the surprise slot wiggles at the "tease" time. Browser only.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";
import { trackerFit } from "./retain_layout.js";

const PALETTE = ["blue", "green", "orange", "purple", "pink", "teal"];

/** @returns {(t:number, s:object) => void} */
export function buildTracker(o, group, kit) {
  const { k, layout } = trackerFit(o);
  const inner = new THREE.Group();
  inner.scale.setScalar(k);
  group.add(inner);
  const style = o.style ?? "train";
  const n = layout.slots.length;
  const surpriseAt = o.surprise ? n - 1 : -1;
  const main = o.color ?? "red";
  const accent = o.accent ?? "yellow";
  const box = (w, h, d, c, style2 = "toy") => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), kit.material(c, style2));
  const labelOf = (i) => (i === surpriseAt ? (typeof o.surprise === "string" ? o.surprise : null) : o.labels?.[i] ?? null);
  const filledColor = (i) => (i === surpriseAt ? "gold" : [main, ...PALETTE.filter((c) => c !== main)][i % 6]);

  /** A gift box with a ribbon, a bow and a question mark (the surprise before it is revealed). */
  const gift = (w) => {
    const g = new THREE.Group();
    g.add(box(w, w * 0.8, w * 0.6, accent, "glossy"));
    g.add(box(w * 0.16, w * 0.82, w * 0.62, main), box(w * 1.02, w * 0.16, w * 0.62, main));
    for (const sx of [-1, 1]) {
      const bow = new THREE.Mesh(new THREE.SphereGeometry(w * 0.13, 16, 10), kit.material(main, "glossy"));
      bow.scale.set(1.4, 0.8, 0.6);
      bow.position.set(sx * w * 0.14, w * 0.47, 0);
      g.add(bow);
    }
    const q = kit.label("?", w * 0.42, kit.material("white", "glossy"), 0.04);
    q.position.set(0, -w * 0.02, w * 0.32);
    g.add(q);
    return g;
  };
  const wheel = (x, y, r = 0.11) => {
    const w = kit.disc(r, 0.08, kit.material("charcoal", "glossy"), 20);
    w.position.set(x, y, 0.13);
    return w;
  };

  const slots = layout.slots.map((p, i) => {
    const node = new THREE.Group();
    node.position.set(...p);
    inner.add(node);
    const empty = new THREE.Group();
    const full = new THREE.Group();
    node.add(empty, full);
    const label = labelOf(i);
    if (style === "train") {
      node.add(box(0.8, 0.08, 0.3, "charcoal").translateY(-0.27), wheel(-0.22, -0.33), wheel(0.22, -0.33));
      node.add(box(0.14, 0.05, 0.1, "charcoal").translateX(-0.46).translateY(-0.26));
      if (i === surpriseAt) empty.add(gift(0.56).translateY(0.02));
      else {
        empty.add(box(0.7, 0.44, 0.28, "cream"));
        if (label) empty.add(kit.label(label, 0.27, kit.material("grey", "toy"), 0.03).translateZ(0.15));
      }
      full.add(box(0.7, 0.44, 0.28, filledColor(i), "glossy"));
      if (label) full.add(kit.label(label, 0.3, kit.material("white", "glossy"), 0.04).translateZ(0.15));
      else if (i === surpriseAt) full.add(starMesh(0.2, "white").translateZ(0.15));
    } else if (style === "checklist") {
      node.add(box(0.36, 0.36, 0.05, "cream").translateZ(0.04));
      const text = i === surpriseAt ? label ?? "Surprise!" : label ?? `Step ${i + 1}`;
      const ink = kit.label(text, 0.24, kit.material(i === surpriseAt ? main : "ink", "toy"), 0.02);
      ink.geometry.computeBoundingBox();
      ink.position.set(0.36 - ink.geometry.boundingBox.min.x, 0, 0.05);
      if (i === surpriseAt) {
        empty.add(gift(0.32).translateZ(0.06));
        const q = kit.label("?", 0.24, kit.material("grey", "toy"), 0.02);
        q.position.set(0.48, 0, 0.05);
        empty.add(q);
        full.add(ink);
      } else node.add(ink);
      const tick = new THREE.Mesh(shapeGeometry("tick"), kit.material("green", "glossy"));
      tick.scale.setScalar(0.46);
      tick.position.set(0, -0.14, 0.1);
      full.add(tick);
    } else if (style === "stars") {
      if (i === surpriseAt) empty.add(gift(0.56));
      else empty.add(starMesh(0.34, "cream"));
      full.add(starMesh(0.36, "gold"));
      if (label) {
        empty.add(kit.label(label, 0.2, kit.material("grey", "toy"), 0.02).translateZ(0.1));
        full.add(kit.label(label, 0.2, kit.material(main, "glossy"), 0.02).translateZ(0.1));
      }
    } else {
      if (i === surpriseAt) empty.add(gift(0.5));
      else empty.add(kit.disc(0.19, 0.06, kit.material("cream", "toy")));
      full.add(i === surpriseAt ? starMesh(0.32, "gold") : kit.disc(0.21, 0.08, kit.material(accent, "glossy")));
      if (label) node.add(kit.label(label, 0.22, kit.material("ink", "toy"), 0.02).translateY(-0.42));
      if (i > 0) {
        const prev = layout.slots[i - 1];
        for (let j = 1; j < 4; j++) {
          const dot = kit.disc(0.045, 0.03, kit.material("grey", "toy"), 10);
          dot.position.set(prev[0] + ((p[0] - prev[0]) * j) / 4 - p[0], prev[1] + ((p[1] - prev[1]) * j) / 4 - p[1], 0);
          node.add(dot);
        }
      }
    }
    return { node, empty, full };
  });

  if (style === "train") inner.add(engine(layout.engine));
  if (style === "checklist") {
    const back = new THREE.Mesh(new THREE.BoxGeometry(layout.width + 0.08, layout.height + 0.08, 0.04), kit.material(main, "glossy"));
    const card = new THREE.Mesh(new THREE.BoxGeometry(layout.width, layout.height, 0.06), kit.material("white", "toy"));
    for (const m of [back, card]) m.position.set(layout.width / 2, -layout.height / 2, m === back ? -0.02 : 0);
    inner.add(back, card);
  }
  // The path's marker: a pin that hops from stop to stop as the steps fill.
  let marker = null;
  if (style === "path") {
    marker = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), kit.material(main, "glossy"));
    head.position.y = 0.4;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 16), kit.material(main, "glossy"));
    tip.rotation.x = Math.PI;
    tip.position.y = 0.2;
    marker.add(head, tip);
    marker.position.z = 0.15;
    inner.add(marker);
  }

  function starMesh(r, c) {
    const m = new THREE.Mesh(shapeGeometry("star"), kit.material(c, "glossy"));
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox;
    const s = (2 * r) / Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
    m.scale.set(s, s, s * 0.5);
    m.position.y = -((b.min.y + b.max.y) / 2) * s;
    return m;
  }

  /** The engine, facing left (the cars trail to the right, so they fill left to right). */
  function engine(at) {
    const g = new THREE.Group();
    g.position.set(...at);
    const body = box(0.72, 0.38, 0.3, main, "glossy");
    body.position.set(-0.12, -0.08, 0);
    const cab = box(0.36, 0.62, 0.32, main, "glossy");
    cab.position.set(0.3, 0.04, 0);
    const roof = box(0.46, 0.08, 0.38, "charcoal");
    roof.position.set(0.3, 0.38, 0);
    const win = box(0.2, 0.18, 0.02, "sky", "glossy");
    win.position.set(0.3, 0.14, 0.17);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.26, 16), kit.material("charcoal", "glossy"));
    chimney.position.set(-0.32, 0.23, 0);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), kit.material(accent, "glossy"));
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(-0.49, -0.04, 0);
    const base = box(1.0, 0.08, 0.3, "charcoal");
    base.position.set(0, -0.3, 0);
    g.add(body, cab, roof, win, chimney, lamp, base, wheel(-0.32, -0.34, 0.1), wheel(0.02, -0.34, 0.12), wheel(0.34, -0.34, 0.12));
    return g;
  }

  return (t, s) => {
    for (let i = 0; i < n; i++) {
      const since = s[`f${i}`] ?? -1;
      const done = since > -1 && t >= since;
      const { empty, full, node } = slots[i];
      empty.visible = !done;
      full.visible = done;
      if (done) full.scale.setScalar(since <= -5 ? 1 : kit.popScale(t, since));
      node.rotation.z = 0;
      node.scale.setScalar(1);
      if (i === surpriseAt && !done && s.tease >= 0 && t >= s.tease && t < s.tease + 1.4) {
        const u = (t - s.tease) / 1.4;
        node.rotation.z = Math.sin(u * Math.PI * 8) * (1 - u) * 0.25;
        node.scale.setScalar(1 + 0.25 * Math.sin(Math.PI * u));
      }
    }
    if (marker) {
      const st = Math.max(0, Math.min(n, s.step ?? 0));
      const i0 = Math.max(0, Math.floor(st) - 1);
      const p0 = st < 1 ? [layout.slots[0][0] - 0.45, layout.slots[0][1], 0] : layout.slots[i0];
      const p1 = layout.slots[Math.min(n - 1, Math.max(0, Math.ceil(st) - 1))];
      const u = st < 1 ? st : st - Math.floor(st);
      marker.position.x = p0[0] + (p1[0] - p0[0]) * u;
      marker.position.y = p0[1] + (p1[1] - p0[1]) * u + Math.sin(Math.PI * u) * 0.25 + 0.05;
    }
  };
}
