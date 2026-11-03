// three.js builders for the teaching kit (catalog/kinds.json): number lines, fraction bars and circles and
// arrays here; grids, cubes, pointers, callouts and angles in teach_more.js; marks and glows in teach_marks.js.
// Every piece is its own node (named "p1", "s1", "i1", ... for <id>#<piece> targets), driven each frame by the
// object's timeline props (built, buildOrder, shaded, shadeColor, drawn, ...). Browser and Node.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";
import { buildModel } from "./models.js";
import { LINE_TOP, lineLabels, lineTicks, withDefaults, rowCol } from "./teach_layout.js";
import { blendColor, builder, clamp01, colorRGB, labelMaker, ownMaterial, roundedBox, setPiece, solid } from "./teach_common.js";
import { buildAngle, buildCallout, buildCubes, buildGrid, buildPointer } from "./teach_more.js";
import { buildGlow, buildMark } from "./teach_marks.js";

const BUILDERS = {
  number_line: buildNumberLine, fraction_bar: buildFractionBar, fraction_circle: buildFractionCircle, array: buildArray,
  grid: buildGrid, cubes: buildCubes, pointer: buildPointer, callout: buildCallout, angle: buildAngle, _mark: buildMark, _glow: buildGlow,
};

/** True for the kinds this module builds (the teaching kit plus the internal _mark and _glow helpers). */
export const isTeachKind = (kind) => kind in BUILDERS;

/**
 * @param {object} o  plan object
 * @param {{ catalog, material, font, textGeometry, handles: Map }} ctx
 * @returns {{ group: THREE.Group, named?: Map, update?: Function }}
 */
export function buildTeach(o, ctx) {
  const group = new THREE.Group();
  group.name = o.id;
  return { group, ...BUILDERS[o.kind](withDefaults(o), group, { ...ctx, raw: o }) };
}

/** Apply a piece's timeline offset ("<id>#p2" position and rotation) on top of its rest pose. */
function offsetPiece(node, rest, sub) {
  node.position.copy(rest);
  if (sub?.position) node.position.add(new THREE.Vector3(...sub.position));
  node.rotation.set(...(sub?.rotation ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180));
}

/**
 * A toy number line: a rounded beam on two legs whose top is LINE_TOP above at (objects stand there), ticks
 * hanging down its front face (longer at labelled ticks) and the numbers under them, like a textbook line.
 */
function buildNumberLine(o, group, { material, font, textGeometry }) {
  const L = o.length;
  const W = L + 1.2; // room past both ends for the legs, clear of the end numbers
  const barH = 0.12;
  const barY = LINE_TOP - barH / 2;
  const depth = 0.3;
  const color = material(o.color, "toy");
  const bar = solid(roundedBox(W, barH, depth, 0.05), color);
  bar.position.y = barY;
  group.add(bar);
  const legs = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.position.set(side * (W / 2 - 0.09), 0, -0.04);
    const post = solid(roundedBox(0.09, LINE_TOP - barH, 0.09, 0.03), color);
    post.position.y = (LINE_TOP - barH) / 2;
    const foot = solid(roundedBox(0.18, 0.05, 0.3, 0.02), color);
    foot.position.y = 0.025;
    g.add(post, foot);
    group.add(g);
    return g;
  });
  const ticks = lineTicks(o);
  const labels = lineLabels(o);
  const size = Math.max(0.12, Math.min(0.2, 0.05 + L / 40));
  const big = labelMaker(textGeometry, font, size, 0.05);
  const small = labelMaker(textGeometry, font, size * 0.78, 0.04);
  const minorLabels = labels.some((x, j) => x != null && !ticks[j].major);
  const ink = material("ink", "toy");
  const white = material("white", "glossy");
  const pieces = ticks.map((t, i) => {
    const g = new THREE.Group();
    g.position.x = t.x;
    // A white stripe across the top where the value is, and a tick down the front face and below the beam.
    const stripe = solid(roundedBox(t.major ? 0.05 : 0.035, 0.016, depth - 0.02, 0.006), white);
    stripe.position.y = LINE_TOP + 0.002;
    const ext = t.major ? 0.11 : 0.06;
    const tick = solid(roundedBox(t.major ? 0.05 : 0.035, barH + ext, 0.03, 0.012), ink);
    tick.position.set(0, LINE_TOP - (barH + ext) / 2, depth / 2 + 0.012);
    g.add(stripe, tick);
    if (labels[i] != null) {
      const geo = (t.major || !minorLabels ? big : small)(labels[i]);
      const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
      const text = solid(geo, ink);
      text.position.set(0, Math.max(0.01, LINE_TOP - barH - ext - 0.05 - h), depth / 2 - 0.02);
      g.add(text);
    }
    group.add(g);
    return g;
  });
  return {
    update(t, s) {
      const built = builder(o, s);
      const drawn = s.drawn ?? 1;
      bar.scale.x = Math.max(1e-4, drawn);
      bar.position.x = (-W / 2) * (1 - drawn);
      bar.visible = drawn > 0.001;
      // Legs, ticks and numbers appear as the drawn beam reaches them (draw), and in turn when built (build).
      const reached = (x) => clamp01((drawn * W - (x + W / 2)) / 0.25 + 1);
      legs.forEach((g, i) => setPiece(g, reached(i ? W / 2 - 0.3 : -W / 2 + 0.09)));
      pieces.forEach((g, i) => setPiece(g, Math.min(built(i), reached(ticks[i].x))));
    },
  };
}

/** A bar cut into equal parts (gaps between them), shaded from the left; label shows "shaded/parts" above. */
function buildFractionBar(o, group, { catalog, material, font, textGeometry }) {
  const n = o.parts;
  const gap = Math.min(0.05, (o.length / n) * 0.1);
  const w = (o.length - gap * (n - 1)) / n;
  const geo = roundedBox(w, o.height, 0.3, Math.min(0.07, w * 0.18, o.height * 0.2));
  const named = new Map();
  const rests = [];
  const mats = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.position.set(-o.length / 2 + w / 2 + i * (w + gap), o.height / 2, 0);
    const m = ownMaterial(material, o.empty);
    g.add(solid(geo, m));
    group.add(g);
    named.set(`p${i + 1}`, g);
    rests.push(g.position.clone());
    mats.push(m);
  }
  const label = fractionLabel(o, group, { material, font, textGeometry }, o.height + 0.14, Math.min(0.32, 0.12 + o.length / 18));
  const empty = colorRGB(catalog, o.empty);
  return {
    named,
    update(t, s, state) {
      const built = builder(o, s);
      [...named.values()].forEach((g, i) => {
        offsetPiece(g, rests[i], state[`${o.id}#p${i + 1}`]);
        setPiece(g, built(i));
        blendColor(mats[i], empty, s.shadeColor, (s.shaded ?? 0) - i);
      });
      label?.(s, built(n - 1));
    },
  };
}

/** A pie standing on its rim, facing the camera, cut into equal slices from 12 o'clock going clockwise. */
function buildFractionCircle(o, group, { catalog, material, font, textGeometry }) {
  const n = o.parts;
  const R = o.radius;
  const depth = R * 0.22;
  const bevel = R * 0.035;
  const gap = n > 1 ? R * 0.035 : 0;
  const center = new THREE.Group();
  center.position.y = R + bevel + 0.02;
  group.add(center);
  const named = new Map();
  const rests = [];
  const mats = [];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI / 2 - (i * 2 * Math.PI) / n;
    const a1 = a0 - (2 * Math.PI) / n;
    const shape = new THREE.Shape();
    if (n === 1) shape.absarc(0, 0, R - bevel, 0, Math.PI * 2, false);
    else {
      shape.moveTo(0, 0);
      shape.absarc(0, 0, R - bevel, a0, a1, true);
      shape.lineTo(0, 0);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: Math.max(8, Math.ceil(96 / n)) });
    geo.translate(0, 0, -depth / 2);
    const m = ownMaterial(material, o.empty);
    const g = new THREE.Group();
    const mid = (a0 + a1) / 2;
    g.position.set(Math.cos(mid) * gap, Math.sin(mid) * gap, 0);
    g.add(solid(geo, m));
    center.add(g);
    named.set(`s${i + 1}`, g);
    rests.push(g.position.clone());
    mats.push(m);
  }
  const label = fractionLabel(o, group, { material, font, textGeometry }, 2 * R + 0.22, Math.min(0.32, 0.12 + R * 0.16));
  const empty = colorRGB(catalog, o.empty);
  return {
    named,
    update(t, s, state) {
      const built = builder(o, s);
      [...named.values()].forEach((g, i) => {
        offsetPiece(g, rests[i], state[`${o.id}#s${i + 1}`]);
        setPiece(g, built(i));
        blendColor(mats[i], empty, s.shadeColor, (s.shaded ?? 0) - i);
      });
      label?.(s, built(n - 1));
    },
  };
}

/** "shaded/parts" over a fraction bar or circle (label: true): the number follows the shading. */
function fractionLabel(o, group, { material, font, textGeometry }, y, size) {
  if (!o.label) return null;
  const make = labelMaker(textGeometry, font, size, size * 0.25);
  const mesh = solid(make(`0/${o.parts}`), material("ink", "toy"));
  mesh.position.y = y;
  group.add(mesh);
  return (s, k) => {
    mesh.geometry = make(`${Math.round(s.shaded ?? 0)}/${o.parts}`);
    setPiece(mesh, k);
  };
}

/** Rows and columns of equal things standing up like a pegboard (row 1 on top); trays: a tray under each row. */
function buildArray(o, group, { catalog, material, raw }) {
  const pitch = o.size + o.gap;
  const tray = o.trays ? 0.06 : 0;
  const rowH = o.size + o.gap + tray;
  const named = new Map();
  const items = [];
  const shadeable = o.item === "dot" || !!catalog.shapes[o.item];
  const geo = o.item === "dot" ? shapeGeometry("sphere") : catalog.shapes[o.item] ? shapeGeometry(o.item) : null;
  const trays = [];
  for (let r = 0; r < o.rows; r++) {
    const y0 = (o.rows - 1 - r) * rowH + (o.trays ? 0.02 : 0);
    if (o.trays) {
      const t = solid(roundedBox(o.cols * pitch + 0.12, tray, o.size * 1.25, 0.025), material("sand", "toy"));
      t.position.set(0, y0 + tray / 2, 0);
      group.add(t);
      trays.push(t);
    }
  }
  for (let i = 0; i < o.rows * o.cols; i++) {
    const [r, c] = rowCol(o, i);
    const y0 = (o.rows - 1 - r) * rowH + (o.trays ? 0.02 + tray : 0);
    const g = new THREE.Group();
    g.position.set((c - (o.cols - 1) / 2) * pitch, y0, 0);
    let mat = null;
    if (geo) {
      mat = ownMaterial(material, o.color, o.item === "dot" ? "glossy" : "toy");
      const m = solid(geo, mat);
      m.scale.setScalar(o.size);
      m.position.y = -geo.boundingBox.min.y * o.size;
      g.add(m);
    } else {
      const built = buildModel({ id: `${o.id}_${i}`, size: o.size, color: raw.color }, catalog.props[o.item], material);
      g.add(built.group);
    }
    group.add(g);
    named.set(`i${i + 1}`, g);
    items.push({ g, mat });
  }
  const base = colorRGB(catalog, o.color);
  return {
    named,
    update(t, s) {
      const built = builder(o, s);
      items.forEach(({ g, mat }, i) => {
        setPiece(g, built(i));
        if (shadeable) blendColor(mat, base, s.shadeColor, (s.shaded ?? 0) - i);
      });
      // A tray comes in with the first item of its row.
      trays.forEach((tr, r) => setPiece(tr, built(r * o.cols)));
    },
  };
}
