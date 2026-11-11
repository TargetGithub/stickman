#!/usr/bin/env node
// Writes catalog/models/tk_props2.json: Toybox 10K props from ENGINE_REQUESTS #113 (vine, plum, rake, sled, cliff,
// ink_blot, bitten_apple, coat_peg, pen, spiral_shell, lighthouse_split) and the pug critter. Parts are laid out
// here in code, so edit this file, not the JSON:
//   node engine3d/tools/gen_tk_props2.mjs
// Conventions: props stand on y = 0 facing +z (the camera), about 1 m at size 1, readable on a picture card.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEG = 180 / Math.PI;
const rd = (v) => Math.round(v * 1000) / 1000;
const P = (p, at, s, o = {}) => ({ p, at: at.map(rd), s: s.map(rd), ...o, ...(o.r ? { r: o.r.map(rd) } : {}) });
function yTo(n) {
  const L = Math.hypot(...n);
  const [x, y, z] = n.map((v) => v / L);
  return [Math.atan2(z, y) * DEG, 0, -Math.asin(x) * DEG];
}
function rod(p0, p1, w, o = {}) {
  const d = p1.map((v, i) => v - p0[i]);
  return P("cylinder", p0.map((v, i) => (v + p1[i]) / 2), [w, Math.hypot(...d), w], { ...o, r: yTo(d) });
}
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);

const props = {};
const critters = {};
const add = (name, color, description, tags, parts) => (props[name] = { color, description, tags: [...tags, "toybox10k"], parts });

// vine: a wavy green stem climbing up with leaves on alternate sides.
{
  const parts = [];
  let prev = [0, 0, 0];
  for (let i = 1; i <= 8; i++) {
    const p = [Math.sin(i * 0.9) * 0.18, i * 0.17, 0];
    parts.push(rod(prev, p, 0.05, { name: "stem" }), ball(p, 0.05, { name: "stem" }));
    const side = i % 2 ? 1 : -1;
    parts.push(P("leaf", [p[0] + side * 0.13, p[1], 0.02], [0.2, 0.26, 0.15], { c: i % 3 ? "leaf" : "leaf_light", r: [0, 0, side * -60], name: "leaves" }));
    prev = p;
  }
  parts.push(P("crescent", [prev[0] + 0.06, prev[1] + 0.1, 0], [0.12, 0.12, 0.1], { r: [0, 0, 30], name: "stem" }));
  add("vine", "green", "A climbing vine: a wavy green stem 1.45 m tall with leaves on both sides and a curly tendril at the top (named parts `stem`, `leaves`: wiggle the leaves to rustle). Stand it against a wall or a pole.", ["plant", "garden", "vine"], parts);
}

add("plum", "purple", "A ripe purple plum: a smooth glossy round fruit with a soft groove, a short brown stalk and a green leaf, 0.5 m wide. For the short-u word plum.", ["food", "fruit", "plum", "phonics_picture"], [
  P("sphere", [0, 0.25, 0], [0.5, 0.48, 0.46], { m: "glossy" }),
  P("crescent", [0.03, 0.26, 0.225], [0.018, 0.3, 0.03], { c: "purple", r: [0, 0, 180] }),
  ball([-0.1, 0.36, 0.18], 0.07, { c: "white", m: "glossy" }),
  rod([0, 0.47, 0], [0.04, 0.58, 0], 0.03, { c: "wood_dark" }),
  P("leaf", [0.11, 0.56, 0], [0.12, 0.2, 0.1], { c: "leaf", r: [0, 0, -65] }),
]);

add("rake", "red", "A garden rake standing up: a long wooden handle and a red head with eight tines at the bottom, 1.4 m tall, the tines facing the camera. Lean it on something with rotation [0, 0, 12].", ["garden", "tool", "rake", "phonics_picture"], [
  rod([0, 0.2, 0], [0, 1.4, 0], 0.05, { c: "wood" }),
  P("box", [0, 0.2, 0], [0.6, 0.06, 0.06]),
  ...Array.from({ length: 8 }, (_, i) => rod([-0.26 + i * 0.075, 0.18, 0.02], [-0.26 + i * 0.075, 0.03, 0.07], 0.022, { c: "grey", m: "glossy", name: "tines" })),
]);

add("sled", "red", "A wooden sled side on: three red slats on two curved silver runners that turn up at the front (+x), with a rope to pull it, 1.2 m long. A critter of size 0.8 sits on it at about [0, 0.3, 0].", ["winter", "snow", "sled", "phonics_picture"], [
  ...[-0.3, 0, 0.3].map((z) => P("box", [0, 0.26, z * 0.6], [1, 0.05, 0.16], { name: "seat" })),
  ...[-1, 1].flatMap((sd) => [
    P("box", [-0.05, 0.04, sd * 0.24], [1.0, 0.03, 0.04], { c: "grey", m: "metal" }),
    P("torus", [0.48, 0.13, sd * 0.24], [0.2, 0.2, 0.15], { c: "grey", m: "metal" }),
    rod([-0.35, 0.05, sd * 0.24], [-0.35, 0.25, sd * 0.24], 0.04, { c: "grey", m: "metal" }),
    rod([0.25, 0.05, sd * 0.24], [0.25, 0.25, sd * 0.24], 0.04, { c: "grey", m: "metal" }),
  ]),
  rod([0.56, 0.2, 0], [0.85, 0.08, 0.1], 0.025, { c: "twine", name: "rope" }),
]);

add("cliff", "grey", "A tall rocky cliff: a sheer grey rock face 2.2 m high and 3 m wide with a flat grassy top (top at y 2.2, front face at z 0.6), a few ledges and boulders at the foot. Stand a critter on top at [0, 2.2, 0] or at its foot in front.", ["outdoor", "rock", "cliff", "mountain"], [
  P("box", [0, 1.1, 0], [3, 2.2, 1.2], { m: "matte", name: "rock" }),
  P("box", [-0.6, 0.7, 0.62], [0.9, 0.08, 0.12], { m: "matte" }),
  P("box", [0.7, 1.5, 0.62], [0.7, 0.08, 0.12], { m: "matte" }),
  P("box", [0, 2.22, 0], [3.04, 0.06, 1.24], { c: "grass", m: "matte", name: "top" }),
  ...[[-1, 2.3, 0.3, 0.3], [0.9, 2.3, -0.2, 0.36], [0.2, 2.28, 0.4, 0.24]].map(([x, y, z, w]) => P("sphere", [x, y, z], [w, w * 0.6, w], { c: "leaf", m: "matte" })),
  ...[[-1.2, 0.15, 0.8, 0.4], [1.3, 0.12, 0.85, 0.32], [0.4, 0.1, 0.9, 0.24]].map(([x, y, z, w]) => P("sphere", [x, y, z], [w, w * 0.7, w * 0.9], { m: "matte" })),
  ...[[-0.9, 1.3], [0.2, 0.6], [1.1, 1.1]].map(([x, y]) => P("crescent", [x, y, 0.61], [0.3, 0.4, 0.04], { c: "charcoal", m: "matte", r: [0, 0, 40] })),
]);

add("ink_blot", "ink", "An ink blot: a splotchy dark puddle of ink with drops around it, standing up facing the camera like a mark on a page (0.7 m across, floats: its origin is the middle). Lay it on a page or card at its front; set color for coloured ink.", ["ink", "mess", "writing", "phonics_picture"], [
  P("circle", [0, 0, 0], [0.46, 0.4, 0.15], { m: "glossy" }),
  ...[[0.2, 0.1, 0.24], [-0.18, 0.12, 0.2], [0.12, -0.18, 0.22], [-0.16, -0.12, 0.18], [0.02, 0.22, 0.16]].map(([x, y, w]) => P("circle", [x, y, 0.005], [w, w, 0.15], { m: "glossy" })),
  ...[[0.36, 0.22, 0.07], [-0.34, -0.25, 0.06], [0.3, -0.3, 0.05], [-0.32, 0.26, 0.045]].map(([x, y, w]) => P("circle", [x, y, 0], [w, w, 0.15], { m: "glossy" })),
]);

add("bitten_apple", "red", "A red apple with a big bite out of its side (a bite mark): the pale bitten flesh with a scalloped tooth edge, two pips, a stalk and a leaf, 0.6 m wide. For the word bite or bite mark.", ["food", "fruit", "bite", "phonics_picture"], [
  P("sphere", [0, 0.3, 0], [0.6, 0.56, 0.56], { m: "glossy" }),
  P("circle", [0.18, 0.3, 0.17], [0.3, 0.36, 0.25], { c: "cream", m: "matte", r: [0, 35, 0] }),
  ...[0.18, 0.3, 0.42].map((y) => P("circle", [0.3, y, 0.1], [0.12, 0.12, 0.25], { c: "cream", m: "matte", r: [0, 35, 0] })),
  ball([0.14, 0.33, 0.27], 0.05, { c: "wood_dark" }),
  ball([0.2, 0.26, 0.26], 0.05, { c: "wood_dark" }),
  rod([0, 0.55, 0], [0.02, 0.68, 0], 0.035, { c: "wood_dark" }),
  P("leaf", [0.1, 0.65, 0], [0.12, 0.2, 0.1], { c: "leaf", r: [0, 0, -60] }),
]);

add("coat_peg", "blue", "A coat hanging on a wooden wall peg: a peg board with a round knob and a coat in its main colour (blue) hung by its loop, buttons down the front, 1.3 m tall, standing against a wall (back at z -0.05). For a cloakroom or the word coat.", ["clothes", "coat", "school", "phonics_picture"], [
  P("box", [0, 1.2, -0.05], [0.8, 0.14, 0.04], { c: "wood" }),
  rod([0, 1.2, -0.03], [0, 1.2, 0.12], 0.05, { c: "wood_dark" }),
  ball([0, 1.2, 0.13], 0.08, { c: "wood_dark" }),
  P("box", [0, 0.72, 0.06], [0.5, 0.8, 0.1], { name: "coat" }),
  P("box", [-0.33, 0.8, 0.06], [0.16, 0.6, 0.1], { r: [0, 0, -10], name: "coat" }),
  P("box", [0.33, 0.8, 0.06], [0.16, 0.6, 0.1], { r: [0, 0, 10], name: "coat" }),
  P("triangle", [-0.09, 1.04, 0.115], [0.16, 0.2, 0.08], { r: [0, 0, 180], c: "white", name: "coat" }),
  P("triangle", [0.09, 1.04, 0.115], [0.16, 0.2, 0.08], { r: [0, 0, 180], c: "white", name: "coat" }),
  ...[0.92, 0.76, 0.6, 0.44].map((y) => ball([0, y, 0.115], 0.05, { c: "yellow", name: "coat" })),
  P("torus", [0, 1.14, 0.06], [0.08, 0.08, 0.2], { c: "white" }),
]);

add("pen", "blue", "A ballpoint pen lying on a slant: a barrel in its main colour (blue) with a clip, a silver tip and a click button, 0.8 m long (shown big). For writing scenes or the word pen.", ["school", "writing", "pen", "phonics_picture"], [
  rod([-0.34, 0.08, 0], [0.24, 0.42, 0], 0.08),
  rod([0.24, 0.42, 0], [0.33, 0.47, 0], 0.06, { c: "grey", m: "metal" }),
  P("cone", [-0.39, 0.05, 0], [0.06, 0.12, 0.06], { c: "grey", m: "metal", r: [0, 0, 120] }),
  rod([0.08, 0.36, 0.05], [0.24, 0.45, 0.05], 0.02, { c: "grey", m: "metal" }),
  ball([0.35, 0.48, 0], 0.05, { c: "ink" }),
]);

add("spiral_shell", "sand", "A spiral sea shell (a conch): pale sand-coloured whorls winding to a point, with a pink opening facing the camera, 0.6 m long, lying on its side. For the beach or the sh sound.", ["sea", "beach", "shell", "phonics_picture"], [
  ...Array.from({ length: 6 }, (_, i) => {
    const k = 1 - i * 0.15;
    return P("torus", [-0.06 - i * 0.07, 0.18 + i * 0.03, 0], [0.42 * k, 0.42 * k, 0.6 * k], { r: [0, 90, 0] });
  }),
  P("cone", [-0.5, 0.33, 0], [0.12, 0.18, 0.12], { r: [0, 0, 70] }),
  P("sphere", [0.08, 0.17, 0.02], [0.3, 0.3, 0.26]),
  P("oval", [0.12, 0.15, 0.14], [0.2, 0.26, 0.15], { c: "pink", m: "glossy", r: [0, 30, 0] }),
]);

props.lighthouse_split = {
  like: "lighthouse",
  add: [{ p: "cone", at: [0, 2.24, 0], s: [0.75, 2.6, 0.42], c: "yellow", m: "glass", hr: [-90, 0, 0], hang: [0, 0, -1.3], r: [0, 0, 0], name: "beam" }],
  description: "The striped lighthouse with a split beam: two soft beams from the lamp, one toward +z and one toward -z (both named `beam`): spin `<id>#beam` about y and both sweep round together, like a real lighthouse light.",
  tags: ["sea", "light", "lighthouse", "toybox10k"],
};

critters.pug = {
  like: "puppy",
  recolor: { cream: "hay", brown: "charcoal", white: "hay" },
  description: "A pug: the puppy as a fawn little dog with a dark face patch and dark floppy ears (about 0.7 m tall at size 1). Same named parts and moves as puppy.",
  tags: ["dog", "pet", "pug", "toybox10k"],
};

const out = {
  description: "Toybox 10K props from ENGINE_REQUESTS #113: vine, plum, rake, sled, cliff, ink_blot, bitten_apple, coat_peg, pen, spiral_shell, lighthouse_split, and the pug critter. Generated by tools/gen_tk_props2.mjs: edit the generator and rerun it, not the JSON.",
  props,
  critters,
};
const file = fileURLToPath(new URL("../catalog/models/tk_props2.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props,", Object.keys(critters).length, "critters");
