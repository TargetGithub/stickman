// More progress-tracker looks (Toybox 10K), built into the slots retain_tracker.js lays out. Browser only.
//   islands: little sandy islands on a dotted sea path; a flag rises on each finished island; the surprise island
//            waits under a soft mist cloud until it fills (island map tracker)
//   town:    small houses and shops on a path that light their windows as each step is done (town map tracker)
//   gauges:  round dials whose needles swing to full and glow green (Word Workshop gauges)
//   pencil:  a page whose lines write in one by one, a big pencil riding to the newest line (growing pencil)
//   rainbow: an arch of pale bands, outermost first, each painting in its rainbow colour as a step is done; the
//            surprise is a sun (gift until it fills) at the arch's right foot
// Each style fills `empty` (before) and `full` (after) of a slot; the tracker pops `full` in at the slot's time.

import * as THREE from "three";

export const EXTRA_TRACKER_STYLES = ["islands", "town", "gauges", "pencil", "rainbow"];
const RAINBOW = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "teal", "rose", "sky"];

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

/** Type size for a stop's label: short words full size, longer ones shrunk to the stop's width (lit or not, #64). */
const stopType = (label, full = 0.16) => (label.length <= 3 ? full : Math.max(0.09, Math.min(full, 0.42 / label.length)));

/** One slot of an extra style. ctx: { i, n, p, prev, empty, full, node, label, surprise, gift, kit, main, accent, filledColor }. */
export function buildExtraSlot(style, ctx) {
  const { i, n, p, prev, empty, full, node, label, surprise, gift, kit, main, accent, filledColor } = ctx;
  const M = (c, s = "toy") => kit.material(c, s);
  if (style === "islands" || style === "town") {
    // Dotted path from the previous stop.
    if (prev) for (let j = 1; j < 4; j++) node.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), M(style === "islands" ? "white" : "grey"), prev[0] + ((p[0] - prev[0]) * j) / 4 - p[0], prev[1] + ((p[1] - prev[1]) * j) / 4 - p[1] - 0.12, 0));
  }
  if (style === "islands") {
    const isle = new THREE.Group();
    const sand = mesh(new THREE.SphereGeometry(0.26, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("sand"), 0, -0.14, 0);
    sand.scale.set(1, 0.55, 0.6);
    const palm = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.26, 8), M("wood_dark"), -0.08, 0.02, 0);
    const crown = mesh(new THREE.SphereGeometry(0.09, 12, 8), M("leaf"), -0.08, 0.17, 0);
    crown.scale.set(1.5, 0.5, 1);
    isle.add(sand, palm, crown);
    if (surprise) {
      // Hidden in mist until the finale.
      const mist = new THREE.Group();
      for (const [x, y, r] of [[-0.14, 0, 0.17], [0.05, 0.05, 0.2], [0.2, -0.02, 0.15], [0.02, -0.1, 0.16]]) mist.add(mesh(new THREE.SphereGeometry(r, 16, 12), M("white", "matte"), x, y, 0.08));
      empty.add(mist);
      full.add(isle, flag(kit, "gold", label));
    } else {
      node.add(isle);
      const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), M("charcoal"), 0.1, 0.05, 0.02);
      node.add(pole);
      if (label) empty.add(kit.label(label, stopType(label), M("grey"), 0.02).translateY(-0.36));
      full.add(flag(kit, filledColor(i), label));
    }
    return;
  }
  if (style === "town") {
    const c = filledColor(i);
    const house = new THREE.Group();
    house.add(mesh(new THREE.BoxGeometry(0.34, 0.28, 0.2), M("cream")));
    const roof = mesh(new THREE.ConeGeometry(0.27, 0.18, 4), M(surprise ? "gold" : "barn_red"), 0, 0.23, 0);
    roof.rotation.y = Math.PI / 4;
    house.add(roof, mesh(new THREE.BoxGeometry(0.09, 0.14, 0.02), M("wood_dark"), 0, -0.07, 0.105));
    node.add(house);
    for (const x of [-0.11, 0.11]) {
      empty.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), M("charcoal"), x, 0.04, 0.105));
      full.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), M("yellow", "glow"), x, 0.04, 0.105));
    }
    full.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), M(c, "glossy"), 0, 0.42, 0));
    if (label) node.add(kit.label(label, stopType(label), M("ink"), 0.02).translateY(-0.34));
    if (surprise) empty.add(gift(0.3).translateY(0.5));
    return;
  }
  if (style === "rainbow") {
    // Every band shares the arch centre (the slot's node sits there); band i is ring i from the outside.
    if (surprise) {
      empty.add(gift(0.32).translateX(1.35).translateY(0.1));
      const sun = new THREE.Group();
      sun.add(mesh(new THREE.SphereGeometry(0.2, 20, 14), M("gold", "glossy")));
      for (let k = 0; k < 8; k++) {
        const ray = mesh(new THREE.BoxGeometry(0.05, 0.12, 0.04), M("yellow", "glossy"), Math.cos((k * Math.PI) / 4) * 0.3, Math.sin((k * Math.PI) / 4) * 0.3, 0);
        ray.rotation.z = (k * Math.PI) / 4 - Math.PI / 2;
        sun.add(ray);
      }
      sun.position.set(1.35, 0.12, 0.05);
      full.add(sun);
      return;
    }
    const r = 1.05 - i * Math.min(0.13, 0.75 / Math.max(1, n - 1));
    const band = (c, tube, z) => mesh(new THREE.TorusGeometry(r, tube, 12, 48, Math.PI), M(c, c === "cream" ? "matte" : "glossy"), 0, 0, z);
    empty.add(band("cream", 0.045, 0));
    full.add(band(RAINBOW[i % RAINBOW.length], 0.062, 0.01));
    if (label) node.add(kit.label(label, 0.12, M("ink"), 0.02).translateX(-r).translateY(-0.14));
    return;
  }
  if (style === "gauges") {
    const R = 0.3;
    node.add(kit.disc(R + 0.04, 0.05, M(main, "glossy")), kit.disc(R, 0.07, M("cream")).translateZ(0.005));
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI * (1 - k / 4);
      const tick = mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), M("ink"), Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8 - 0.05, 0.05);
      tick.rotation.z = a - Math.PI / 2;
      node.add(tick);
    }
    const needle = (angle, c) => {
      const g = new THREE.Group();
      g.position.set(0, -0.05, 0.06);
      const bar = mesh(new THREE.BoxGeometry(0.035, R * 0.75, 0.02), M(c, "glossy"), 0, R * 0.37, 0);
      g.add(bar, mesh(new THREE.SphereGeometry(0.05, 12, 8), M("charcoal", "glossy")));
      g.rotation.z = angle;
      return g;
    };
    empty.add(needle(Math.PI / 2, "red"));
    full.add(needle(-Math.PI / 2 + 0.25, "green"), kit.disc(0.07, 0.03, M("green", "glow")).translateY(-0.2).translateZ(0.06));
    if (surprise) empty.add(gift(0.28).translateY(0.42));
    // Word names ("closed", "flex") shrink to stay under their dial.
    if (label) node.add(kit.label(label, stopType(label, 0.15), M("ink"), 0.02).translateY(-0.44));
    return;
  }
  // pencil: one written line per slot on a page (the page and the pencil are added by addPencilPage).
  const len = 0.95 - (i % 3) * 0.15;
  empty.add(mesh(new THREE.BoxGeometry(len, 0.015, 0.01), M("sky"), len / 2, -0.06, 0.02));
  full.add(mesh(new THREE.BoxGeometry(len, 0.05, 0.02), M(surprise ? "gold" : "ink"), len / 2, -0.04, 0.03));
  if (surprise) empty.add(gift(0.24).translateX(1.25));
  else if (label) node.add(kit.label(label, 0.14, M("grey"), 0.02).translateX(-0.12));
}

function flag(kit, color, label) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), kit.material("charcoal", "toy"), 0.1, 0.08, 0.02));
  const cloth = mesh(new THREE.BoxGeometry(0.16, 0.11, 0.015), kit.material(color, "glossy"), 0.18, 0.2, 0.02);
  g.add(cloth);
  if (label) g.add(kit.label(label, stopType(label), kit.material("ink", "toy"), 0.02).translateY(-0.36));
  return g;
}

/** The pencil style's page behind the lines, and the pencil that rides to the newest line (returned updater). */
export function addPencilPage(inner, layout, kit) {
  const page = mesh(new THREE.BoxGeometry(1.35, layout.height + 0.2, 0.03), kit.material("white", "matte"), 0.62, -layout.height / 2 + 0.06, -0.01);
  inner.add(page);
  const pencil = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 6), kit.material("yellow", "glossy"), 0, 0.36, 0);
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 6), kit.material("sand", "toy"), 0, 0, 0);
  tip.rotation.x = Math.PI;
  const lead = mesh(new THREE.ConeGeometry(0.018, 0.04, 6), kit.material("charcoal", "toy"), 0, -0.04, 0);
  lead.rotation.x = Math.PI;
  const eraser = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), kit.material("pink", "toy"), 0, 0.7, 0);
  pencil.add(body, tip, lead, eraser);
  pencil.rotation.z = -0.5;
  pencil.position.z = 0.12;
  inner.add(pencil);
  return (step) => {
    const st = Math.max(0, Math.min(layout.slots.length, step));
    const i = Math.max(0, Math.ceil(st) - 1);
    const p = layout.slots[i];
    const u = st - Math.floor(st);
    pencil.position.x = p[0] + (st < 1 ? st : u > 0 ? u : 1) * (0.95 - (i % 3) * 0.15);
    pencil.position.y = p[1] + 0.04 + Math.sin(u * Math.PI * 6) * 0.02;
  };
}
