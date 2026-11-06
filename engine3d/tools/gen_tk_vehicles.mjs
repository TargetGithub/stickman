#!/usr/bin/env node
// Writes catalog/models/tk_vehicles.json: vehicles and big toy props for the Toybox 10K wave (safari jeep, studio
// mic, word workbench, lighthouse, bus, train tunnel, airplane, bike, stroller, toy submarine, tractor, wheelbarrow,
// helicopter, ambulance, canal lock, carousel, digger, moving truck, paper towel roll, pound weight, soccer ball,
// baseball bat). Parts are laid out here in code (wheels with bolts, rods between points, arches), so edit this
// file, not the JSON:
//   node engine3d/tools/gen_tk_vehicles.mjs
// Conventions: every vehicle faces +z (its front), stands on y = 0, its left is +x. Give it rotation [0, 90, 0] to
// drive toward +x (then its right side, -x, faces the camera: bus and van doors are there). Wheels are named
// `wheels`: each wheel's pivot is its axle centre with no rest rotation, so `turn` `<id>#wheels` by [360, 0, 0]
// (positive x) rolls it forward one turn.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEG = 180 / Math.PI;
const rd = (v) => Math.round(v * 1000) / 1000;
const r3 = (v) => (Array.isArray(v) ? v.map(rd) : rd(v));
const P = (p, at, s, o = {}) => {
  const q = { p, at: r3(at), s: r3(s), ...o };
  for (const k of ["r", "hr", "hang"]) if (o[k]) q[k] = r3(o[k]);
  return q;
};
const M = { mirror: true };

/** Rotation (degrees, XYZ) that turns +y toward direction n. */
function yTo(n) {
  const L = Math.hypot(...n);
  const [x, y, z] = n.map((v) => v / L);
  return [Math.atan2(z, y) * DEG, 0, -Math.asin(x) * DEG];
}
/** Rotation (degrees, XYZ) that turns +z toward direction n. */
function zTo(n) {
  const L = Math.hypot(...n);
  const [x, y, z] = n.map((v) => v / L);
  return [Math.atan2(-y, z) * DEG, Math.asin(x) * DEG, 0];
}
/** A cylinder rod from p0 to p1, width w (round joints are separate spheres). */
function rod(p0, p1, w, o = {}) {
  const d = p1.map((v, i) => v - p0[i]);
  const L = Math.hypot(...d);
  const mid = p0.map((v, i) => (v + p1[i]) / 2);
  return P("cylinder", mid, [w, L, w], { ...o, r: yTo(d) });
}
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);

/**
 * A chunky toy wheel with its axle along x: a round tyre, a hub, a cap and five bolts (so a roll reads). All its
 * pieces share the pivot at the axle centre and are offset with hang, so turning `wheels` about x rolls it.
 * side: +1 = the outer face is +x (a left wheel; with mirror: true the copy gets its outer face at -x).
 */
function wheel(at, r, w, { tyre = "charcoal", hub = "cream", bolt = "grey", mirror = false, name = "wheels", side = 1, both = false } = {}) {
  const o = { name, ...(mirror ? M : {}) };
  const out = [
    P("torus", at, [2 * r, 2 * r, w / 0.3], { c: tyre, m: "rubber", hr: [0, 90, 0], ...o }),
    P("cylinder", at, [1.7 * r, w * 0.78, 1.7 * r], { c: tyre, m: "rubber", hr: [0, 0, 90], ...o }),
  ];
  for (const sd of both ? [1, -1] : [side]) {
    out.push(P("cylinder", at, [1.08 * r, w * 0.5, 1.08 * r], { c: hub, hr: [0, 0, 90], hang: [sd * w * 0.25, 0, 0], ...o }));
    out.push(P("sphere", at, [w * 0.22, 0.46 * r, 0.46 * r], { c: hub, m: "glossy", hang: [sd * w * 0.5, 0, 0], ...o }));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 2 * Math.PI + 0.3;
      out.push(P("sphere", at, [w * 0.12, 0.1 * r, 0.1 * r], { c: bolt, hang: [sd * w * 0.5, 0.37 * r * Math.cos(a), 0.37 * r * Math.sin(a)], ...o }));
    }
  }
  return out;
}

const props = {};

// ---------------------------------------------------------------- safari jeep
{
  const W = 0.3, WW = 0.26;
  const parts = [
    // chassis tub: a chunky rounded body, an olive band, flat bumpers
    P("block", [0, 0.5, 0], [1.08, 0.38, 2.05], {}),
    P("block", [0, 0.39, 0], [1.1, 0.14, 2.0], { c: "leaf" }),
    P("block", [0, 0.75, 0.63], [1.0, 0.18, 0.8], {}), // hood
    P("block", [0, 0.82, 0.63], [0.6, 0.04, 0.62], { c: "sand", m: "matte" }), // hood panel (badge row sits on it)
    P("block", [0, 0.36, 1.06], [1.14, 0.13, 0.12], { c: "charcoal" }), // front bumper
    P("block", [0, 0.36, -1.06], [1.14, 0.13, 0.12], { c: "charcoal" }), // rear bumper
    // grille and headlight eyes
    P("block", [0, 0.6, 1.03], [0.44, 0.24, 0.06], { c: "leaf" }),
    ...[-0.12, -0.04, 0.04, 0.12].map((x) => P("box", [x, 0.6, 1.065], [0.035, 0.18, 0.02], { c: "charcoal" })),
    P("cylinder", [0.34, 0.64, 1.035], [0.23, 0.07, 0.23], { c: "leaf", r: [90, 0, 0], ...M }),
    P("sphere", [0.34, 0.64, 1.07], [0.18, 0.18, 0.09], { c: "cream", m: "glow", ...M }),
    P("sphere", [0.37, 0.67, 1.11], [0.045, 0.045, 0.02], { c: "white", m: "light", ...M }),
    // fenders: green arches over each wheel
    ...[0.66, -0.62].map((z) => P("block", [0.58, 0.66, z], [0.34, 0.08, 0.74], { c: "leaf", ...M })),
    ...[0.66, -0.62].map((z) => P("block", [0.58, 0.59, z + 0.35], [0.33, 0.14, 0.06], { c: "leaf", ...M })),
    // open cab: low side walls and a back wall
    P("block", [0.5, 0.79, -0.36], [0.09, 0.22, 1.32], {}, ),
    P("block", [-0.5, 0.79, -0.36], [0.09, 0.22, 1.32], {}),
    P("block", [0, 0.79, -0.99], [1.08, 0.22, 0.09], {}),
    P("block", [0.5, 0.91, -0.36], [0.11, 0.04, 1.34], { c: "leaf", ...M }), // green rails along the top of the walls
    P("block", [0, 0.91, -0.99], [1.1, 0.04, 0.11], { c: "leaf" }),
    // seats (front pair + a back bench), cream cushions
    P("block", [0.24, 0.75, 0.02], [0.36, 0.1, 0.36], { c: "cream", m: "matte", ...M }),
    P("block", [0.24, 0.95, -0.16], [0.36, 0.36, 0.09], { c: "cream", m: "matte", r: [-8, 0, 0], ...M }),
    P("block", [0, 0.75, -0.68], [0.86, 0.1, 0.36], { c: "cream", m: "matte" }),
    P("block", [0, 0.95, -0.86], [0.86, 0.34, 0.09], { c: "cream", m: "matte", r: [-8, 0, 0] }),
    // windscreen: a green frame round see-through glass
    rod([0.47, 0.84, 0.28], [0.45, 1.24, 0.24], 0.05, { c: "leaf", ...M }),
    rod([-0.45, 1.24, 0.24], [0.45, 1.24, 0.24], 0.05, { c: "leaf" }),
    P("box", [0, 1.04, 0.26], [0.88, 0.36, 0.025], { c: "sky", m: "glass", r: [-6, 0, 0] }),
    // steering wheel
    rod([0.24, 0.8, 0.3], [0.24, 0.98, 0.17], 0.035, { c: "charcoal" }),
    P("torus", [0.24, 0.99, 0.16], [0.2, 0.2, 0.15], { c: "charcoal", r: [-35, 0, 0] }),
    // roll bar: an olive hoop with braces to the back corners
    rod([0.47, 0.88, -0.42], [0.47, 1.36, -0.42], 0.065, { c: "charcoal", ...M }),
    ball([0.47, 1.38, -0.42], 0.09, { c: "charcoal", ...M }),
    rod([-0.47, 1.4, -0.42], [0.47, 1.4, -0.42], 0.065, { c: "charcoal" }),
    rod([0.47, 1.37, -0.44], [0.47, 0.9, -0.96], 0.05, { c: "charcoal", ...M }),
    // spare tyre on the back
    P("torus", [0, 0.74, -1.14], [0.5, 0.5, 0.7], { c: "charcoal", m: "rubber" }),
    P("cylinder", [0, 0.74, -1.13], [0.32, 0.16, 0.32], { c: "leaf", r: [90, 0, 0] }),
    P("sphere", [0, 0.74, -1.21], [0.12, 0.12, 0.05], { c: "cream", m: "glossy" }),
    // rear lights
    P("sphere", [0.42, 0.55, -1.03], [0.09, 0.09, 0.05], { c: "red", m: "glow", ...M }),
    // badge spots: a row of four empty cream dimples on the hood
    ...[-0.33, -0.11, 0.11, 0.33].map((x) => P("cylinder", [x, 0.85, 0.66], [0.12, 0.02, 0.12], { c: "cream", m: "matte", name: "badge_spots" })),
    ...wheel([0.58, W, 0.66], W, WW, { mirror: true, hub: "leaf", bolt: "cream" }),
    ...wheel([0.58, W, -0.62], W, WW, { mirror: true, hub: "leaf", bolt: "cream" }),
  ];
  props.safari_jeep = {
    color: "sand",
    description: "A chunky friendly open-top toy safari jeep, 2.25 m long and 1.45 m tall, faces +z: sand body with an olive band, green fenders, round headlight eyes, a green-framed windscreen, a roll bar over the back seat and a spare tyre on the back. Seats (parent a critter to the jeep, clip Sitting): driver front left at [0.24, 0.8, 0.02], front right [-0.24, 0.8, 0.02], back bench [±0.25, 0.8, -0.68]. Named parts: `wheels` (turn by [360, 0, 0] per roll forward; rotation [0, 90, 0] drives toward +x) and `badge_spots` (a row of four empty cream dimples on the hood at x -0.33, -0.11, 0.11, 0.33, y 0.86, z 0.66: put a badge of size ~0.12 there turned [-90, 0, 0]).",
    tags: ["vehicles", "safari", "transport", "animals", "toy"],
    parts,
  };
}

// ---------------------------------------------------------------- studio mic
{
  const Y = 1.25; // centre of the mic head
  const parts = [
    P("cylinder", [0, 0.03, 0], [0.56, 0.06, 0.56], { c: "charcoal", m: "glossy" }),
    P("cylinder", [0, 0.07, 0], [0.16, 0.06, 0.16], { c: "grey", m: "metal" }),
    P("cylinder", [0, 0.6, 0], [0.05, 1.08, 0.05], { c: "grey", m: "metal" }),
    ball([0, 1.07, 0], 0.09, { c: "charcoal" }),
    P("cylinder", [0, 1.11, 0], [0.12, 0.08, 0.12], { c: "charcoal", m: "glossy" }),
    P("cylinder", [0, Y - 0.26, 0], [0.2, 0.1, 0.2], { c: "charcoal", m: "glossy" }),
    P("sphere", [0, Y, 0], [0.44, 0.54, 0.44], { c: "grey", m: "metal", name: "mic" }),
    // grille bands round the head
    ...[-0.18, -0.09, 0.09, 0.18].map((dy) => {
      const k = Math.sqrt(1 - (dy / 0.27) ** 2);
      return P("hoop", [0, Y + dy, 0], [0.45 * k, 1, 0.45 * k], { c: "charcoal", name: "mic" });
    }),
    P("torus", [0, Y, 0], [0.54, 0.54, 0.22], { c: "sky", m: "light", r: [90, 0, 0], name: "ring" }),
  ];
  props.studio_mic = {
    color: "sky",
    description: "A big round studio microphone on a stand, 1.5 m tall (mouth height for a critter of about 1.1 m: the head centre is at y 1.3; scale the prop to fit a smaller singer): a dark base, a metal pole, a silver ball head with grille bands (named part `mic`, wiggle it) and a glowing band round its middle (named part `ring`, light material in the main colour: set `color` to change the glow, pulse it with paint or pop while someone sings).",
    tags: ["music", "singing", "studio", "sound", "stage"],
    parts,
  };
}

// ---------------------------------------------------------------- word workbench
{
  const parts = [
    P("block", [0, 0.85, 0], [2.6, 0.1, 0.8], { c: "wood" }),
    ...[[1.18, 0.3], [1.18, -0.3]].map(([x, z]) => P("block", [x, 0.4, z], [0.1, 0.8, 0.1], { c: "wood_dark", ...M })),
    P("block", [0, 0.24, 0], [2.4, 0.05, 0.62], { c: "wood_dark" }),
    // drawers under the top
    ...[-0.75, 0, 0.75].map((x) => P("block", [x, 0.7, 0.37], [0.62, 0.18, 0.05], { c: "wood" })),
    ...[-0.75, 0, 0.75].map((x) => ball([x, 0.7, 0.41], 0.06, { c: "gold", m: "metal" })),
    // tile rail along the front edge: tiles stand in the groove at z 0.34, bottom on y 0.9
    P("block", [0, 0.93, 0.39], [2.56, 0.06, 0.04], { c: "wood_dark", name: "rail" }),
    P("block", [0, 0.95, 0.29], [2.56, 0.1, 0.04], { c: "wood_dark", name: "rail" }),
    // camera spot: a mint mat on the top with corner marks
    P("plate", [0, 0.905, -0.06], [0.8, 0.3, 0.46], { c: "mint", m: "matte", name: "camera_spot" }),
    ...[[0.36, 0.17], [-0.36, 0.17], [0.36, -0.29], [-0.36, -0.29]].map(([x, z]) => P("plate", [x, 0.912, z], [0.06, 0.3, 0.06], { c: "teal", m: "matte" })),
    // pegboard with hooks and tools behind
    P("block", [1.15, 1.32, -0.36], [0.06, 0.86, 0.06], { c: "wood_dark", ...M }),
    P("block", [0, 1.36, -0.37], [2.36, 0.72, 0.04], { c: "cork", m: "matte", name: "pegboard" }),
    ...[-0.9, -0.45, 0.45, 0.9].map((x) => rod([x, 1.62, -0.35], [x, 1.62, -0.27], 0.03, { c: "grey", m: "metal" })),
    // ruler
    P("box", [-0.9, 1.4, -0.31], [0.08, 0.42, 0.02], { c: "yellow" }),
    ...[0, 1, 2, 3, 4].map((k) => P("box", [-0.92, 1.25 + k * 0.075, -0.298], [0.04, 0.01, 0.01], { c: "charcoal" })),
    // magnifier
    P("torus", [-0.45, 1.46, -0.31], [0.22, 0.22, 0.15], { c: "red" }),
    P("cylinder", [-0.45, 1.46, -0.31], [0.15, 0.02, 0.15], { c: "sky", m: "glass", r: [90, 0, 0] }),
    rod([-0.45, 1.35, -0.31], [-0.45, 1.2, -0.31], 0.045, { c: "red" }),
    // paintbrush
    rod([0.45, 1.6, -0.31], [0.45, 1.3, -0.31], 0.035, { c: "blue" }),
    P("cylinder", [0.45, 1.28, -0.31], [0.05, 0.05, 0.05], { c: "grey", m: "metal" }),
    P("drop", [0.45, 1.22, -0.31], [0.07, 0.1, 0.06], { c: "orange", r: [0, 0, 180] }),
    // letter stamp
    P("cylinder", [0.9, 1.52, -0.31], [0.08, 0.14, 0.08], { c: "purple" }),
    P("block", [0.9, 1.42, -0.31], [0.14, 0.06, 0.1], { c: "wood_dark" }),
    // tile tray at the right end with blank tiles
    P("block", [1.0, 0.94, -0.12], [0.42, 0.08, 0.3], { c: "wood_dark" }),
    ...[["red", 0.88], ["blue", 0.98], ["yellow", 1.08], ["green", 1.16]].map(([c, x], k) => P("block", [x, 0.99, -0.12 + (k % 2) * 0.05], [0.09, 0.1, 0.03], { c, r: [-15, 0, 0] })),
    // pencil cup at the left end
    P("cup", [-1.0, 0.98, -0.15], [0.14, 0.16, 0.14], { c: "teal" }),
    rod([-1.02, 0.95, -0.15], [-1.05, 1.15, -0.12], 0.025, { c: "yellow" }),
    rod([-0.98, 0.95, -0.16], [-0.96, 1.13, -0.2], 0.025, { c: "pink" }),
  ];
  props.word_workbench = {
    color: "wood",
    description: "Robo's long wooden word-work bench, 2.6 m wide, 0.8 m deep, top at y 0.9 (pegboard top 1.72), faces +z. Named parts: `rail` (a tile rail along the front edge: tiles stand in its groove at z 0.34 with their bottom on y 0.9, from x -1.25 to 1.25), `camera_spot` (a mint mat with teal corner marks for the top-down camera, centre [0, 0.91, -0.06], 0.8 × 0.46) and `pegboard` (cork board behind with hooks, a ruler, a magnifier, a paintbrush and a letter stamp). A tray of blank tiles sits at the right end, a pencil cup at the left. The word_machine stands beside it (at x ±2.2).",
    tags: ["phonics", "workshop", "word_work", "furniture", "school"],
    parts,
  };
}

// ---------------------------------------------------------------- lighthouse
{
  const bands = [0.74, 0.7, 0.66, 0.62, 0.58];
  const parts = [
    P("sphere", [0, 0.1, 0], [1.4, 0.5, 1.25], { c: "grey", m: "matte" }),
    P("sphere", [0.5, 0.1, 0.3], [0.55, 0.4, 0.5], { c: "charcoal", m: "matte" }),
    P("sphere", [-0.45, 0.08, -0.3], [0.6, 0.36, 0.55], { c: "grey", m: "matte" }),
    P("sphere", [-0.3, 0.07, 0.5], [0.4, 0.26, 0.35], { c: "charcoal", m: "matte" }),
    ...bands.map((d, i) => P("cylinder", [0, 0.45 + i * 0.3, 0], [d, 0.3, d], { c: i % 2 ? "white" : undefined, m: "glossy" })),
    // door and windows
    P("block", [0, 0.46, 0.36], [0.2, 0.3, 0.06], { c: "wood_dark" }),
    P("cylinder", [0, 1.07, 0.335], [0.12, 0.03, 0.12], { c: "sky", m: "glossy", r: [90, 0, 0] }),
    P("cylinder", [0, 1.65, 0.3], [0.11, 0.03, 0.11], { c: "sky", m: "glossy", r: [90, 0, 0] }),
    // gallery with a railing
    P("cylinder", [0, 1.98, 0], [0.86, 0.07, 0.86], { c: "charcoal", m: "glossy" }),
    P("hoop", [0, 2.08, 0], [0.84, 1.2, 0.84], { c: "charcoal" }),
    P("hoop", [0, 2.17, 0], [0.84, 1.2, 0.84], { c: "charcoal" }),
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => P("cylinder", [0.41 * Math.sin(a / DEG), 2.09, 0.41 * Math.cos(a / DEG)], [0.02, 0.18, 0.02], { c: "charcoal" })),
    // lamp room
    P("cylinder", [0, 2.02, 0], [0.5, 0.06, 0.5], { c: "white" }),
    P("cylinder", [0, 2.24, 0], [0.46, 0.38, 0.46], { c: "sky", m: "glass" }),
    ...[0, 90, 180, 270].map((a) => P("cylinder", [0.23 * Math.sin((a + 45) / DEG), 2.24, 0.23 * Math.cos((a + 45) / DEG)], [0.03, 0.38, 0.03], { c: "charcoal" })),
    P("sphere", [0, 2.24, 0], [0.22, 0.22, 0.22], { c: "yellow", m: "light", name: "lamp" }),
    P("cylinder", [0, 2.45, 0], [0.54, 0.05, 0.54], { c: "charcoal" }),
    P("cone", [0, 2.6, 0], [0.56, 0.28, 0.56], {}),
    ball([0, 2.78, 0], 0.1, { c: "charcoal" }),
    // the beam: a long see-through cone from the lamp toward +z, turning about y
    P("cone", [0, 2.24, 0], [0.75, 2.6, 0.42], { c: "yellow", m: "glass", hr: [-90, 0, 0], hang: [0, 0, 1.3], name: "beam" }),
  ];
  props.lighthouse = {
    color: "red",
    description: "A small striped toy lighthouse on a rock, 2.8 m tall: red and white bands (main colour red), a door, a dark gallery with a railing, a glass lamp room and a red cone roof. Named parts: `lamp` (a glowing yellow ball in the lamp room at [0, 2.24, 0]: pulse it or paint it) and `beam` (a long soft see-through cone, 2.6 m, from the lamp toward +z: `spin` `<id>#beam` about y, slowly, to sweep; paint it for a coloured beam, or add two more beam props for a split beam).",
    tags: ["sea", "coast", "buildings", "light", "boats"],
    parts,
  };
}

// ---------------------------------------------------------------- bus
{
  const parts = [
    P("block", [0, 0.78, 0], [1.14, 0.98, 2.7], {}),
    P("block", [0, 1.29, 0], [1.08, 0.08, 2.6], { c: "white" }),
    P("block", [0, 0.6, 0], [1.16, 0.07, 2.66], { c: "white" }), // band along the sides
    P("block", [0, 0.33, 0], [1.1, 0.1, 2.66], { c: "charcoal" }), // skirt
    // windows: four each side, and a driver window on the left
    ...[-1.0, -0.48, 0.04, 0.56].map((z) => P("block", [0.575, 0.98, z], [0.03, 0.36, 0.44], { c: "sky", m: "glossy", ...M })),
    P("block", [0.575, 0.98, 1.0], [0.03, 0.36, 0.36], { c: "sky", m: "glossy" }),
    P("block", [0, 0.97, 1.355], [1.0, 0.46, 0.03], { c: "sky", m: "glossy" }),
    P("block", [0, 0.98, -1.355], [0.9, 0.36, 0.03], { c: "sky", m: "glossy" }),
    P("block", [0, 1.21, 1.36], [0.7, 0.11, 0.03], { c: "cream", m: "matte", name: "sign" }),
    // front: headlights and a bumper; back: lights
    P("sphere", [0.4, 0.5, 1.36], [0.14, 0.14, 0.06], { c: "cream", m: "glow", ...M }),
    P("block", [0, 0.36, 1.38], [1.16, 0.12, 0.08], { c: "charcoal" }),
    P("block", [0, 0.36, -1.38], [1.16, 0.12, 0.08], { c: "charcoal" }),
    P("sphere", [0.42, 0.5, -1.36], [0.11, 0.11, 0.05], { c: "red", m: "glow", ...M }),
    // mirrors
    rod([0.57, 1.0, 1.3], [0.67, 1.0, 1.36], 0.025, { c: "charcoal", ...M }),
    P("block", [0.69, 0.96, 1.36], [0.04, 0.14, 0.08], { c: "charcoal", ...M }),
    // door on the right (-x), hinged at its front edge
    P("block", [-0.585, 0.73, 1.18], [0.03, 0.8, 0.36], { hang: [0, 0, -0.18], name: "door" }),
    P("block", [-0.6, 0.86, 1.18], [0.02, 0.4, 0.28], { c: "sky", m: "glossy", hang: [0, 0, -0.18], name: "door" }),
    ...wheel([0.53, 0.26, 0.85], 0.26, 0.24, { mirror: true }),
    ...wheel([0.53, 0.26, -0.85], 0.26, 0.24, { mirror: true }),
  ];
  props.bus = {
    color: "red",
    description: "A rounded red toy town bus, 2.75 m long and 1.33 m tall, faces +z: big windows, a white roof and band, a cream destination sign over the windscreen (named part `sign`, front at z 1.38, y 1.21: parent a word there). Main colour red; a yellow school bus is `recolor: { red: \"yellow\" }`. Named parts: `wheels` (turn [360, 0, 0] per roll; rotation [0, 90, 0] drives toward +x with the door side facing the camera) and `door` (on the right side, -x, hinged at its front edge: turn to [0, 85, 0] to open). No seats inside (riders can stand beside the door at about [-0.9, 0, 1.0]).",
    tags: ["vehicles", "transport", "town", "school"],
    parts,
  };
}

// ---------------------------------------------------------------- train tunnel
{
  const ZF = 0.98; // front face of the portal wall
  const stones = [];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / (n - 1)) * Math.PI;
    const x = 0.62 * Math.cos(a), y = 0.78 * Math.sin(a);
    const t = Math.atan2(0.78 * Math.cos(a), -0.62 * Math.sin(a)) * DEG; // tangent angle
    stones.push(P("block", [x, y, ZF + 0.03], [0.24, 0.17, 0.1], { c: k === (n - 1) / 2 ? "sand" : "grey", m: "matte", r: [0, 0, t] }));
  }
  const parts = [
    P("sphere", [0, 0, -0.25], [3.0, 3.1, 2.4], { c: "grass", m: "matte" }),
    P("sphere", [0, 0.85, 0.1], [2.2, 1.3, 1.2], { c: "grass", m: "matte" }),
    P("sphere", [-0.95, 0.15, 0.6], [0.9, 0.7, 0.8], { c: "moss", m: "matte" }),
    P("sphere", [1.0, 0.12, 0.55], [0.8, 0.6, 0.8], { c: "moss", m: "matte" }),
    P("block", [0, 0.5, ZF - 0.1], [1.6, 1.0, 0.2], { c: "wall_warm", m: "matte" }),
    P("circle", [0, 0, ZF + 0.01], [1.06, 1.34, 0.15], { c: "night", m: "matte", name: "opening" }),
    ...stones,
    // a bush and a flower on the hill
    P("sphere", [0.55, 1.35, 0.1], [0.4, 0.32, 0.36], { c: "leaf", m: "matte" }),
    ball([-0.5, 1.42, 0.0], 0.1, { c: "pink" }),
    // rails coming out
    ...[0.25, -0.25].map((x) => P("box", [x, 0.03, ZF + 0.4], [0.05, 0.05, 0.85], { c: "grey", m: "metal" })),
    ...[0.1, 0.35, 0.6, 0.8].map((dz) => P("box", [0, 0.012, ZF + dz], [0.7, 0.025, 0.1], { c: "wood_dark", m: "matte" })),
  ];
  props.train_tunnel = {
    color: "grass",
    description: "A toy-train tunnel through a grassy hill, 3 m wide and 1.55 m tall, its portal facing +z: a cream wall with a stone arch round a dark opening (named part `opening`, 1.06 m wide, 0.67 m high, its face at z 0.99) and rails running out toward +z. A train car or a small vehicle (up to ~0.95 m wide, 0.6 m tall) rides out: start it just behind the opening (centre z about 0.5, hidden by the dark face and the hill) and move it toward +z. For a train running along x give the tunnel rotation [0, -90, 0] (portal toward +x) or [0, 90, 0].",
    tags: ["train", "vehicles", "hills", "transport", "toy"],
    parts,
  };
}

// ---------------------------------------------------------------- airplane
{
  const parts = [
    P("capsule", [0, 0.62, 0], [0.56, 2.0, 0.62], { c: "white", r: [90, 0, 0] }),
    P("block", [0, 0.48, 0.12], [2.4, 0.07, 0.5], {}),
    ...[1.2].map((x) => P("sphere", [x, 0.48, 0.12], [0.12, 0.07, 0.5], { ...M })),
    P("block", [0, 0.74, -0.88], [0.9, 0.05, 0.28], {}),
    P("block", [0, 0.96, -0.86], [0.05, 0.46, 0.32], { r: [-14, 0, 0] }),
    P("sphere", [0, 0.86, 0.42], [0.34, 0.26, 0.5], { c: "sky", m: "glossy" }),
    ...[0.1, -0.15, -0.4].map((z) => P("cylinder", [0.272, 0.68, z], [0.12, 0.02, 0.12], { c: "sky", m: "glossy", r: [0, 0, 90], ...M })),
    P("block", [0.28, 0.54, -0.1], [0.01, 0.05, 1.3], { ...M }), // stripe
    // propeller on the nose
    P("cone", [0, 0.62, 1.07], [0.2, 0.18, 0.2], { c: "yellow", r: [90, 0, 0], name: "propeller" }),
    P("block", [0, 0.62, 1.04], [0.09, 0.72, 0.03], { c: "charcoal", name: "propeller" }),
    // landing gear
    rod([0.38, 0.45, 0.28], [0.4, 0.13, 0.3], 0.04, { c: "grey", ...M }),
    ...wheel([0.42, 0.12, 0.3], 0.12, 0.08, { mirror: true, hub: "white" }),
    rod([0, 0.4, -0.75], [0, 0.07, -0.8], 0.03, { c: "grey" }),
    ...wheel([0, 0.07, -0.8], 0.07, 0.05, { hub: "white", both: true }),
  ];
  props.airplane = {
    color: "red",
    description: "A small friendly propeller airplane, 2.2 m long with a 2.5 m wingspan, 1.2 m tall, faces +z: a white body with round windows and a bubble cockpit, red wings and tail (main colour), a yellow nose. Named parts: `propeller` (spin about z, fast) and `wheels` (landing gear; turn [360, 0, 0] to roll). Lift it with `at` to fly; rotation [0, 90, 0] flies toward +x. A pilot sits in the cockpit at [0, 0.8, 0.42] (parent, size ~0.35).",
    tags: ["vehicles", "air", "transport", "sky"],
    parts,
  };
}

// ---------------------------------------------------------------- bike
{
  const R = 0.3, ZB = -0.45, ZF = 0.46, YW = R;
  const wheelParts = (z) => [
    P("torus", [0, YW, z], [2 * R, 2 * R, 0.22], { c: "charcoal", m: "rubber", hr: [0, 90, 0], name: "wheels" }),
    ...[0, 60, 120].map((a) => P("cylinder", [0, YW, z], [0.015, 2 * R * 0.62, 0.015], { c: "grey", m: "metal", hr: [a, 0, 0], name: "wheels" })),
    P("sphere", [0, YW, z], [0.08, 0.08, 0.08], { c: "grey", m: "metal", name: "wheels" }),
  ];
  const BB = [0, 0.3, 0];
  const seat = [0, 0.66, -0.13], head = [0, 0.7, 0.34], fork = [0, 0.55, 0.39];
  const parts = [
    ...wheelParts(ZB),
    ...wheelParts(ZF),
    rod([0, YW, ZB], BB, 0.04, {}),
    rod([0, YW, ZB], seat, 0.04, {}),
    rod(BB, seat, 0.05, {}),
    rod(BB, fork, 0.05, {}),
    rod([0, 0.62, -0.1], head, 0.05, {}),
    rod(fork, [0, YW, ZF], 0.04, {}),
    rod(fork, [0, 0.76, 0.36], 0.05, {}),
    ball(head, 0.07, {}),
    P("capsule", [0, 0.72, -0.14], [0.13, 0.25, 0.08], { c: "charcoal", r: [90, 0, 0] }),
    rod([0, 0.67, -0.13], [0, 0.71, -0.14], 0.03, { c: "grey" }),
    rod([-0.24, 0.84, 0.33], [0.24, 0.84, 0.33], 0.035, { c: "grey", m: "metal" }),
    rod([0, 0.76, 0.36], [0, 0.84, 0.33], 0.035, { c: "grey", m: "metal" }),
    P("capsule", [0.25, 0.84, 0.33], [0.05, 0.14, 0.05], { c: "pink", r: [0, 0, 90], ...M }),
    // basket and bell
    P("cup", [0, 0.82, 0.52], [0.3, 0.2, 0.26], { c: "cork", m: "matte" }),
    P("hoop", [0, 0.92, 0.52], [0.31, 1.2, 0.27], { c: "wood_dark" }),
    P("dome", [0.17, 0.88, 0.33], [0.06, 0.06, 0.06], { c: "gold", m: "metal", name: "bell" }),
    // pedals and crank
    P("cylinder", BB, [0.16, 0.02, 0.16], { c: "grey", m: "metal", hr: [0, 0, 90], hang: [0.04, 0, 0], name: "pedals" }),
    P("box", BB, [0.02, 0.14, 0.03], { c: "grey", hang: [0.06, 0.07, 0], name: "pedals" }),
    P("box", BB, [0.02, 0.14, 0.03], { c: "grey", hang: [-0.06, -0.07, 0], name: "pedals" }),
    P("block", BB, [0.08, 0.025, 0.05], { c: "charcoal", hang: [0.1, 0.14, 0], name: "pedals" }),
    P("block", BB, [0.08, 0.025, 0.05], { c: "charcoal", hang: [-0.1, -0.14, 0], name: "pedals" }),
  ];
  props.bike = {
    color: "teal",
    description: "A small toy bicycle, 1.35 m long and 0.95 m tall, faces +z: a teal frame, chunky tyres with spokes, a wicker basket on the front, pink grips and a gold bell (named part `bell`: wiggle it). Named parts: `wheels` (turn [360, 0, 0] per roll) and `pedals` (the crank: turn about x with the wheels). Rider: parent a critter (size ~0.6) at [0, 0.76, -0.14] on the saddle, clip Sitting.",
    tags: ["vehicles", "transport", "outdoor", "toy"],
    parts,
  };
}

// ---------------------------------------------------------------- stroller
{
  const parts = [
    rod([0.25, 0.11, 0.3], [0.23, 0.48, 0.12], 0.035, { c: "grey", m: "metal", ...M }),
    rod([0.27, 0.13, -0.28], [0.23, 0.48, -0.12], 0.035, { c: "grey", m: "metal", ...M }),
    rod([0.23, 0.48, -0.12], [0.22, 1.0, -0.44], 0.035, { c: "grey", m: "metal", ...M }),
    P("capsule", [0, 1.0, -0.44], [0.07, 0.5, 0.07], { c: "charcoal", r: [0, 0, 90] }),
    P("block", [0, 0.54, 0], [0.48, 0.26, 0.66], {}),
    P("block", [0, 0.68, 0], [0.5, 0.05, 0.68], { c: "cream", m: "matte" }), // rim
    P("block", [0, 0.67, 0.02], [0.4, 0.04, 0.56], { c: "cream", m: "plush" }), // mattress
    P("block", [0, 0.6, 0.29], [0.36, 0.1, 0.12], { c: "white", m: "plush" }), // blanket roll at the foot
    P("bowl", [0, 0.75, -0.05], [0.52, 0.62, 0.7], { hr: [90, 0, 0], hang: [0, 0, -0.1], name: "hood" }),
    P("hoop", [0, 0.75, -0.05], [0.53, 1.5, 0.71], { c: "cream", hr: [90, 0, 0], hang: [0, 0, 0.055], name: "hood" }),
    P("box", [0, 0.25, 0], [0.4, 0.02, 0.5], { c: "charcoal" }), // basket underneath
    ...wheel([0.26, 0.11, 0.3], 0.11, 0.07, { mirror: true, hub: "white" }),
    ...wheel([0.28, 0.13, -0.28], 0.13, 0.08, { mirror: true, hub: "white" }),
  ];
  props.stroller = {
    color: "teal",
    description: "A baby stroller, 1.15 m tall to the hood top and 0.85 m long, faces +z (handle at the back): a teal tub with a cream mattress and a soft teal hood with a cream rim (main colour). Named parts: `hood` (hinged at the sides at [0, 0.7, -0.05]: turn to [-75, 0, 0] to fold it down, back to [0, 0, 0] to raise it) and `wheels` (turn [360, 0, 0] per roll). A baby lies or sits on the mattress at [0, 0.69, 0] (parent; size ~0.4).",
    tags: ["baby", "family", "vehicles", "home"],
    parts,
  };
}

// ---------------------------------------------------------------- toy submarine
{
  const parts = [
    P("sphere", [0, 0.4, 0], [0.82, 0.76, 1.3], { m: "glossy" }),
    P("block", [0, 0.82, -0.05], [0.3, 0.3, 0.44], { m: "glossy" }),
    P("cylinder", [0, 0.97, -0.05], [0.22, 0.04, 0.22], { c: "orange" }),
    P("cylinder", [0, 1.1, 0.02], [0.06, 0.32, 0.06], { c: "grey", m: "metal", name: "periscope" }),
    P("cylinder", [0, 1.25, 0.07], [0.09, 0.16, 0.09], { c: "grey", m: "metal", r: [90, 0, 0], name: "periscope" }),
    P("cylinder", [0, 1.25, 0.15], [0.07, 0.01, 0.07], { c: "sky", m: "glossy", r: [90, 0, 0], name: "periscope" }),
    // portholes: a big one on the nose, two each side
    P("torus", [0, 0.42, 0.62], [0.32, 0.32, 0.4], { c: "gold", m: "metal" }),
    P("cylinder", [0, 0.42, 0.62], [0.22, 0.03, 0.22], { c: "sky", m: "glossy", r: [90, 0, 0] }),
    ...[0.15, -0.22].map((z) => P("torus", [0.38, 0.45, z], [0.24, 0.24, 0.3], { c: "gold", m: "metal", r: [0, 90, 0], ...M })),
    ...[0.15, -0.22].map((z) => P("cylinder", [0.385, 0.45, z], [0.16, 0.02, 0.16], { c: "sky", m: "glossy", r: [0, 0, 90], ...M })),
    // fins
    P("block", [0.26, 0.38, -0.5], [0.3, 0.04, 0.2], { c: "orange", ...M }),
    P("block", [0, 0.62, -0.52], [0.04, 0.24, 0.2], { c: "orange" }),
    // propeller at the back
    P("cone", [0, 0.38, -0.67], [0.12, 0.12, 0.12], { c: "orange", r: [-90, 0, 0], name: "propeller" }),
    ...[0, 120, 240].map((a) => P("block", [0, 0.38, -0.68], [0.07, 0.2, 0.02], { c: "orange", hang: [0.1 * Math.sin(a / DEG), 0.1 * Math.cos(a / DEG), 0], hr: [0, 0, -a], name: "propeller" })),
  ];
  props.toy_submarine = {
    color: "yellow",
    description: "A small round yellow bath-toy submarine, 1.3 m long and 1.33 m tall to the periscope top, faces +z: a big gold-rimmed porthole on the nose and two each side, orange fins. Named parts: `periscope` (move [0, -0.18, 0] to lower it, back up to look) and `propeller` (spin about z). Bob it with `wiggle` or `move`; it sits on y 0.02.",
    tags: ["vehicles", "water", "sea", "toy", "bath"],
    parts,
  };
}

// ---------------------------------------------------------------- tractor
{
  const parts = [
    P("block", [0, 0.62, 0.38], [0.52, 0.42, 0.9], {}), // engine hood
    P("block", [0, 0.6, 0.84], [0.44, 0.34, 0.04], { c: "charcoal" }), // grille
    ...[-0.1, 0, 0.1].map((x) => P("box", [x, 0.6, 0.865], [0.03, 0.28, 0.02], { c: "grey" })),
    P("sphere", [0.2, 0.74, 0.84], [0.1, 0.1, 0.05], { c: "cream", m: "glow", ...M }),
    P("block", [0, 0.6, -0.35], [0.62, 0.34, 0.72], {}),
    P("block", [0.47, 0.88, -0.35], [0.34, 0.07, 0.86], { ...M }), // fenders
    P("block", [0, 0.81, -0.42], [0.36, 0.08, 0.32], { c: "charcoal", m: "matte" }),
    P("block", [0, 1.0, -0.58], [0.36, 0.34, 0.07], { c: "charcoal", m: "matte" }),
    rod([0, 0.82, -0.05], [0, 1.02, -0.14], 0.035, { c: "charcoal" }),
    P("torus", [0, 1.03, -0.15], [0.22, 0.22, 0.15], { c: "charcoal", r: [-40, 0, 0] }),
    ...[[0.32, -0.02], [0.32, -0.68]].map(([x, z]) => rod([x, 0.78, z], [x, 1.42, z], 0.045, { c: "yellow", ...M })),
    P("block", [0, 1.45, -0.35], [0.82, 0.07, 0.8], { c: "yellow" }),
    rod([0.16, 0.8, 0.62], [0.16, 1.12, 0.62], 0.06, { c: "charcoal" }),
    P("cylinder", [0.16, 1.13, 0.62], [0.09, 0.04, 0.09], { c: "charcoal" }),
    ...wheel([0.48, 0.42, -0.35], 0.42, 0.3, { mirror: true, hub: "yellow", bolt: "charcoal" }),
    ...wheel([0.38, 0.22, 0.58], 0.22, 0.17, { mirror: true, hub: "yellow", bolt: "charcoal" }),
  ];
  props.tractor = {
    color: "green",
    description: "A friendly green toy farm tractor, 1.5 m long and 1.5 m tall, faces +z: big back wheels and small front wheels with yellow hubs, an open cab with a yellow roof on four posts, a chimney. Named part `wheels` (all four; turn [360, 0, 0] per roll). Driver: parent a critter at [0, 0.86, -0.42] on the seat, clip Sitting.",
    tags: ["vehicles", "farm", "transport", "toy"],
    parts,
  };
}

// ---------------------------------------------------------------- wheelbarrow
{
  const parts = [
    P("block", [0, 0.44, -0.08], [0.5, 0.05, 0.66], { c: "wood" }),
    P("block", [0.28, 0.55, -0.08], [0.05, 0.24, 0.7], { c: "wood", r: [0, 0, -14], ...M }),
    P("block", [0, 0.56, 0.3], [0.62, 0.26, 0.05], { c: "wood", r: [22, 0, 0] }),
    P("block", [0, 0.55, -0.43], [0.58, 0.24, 0.05], { c: "wood", r: [-8, 0, 0] }),
    P("block", [0.3, 0.67, -0.08], [0.06, 0.04, 0.72], { c: "wood_dark", r: [0, 0, -14], ...M }), // top rims
    rod([0.1, 0.17, 0.5], [0.22, 0.4, -0.25], 0.045, { c: "wood_dark", ...M }),
    rod([0.22, 0.4, -0.25], [0.27, 0.58, -0.82], 0.045, { c: "wood_dark", ...M }),
    P("capsule", [0.27, 0.59, -0.86], [0.06, 0.18, 0.06], { c: "charcoal", r: [80, 0, 0], ...M }),
    rod([0.22, 0.42, -0.3], [0.22, 0.03, -0.34], 0.04, { c: "wood_dark", ...M }),
    P("block", [0.22, 0.02, -0.34], [0.07, 0.04, 0.1], { c: "charcoal", ...M }),
    rod([-0.1, 0.17, 0.5], [0.1, 0.17, 0.5], 0.03, { c: "grey", m: "metal" }),
    ...wheel([0, 0.17, 0.5], 0.17, 0.1, { hub: "red", bolt: "cream", both: true }),
  ];
  props.wheelbarrow = {
    color: "wood",
    description: "A wooden garden wheelbarrow, 1.45 m long and 0.7 m tall, faces +z (wheel at the front, handles at the back): a plank tray with dark rims, one red-hubbed wheel, two handles with grips and two legs. Named part `wheels` (turn [360, 0, 0] per roll; wiggle it for a wobbly wheel). Load: the tray floor's top is at y 0.47, centre [0, 0.47, -0.08] (a pumpkin of size ~0.5 fits).",
    tags: ["garden", "farm", "tools", "outdoor"],
    parts,
  };
}

// ---------------------------------------------------------------- helicopter
{
  const parts = [
    P("sphere", [0, 0.66, 0.0], [0.82, 0.78, 1.05], {}),
    P("sphere", [0, 0.72, 0.24], [0.66, 0.56, 0.64], { c: "sky", m: "glossy" }),
    P("cylinder", [0.4, 0.62, -0.12], [0.24, 0.03, 0.24], { c: "sky", m: "glossy", r: [0, 0, 90], ...M }),
    rod([0, 0.72, -0.4], [0, 0.84, -1.25], 0.15, {}),
    ball([0, 0.84, -1.25], 0.15, {}),
    P("block", [0, 1.0, -1.28], [0.05, 0.32, 0.24], { c: "white", r: [-18, 0, 0] }),
    P("block", [0, 0.85, -1.12], [0.4, 0.04, 0.14], { c: "white" }),
    P("sphere", [0.09, 0.86, -1.26], [0.05, 0.06, 0.06], { c: "charcoal", name: "tail_rotor" }),
    P("block", [0.1, 0.86, -1.26], [0.02, 0.38, 0.05], { c: "charcoal", name: "tail_rotor" }),
    P("cylinder", [0, 1.07, 0], [0.12, 0.12, 0.12], { c: "charcoal" }),
    P("sphere", [0, 1.16, 0], [0.16, 0.1, 0.16], { c: "charcoal", name: "rotor" }),
    P("block", [0, 1.16, 0], [2.1, 0.03, 0.13], { c: "charcoal", name: "rotor" }),
    P("block", [0, 1.16, 0], [0.13, 0.03, 2.1], { c: "charcoal", name: "rotor" }),
    // skids
    rod([0.32, 0.05, 0.42], [0.32, 0.05, -0.42], 0.05, { c: "grey", m: "metal", ...M }),
    rod([0.32, 0.05, 0.42], [0.32, 0.12, 0.55], 0.05, { c: "grey", m: "metal", ...M }),
    rod([0.32, 0.05, 0.22], [0.22, 0.36, 0.16], 0.04, { c: "grey", m: "metal", ...M }),
    rod([0.32, 0.05, -0.25], [0.22, 0.36, -0.22], 0.04, { c: "grey", m: "metal", ...M }),
  ];
  props.helicopter = {
    color: "orange",
    description: "A rounded friendly toy helicopter, 1.9 m long and 1.2 m tall, faces +z: an orange body (main colour) with a big bubble windscreen, a tail boom with a white fin, grey skids. Named parts: `rotor` (four blades, 2.1 m across: spin about y, slowly) and `tail_rotor` (spin about x). Lift it with `at` to hover; bob it gently with wiggle.",
    tags: ["vehicles", "air", "transport", "sky"],
    parts,
  };
}

// ---------------------------------------------------------------- ambulance
{
  const checks = [];
  for (let k = 0; k < 10; k++) {
    const z = -1.08 + k * 0.17;
    checks.push(P("box", [0.56, 0.7, z], [0.02, 0.1, 0.17], { c: k % 2 ? "yellow" : "green", m: "matte", ...M }));
    checks.push(P("box", [0.56, 0.8, z], [0.02, 0.1, 0.17], { c: k % 2 ? "green" : "yellow", m: "matte", ...M }));
  }
  const parts = [
    P("block", [0, 0.83, -0.3], [1.1, 1.06, 1.86], {}),
    P("block", [0, 0.6, 0.86], [1.04, 0.58, 0.62], {}),
    P("block", [0, 1.03, 0.72], [1.02, 0.4, 0.38], {}),
    P("block", [0, 1.04, 0.915], [0.92, 0.32, 0.03], { c: "sky", m: "glossy", r: [-14, 0, 0] }),
    P("block", [0.515, 1.03, 0.72], [0.02, 0.28, 0.28], { c: "sky", m: "glossy", ...M }),
    P("block", [0, 0.33, 0], [1.08, 0.1, 2.4], { c: "charcoal" }),
    ...checks,
    // soft blue lights on the roof
    P("block", [0, 1.38, 0.5], [0.7, 0.05, 0.16], { c: "grey" }),
    P("dome", [0.24, 1.43, 0.5], [0.2, 0.18, 0.16], { c: "blue", m: "glow", name: "lights" }),
    P("dome", [-0.24, 1.43, 0.5], [0.2, 0.18, 0.16], { c: "blue", m: "glow", name: "lights" }),
    P("sphere", [0.36, 0.5, 1.17], [0.13, 0.13, 0.05], { c: "cream", m: "glow", ...M }),
    P("block", [0, 0.36, 1.18], [1.08, 0.12, 0.08], { c: "charcoal" }),
    P("block", [0, 0.36, -1.24], [1.08, 0.12, 0.08], { c: "charcoal" }),
    P("sphere", [0.5, 1.2, -1.23], [0.08, 0.08, 0.04], { c: "blue", m: "glow", name: "lights", ...M }),
    // back doors, hinged at their outer edges
    P("block", [0.54, 0.83, -1.235], [0.53, 0.94, 0.04], { hang: [-0.265, 0, 0], name: "door_left" }),
    P("block", [0.54, 1.04, -1.25], [0.34, 0.28, 0.02], { c: "sky", m: "glossy", hang: [-0.27, 0, 0], name: "door_left" }),
    P("block", [-0.54, 0.83, -1.235], [0.53, 0.94, 0.04], { hang: [0.265, 0, 0], name: "door_right" }),
    P("block", [-0.54, 1.04, -1.25], [0.34, 0.28, 0.02], { c: "sky", m: "glossy", hang: [0.27, 0, 0], name: "door_right" }),
    rod([0.52, 0.98, 0.84], [0.64, 0.98, 0.9], 0.025, { c: "charcoal", ...M }),
    P("block", [0.66, 0.94, 0.9], [0.04, 0.14, 0.08], { c: "charcoal", ...M }),
    ...wheel([0.5, 0.24, 0.78], 0.24, 0.22, { mirror: true }),
    ...wheel([0.5, 0.24, -0.78], 0.24, 0.22, { mirror: true }),
  ];
  props.ambulance = {
    color: "white",
    description: "A friendly white toy ambulance van, 2.45 m long and 1.5 m tall, faces +z: a green-and-yellow check stripe along both sides, soft blue roof lights, no name or logo. Named parts: `lights` (the two roof domes and two small back lamps, glow material: pulse them gently, never flash fast), `wheels` (turn [360, 0, 0] per roll), `door_left` / `door_right` (back doors hinged at their outer edges: turn to [0, -100, 0] / [0, 100, 0] to open). A stretcher or a patient goes inside behind the doors at about [0, 0.4, -0.8].",
    tags: ["vehicles", "health", "helpers", "town", "transport"],
    parts,
  };
}

// ---------------------------------------------------------------- canal lock
{
  const gate = (name, x, z, sx) => [
    P("block", [x, 0.37, z], [0.47, 0.66, 0.07], { c: "wood_dark", hang: [-sx * 0.235, 0, 0], name }),
    P("box", [x, 0.37, z], [0.4, 0.04, 0.08], { c: "wood", hang: [-sx * 0.24, 0.12, 0], name }),
    P("box", [x, 0.37, z], [0.4, 0.04, 0.08], { c: "wood", hang: [-sx * 0.24, -0.12, 0], name }),
    P("block", [x, 0.37, z], [0.95, 0.08, 0.09], { c: "white", hang: [sx * 0.3, 0.39, 0], name }), // balance beam
  ];
  const parts = [
    P("block", [0.64, 0.36, 0], [0.32, 0.72, 2.9], { c: "grey", m: "matte", ...M }),
    P("block", [0.64, 0.73, 0], [0.38, 0.05, 2.94], { c: "sand", m: "matte", ...M }),
    P("box", [0, 0.01, 0], [0.96, 0.02, 2.9], { c: "charcoal", m: "matte" }),
    ...[1.0, -1.0].map((z) => P("block", [0.5, 0.74, z], [0.04, 0.06, 0.14], { c: "charcoal", ...M })),
    ...[0.6, -0.6].map((z) => P("cylinder", [0.62, 0.82, z], [0.1, 0.14, 0.1], { c: "charcoal", ...M })), // bollards
    P("box", [0, -0.05, 0], [0.94, 0.7, 1.96], { c: "pond", m: "water", name: "water" }),
    P("box", [0, 0.12, -1.23], [0.94, 0.95, 0.46], { c: "pond", m: "water", name: "water_upper" }),
    P("box", [0, -0.1, 1.23], [0.94, 0.6, 0.46], { c: "pond", m: "water", name: "water_lower" }),
    ...gate("gate_left", 0.47, 1.0, 1),
    ...gate("gate_right", -0.47, 1.0, -1),
    ...gate("gate_back_left", 0.47, -1.0, 1),
    ...gate("gate_back_right", -0.47, -1.0, -1),
  ];
  props.canal_lock = {
    color: "grey",
    description: "A toy canal lock, 2.9 m long (along z) and 1.6 m wide, walls 0.75 m high: a stone channel with a lock chamber 0.94 m wide and 2 m long between two pairs of wooden gates with white balance beams. Named parts: `gate_left` / `gate_right` (the front pair at z 1.0; open: turn to [0, -80, 0] / [0, 80, 0]), `gate_back_left` / `gate_back_right` (the back pair at z -1.0; open: turn to [0, 80, 0] / [0, -80, 0]), `water` (the chamber water, top at y 0.3: move [0, 0.27, 0] to fill it level with `water_upper`, the high water behind the back gates; `water_lower` in front stays low). A boat of size ~0.8 floats in the chamber: put it at [0, 0.3, 0] and move it up with the water.",
    tags: ["water", "boats", "canal", "engineering", "science"],
    parts,
  };
}

// ---------------------------------------------------------------- carousel
{
  const on = { on: "platform" };
  const parts = [
    P("cylinder", [0, 0.05, 0], [2.1, 0.1, 2.1], { c: "cream" }),
    P("cylinder", [0, 0.15, 0], [1.94, 0.1, 1.94], { name: "platform" }),
    P("hoop", [0, 0.06, 0], [1.96, 1.6, 1.96], { c: "gold", m: "metal", ...on }),
    P("cylinder", [0, 0.8, 0], [0.26, 1.6, 0.26], { c: "gold", m: "metal", ...on }),
    P("cylinder", [0, 0.75, 0], [0.34, 0.9, 0.34], { c: "cream", ...on }),
    P("cylinder", [0, 1.62, 0], [2.06, 0.08, 2.06], { c: "gold", ...on }),
    P("cone", [0, 1.92, 0], [2.14, 0.56, 2.14], { ...on }),
    P("cone", [0, 2.12, 0], [0.9, 0.24, 0.9], { c: "white", ...on }),
    ball([0, 2.26, 0], 0.14, { c: "gold", m: "metal", ...on }),
    P("cone", [0, 2.42, 0], [0.08, 0.2, 0.08], { c: "gold", ...on }),
  ];
  // valance: alternating red and white scallops round the canopy rim, bulbs below
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 360;
    const s = Math.sin(a / DEG), c = Math.cos(a / DEG);
    parts.push(P("sphere", [1.04 * s, 1.55, 1.04 * c], [0.36, 0.22, 0.08], { c: k % 2 ? "white" : undefined, r: [0, a, 0], ...on }));
    parts.push(ball([0.99 * s, 1.44, 0.99 * c], 0.07, { c: "yellow", m: "light", name: "lights", ...on }));
  }
  // four horses on poles, facing round the ring (counterclockwise seen from above: spin positive y)
  const horse = (ang, color, mane, name) => {
    const s = Math.sin(ang / DEG), c = Math.cos(ang / DEG);
    const R = 0.66, Y = 0.62;
    const yaw = ang + 90; // facing along the ring
    const X = (lx, ly, lz) => {
      const ys = Math.sin(yaw / DEG), yc = Math.cos(yaw / DEG);
      return [R * s + lx * yc + lz * ys, Y + ly, R * c - lx * ys + lz * yc];
    };
    const H = (p, l, sz, o = {}) => P(p, X(...l), sz, { r: [0, yaw, 0], ...o, name, ...on });
    parts.push(P("cylinder", [R * s, 0.8, R * c], [0.04, 1.6, 0.04], { c: "gold", m: "metal", ...on }));
    parts.push(
      H("capsule", [0, 0, 0], [0.22, 0.52, 0.24], { c: color, hr: [90, 0, 0] }),
      H("capsule", [0, 0.12, 0.2], [0.12, 0.26, 0.12], { c: color, hr: [35, 0, 0] }),
      H("capsule", [0, 0.25, 0.3], [0.12, 0.22, 0.14], { c: color, hr: [105, 0, 0] }),
      H("block", [0, 0.2, 0.15], [0.05, 0.22, 0.1], { c: mane, hr: [35, 0, 0] }),
      H("cone", [0.035, 0.33, 0.25], [0.04, 0.08, 0.04], { c: color }),
      H("cone", [-0.035, 0.33, 0.25], [0.04, 0.08, 0.04], { c: color }),
      H("sphere", [0.055, 0.29, 0.33], [0.035, 0.04, 0.03], { c: "ink" }),
      H("sphere", [-0.055, 0.29, 0.33], [0.035, 0.04, 0.03], { c: "ink" }),
      H("capsule", [0.06, -0.16, 0.18], [0.06, 0.24, 0.06], { c: color, hr: [-45, 0, 0] }),
      H("capsule", [-0.06, -0.16, 0.16], [0.06, 0.24, 0.06], { c: color, hr: [-25, 0, 0] }),
      H("capsule", [0.06, -0.17, -0.18], [0.06, 0.24, 0.06], { c: color, hr: [25, 0, 0] }),
      H("capsule", [-0.06, -0.17, -0.17], [0.06, 0.24, 0.06], { c: color, hr: [15, 0, 0] }),
      H("capsule", [0, 0.03, -0.29], [0.06, 0.22, 0.06], { c: mane, hr: [-55, 0, 0] }),
      H("block", [0, 0.12, -0.02], [0.24, 0.05, 0.2], { c: "red" }),
      H("block", [0, 0.06, -0.02], [0.25, 0.1, 0.12], { c: "gold" }),
    );
  };
  horse(0, "white", "gold", "horses_a");
  horse(90, "horse_tan", "horse_mane", "horses_b");
  horse(180, "pink", "purple", "horses_a");
  horse(270, "sky", "blue", "horses_b");
  props.carousel = {
    color: "red",
    description: "A small fairground carousel, 2.1 m across and 2.5 m tall: a turning platform with four painted horses on gold poles (white, tan, pink, sky blue), a gold centre column and a red cone canopy (main colour) with red and white scallops and twinkling bulbs. Named parts: `platform` (everything above the cream base step rides on it: `spin` `<id>#platform` about y, slowly; positive turns carry the horses forward), `horses_a` / `horses_b` (two opposite horses each: move [0, 0.12, 0] and back, out of step, so they rise and fall), `lights` (the bulbs: pulse them). Saddle tops at world y 0.92 at radius 0.66 (at rest the white horse is at the front, z 0.66). Riders parented to the carousel do not turn with the platform.",
    tags: ["fair", "playground", "toy", "music", "fun"],
    parts,
  };
}

// ---------------------------------------------------------------- digger
{
  const oc = { on: "cab" };
  const ob = { on: "boom" };
  const os = { on: "scoop" };
  const parts = [
    P("capsule", [0.42, 0.21, 0], [0.3, 1.3, 0.42], { c: "charcoal", m: "rubber", r: [90, 0, 0], ...M }),
    ...[0.38, 0, -0.38].flatMap((z) => wheel([0.55, 0.2, z], 0.13, 0.07, { mirror: true, tyre: "grey", hub: "yellow", bolt: "charcoal" })),
    P("block", [0, 0.42, 0], [0.6, 0.14, 0.8], { c: "charcoal" }),
    P("cylinder", [0, 0.51, 0], [0.74, 0.06, 0.74], { c: "grey", name: "cab" }),
    P("block", [0, 0.24, -0.12], [0.96, 0.36, 1.0], { ...oc }),
    P("block", [0, 0.26, -0.66], [0.92, 0.34, 0.2], { c: "charcoal", ...oc }),
    P("block", [0.2, 0.68, 0.08], [0.48, 0.52, 0.5], { ...oc }),
    P("block", [0.2, 0.72, 0.335], [0.38, 0.34, 0.02], { c: "sky", m: "glossy", ...oc }),
    P("block", [0.445, 0.72, 0.08], [0.02, 0.32, 0.36], { c: "sky", m: "glossy", ...oc }),
    P("block", [0.2, 0.95, 0.08], [0.52, 0.04, 0.54], { c: "charcoal", ...oc }),
    P("cylinder", [-0.3, 0.6, -0.35], [0.06, 0.32, 0.06], { c: "charcoal", ...oc }),
    P("sphere", [0.34, 0.5, 0.33], [0.08, 0.08, 0.04], { c: "cream", m: "glow", ...oc }),
    // boom: pivots at the front of the house, rises forward
    P("block", [-0.18, 0.32, 0.38], [0.15, 0.15, 0.95], { hr: [-36, 0, 0], hang: [0, 0.28, 0.38], name: "boom", ...oc }),
    rod([0, -0.22, 0.02], [0, 0.26, 0.36], 0.07, { c: "grey", m: "metal", ...ob }), // ram
    P("block", [0, 0.56, 0.77], [0.13, 0.13, 0.66], { hr: [52, 0, 0], hang: [0, -0.26, 0.2], ...ob }), // stick
    ball([0, 0.56, 0.77], 0.17, { c: "charcoal", ...ob }),
    // scoop: a dark bucket open toward +z, hanging from the stick's end
    P("block", [0, 0.04, 1.17], [0.36, 0.26, 0.05], { c: "charcoal", hang: [0, -0.1, -0.02], hr: [-10, 0, 0], name: "scoop", ...ob }),
    P("block", [0, 0, 0], [0.36, 0.05, 0.24], { c: "charcoal", hang: [0, -0.22, 0.1], ...os }),
    P("block", [0.17, 0, 0], [0.04, 0.24, 0.24], { c: "charcoal", hang: [0, -0.11, 0.1], ...os, ...M }),
    ...[-0.11, 0, 0.11].map((x) => P("sphere", [0, 0, 0], [0.07, 0.05, 0.07], { c: "grey", hang: [x, -0.22, 0.23], ...os })),
  ];
  props.digger = {
    color: "yellow",
    description: "A yellow toy digger (excavator), 1.75 m long with its arm out and 1.5 m tall, faces +z: rubber tracks with yellow road wheels, a cab that swivels and a jointed arm with a dark scoop. Named parts: `wheels` (road wheels; turn [360, 0, 0] as it rolls), `cab` (the whole top: turn about y to swivel), `boom` (the arm, rides on the cab: turn to [20, 0, 0] to dip the scoop to the ground, [-20, 0, 0] to lift it), `scoop` (rides on the boom: turn [-60, 0, 0] to curl it up holding soil, [30, 0, 0] to tip it out). Driver: a small critter (size ~0.4) in the cab at [0.2, 0.95, 0.08]; it does not swivel with the cab.",
    tags: ["vehicles", "construction", "machines", "toy"],
    parts,
  };
}

// ---------------------------------------------------------------- moving truck
{
  const parts = [
    // cargo box: a hollow box open at the back (floor, walls, roof, front wall)
    P("block", [0, 0.42, -0.35], [1.14, 0.12, 1.5], { c: "cream" }),
    P("block", [0.55, 0.92, -0.35], [0.06, 1.0, 1.5], { ...M }),
    P("block", [0, 1.44, -0.35], [1.16, 0.08, 1.52], {}),
    P("block", [0, 0.92, 0.37], [1.14, 1.0, 0.06], {}),
    P("box", [0.58, 1.0, -0.35], [0.01, 0.5, 1.2], { c: "white", m: "matte", ...M }), // side panel (a word fits here)
    P("block", [0, 0.91, -1.09], [1.14, 1.06, 0.03], { c: "charcoal", m: "matte" }), // back frame top
    // cab
    P("block", [0, 0.6, 0.78], [1.06, 0.6, 0.76], { c: "blue" }),
    P("block", [0, 1.0, 0.66], [1.02, 0.44, 0.5], { c: "blue" }),
    P("block", [0, 1.02, 0.915], [0.9, 0.34, 0.03], { c: "sky", m: "glossy", r: [-12, 0, 0] }),
    P("block", [0.515, 1.0, 0.66], [0.02, 0.3, 0.34], { c: "sky", m: "glossy", ...M }),
    P("sphere", [0.36, 0.52, 1.16], [0.13, 0.13, 0.05], { c: "cream", m: "glow", ...M }),
    P("block", [0, 0.34, 1.18], [1.1, 0.12, 0.08], { c: "charcoal" }),
    P("block", [0, 0.31, -0.35], [1.0, 0.1, 1.5], { c: "charcoal" }),
    P("sphere", [0.5, 0.52, -1.1], [0.08, 0.08, 0.04], { c: "red", m: "glow", ...M }),
    // back door: hinged at the top of the opening, swings up
    P("block", [0, 1.4, -1.12], [1.06, 0.94, 0.04], { hang: [0, -0.48, 0], name: "door" }),
    P("box", [0, 1.4, -1.145], [0.9, 0.04, 0.02], { c: "white", hang: [0, -0.3, 0], name: "door" }),
    P("box", [0, 1.4, -1.145], [0.9, 0.04, 0.02], { c: "white", hang: [0, -0.6, 0], name: "door" }),
    // ramp, folded up against the door, hinged at the floor
    P("block", [0, 0.44, -1.16], [0.7, 0.72, 0.04], { c: "grey", m: "metal", hang: [0, 0.36, 0], name: "ramp" }),
    ...wheel([0.5, 0.25, 0.8], 0.25, 0.22, { mirror: true }),
    ...wheel([0.5, 0.25, -0.75], 0.25, 0.22, { mirror: true }),
  ];
  props.moving_truck = {
    color: "blue",
    description: "A friendly blue toy moving truck, 2.4 m long and 1.5 m tall, faces +z: a blue cab and a hollow cargo box (cream floor, top at y 0.48, from z -1.1 to 0.35, 1.0 m wide inside) with white side panels where a word fits. Named parts: `ramp` (folded up behind the door, hinged at the floor at [0, 0.44, -1.16]: turn to [-118, 0, 0] to lay it down to the ground), `door` (the back door, hinged at the top: turn to [100, 0, 0] to swing it up and open; lower the ramp after it), `wheels` (turn [360, 0, 0] per roll). Boxes ride up the ramp and in along -z → +z.",
    tags: ["vehicles", "moving", "home", "town", "transport"],
    parts,
  };
}

// ---------------------------------------------------------------- paper towel roll
props.paper_towel_roll = {
  color: "white",
  description: "A plain paper towel roll standing on its end, 0.5 m tall and 0.24 m across, with a brown card core showing at the top and one sheet peeling off its right side toward +z (named part `sheet`: turn about y to flap it, drop it with move to tear it off). Its front is blank: parent a `letter` of size ~0.2 at [0, 0.27, 0.13] to label it A, B or C.",
  tags: ["home", "science", "kitchen", "water"],
  parts: [
    P("cylinder", [0, 0.25, 0], [0.24, 0.5, 0.24], { m: "paper" }),
    P("cylinder", [0, 0.25, 0], [0.09, 0.504, 0.09], { c: "cork", m: "matte" }),
    P("cylinder", [0, 0.25, 0], [0.07, 0.508, 0.07], { c: "wood_dark", m: "matte" }),
    P("plate", [0.118, 0.25, 0], [0.46, 0.15, 0.26], { m: "paper", hr: [0, 0, 90], hang: [0, 0, 0.13], name: "sheet" }),
  ],
};

// ---------------------------------------------------------------- pound weight
{
  // "1 POUND" in raised strokes on the front: each glyph is a few bars in a 0.1 × 0.14 cell.
  const T = 0.024, Hh = 0.14, Wd = 0.09, Z = 0.33;
  const bar = (x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) + T;
    return P("box", [(x0 + x1) / 2, (y0 + y1) / 2, Z], [L, T, 0.03], { c: "grey", m: "metal", r: [0, 0, Math.atan2(dy, dx) * DEG] });
  };
  const glyph = {
    1: (x) => [bar(x, 0, x, Hh), bar(x, Hh, x - 0.03, Hh - 0.03), bar(x - 0.03, 0, x + 0.03, 0)],
    P: (x) => [bar(x, 0, x, Hh), bar(x, Hh, x + Wd * 0.75, Hh), bar(x + Wd * 0.75, Hh, x + Wd * 0.75, Hh * 0.5), bar(x, Hh * 0.5, x + Wd * 0.75, Hh * 0.5)],
    O: (x) => [bar(x, 0, x, Hh), bar(x + Wd * 0.8, 0, x + Wd * 0.8, Hh), bar(x, Hh, x + Wd * 0.8, Hh), bar(x, 0, x + Wd * 0.8, 0)],
    U: (x) => [bar(x, 0, x, Hh), bar(x + Wd * 0.8, 0, x + Wd * 0.8, Hh), bar(x, 0, x + Wd * 0.8, 0)],
    N: (x) => [bar(x, 0, x, Hh), bar(x + Wd * 0.8, 0, x + Wd * 0.8, Hh), bar(x, Hh, x + Wd * 0.8, 0)],
    D: (x) => [bar(x, 0, x, Hh), bar(x, Hh, x + Wd * 0.55, Hh), bar(x, 0, x + Wd * 0.55, 0), bar(x + Wd * 0.8, Hh * 0.22, x + Wd * 0.8, Hh * 0.78), bar(x + Wd * 0.55, Hh, x + Wd * 0.8, Hh * 0.78), bar(x + Wd * 0.55, 0, x + Wd * 0.8, Hh * 0.22)],
  };
  const word = (s, y, step) => {
    const w = s.length * step - (step - Wd * 0.8);
    return [...s].flatMap((ch, i) => glyph[ch](-w / 2 + i * step).map((p) => ({ ...p, at: r3([p.at[0], p.at[1] + y, p.at[2]]) })));
  };
  props.pound_weight = {
    color: "black",
    description: "A giant cartoon iron weight stamped \"1 POUND\" in raised grey letters on its front (+z), 1.0 m wide and 1.05 m tall: a black trapezoid block with a shelf on top and a round lifting handle. Origin at the bottom middle.",
    tags: ["maths", "measuring", "weight", "comedy"],
    parts: [
      P("block", [0, 0.3, 0], [1.0, 0.6, 0.62], { m: "glossy" }),
      P("block", [0, 0.66, 0], [0.74, 0.16, 0.5], { m: "glossy" }),
      P("block", [0, 0.6, 0], [0.88, 0.1, 0.56], { m: "glossy" }),
      P("torus", [0, 0.86, 0], [0.42, 0.42, 0.5], { m: "glossy" }),
      ...word("1", 0.32, 0.11),
      ...word("POUND", 0.1, 0.12),
    ],
  };
}

// ---------------------------------------------------------------- soccer ball
{
  const R = 0.15;
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const patches = verts.map((v) => {
    const L = Math.hypot(...v);
    const n = v.map((x) => x / L);
    return P("pentagon", n.map((x, i) => x * (R - 0.009) + (i === 1 ? R : 0)), [0.095, 0.095, 0.04], { c: "black", r: zTo(n) });
  });
  props.soccer_ball = {
    color: "white",
    description: "A classic black-and-white soccer ball, 0.3 m across, resting on y = 0 (centre at y 0.15): a white ball with twelve black pentagon patches. Kick it along an arc with move (and spin it about x as it flies).",
    tags: ["sports", "ball", "playground", "outdoor"],
    parts: [ball([0, R, 0], 2 * R, { m: "glossy" }), ...patches],
  };
}

// ---------------------------------------------------------------- baseball bat
{
  const seg = [[0.05, 0.14, "grey"], [0.044, 0.33, "black"], [0.05, 0.5, null], [0.058, 0.58, null], [0.07, 0.66, null], [0.083, 0.75, null], [0.09, 0.85, null]];
  const parts = [P("cylinder", [0, 0.015, 0], [0.085, 0.03, 0.085], { c: "wood_dark", m: "glossy" })];
  let y0 = 0.03;
  for (const [d, y1, c] of seg) {
    parts.push(P("cylinder", [0, (y0 + y1) / 2, 0], [d, y1 - y0, d], { c: c === "black" ? "charcoal" : c === "grey" ? "wood_dark" : undefined, m: c === "black" ? "rubber" : "glossy" }));
    y0 = y1;
  }
  parts.push(P("sphere", [0, 0.85, 0], [0.09, 0.05, 0.09], { m: "glossy" }));
  props.baseball_bat = {
    color: "wood",
    description: "A smooth wooden baseball bat with a dark rubber-grip handle, 0.88 m long, standing on its knob (origin at the knob end, barrel up +y). Rotation [0, 0, -90] lays it pointing +x; held, the grip is at about y 0.2.",
    tags: ["sports", "baseball", "playground", "outdoor"],
    parts,
  };
}

const out = {
  description: "Toybox 10K wave 2 vehicles and big props: safari_jeep, studio_mic, word_workbench, lighthouse, bus, train_tunnel, airplane, bike, stroller, toy_submarine, tractor, wheelbarrow, helicopter, ambulance, canal_lock, carousel, digger, moving_truck, paper_towel_roll, pound_weight, soccer_ball, baseball_bat. Vehicles face +z (rotation [0, 90, 0] drives toward +x) and roll by turning `wheels` about x; named parts and seats are in each description. Generated by tools/gen_tk_vehicles.mjs: edit the generator and rerun it, not the JSON.",
  props,
};
const file = fileURLToPath(new URL("../catalog/models/tk_vehicles.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props");
