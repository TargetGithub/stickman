// three.js builders for the retention kit's kinds (ENGINE_RETENTION_KIT.md): badge and timer_ring here, tracker
// in retain_tracker.js. Each is drawn facing +z with its origin at its centre (they live on the HUD), driven every
// frame by its timeline props (fill, num, numAt, rang, pulse, ...). Browser only.

import * as THREE from "three";
import { EASES } from "./ease.js";
import { drawIcon } from "./retain_icons.js";
import { BADGE_D, TIMER_D } from "./retain_layout.js";
import { buildTracker } from "./retain_tracker.js";

export const clamp01 = (k) => Math.max(0, Math.min(1, k));
const TAU = Math.PI * 2;

/** True for the kinds this module builds. */
export const isRetainKind = (kind) => kind === "badge" || kind === "timer_ring" || kind === "tracker";

/**
 * @param {object} o  plan object
 * @param {{ catalog, material, font, textGeometry }} ctx
 * @returns {{ group: THREE.Group, update?: Function }}
 */
export function buildRetain(o, ctx) {
  const group = new THREE.Group();
  group.name = o.id;
  const kit = kitTools(ctx);
  const update = o.kind === "badge" ? buildBadge(o, group, kit) : o.kind === "timer_ring" ? buildTimer(o, group, kit) : buildTracker(o, group, kit);
  return { group, update };
}

/** Small shared helpers for the kit's builders: discs, centred labels, colours and a pop-in curve. */
export function kitTools({ catalog, material, font, textGeometry }) {
  const hex = (c) => catalog.colors[c]?.hex ?? c;
  return {
    catalog,
    material,
    hex,
    /** A disc facing +z (radius r, thickness d), its front at z = d / 2. */
    disc(r, d, mat, seg = 48) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, seg), mat);
      m.rotation.x = Math.PI / 2;
      return m;
    },
    /** Extruded text centred on its middle (x and y), facing +z. */
    label(text, size, mat, depth = size * 0.2) {
      const g = textGeometry(String(text), font, size, depth).clone();
      g.computeBoundingBox();
      const b = g.boundingBox;
      g.translate(0, -(b.min.y + b.max.y) / 2, 0);
      return new THREE.Mesh(g, mat);
    },
    /** A flat, unlit copy of a colour for HUD faces that must read the same in any light. */
    flat: (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex(c)), toneMapped: false }),
    /** Pop-in scale for something that appeared at `since` (elastic over 0.5 s; 1 before any pop). */
    popScale: (t, since) => (since < 0 ? 1 : since > t ? 0.0001 : Math.max(0.0001, EASES.elasticOut(clamp01((t - since) / 0.5)))),
  };
}

/** A round sticker: a coloured rim, a white face and an icon (canvas), a short word, or nothing (a prop rides on it). */
function buildBadge(o, group, kit) {
  const r = (BADGE_D / 2) * (o.size ?? 1);
  const inner = new THREE.Group();
  group.add(inner);
  const rimColor = o.color ?? "yellow";
  inner.add(kit.disc(r, 0.12 * r, kit.material(rimColor, "glossy")));
  const face = kit.disc(r * 0.82, 0.16 * r, kit.material("white", "glossy"));
  inner.add(face);
  if (o.icon) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    drawIcon(cv.getContext("2d"), o.icon, kit.hex(rimColor), 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.3, r * 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    plane.position.z = 0.085 * r + 0.01;
    inner.add(plane);
  } else if (o.text) {
    const len = String(o.text).length;
    const size = r * [0.62, 0.48, 0.36, 0.28][Math.min(3, len - 1)];
    const t = kit.label(o.text, size, kit.material(rimColor === "white" ? "ink" : rimColor, "glossy"));
    t.position.z = 0.085 * r;
    inner.add(t);
  }
  return (t, s) => {
    const [a, b] = s.pulse ?? [-1, -1];
    inner.scale.setScalar(t >= a && t <= b ? 1 + 0.07 * Math.sin(TAU * 1.6 * (t - a)) : 1);
  };
}

/**
 * A stopwatch-like timer: a dark outline, a white face, a ring of 60 segments that drains clockwise from twelve
 * o'clock (green, then yellow, then orange as it runs out), a hand at the edge of what is left, and big countdown
 * numbers that pop in the middle.
 */
function buildTimer(o, group, kit) {
  const R = (TIMER_D / 2) * (o.size ?? 1);
  const N = 60;
  group.add(kit.disc(R + 0.07, 0.1, kit.material("charcoal", "glossy")));
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 20), kit.material("charcoal", "glossy"));
  knob.position.y = R + 0.12;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 20), kit.material(o.color ?? "green", "glossy"));
  cap.position.y = R + 0.22;
  group.add(knob, cap);
  const face = kit.disc(R - 0.02, 0.14, kit.material(o.face ?? "white", "glossy"));
  group.add(face);
  const track = new THREE.Mesh(new THREE.RingGeometry(R * 0.7, R * 0.95, 64), kit.flat("cream"));
  track.position.z = 0.075;
  group.add(track);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(kit.hex(o.color ?? "green")), toneMapped: false });
  const step = TAU / N;
  const segs = Array.from({ length: N }, (_, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(R * 0.7, R * 0.95, 2, 1, Math.PI / 2 - (i + 1) * step + step * 0.08, step * 0.84), ringMat);
    m.position.z = 0.08;
    group.add(m);
    return m;
  });
  const hand = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, R * 0.62, 0.03), kit.flat("ink"));
  stick.position.y = R * 0.31;
  hand.add(stick, kit.disc(0.07, 0.04, kit.flat("ink")));
  hand.position.z = 0.1;
  group.add(hand);
  const ink = kit.material("ink", "glossy");
  const nums = new Map([1, 2, 3, 4, 5].map((n) => {
    const m = kit.label(String(n), R * 0.62, ink, 0.06);
    m.position.z = 0.09;
    m.visible = false;
    group.add(m);
    return [n, m];
  }));
  const stops = ["green", "yellow", "orange"].map((c) => new THREE.Color(kit.hex(c)));
  const full = new THREE.Color(kit.hex(o.color ?? "green"));
  const tmp = new THREE.Color();
  return (t, s) => {
    const fill = clamp01(s.fill ?? 1);
    const gone = Math.round((1 - fill) * N);
    segs.forEach((m, i) => (m.visible = i >= gone));
    if (o.fixed) ringMat.color.copy(full);
    else if (fill > 0.5) ringMat.color.copy(tmp.copy(full).lerp(stops[1], clamp01((1 - fill) * 2)));
    else ringMat.color.copy(tmp.copy(stops[1]).lerp(stops[2], clamp01((0.5 - fill) * 3)));
    // The hand sits on the edge of what is left; it hides behind the numbers in the last seconds.
    hand.rotation.z = -(1 - fill) * TAU;
    hand.visible = !(s.num > 0) && fill > 0.001;
    for (const [n, m] of nums) {
      m.visible = s.num === n;
      if (m.visible) m.scale.setScalar(kit.popScale(t, s.numAt ?? -1));
    }
    // When it rings: the cap flashes gold for a moment.
    const ringing = s.rang >= 0 && t >= s.rang && t < s.rang + 0.8;
    cap.material = ringing && Math.floor((t - s.rang) * 8) % 2 === 0 ? kit.material("gold", "glossy") : kit.material(o.color ?? "green", "glossy");
  };
}
