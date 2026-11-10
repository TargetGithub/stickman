#!/usr/bin/env node
// Writes catalog/models/tk_wild2.json: wild animals for the Toybox 10K wave (hare, snake, tortoise, coyote, wolf,
// arctic fox, toads, newt, axolotl, badger, chipmunk, dormouse, elk, caribou, deer, mouse deer, raccoon, skunk, salmon, seahorse, pocket gopher, sloth, snow
// leopard, tardigrade, termites, turtle hatchling). Parts are laid out here in code (faces placed on each head's
// curve, rods between points, spots on body surfaces), so edit this file, not the JSON:
//   node engine3d/tools/gen_tk_wild2.mjs
// Critters face +z, stand on y = 0, their left is +x. Quadruped legs follow the horse: leg_front_left is at +x.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEG = 180 / Math.PI;
const rd = (v) => Math.round(v * 1000) / 1000;
const r3 = (v) => (Array.isArray(v) ? v.map(rd) : rd(v));
const P = (p, at, s, o = {}) => ({ p, at: r3(at), s: r3(s), ...o, ...(o.r ? { r: r3(o.r) } : {}), ...(o.hang ? { hang: r3(o.hang) } : {}) });
const H = (p, at, s, o = {}) => P(p, at, s, { on: "head", ...o });
const M = { mirror: true };

/** z of the front surface of an ellipsoid (centre c, radii rad) at (x, y). */
const fz = (c, rad, x, y) => c[2] + rad[2] * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / rad[0]) ** 2 - ((y - c[1]) / rad[1]) ** 2));
/** Sphere part by size (s = diameters); returns [part, centre, radii]. */
const ell = (s) => s.map((v) => v / 2);

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
/** A capsule (or other shape) from p0 to p1, width w. */
function rod(p0, p1, w, o = {}) {
  const d = p1.map((v, i) => v - p0[i]);
  const L = Math.hypot(...d);
  const mid = p0.map((v, i) => (v + p1[i]) / 2);
  const { p = "capsule", ...rest } = o;
  return P(p, mid, [w, L + w * 0.5, rest.depth ?? w], { r: yTo(d), ...rest, depth: undefined });
}
/** Point and outward normal on an ellipsoid at yaw th (from +z toward +x) and elevation ph, in degrees. */
function onEll(c, rad, th, ph, lift = 0) {
  const t = th / DEG, f = ph / DEG;
  const u = [Math.cos(f) * Math.sin(t), Math.sin(f), Math.cos(f) * Math.cos(t)];
  const n = u.map((v, i) => v / rad[i]);
  const nl = Math.hypot(...n);
  const nn = n.map((v) => v / nl);
  return { at: c.map((v, i) => v + rad[i] * u[i] + nn[i] * lift), n: nn };
}
/** A flat decoration lying on an ellipsoid surface (spot, patch or ring). */
function decor(c, rad, th, ph, p, s, o = {}, lift = 0.004) {
  const { at, n } = onEll(c, rad, th, ph, lift);
  return P(p, at, s, { r: zTo(n), ...o });
}
/** A straight leg from the hip down to the floor, with a foot or hoof at the bottom (same pivot). */
function leg(name, hip, w, foot, o = {}) {
  const L = hip[1] - (foot?.h ?? 0) * 0.5;
  const parts = [P("capsule", hip, [w, L, w], { hang: [0, -L / 2 + w * 0.1, 0], name, ...(o.c ? { c: o.c } : {}) })];
  if (foot) parts.push(P(foot.p ?? "sphere", hip, foot.s, { hang: [0, -hip[1] + foot.s[1] / 2, foot.dz ?? 0], name, ...(foot.c ? { c: foot.c } : {}), ...(foot.m ? { m: foot.m } : {}) }));
  return parts;
}
/** Four legs, horse names: front_left at +x. */
function legs4(x, yHip, zF, zB, w, foot, o = {}) {
  return [
    ...leg("leg_front_left", [x, yHip, zF], w, foot, o), ...leg("leg_front_right", [-x, yHip, zF], w, foot, o),
    ...leg("leg_back_left", [x, o.yHipB ?? yHip, zB], w, foot, o), ...leg("leg_back_right", [-x, o.yHipB ?? yHip, zB], w, foot, o),
  ];
}
/** Face rig placed on a head sphere of size hs (centre [0,0,0] unless hc). */
function face(hs, { ex, ey, es, iris, my, ms, mc = [0, 0, 0], ms3, cx = null, cy = -0.05, cs = 0.07, hc = [0, 0, 0], open, eyesExtra = {}, mouthExtra = {}, cheeks = {} }) {
  const hr = ell(hs);
  const eyes = { at: r3([ex, ey, fz(hc, hr, ex, ey) - es * 0.08]), size: es, ...(iris ? { iris } : {}), ...eyesExtra };
  const mr = ms3 ? ell(ms3) : hr;
  const mcen = ms3 ? mc : hc;
  const mouth = { at: r3([0, my, fz(mcen, mr, 0, my) + 0.004]), size: ms, ...(open ? { open: true } : {}), ...mouthExtra };
  const cxx = cx ?? ex + es * 0.9;
  const out = { eyes, mouth, cheeks: { at: r3([cxx, cy, fz(hc, hr, cxx, cy) - 0.02]), size: cs, ...cheeks } };
  return out;
}

const C = {};

// ---------------------------------------------------------------- hare (and the white Arctic hare)
{
  const hs = [0.5, 0.46, 0.48];
  const mz = [0.24, 0.17, 0.17], mc = [0, -0.06, 0.17];
  C.hare = {
    color: "horse_brown", sound: "Zoom!",
    description: "A long-eared, long-legged brown hare, taller and leaner than the bunny, with a sandy belly and muzzle, black-tipped ears and big hind feet; sits up on its haunches. About 1.6 m to the ear tips at size 1. Named parts: ears (both, twitch on their own), paw (both front legs, for point and wave), leg_back (both hind legs with their long feet, pivot at the hip: turn [-30, 0, 0] about x to kick off a hop), tail (white puff).",
    tags: ["forest", "meadow", "mammal", "fable", "fast", "grassland"],
    head: { at: [0, 0.92, 0.06] },
    ...face(hs, { ex: 0.105, ey: 0.06, es: 0.08, my: -0.115, ms: 0.09, mc, ms3: mz, cs: 0.08 }),
    bob: 0.025,
    parts: [
      P("sphere", [0, 0.42, -0.02], [0.52, 0.68, 0.5]),
      P("sphere", [0, 0.38, 0.14], [0.32, 0.46, 0.26], { c: "sand" }),
      P("sphere", [0.17, 0.24, -0.06], [0.22, 0.34, 0.4], { name: "leg_back", ...M }),
      P("sphere", [0.17, 0.24, -0.06], [0.15, 0.09, 0.44], { hang: [0, -0.195, 0.14], name: "leg_back", ...M }),
      P("capsule", [0.11, 0.46, 0.16], [0.1, 0.46, 0.1], { hang: [0, -0.21, 0.03], r: [-6, 0, 0], name: "paw", ...M }),
      P("sphere", [0, 0.3, -0.28], 0.17, { c: "white", name: "tail", idle: { r: [0, 0, 10], hz: 0.9 } }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", mc, mz, { c: "sand" }),
      H("sphere", [0, -0.02, 0.25], [0.07, 0.05, 0.05], { c: "rose", m: "glossy" }),
      H("capsule", [0.09, 0.2, -0.04], [0.13, 0.6, 0.07], { r: [-6, 0, -9], hang: [0, 0.28, 0], name: "ears", ...M, idle: { r: [0, 0, 5], hz: 0.45 } }),
      H("capsule", [0.09, 0.2, -0.01], [0.07, 0.46, 0.03], { r: [-6, 0, -9], hang: [0, 0.26, 0.012], c: "pink", name: "ears", ...M, idle: { r: [0, 0, 5], hz: 0.45 } }),
      H("capsule", [0.09, 0.2, -0.04], [0.135, 0.14, 0.075], { r: [-6, 0, -9], hang: [0, 0.52, 0], c: "charcoal", name: "ears", ...M, idle: { r: [0, 0, 5], hz: 0.45 } }),
    ],
  };
  C.arctic_hare = {
    like: "hare", recolor: { horse_brown: "white", sand: "cream" },
    description: "The hare in its white Arctic (or snowshoe winter) coat: snow-white fur with a cream belly and muzzle, black ear tips and long hind legs; sits up tall (a judge with a clipboard: parent the prop to it). Same named parts as hare: ears, paw, leg_back, tail. About 1.6 m to the ear tips at size 1.",
    tags: ["arctic", "snow", "winter", "mammal", "tundra"],
  };
}

// ---------------------------------------------------------------- snake
{
  const hs = [0.44, 0.34, 0.42];
  const sn = [0.36, 0.22, 0.3], snc = [0, -0.05, 0.11];
  const parts = [
    P("torus", [0, 0.13, 0], [0.98, 0.98, 0.9], { r: [90, 0, 0] }),
    P("sphere", [0, 0.17, 0], [0.5, 0.26, 0.5]),
    P("torus", [0, 0.34, -0.02], [0.74, 0.74, 0.84], { r: [90, 0, 0] }),
    P("sphere", [0, 0.37, -0.02], [0.34, 0.2, 0.34]),
    rod([0, 0.36, 0.2], [0, 0.78, 0.24], 0.23),
    rod([0, 0.4, 0.31], [0, 0.76, 0.34], 0.13, { c: "cream", depth: 0.05 }),
    P("cone", [0.44, 0.07, 0.2], [0.13, 0.36, 0.11], { r: [0, 0, -90], hang: [0, 0.14, 0], name: "tail", idle: { r: [0, 0, 10], hz: 0.5 } }),
    H("sphere", [0, -0.2, -0.04], [0.22, 0.34, 0.22]),
    H("sphere", [0, -0.18, 0.06], [0.13, 0.26, 0.06], { c: "cream" }),
    H("sphere", [0, 0, 0], hs),
    H("sphere", snc, sn),
    H("sphere", [0.045, -0.02, 0.255], [0.025, 0.018, 0.015], { c: "ink", ...M }),
  ];
  // Darker spots along the top of each coil.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    parts.push(P("sphere", [0.343 * Math.sin(a), 0.262, 0.343 * Math.cos(a)], [0.09, 0.025, 0.09], { c: "leaf" }));
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.9;
    parts.push(P("sphere", [0.259 * Math.sin(a), 0.47, -0.02 + 0.259 * Math.cos(a)], [0.08, 0.025, 0.08], { c: "leaf" }));
  }
  parts.push(H("sphere", [0, 0.17, -0.02], [0.14, 0.03, 0.12], { c: "leaf" }));
  C.snake = {
    color: "green", sound: "Hissss!",
    description: "A gentle round-faced green snake coiled in two loops, with a cream belly stripe up its neck, darker green spots, big friendly eyes, a wide soft smile and no fangs. Its neck rises from the coil, so the head sways and nods (look, nod, feelings). About 1.05 m tall at size 1, 1 m across the coil. Named part: tail (the tip poking out of the bottom coil, wiggles on its own).",
    tags: ["reptile", "jungle", "desert", "garden", "forest"],
    head: { at: [0, 0.88, 0.24], tilt: 1.2 },
    ...face(hs, { ex: 0.095, ey: 0.07, es: 0.095, iris: "eye_brown", my: -0.1, ms: 0.11, mc: snc, ms3: sn, cx: 0.15, cy: -0.07, cs: 0.06 }),
    bob: 0.015,
    parts,
  };
}

// ---------------------------------------------------------------- tortoise and turtle hatchling (from turtle)
{
  const c = [0, 0.15, 0], rad = [0.475, 0.65, 0.5];
  const shell = [P("dome", [0, 0.475, 0], [0.95, 1.3, 1.0], { c: "wood_dark", name: "shell" })];
  const plates = [[0, 90], [0, 50], [60, 52], [120, 52], [180, 50], [240, 52], [300, 52], [30, 20], [90, 20], [150, 20], [210, 20], [270, 20], [330, 20]];
  for (const [th, ph] of plates) {
    const big = ph === 90 ? 0.22 : ph === 50 || ph === 52 ? 0.2 : 0.17;
    shell.push(decor(c, rad, th, ph, "hexagon", [big, big, 0.03], { c: "hay", name: "shell" }, 0.002));
  }
  const feet = [];
  for (const [nm, x, z] of [["leg_front", 0.3, 0.27], ["leg_back", 0.3, -0.27]]) {
    feet.push(P("cylinder", [x, 0.16, z], [0.17, 0.2, 0.17], { hang: [0, -0.06, 0], name: nm, ...M }));
    for (const dx of [-0.045, 0, 0.045]) feet.push(P("sphere", [x, 0.16, z], [0.035, 0.03, 0.03], { hang: [dx, -0.145, 0.085], c: "cream", name: nm, ...M }));
  }
  C.tortoise = {
    like: "turtle", drop: ["shell"], recolor: { green: "farm_dirt", leaf: "wood_dark", sand: "bun_gold" }, head: { at: [0, 0.32, 0.6] },
    description: "A slow, gentle land tortoise: a high domed dark-brown shell patterned with golden hexagon plates over a golden rim, sandy skin, sturdy column legs with little cream toenails and a calm smile; plods and nods. About 0.95 m tall at size 1 (to the top of the shell), 1.1 m long. Named parts: shell, leg_front and leg_back (each a mirrored pair: turn [±15, 0, 0] about x in turn to plod), tail.",
    tags: ["reptile", "garden", "fable", "slow", "grassland", "desert"],
    add: [...shell, ...feet],
  };
  C.turtle_hatchling = {
    like: "turtle", scale: 0.42, recolor: { green: "grey", leaf: "charcoal", sand: "bubble_line" },
    eyes: { size: 0.042 }, mouth: { size: 0.05 },
    description: "A tiny baby sea turtle just out of its egg: a soft dark-gray shell with a blue-gray rim, gray skin, big eyes for its size and long paddle flippers that scramble over sand. About 0.33 m tall and 0.5 m long at size 1 (the turtle is 0.8 m). Named parts: flipper (both front flippers, for point and the scramble: turn [0, ±30, 0] in turn), shell, tail.",
    tags: ["ocean", "beach", "reptile", "baby", "life_cycle", "small"],
    add: [
      P("sphere", [0.17, 0.06, 0.12], [0.2, 0.035, 0.09], { r: [0, -35, -12], hang: [0.07, 0, 0], c: "grey", name: "flipper", ...M, idle: { r: [0, 14, 0], hz: 1.4 } }),
      P("sphere", [0.15, 0.05, -0.13], [0.13, 0.03, 0.08], { r: [0, 30, -8], c: "grey", ...M }),
    ],
  };
}

// ---------------------------------------------------------------- coyote and wolf (from fox)
C.coyote = {
  like: "fox", scale: 0.97, recolor: { orange: "farm_dirt", white: "cream" },
  description: "A lean sandy-tan young coyote: the fox's build in sandy fur with a cream snout, chest and tail tip, tall ears, dark paws and a bushy tail; trots and tilts its head when curious, hopeful and friendly. About 1.1 m tall at size 1. Named part: tail (swishes on its own).",
  tags: ["desert", "grassland", "mammal", "fable", "canine"],
};
C.wolf = {
  like: "fox", scale: 1.12, recolor: { orange: "grey", white: "cream" }, eyes: { iris: "button_orange", size: 0.1 },
  description: "A friendly storybook gray wolf: bigger than the fox, thick gray coat with a cream snout, chest and tail tip, warm amber eyes, tall ears and a bushy tail; trots, sniffs and tips its head up to howl softly, never scary. About 1.25 m tall at size 1. Named part: tail (swishes on its own).",
  tags: ["forest", "woods", "mammal", "canine", "snow", "fable"],
};

// ---------------------------------------------------------------- arctic fox
{
  const hs = [0.56, 0.48, 0.48];
  const mz = [0.24, 0.16, 0.2], mc = [0, -0.08, 0.16];
  C.arctic_fox = {
    color: "white", sound: "Yip!",
    description: "A small arctic fox in its thick white winter coat: a round head with a short cream muzzle, small rounded ears, short legs and a huge bushy tail curled beside it. About 0.95 m tall at size 1 (smaller and rounder than the fox). Named parts: ears, paw (both front legs, for point), tail (big and fluffy, swishes). For the brown-gray summer coat use arctic_fox_summer, or paint between them.",
    tags: ["arctic", "snow", "winter", "tundra", "mammal", "canine"],
    head: { at: [0, 0.74, 0.06] },
    ...face(hs, { ex: 0.115, ey: 0.05, es: 0.08, my: -0.13, ms: 0.08, mc, ms3: mz, cs: 0.08 }),
    bob: 0.02,
    parts: [
      P("sphere", [0, 0.32, 0], [0.54, 0.56, 0.52]),
      P("sphere", [0, 0.32, 0.15], [0.34, 0.38, 0.26], { c: "cream" }),
      P("capsule", [0.12, 0.3, 0.14], [0.11, 0.3, 0.11], { hang: [0, -0.13, 0.03], name: "paw", ...M }),
      P("sphere", [0.15, 0.05, 0.1], [0.17, 0.1, 0.24], M),
      P("sphere", [0.26, 0.22, -0.16], [0.36, 0.7, 0.36], { r: [-35, 0, -55], hang: [0, 0.3, 0], name: "tail", idle: { r: [0, 0, 10], hz: 0.5 } }),
      P("sphere", [0.26, 0.22, -0.16], [0.26, 0.24, 0.26], { r: [-35, 0, -55], hang: [0, 0.62, 0], c: "cream", name: "tail", idle: { r: [0, 0, 10], hz: 0.5 } }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", [0.17, -0.09, 0.08], [0.2, 0.18, 0.2], { c: "white", ...M }),
      H("sphere", mc, mz, { c: "cream" }),
      H("sphere", [0, -0.05, 0.26], [0.075, 0.06, 0.05], { c: "ink", m: "glossy" }),
      H("sphere", [0.17, 0.2, -0.02], [0.15, 0.15, 0.08], { name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
      H("sphere", [0.17, 0.2, 0.005], [0.09, 0.09, 0.04], { c: "pig", name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
    ],
  };
  C.arctic_fox_summer = {
    like: "arctic_fox", recolor: { white: "brown", cream: "sand" },
    description: "The arctic fox in its brown summer coat: brown fur with a sandy muzzle, chest and tail tip, small rounded ears, short legs and a huge bushy tail. About 0.95 m tall at size 1. Same named parts as arctic_fox: ears, paw, tail.",
    tags: ["arctic", "tundra", "summer", "mammal", "canine"],
  };
}

// ---------------------------------------------------------------- toad and spadefoot toad (from frog)
{
  const warts = [];
  const bc = [0, 0.28, 0], br = [0.43, 0.26, 0.36];
  for (const [th, ph] of [[150, 40], [210, 40], [180, 62], [125, 15], [235, 15], [100, 45], [260, 45], [160, 18], [200, 18], [180, 85], [70, 25], [290, 25]])
    warts.push(decor(bc, br, th, ph, "sphere", [0.07, 0.07, 0.035], { c: "wood_dark" }, -0.004));
  for (const [x, y, z] of [[0.12, 0.17, -0.1], [-0.12, 0.17, -0.1], [0, 0.2, -0.16], [0.26, 0.05, -0.05], [-0.26, 0.05, -0.05]])
    warts.push(H("sphere", [x, y, z], [0.055, 0.05, 0.05], { c: "wood_dark" }));
  const hip = [0.33, 0.16, -0.12];
  C.toad = {
    like: "frog", recolor: { green: "brown", mint: "sand" }, eyes: { iris: "gold" },
    description: "A round, bumpy-but-cute brown toad in storybook style: dark brown warts on its back and head, a sandy throat and belly, big golden eyes on top and a wide smile; waves, walks and makes small hops (out of a book page too). About 0.8 m tall at size 1 (to the eye tops). Named parts: arm (both front legs, for wave and point), leg_back (both hind legs with their feet, pivot at the hip: turn [-35, 0, 0] about x to hop).",
    tags: ["pond", "garden", "amphibian", "storybook", "life_cycle", "wetland"],
    add: [
      ...warts,
      P("capsule", [0.27, 0.24, 0.2], [0.1, 0.24, 0.1], { r: [-20, 0, 18], hang: [0, -0.1, 0], c: "brown", name: "arm", ...M }),
      P("sphere", hip, [0.24, 0.24, 0.32], { c: "brown", name: "leg_back", ...M }),
      P("sphere", hip, [0.2, 0.06, 0.28], { hang: [0.04, -0.13, 0.06], c: "brown", name: "leg_back", ...M }),
      P("sphere", hip, [0.06, 0.06, 0.06], { hang: [0.02, -0.02, -0.1], c: "wood_dark", name: "leg_back", ...M }),
    ],
  };
  C.spadefoot_toad = {
    like: "toad", scale: 0.72, recolor: { brown: "farm_dirt", sand: "cream" },
    description: "A small round sandy-brown desert toad with brown warts, golden eyes, a wide smile and a dark hard spade ridge on each back foot for digging backward into soil; can pop up out of the sand. About 0.58 m tall at size 1. Named parts: arm (front legs), leg_back (hind legs with the spades, pivot at the hip).",
    tags: ["desert", "amphibian", "soil", "adaptation", "small"],
    add: [P("sphere", r3(hip.map((v) => v * 0.72)), [0.06, 0.035, 0.12], { hang: [0.07, -0.095, -0.02], r: [0, 0, -20], c: "hoof", m: "glossy", name: "leg_back", ...M })],
  };
}

// ---------------------------------------------------------------- newt and axolotl
function salamander({ body, belly, head: hcol, hs, extra = [], dots, eyeIris, eyeSize = 0.06, mouthSize = 0.16 }) {
  const hc = [0, 0, 0];
  const parts = [
    P("capsule", [0, 0.17, 0], [0.32, 0.72, 0.24], { r: [90, 0, 0] }),
    P("capsule", [0, 0.135, 0.02], [0.28, 0.66, 0.17], { r: [90, 0, 0], c: belly }),
    P("capsule", [0, 0.17, -0.28], [0.17, 0.74, 0.2], { r: [-90, 0, 0], hang: [0, 0.33, 0], name: "tail", idle: { r: [0, 0, 12], hz: 0.5 } }),
    P("capsule", [0, 0.17, -0.28], [0.04, 0.7, 0.34], { r: [-90, 0, 0], hang: [0, 0.4, 0], c: extra.fin ?? body, name: "tail", idle: { r: [0, 0, 12], hz: 0.5 } }),
  ];
  const legDefs = [["leg_front_left", 0.13, 0.18], ["leg_front_right", -0.13, 0.18], ["leg_back_left", 0.13, -0.17], ["leg_back_right", -0.13, -0.17]];
  for (const [nm, x, z] of legDefs) {
    const sgn = Math.sign(x);
    parts.push(P("capsule", [x, 0.13, z], [0.07, 0.2, 0.07], { r: [0, 0, sgn * 62], hang: [0, -0.07, 0], name: nm }));
    parts.push(P("sphere", [x, 0.13, z], [0.09, 0.03, 0.09], { hang: [sgn * 0.11, -0.115, 0.02], name: nm }));
  }
  parts.push(H("sphere", hc, hs, { c: hcol }));
  parts.push(...(dots ?? []));
  parts.push(...(extra.parts ?? []));
  return { parts, ...face(hs, { ex: 0.1, ey: 0.06, es: eyeSize, iris: eyeIris, my: -0.005, ms: mouthSize, cx: 0.15, cy: -0.03, cs: 0.05 }) };
}
{
  const hs = [0.32, 0.2, 0.28];
  const dots = [];
  const c = [0, 0.13, 0.02];
  for (const [x, z] of [[0.08, 0.15], [-0.07, 0.05], [0.1, -0.08], [-0.1, -0.18], [0.03, -0.25], [0.12, 0.25], [-0.12, 0.2]]) dots.push(P("sphere", [x, 0.088, z], [0.035, 0.012, 0.035], { c: "ink" }));
  for (const [x, z] of [[0.06, 0.12], [-0.08, -0.05], [0.09, -0.2], [-0.03, 0.22]]) dots.push(P("sphere", [x, 0.288, z], [0.03, 0.01, 0.03], { c: "horse_mane" }));
  void c;
  const s = salamander({ body: "brown", belly: "orange", head: "brown", hs, dots, eyeIris: "gold", eyeSize: 0.065, mouthSize: 0.09,
    extra: { fin: "brown", parts: [H("sphere", [0, -0.05, 0.03], [0.26, 0.1, 0.22], { c: "orange" })] } });
  C.newt = {
    color: "brown", sound: "Blip!",
    description: "A small smooth newt: a long low olive-brown body and long flat tail with a little crest, a speckled orange belly that shows along its sides, four tiny legs, golden eyes and a gentle smile; swims and pauses on pondweed. About 0.33 m tall and 1.1 m long at size 1. Named parts: tail (wags on its own), leg_front_left, leg_front_right, leg_back_left, leg_back_right.",
    tags: ["pond", "amphibian", "wetland", "life_cycle", "small"],
    head: { at: [0, 0.2, 0.44] }, bob: 0.01, ...s,
  };
}
{
  const hs = [0.4, 0.26, 0.32];
  const gills = [];
  for (const [i, ang] of [[0, 25], [1, 0], [2, -25]].map(([i, a]) => [i, a])) {
    const base = [0.15, 0.06 - i * 0.03, -0.06];
    const dir = [Math.cos(ang / DEG) * 0.55, Math.sin(ang / DEG) * 0.75 + 0.35, -0.3];
    const L = 0.2;
    const n = Math.hypot(...dir);
    const tip = base.map((v, k) => v + (dir[k] / n) * L);
    gills.push({ ...rod(base, tip, 0.045, { c: "rose" }), on: "head", name: "gills", mirror: true, idle: { r: [0, 0, 6], hz: 0.7 } });
    for (const t of [0.35, 0.6, 0.85]) {
      const q = base.map((v, k) => v + (tip[k] - v) * t);
      gills.push(H("sphere", q, [0.06, 0.03, 0.06], { c: "rose", r: yTo(dir), name: "gills", ...M, idle: { r: [0, 0, 6], hz: 0.7 } }));
    }
  }
  const s = salamander({ body: "pig", belly: "toddler_skin", head: "pig", hs, eyeSize: 0.05, mouthSize: 0.12, extra: { fin: "toddler_skin", parts: gills } });
  C.axolotl = {
    color: "pig", sound: "Bloop!",
    description: "A small smiling axolotl, the pale-pink kind: a soft pink body and wide flat head, three feathery rose gills on each side of its head, little dark eyes, a very wide smile, tiny legs and a long tail with a pale fin. About 0.4 m tall and 1.1 m long at size 1. Named parts: gills (all six, flutter on their own), tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right. The dark speckled wild kind is axolotl_wild.",
    tags: ["pond", "amphibian", "lake", "adaptation", "small"],
    head: { at: [0, 0.21, 0.45] }, bob: 0.01, ...s,
  };
  const spots = [];
  for (const [x, z] of [[0.08, 0.15], [-0.07, 0.03], [0.1, -0.1], [-0.1, -0.2], [0.02, -0.28], [-0.04, 0.24]]) spots.push(P("sphere", [x, 0.288, z], [0.04, 0.012, 0.04], { c: "horse_mane" }));
  spots.push(H("sphere", [0.08, 0.12, -0.04], [0.04, 0.012, 0.04], { c: "horse_mane" }), H("sphere", [-0.1, 0.11, -0.07], [0.035, 0.012, 0.035], { c: "horse_mane" }));
  C.axolotl_wild = {
    like: "axolotl", recolor: { pig: "wood_dark", toddler_skin: "sand", rose: "dusk_sky" }, eyes: { iris: "gold", size: 0.06 },
    description: "The wild axolotl: dark speckled brown with a sandy belly and fin, dusky rose-violet feathery gills, little eyes and a wide smile. About 0.4 m tall at size 1. Same named parts as axolotl: gills, tail, the four legs.",
    tags: ["pond", "amphibian", "lake", "adaptation", "small"],
    add: spots,
  };
}

// ---------------------------------------------------------------- badger
{
  const hs = [0.4, 0.34, 0.42];
  const sn = [0.18, 0.14, 0.22], snc = [0, -0.07, 0.17];
  const hr = ell(hs);
  const hp = (x, y, back = 1, inset = 0.022) => {
    const z = back * (fz([0, 0, 0], hr, x, y) - 0);
    const n = [x / hr[0] ** 2, y / hr[1] ** 2, z / hr[2] ** 2];
    const L = Math.hypot(...n);
    return [x - (n[0] / L) * inset, y - (n[1] / L) * inset, z - (n[2] / L) * inset];
  };
  const stripe = (a, b, w) => [{ ...rod(hp(a[0], a[1], a[2] ?? 1), hp(b[0], b[1], b[2] ?? 1), w, { c: "charcoal" }), on: "head", mirror: true }];
  const claws = (x, z, nm) => [-0.035, 0, 0.035].map((dx) => P("sphere", [x, 0.3, z], [0.035, 0.035, 0.07], { hang: [dx, -0.27, 0.085], c: "cream", name: nm }));
  C.badger = {
    color: "grey", sound: "Snuffle!",
    description: "A stocky gray European badger: a low wide gray body, dark short legs, a white face with a black stripe over each eye from nose to ear, a white-tipped snout, small ears and blunt cream front claws for digging; sniffs the ground and shuffles backward. About 0.8 m tall and 1.1 m long at size 1. Named parts: leg_front_left, leg_front_right (with their claws), leg_back_left, leg_back_right, ears, tail.",
    tags: ["forest", "woods", "mammal", "nocturnal", "soil", "burrow"],
    head: { at: [0, 0.52, 0.5] },
    ...face(hs, { ex: 0.09, ey: 0.05, es: 0.075, iris: "eye_brown", my: -0.13, ms: 0.08, mc: snc, ms3: sn, cx: 0.15, cy: -0.07, cs: 0.06 }),
    bob: 0.015,
    parts: [
      P("sphere", [0, 0.4, -0.06], [0.64, 0.5, 0.92]),
      P("sphere", [0, 0.28, -0.04], [0.56, 0.3, 0.8], { c: "charcoal" }),
      ...legs4(0.2, 0.3, 0.2, -0.32, 0.14, { s: [0.17, 0.07, 0.22], c: "charcoal", dz: 0.03 }, { c: "charcoal" }),
      ...claws(0.2, 0.2, "leg_front_left"), ...claws(-0.2, 0.2, "leg_front_right"),
      P("sphere", [0, 0.46, -0.5], [0.16, 0.14, 0.18], { c: "grey", name: "tail", idle: { r: [0, 0, 10], hz: 0.6 } }),
      H("sphere", [0, 0, 0], hs, { c: "white" }),
      H("sphere", snc, sn, { c: "white" }),
      H("sphere", [0, -0.05, 0.28], [0.08, 0.06, 0.05], { c: "ink", m: "glossy" }),
      ...stripe([0.035, 0.0], [0.085, 0.09], 0.085), ...stripe([0.085, 0.09], [0.12, 0.12], 0.095), ...stripe([0.12, 0.12], [0.15, 0.1, -1], 0.095),
      H("sphere", [0.17, 0.13, -0.08], [0.11, 0.09, 0.06], { c: "charcoal", name: "ears", ...M }),
      H("sphere", [0.17, 0.165, -0.075], [0.09, 0.03, 0.05], { c: "white", name: "ears", ...M }),
    ],
  };
}

// ---------------------------------------------------------------- chipmunk
{
  const hs = [0.42, 0.38, 0.38];
  const mz = [0.18, 0.13, 0.13], mc = [0, -0.07, 0.14];
  const bc = [0, 0.3, 0.02], br = [0.21, 0.25, 0.2];
  const stripes = [];
  for (const [th, col, w] of [[180, "horse_mane", 0.05], [158, "cream", 0.045], [202, "cream", 0.045], [140, "horse_mane", 0.045], [220, "horse_mane", 0.045]])
    for (const ph of [-10, 15, 40]) stripes.push(decor(bc, br, th, ph, "sphere", [w, 0.13, 0.02], { c: col }, -0.002));
  C.chipmunk = {
    color: "horse_brown", sound: "Chip chip!",
    description: "A small striped chipmunk: chestnut fur with dark and cream stripes down its back and through its eyes, round full cheeks, a cream belly, little round ears and a bushy tail; pops out of a burrow and waves. About 0.85 m tall at size 1 (a little smaller than the squirrel, no acorn). Named parts: paw (both front paws, for wave and point), ears, tail (swishes on its own), legs (both feet).",
    tags: ["forest", "garden", "woods", "mammal", "burrow", "autumn", "small"],
    head: { at: [0, 0.66, 0.06] },
    ...face(hs, { ex: 0.085, ey: 0.05, es: 0.07, my: -0.11, ms: 0.06, mc, ms3: mz, cx: 0.15, cy: -0.06, cs: 0.06 }),
    bob: 0.02,
    parts: [
      P("sphere", bc, br.map((v) => v * 2)),
      P("sphere", [0, 0.27, 0.14], [0.26, 0.34, 0.16], { c: "cream" }),
      ...stripes,
      P("sphere", [0.1, 0.035, 0.12], [0.12, 0.07, 0.18], { name: "legs", ...M }),
      P("capsule", [0.13, 0.42, 0.13], [0.08, 0.2, 0.08], { r: [-35, 0, 12], hang: [0, -0.08, 0], name: "paw", ...M }),
      P("sphere", [0, 0.2, -0.2], [0.26, 0.6, 0.22], { r: [-20, 0, -15], hang: [0, 0.27, -0.04], name: "tail", idle: { r: [0, 0, 8], hz: 0.7 } }),
      P("sphere", [0, 0.2, -0.2], [0.08, 0.5, 0.235], { r: [-20, 0, -15], hang: [0, 0.27, -0.04], c: "horse_mane", name: "tail", idle: { r: [0, 0, 8], hz: 0.7 } }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", [0.12, -0.06, 0.08], [0.17, 0.15, 0.17], { c: "sand", ...M }),
      H("sphere", mc, mz, { c: "cream" }),
      H("sphere", [0, -0.035, 0.205], [0.055, 0.045, 0.04], { c: "ink", m: "glossy" }),
      H("sphere", [0.085, 0.115, 0.15], [0.11, 0.03, 0.04], { c: "cream", r: [-30, 0, -10], ...M }),
      H("sphere", [0, 0.175, 0.02], [0.05, 0.03, 0.26], { c: "horse_mane", r: [-20, 0, 0] }),
      H("sphere", [0.13, 0.17, -0.03], [0.1, 0.11, 0.05], { name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.5 } }),
    ],
  };
}

// ---------------------------------------------------------------- dormouse (from mouse)
C.dormouse = {
  like: "mouse", scale: 0.75, recolor: { grey: "bun_gold", white: "cream" }, drop: ["tail"],
  eyes: { size: 0.08 },
  description: "A tiny golden-brown hazel dormouse with a cream tummy and muzzle, big black eyes, round ears and a thick fluffy golden tail curled up behind; curls into a ball to sleep in a nest of leaves. About 0.68 m tall at size 1 (smaller than the mouse). Named part: tail (swishes on its own).",
  tags: ["forest", "woods", "mammal", "hibernation", "small", "nocturnal"],
  add: [
    P("capsule", [0, 0.09, -0.17], [0.13, 0.4, 0.13], { r: [-55, 0, -25], hang: [0, 0.18, 0], c: "bun_gold", name: "tail", idle: { r: [0, 0, 12], hz: 0.6 } }),
    P("sphere", [0, 0.09, -0.17], [0.15, 0.16, 0.15], { r: [-55, 0, -25], hang: [0, 0.38, 0], c: "bun_gold", name: "tail", idle: { r: [0, 0, 12], hz: 0.6 } }),
  ],
};

// ---------------------------------------------------------------- pocket gopher
{
  const hs = [0.46, 0.4, 0.42];
  const mz = [0.2, 0.15, 0.15], mc = [0, -0.07, 0.15];
  const pawClaws = [];
  for (const dx of [-0.03, 0, 0.03]) pawClaws.push(P("sphere", [0.16, 0.34, 0.16], [0.03, 0.03, 0.08], { hang: [dx, -0.24, 0.05], r: [-40, 0, 0], c: "cream", name: "paw", ...M }));
  C.pocket_gopher = {
    color: "twine", sound: "Dig dig!",
    description: "A small sandy-brown pocket gopher: a chubby body, big puffy fur-lined cheek pouches, tiny eyes, a pink nose, two little front teeth, tiny ears, a short tail and strong front paws with big blunt cream digging claws; pops up from a soil mound. About 0.85 m tall at size 1. Named parts: paw (both front paws with their claws, for point and digging), pouches (both cheek pouches), tail.",
    tags: ["grassland", "soil", "burrow", "mammal", "volcano", "small"],
    head: { at: [0, 0.66, 0.07] },
    ...face(hs, { ex: 0.1, ey: 0.07, es: 0.05, my: -0.105, ms: 0.06, mc, ms3: mz, cx: 0.17, cy: -0.02, cs: 0.05 }),
    bob: 0.02,
    parts: [
      P("sphere", [0, 0.3, 0], [0.56, 0.6, 0.52]),
      P("sphere", [0, 0.27, 0.14], [0.36, 0.4, 0.26], { c: "sand" }),
      P("sphere", [0.13, 0.035, 0.12], [0.15, 0.07, 0.2], M),
      P("capsule", [0.16, 0.34, 0.16], [0.12, 0.26, 0.12], { hang: [0, -0.11, 0.02], r: [-30, 0, 0], name: "paw", ...M }),
      ...pawClaws,
      P("capsule", [0, 0.1, -0.24], [0.06, 0.2, 0.06], { r: [-70, 0, 0], hang: [0, 0.08, 0], c: "horse_tan", name: "tail", idle: { r: [0, 0, 12], hz: 0.7 } }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", [0.16, -0.09, 0.08], [0.22, 0.2, 0.22], { c: "horse_tan", name: "pouches", ...M }),
      H("sphere", mc, mz, { c: "sand" }),
      H("sphere", [0, -0.03, 0.225], [0.06, 0.045, 0.04], { c: "rose", m: "glossy" }),
      H("box", [0.017, -0.16, 0.19], [0.03, 0.05, 0.015], { c: "white", ...M }),
      H("sphere", [0.16, 0.16, -0.02], [0.07, 0.07, 0.04], M),
    ],
  };
}

// ---------------------------------------------------------------- sloth
{
  const hs = [0.48, 0.44, 0.44];
  const fd = [0.38, 0.32, 0.26], fc = [0, -0.02, 0.1];
  const claws = [];
  for (const dx of [-0.035, 0, 0.035]) claws.push(P("cone", [0.2, 0.8, 0.02], [0.035, 0.14, 0.035], { on: "arm", at: [dx, 0.6, 0.04], r: [140, 0, 0], c: "cream", ...M }));
  const fur = { length: 0.03, shells: 12, density: 70, clump: 0.6 };
  C.sloth = {
    color: "brown", sound: "Hmmm...",
    description: "A gentle three-toed-style sloth with shaggy brown fur, a pale cream face with dark eye patches, a dark nose and a sleepy smile, and long curved cream claws; its arms reach up over its head to hang from a branch and it moves very slowly. About 1.4 m tall at size 1 to the raised hands (a branch held at about y 1.38 sits in its claws). Named parts: arm (both arms, pivot at the shoulder: turn [0, 0, ±150] to lower them, or slowly in turn to climb), legs (both legs dangling).",
    tags: ["rainforest", "jungle", "mammal", "slow", "tree"],
    head: { at: [0, 1.0, 0.06] },
    ...face(fd, { hc: fc, ex: 0.085, ey: 0.03, es: 0.07, iris: "eye_brown", my: -0.1, ms: 0.08, cx: 0.15, cy: -0.07, cs: 0.06 }),
    bob: 0.01,
    parts: [
      P("sphere", [0, 0.55, 0], [0.58, 0.74, 0.5], { m: "plush", fur }),
      P("sphere", [0, 0.5, 0.14], [0.36, 0.44, 0.24], { c: "sand", m: "plush" }),
      P("capsule", [0.13, 0.3, 0.04], [0.14, 0.32, 0.14], { hang: [0, -0.14, 0], r: [-10, 0, -8], name: "legs", m: "plush", ...M }),
      P("cone", [0.13, 0.3, 0.04], [0.03, 0.1, 0.03], { hang: [0.02, -0.3, 0.06], r: [160, 0, 0], c: "cream", name: "legs", ...M }),
      P("cone", [0.13, 0.3, 0.04], [0.03, 0.1, 0.03], { hang: [-0.02, -0.3, 0.06], r: [160, 0, 0], c: "cream", name: "legs", ...M }),
      P("capsule", [0.2, 0.8, 0.02], [0.13, 0.62, 0.13], { r: [0, 0, -14], hang: [0, 0.28, 0], name: "arm", m: "plush", ...M }),
      ...claws,
      H("sphere", [0, 0, 0], hs, { m: "plush" }),
      H("sphere", fc, fd, { c: "bun_crumb" }),
      H("sphere", [0.085, 0.02, 0.215], [0.15, 0.085, 0.04], { r: [0, 18, -22], c: "horse_mane", ...M }),
      H("sphere", [0, -0.045, 0.235], [0.075, 0.05, 0.04], { c: "horse_mane", m: "glossy" }),
    ],
  };
}

// ---------------------------------------------------------------- snow leopard
{
  const hs = [0.46, 0.4, 0.42];
  const mz = [0.24, 0.17, 0.18], mc = [0, -0.08, 0.16];
  const bc = [0, 0.6, -0.08], br = [0.25, 0.22, 0.48];
  const ros = [];
  for (const [th, ph] of [[60, 20], [90, 10], [120, 15], [75, 45], [105, 40], [140, 30], [45, 40], [160, 50], [90, 70], [130, 60]]) {
    ros.push(decor(bc, br, th, ph, "torus", [0.1, 0.1, 0.08], { c: "charcoal" }, 0.004));
    ros.push(decor(bc, br, -th, ph, "torus", [0.1, 0.1, 0.08], { c: "charcoal" }, 0.004));
  }
  const tail = [];
  for (const [h, w] of [[0.18, 0.17], [0.4, 0.18], [0.62, 0.19]]) tail.push(P("capsule", [0, 0.66, -0.52], [w, 0.3, w], { r: [-125, 0, 0], hang: [0, h, 0], name: "tail", idle: { r: [0, 0, 8], hz: 0.4 } }));
  for (const h of [0.3, 0.52]) tail.push(P("torus", [0, 0.66, -0.52], [0.2, 0.2, 0.3], { r: [-35, 0, 0], hang: [0, -0.0, h], c: "charcoal", name: "tail", idle: { r: [0, 0, 8], hz: 0.4 } }));
  tail.push(P("sphere", [0, 0.66, -0.52], [0.22, 0.24, 0.22], { r: [-125, 0, 0], hang: [0, 0.78, 0], c: "charcoal", name: "tail", idle: { r: [0, 0, 8], hz: 0.4 } }));
  C.snow_leopard = {
    color: "bao_dough", sound: "Purr...",
    description: "A pale smoky-gray snow leopard standing on four legs: dark ring rosettes on its back and sides, a white muzzle and chest, small rounded ears, wide furry paws, soft green eyes and a very long thick ringed tail; moves silently. About 1.2 m tall and 1.9 m long with the tail at size 1. Named parts: leg_front_left, leg_front_right, leg_back_left, leg_back_right (each with its paw, pivot at the hip: turn [±20, 0, 0] to walk), tail (sways), ears.",
    tags: ["mountain", "snow", "mammal", "big_cat", "asia"],
    head: { at: [0, 0.92, 0.42] },
    ...face(hs, { ex: 0.1, ey: 0.05, es: 0.08, iris: "moss", my: -0.135, ms: 0.07, mc, ms3: mz, cs: 0.07 }),
    bob: 0.01,
    parts: [
      P("sphere", bc, br.map((v) => v * 2)),
      P("sphere", [0, 0.55, 0.22], [0.42, 0.46, 0.36], { c: "white" }),
      ...ros,
      ...legs4(0.14, 0.52, 0.26, -0.38, 0.15, { s: [0.2, 0.1, 0.24], dz: 0.03 }),
      ...tail,
      H("sphere", [0, 0, 0], hs),
      H("sphere", mc, mz, { c: "white" }),
      H("sphere", [0, -0.04, 0.25], [0.07, 0.05, 0.04], { c: "rose", m: "glossy" }),
      H("sphere", [0.1, 0.15, 0.12], [0.04, 0.04, 0.015], { r: zTo([0.3, 0.6, 0.7]), c: "charcoal", ...M }),
      H("sphere", [0, 0.17, 0.09], [0.04, 0.04, 0.015], { r: [-50, 0, 0], c: "charcoal" }),
      ...[[20, 45], [40, 30], [12, 62], [55, 15], [-20, 45], [-40, 30], [-12, 62], [-55, 15], [0, 75], [65, 40], [-65, 40]].map(([th, ph]) => ({ ...decor([0, 0, 0], ell(hs), th, ph, "sphere", [0.035, 0.035, 0.015], { c: "charcoal" }, 0.0), on: "head" })),
      H("sphere", [0.17, 0.17, -0.03], [0.12, 0.12, 0.06], { name: "ears", ...M }),
      H("sphere", [0.17, 0.17, -0.005], [0.07, 0.07, 0.03], { c: "white", name: "ears", ...M }),
    ],
  };
}

// ---------------------------------------------------------------- elk
{
  const hs = [0.38, 0.36, 0.42];
  const mz = [0.26, 0.24, 0.34], mc = [0, -0.1, 0.2];
  const ant = [];
  const beam = (p0, p1) => ({ ...rod(p0, p1, 0.055, { c: "wood" }), on: "head", name: "antlers", ...M });
  const A = [0.08, 0.17, -0.06], B = [0.3, 0.42, -0.18], Cc = [0.44, 0.66, -0.3];
  ant.push(beam(A, B), beam(B, Cc));
  for (const [p, d] of [[[0.14, 0.24, -0.09], [0.08, 0.2, 0.22]], [[0.24, 0.35, -0.15], [0.03, 0.22, 0.2]], [[0.34, 0.49, -0.21], [0.0, 0.22, 0.14]], [[0.42, 0.62, -0.28], [0.02, 0.18, 0.12]]])
    ant.push(beam(p, p.map((v, i) => v + d[i])));
  C.elk = {
    color: "brown", sound: "Bugle!",
    description: "A large calm brown elk (wapiti) bull: a dark chocolate neck, a pale sandy rump and tiny tail, a long dark muzzle, leaf-shaped ears, long legs on dark hooves and wide cream antlers with tines; grazes and walks calmly. About 1.95 m tall to the antler tips at size 1 (head top about 1.55). Named parts: antlers (drop them for a cow elk), ears, tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (each with its hoof, pivot at the hip: turn [±20, 0, 0] to walk).",
    tags: ["forest", "mountain", "mammal", "grassland", "hoofed"],
    head: { at: [0, 1.38, 0.66], tilt: 0.8 },
    ...face(hs, { ex: 0.135, ey: 0.06, es: 0.075, iris: "eye_brown", my: -0.17, ms: 0.1, mc, ms3: mz, cx: 0.16, cy: -0.06, cs: 0.06 }),
    bob: 0.01,
    parts: [
      P("sphere", [0, 0.86, -0.04], [0.6, 0.56, 1.12]),
      P("sphere", [0, 0.88, -0.5], [0.5, 0.46, 0.28], { c: "sand" }),
      P("sphere", [0, 0.98, -0.62], [0.1, 0.12, 0.08], { c: "sand", name: "tail", idle: { r: [0, 0, 10], hz: 0.6 } }),
      rod([0, 0.9, 0.34], [0, 1.28, 0.6], 0.34, { c: "horse_mane" }),
      P("sphere", [0, 0.88, 0.4], [0.44, 0.44, 0.4], { c: "horse_mane" }),
      ...legs4(0.17, 0.72, 0.32, -0.38, 0.15, { p: "cylinder", s: [0.17, 0.1, 0.17], c: "hoof", m: "glossy" }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", mc, mz, { c: "wood_dark" }),
      H("sphere", [0.05, -0.1, 0.36], [0.05, 0.04, 0.03], { c: "hoof", ...M }),
      H("sphere", [0.2, 0.12, -0.07], [0.09, 0.22, 0.05], { r: [0, 0, -60], hang: [0, 0.07, 0], name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
      ...ant,
    ],
  };
}

// ---------------------------------------------------------------- mouse deer
{
  const hs = [0.26, 0.24, 0.28];
  const sn = [0.14, 0.11, 0.17], snc = [0, -0.05, 0.11];
  const throat = [];
  {
    const a = [0, 0.42, 0.14], b = [0, 0.6, 0.3], n = [0, -0.66, 0.75];
    const at = (p, t, off) => p.map((v, i) => v + (b[i] - a[i]) * t + n[i] * off);
    throat.push(rod(at(a, 0.1, 0.03), at(a, 0.85, 0.03), 0.085, { c: "white" }));
    throat.push(rod(at(a, 0.05, 0.068), at(a, 0.9, 0.068), 0.02, { c: "horse_brown" }));
  }
  C.mouse_deer = {
    color: "horse_brown", sound: "Peep!",
    description: "Sang Kancil the mouse deer: a tiny slender chestnut deer with a cream belly, white throat stripes, a pointed dark nose, big dark shiny eyes, small round ears, thin legs on little dark hooves and a stubby tail; quick and twinkly. About 0.78 m tall at size 1 (head top). Named parts: ears, tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (each with its hoof, pivot at the hip).",
    tags: ["rainforest", "jungle", "mammal", "fable", "asia", "hoofed", "small"],
    head: { at: [0, 0.64, 0.33] },
    ...face(hs, { ex: 0.07, ey: 0.03, es: 0.075, iris: "horse_mane", my: -0.08, ms: 0.05, mc: snc, ms3: sn, cx: 0.1, cy: -0.05, cs: 0.045 }),
    bob: 0.015,
    parts: [
      P("sphere", [0, 0.4, -0.04], [0.3, 0.28, 0.56]),
      P("sphere", [0, 0.34, -0.02], [0.24, 0.16, 0.44], { c: "cream" }),
      rod([0, 0.42, 0.14], [0, 0.6, 0.3], 0.13),
      ...throat,
      P("sphere", [0, 0.47, -0.3], [0.07, 0.08, 0.06], { c: "cream", name: "tail", idle: { r: [0, 0, 12], hz: 0.9 } }),
      ...legs4(0.08, 0.34, 0.14, -0.2, 0.055, { p: "cylinder", s: [0.06, 0.05, 0.06], c: "hoof", m: "glossy" }),
      H("sphere", [0, 0, 0], hs),
      H("sphere", snc, sn),
      H("sphere", [0, -0.04, 0.195], [0.045, 0.035, 0.03], { c: "ink", m: "glossy" }),
      H("sphere", [0.1, 0.11, -0.04], [0.08, 0.11, 0.04], { r: [0, 0, -30], name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.6 } }),
      H("sphere", [0.1, 0.11, -0.02], [0.05, 0.07, 0.02], { r: [0, 0, -30], c: "pig", name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.6 } }),
    ],
  };
}

// ---------------------------------------------------------------- tardigrade
{
  const hs = [0.42, 0.38, 0.34];
  const parts = [];
  const segs = [[0.15, 0.48, 0.44, 0.34], [-0.07, 0.5, 0.46, 0.34], [-0.28, 0.44, 0.4, 0.32]];
  for (const [z, w, h, d] of segs) parts.push(P("sphere", [0, 0.3, z], [w, h, d]));
  for (const z of [0.04, -0.18]) parts.push(P("torus", [0, 0.3, z], [0.48, 0.44, 0.15], { c: "bun_crumb" }));
  const lz = [0.28, 0.08, -0.12, -0.3];
  lz.forEach((z, i) => {
    const nm = `leg_${i + 1}`;
    const idle = { r: [i % 2 ? 14 : -14, 0, 0], hz: 0.6 };
    parts.push(P("capsule", [0.18, 0.18, z], [0.12, 0.2, 0.12], { r: [0, 0, 18], hang: [0, -0.07, 0], name: nm, ...M, idle }));
    for (const dz of [-0.025, 0.025]) parts.push(P("cone", [0.18, 0.18, z], [0.025, 0.05, 0.025], { r: [0, 0, 18], hang: [0, -0.18, dz + 0.03], c: "charcoal", name: nm, ...M, idle }));
  });
  parts.push(H("sphere", [0, 0, 0], hs));
  parts.push(H("torus", [0, -0.04, 0.17], [0.11, 0.11, 0.12], { c: "pig" }));
  C.tardigrade = {
    color: "dough", sound: "Paddle paddle!",
    description: "A tiny chubby water bear (tardigrade), as seen under a microscope and made cute: a plump soft cream body in round segments, a round head with a little round snout ring, small eyes and a smile, and eight stubby legs with tiny dark claws that paddle slowly. About 0.55 m tall and 0.95 m long at size 1 (a toy blown up from microscope size). Named parts: leg_1 .. leg_4 (each a mirrored pair, front to back, paddling on their own). Its dry curled barrel (tun) is tardigrade_tun.",
    tags: ["microscope", "science", "micro", "water", "adaptation", "small"],
    head: { at: [0, 0.33, 0.38] },
    ...face(hs, { ex: 0.09, ey: 0.07, es: 0.06, my: -0.09, ms: 0.07, cx: 0.14, cy: -0.02, cs: 0.06 }),
    bob: 0.012,
    parts,
  };
  C.tardigrade_tun = {
    like: "tardigrade", drop: ["leg_1", "leg_2", "leg_3", "leg_4"], recolor: { dough: "hay", bun_crumb: "bun_gold" },
    description: "The water bear dried out and curled into its barrel-shaped tun: legs pulled in, a golden dry shell of segments, eyes and a small calm face; swap tardigrade for this (or back) to show it curling up and reviving. About 0.5 m tall at size 1.",
    tags: ["microscope", "science", "micro", "adaptation", "small"],
  };
}

// ---------------------------------------------------------------- termites
{
  const hs = [0.32, 0.3, 0.3];
  const parts = [
    P("sphere", [0, 0.22, 0.12], [0.22, 0.18, 0.22], { c: "bun_crumb" }),
    P("sphere", [0, 0.24, -0.16], [0.36, 0.3, 0.46]),
    P("torus", [0, 0.24, -0.1], [0.36, 0.32, 0.12], { c: "bun_crumb" }),
    P("torus", [0, 0.24, -0.24], [0.33, 0.28, 0.12], { c: "bun_crumb" }),
  ];
  for (const [z, rz] of [[0.16, 0], [0.08, 0], [-0.0, 0]]) {
    void rz;
    parts.push(P("capsule", [0.08, 0.18, z], [0.04, 0.22, 0.04], { r: [0, 0, 55], hang: [0, -0.09, 0], c: "bun_gold", name: "legs", ...M }));
  }
  parts.push(H("sphere", [0, 0, 0], hs, { c: "bun_gold" }));
  parts.push(H("capsule", [0.06, 0.12, 0.06], [0.025, 0.18, 0.025], { r: [30, 0, -30], hang: [0, 0.08, 0], c: "bun_gold", name: "antennae", ...M, idle: { r: [0, 0, 8], hz: 1 } }));
  parts.push(H("sphere", [0.06, 0.12, 0.06], [0.04, 0.04, 0.04], { r: [30, 0, -30], hang: [0, 0.17, 0], c: "bun_gold", name: "antennae", ...M, idle: { r: [0, 0, 8], hz: 1 } }));
  C.termite = {
    color: "bun_crumb", sound: "Munch munch!",
    description: "A small pale cartoon worker termite: a round golden-brown head with eyes and a smile, beaded antennae, a cream ringed body and six thin legs; moves in busy lines. About 0.5 m tall and 0.6 m long at size 1. Named parts: legs (all six), antennae. The big-jawed soldier is termite_soldier and the large queen termite_queen.",
    tags: ["insect", "minibeast", "soil", "wood", "colony", "small"],
    head: { at: [0, 0.3, 0.33] },
    ...face(hs, { ex: 0.07, ey: 0.04, es: 0.065, my: -0.07, ms: 0.07, cx: 0.11, cy: -0.03, cs: 0.05 }),
    bob: 0.015,
    parts,
  };
  const big = [0.44, 0.38, 0.42], bc = [0, 0.02, 0.03];
  C.termite_soldier = {
    like: "termite",
    ...(() => { const f = face(big, { hc: bc, ex: 0.08, ey: 0.08, es: 0.07, my: -0.02, ms: 0.06, cx: 0.13, cy: -0.0, cs: 0.05 }); return { eyes: f.eyes, mouth: f.mouth, cheeks: f.cheeks }; })(),
    description: "A soldier termite: the worker's pale ringed body with a much bigger golden-brown head and two big rounded dark-brown jaws held out in front (friendly, never biting). About 0.55 m tall at size 1. Named parts: jaws (both, pivot at the head: turn [0, ±10, 0] to open and close), legs, antennae.",
    tags: ["insect", "minibeast", "soil", "colony", "small"],
    add: [
      H("sphere", bc, big, { c: "bun_gold" }),
      H("cone", [0.1, -0.11, 0.17], [0.08, 0.26, 0.05], { r: [84, 0, 24], hang: [0, 0.12, 0], c: "horse_mane", name: "jaws", ...M }),
      H("sphere", [0.1, -0.11, 0.17], [0.035, 0.035, 0.035], { r: [84, 0, 24], hang: [0, 0.245, 0], c: "horse_mane", name: "jaws", ...M }),
    ],
  };
  C.termite_queen = {
    like: "termite", scale: 1.3,
    description: "The termite queen: a bigger termite with a huge long cream abdomen striped with golden bands stretching out behind her, and a small gold crown. About 0.75 m tall and 1.9 m long at size 1. Named parts: abdomen, crown, legs, antennae.",
    tags: ["insect", "minibeast", "soil", "colony"],
    add: [
      P("sphere", [0, 0.34, -0.85], [0.66, 0.56, 1.3], { c: "bun_crumb", name: "abdomen" }),
      ...[-0.45, -0.7, -0.95, -1.2].map((z) => P("torus", [0, 0.34, z], [0.66 * Math.sqrt(1 - ((z + 0.85) / 0.65) ** 2) + 0.02, 0.56 * Math.sqrt(1 - ((z + 0.85) / 0.65) ** 2) + 0.02, 0.15], { c: "hay", name: "abdomen" })),
      H("cone", [0, 0.24, -0.02], [0.18, 0.14, 0.18], { c: "gold", m: "glossy", name: "crown" }),
    ],
  };
}

// ---------------------------------------------------------------- caribou and deer (from elk)
{
  const k = 0.9;
  const hoofs = [["leg_front_left", 0.17, 0.32], ["leg_front_right", -0.17, 0.32], ["leg_back_left", 0.17, -0.38], ["leg_back_right", -0.17, -0.38]].map(([nm, x, z]) =>
    P("cylinder", [x * k, 0.72 * k, z * k], [0.24, 0.07, 0.27], { hang: [0, -0.72 * k + 0.035, 0.02], c: "hoof", m: "glossy", name: nm }));
  // A forward brow shovel and an extra tine on each antler (in the caribou's own units, on the head).
  const beam = (p0, p1) => ({ ...rod(p0, p1, 0.05, { c: "wood" }), on: "head", name: "antlers", ...M });
  C.caribou = {
    like: "elk", scale: k, recolor: { horse_mane: "cream", brown: "wood_dark" },
    description: "A brown caribou (reindeer): darker brown body, a pale cream neck and chest, a pale rump, a dark muzzle, wide flat dark hooves for snow and big branching cream antlers with a brow tine reaching forward; scrapes snow with a front hoof to find lichens. About 1.8 m tall to the antler tips at size 1. Named parts: antlers, ears, tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (each with its wide hoof, pivot at the hip: turn leg_front_left [-30, 0, 0] and back to scrape).",
    tags: ["arctic", "tundra", "snow", "mammal", "hoofed", "migration"],
    add: [...hoofs, beam([0.07, 0.15, -0.05], [0.05, 0.2, 0.15]), beam([0.05, 0.2, 0.15], [0.03, 0.12, 0.24]), beam([0.38, 0.55, -0.26], [0.5, 0.62, -0.18])],
  };
}
{
  const k = 0.6;
  const bc = [0, 0.86 * k, -0.04 * k], br = [0.3 * k, 0.28 * k, 0.56 * k];
  const spots = [];
  for (const [th, ph] of [[160, 55], [200, 55], [145, 35], [215, 35], [175, 75], [130, 55], [230, 55], [120, 30], [240, 30], [185, 45], [100, 45], [260, 45]])
    spots.push(decor(bc, br, th, ph, "sphere", [0.045, 0.045, 0.015], { c: "white" }, 0));
  C.deer = {
    like: "elk", scale: k, drop: ["antlers"], recolor: { brown: "horse_brown", horse_mane: "horse_brown", wood_dark: "horse_tan" },
    eyes: { size: 0.06 },
    description: "A gentle young deer (a fawn): a soft chestnut coat with white spots on its back, a pale rump and tail, a dark nose, big eyes, big ears and thin legs on little dark hooves; steps quietly into a clearing. About 0.98 m tall to the ear tips at size 1. Named parts: ears (big, twitch on their own), tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (each with its hoof, pivot at the hip).",
    tags: ["forest", "woods", "mammal", "hoofed", "baby", "meadow"],
    add: [
      ...spots,
      H("sphere", [0.12, 0.072, -0.042], [0.09, 0.2, 0.04], { r: [0, 0, -50], hang: [0, 0.08, 0], name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
      H("sphere", [0.12, 0.072, -0.025], [0.055, 0.14, 0.02], { r: [0, 0, -50], hang: [0, 0.08, 0], c: "pig", name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
    ],
  };
}

// ---------------------------------------------------------------- raccoon
{
  const hs = [0.54, 0.46, 0.48];
  const fd = [0.44, 0.3, 0.28], fc = [0, -0.04, 0.12];
  const sn = [0.18, 0.13, 0.14], snc = [0, -0.1, 0.2];
  const tail = [];
  [0.1, 0.22, 0.34, 0.46, 0.58].forEach((h, i) => tail.push(P("sphere", [0.12, 0.16, -0.22], [0.26 - i * 0.015, 0.16, 0.26 - i * 0.015], { r: [-40, 0, -45], hang: [0, h, 0], c: i % 2 ? "charcoal" : "grey", name: "tail", idle: { r: [0, 0, 10], hz: 0.5 } })));
  tail.push(P("sphere", [0.12, 0.16, -0.22], [0.18, 0.16, 0.18], { r: [-40, 0, -45], hang: [0, 0.68, 0], c: "charcoal", name: "tail", idle: { r: [0, 0, 10], hz: 0.5 } }));
  C.raccoon = {
    color: "grey", sound: "Chitter!",
    description: "A friendly raccoon: a gray coat with a white tummy, a white face with a black mask around her big brown eyes, a pointed white snout with a black nose, round ears with dark centers, dark hands and feet and a bushy tail ringed gray and black. Her front paws reach forward to carry a picnic basket (parent it at about [0, 0.36, 0.34]). About 1.0 m tall at size 1. Named parts: paw (both front paws, for carry, point and wave), ears, tail (sways).",
    tags: ["forest", "woods", "mammal", "nocturnal", "town", "picnic"],
    head: { at: [0, 0.82, 0.06] },
    ...face(fd, { hc: fc, ex: 0.095, ey: 0.03, es: 0.075, iris: "eye_brown", my: -0.15, ms: 0.07, mc: snc, ms3: sn, cx: 0.17, cy: -0.08, cs: 0.06 }),
    bob: 0.02,
    parts: [
      P("sphere", [0, 0.34, 0], [0.58, 0.62, 0.54]),
      P("sphere", [0, 0.31, 0.15], [0.36, 0.4, 0.26], { c: "white" }),
      P("sphere", [0.15, 0.04, 0.14], [0.16, 0.08, 0.22], { c: "charcoal", ...M }),
      P("capsule", [0.17, 0.48, 0.12], [0.11, 0.3, 0.11], { r: [-55, 0, 8], hang: [0, -0.12, 0], name: "paw", ...M }),
      P("sphere", [0.17, 0.48, 0.12], [0.12, 0.1, 0.12], { r: [-55, 0, 8], hang: [0, -0.26, 0], c: "charcoal", name: "paw", ...M }),
      ...tail,
      H("sphere", [0, 0, 0], hs),
      H("sphere", fc, fd, { c: "white" }),
      H("sphere", [0.1, 0.03, 0.2], [0.2, 0.12, 0.05], { r: [0, 20, -12], c: "black", ...M }),
      H("sphere", [0, 0.06, 0.2], [0.07, 0.16, 0.05], { r: [-25, 0, 0], c: "grey" }),
      H("sphere", snc, sn, { c: "white" }),
      H("sphere", [0, -0.075, 0.27], [0.07, 0.05, 0.05], { c: "ink", m: "glossy" }),
      H("sphere", [0.19, 0.19, -0.03], [0.16, 0.16, 0.06], { name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
      H("sphere", [0.19, 0.19, -0.005], [0.1, 0.1, 0.03], { c: "charcoal", name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
    ],
  };
}

// ---------------------------------------------------------------- skunk
{
  const hs = [0.5, 0.44, 0.46];
  const sn = [0.2, 0.15, 0.16], snc = [0, -0.08, 0.17];
  const bc = [0, 0.32, -0.02], br = [0.28, 0.3, 0.26];
  const stripe = [];
  for (const ph of [88, 72, 56, 40, 24]) stripe.push(decor(bc, br, 180, ph, "sphere", [0.16, 0.16, 0.03], { c: "white" }, -0.004));
  const tp = [0.08, 0.2, -0.22], tr = [-22, 0, -14];
  C.skunk = {
    color: "charcoal", sound: "Peek-a-boo!",
    description: "A friendly black skunk with big brown eyes, a pink nose and a smile; a white stripe runs from its forehead over its head and down its back, and a big bushy black tail with a white stripe curls up behind it; peeks out from behind a log. About 1.2 m tall to the tail top at size 1. Named parts: paw (both front paws, for point and wave), ears, tail (big and bushy, sways).",
    tags: ["forest", "woods", "mammal", "nocturnal", "garden"],
    head: { at: [0, 0.78, 0.06] },
    ...face(hs, { ex: 0.1, ey: 0.04, es: 0.08, iris: "eye_brown", my: -0.13, ms: 0.07, mc: snc, ms3: sn, cx: 0.16, cy: -0.07, cs: 0.07 }),
    bob: 0.02,
    parts: [
      P("sphere", bc, br.map((v) => v * 2)),
      ...stripe,
      P("sphere", [0.14, 0.04, 0.13], [0.15, 0.08, 0.2], M),
      P("capsule", [0.15, 0.42, 0.13], [0.1, 0.28, 0.1], { r: [-30, 0, 8], hang: [0, -0.11, 0], name: "paw", ...M }),
      ...[[0.48, [0.44, 1.0, 0.4]], [0.74, [0.5, 0.52, 0.46]]].flatMap(([h, sz]) => [
        P("sphere", tp, sz, { r: tr, hang: [0, h, -0.02], name: "tail", idle: { r: [0, 0, 8], hz: 0.5 } }),
        P("sphere", tp, [0.16, sz[1] * 0.98, sz[2]], { r: tr, hang: [0, h, -0.09], c: "white", name: "tail", idle: { r: [0, 0, 8], hz: 0.5 } }),
      ]),
      H("sphere", [0, 0, 0], hs),
      H("sphere", [0, 0.1, 0.16], [0.08, 0.26, 0.12], { r: [-38, 0, 0], c: "white" }),
      H("sphere", [0, 0.2, -0.02], [0.12, 0.08, 0.3], { c: "white" }),
      H("sphere", snc, sn),
      H("sphere", [0, -0.05, 0.25], [0.065, 0.05, 0.045], { c: "rose", m: "glossy" }),
      H("sphere", [0.18, 0.17, -0.03], [0.12, 0.12, 0.05], { name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
      H("sphere", [0.18, 0.17, -0.008], [0.07, 0.07, 0.02], { c: "pig", name: "ears", ...M, idle: { r: [0, 0, 6], hz: 0.4 } }),
    ],
  };
}

// ---------------------------------------------------------------- salmon (from fish)
{
  const bc = [0, 0.6, 0], br = [0.32, 0.35, 0.46];
  const spots = [];
  for (const [th, ph] of [[150, 60], [210, 60], [120, 65], [240, 65], [180, 72], [100, 55], [260, 55], [165, 50], [195, 50]])
    spots.push(decor(bc, br, th, ph, "sphere", [0.04, 0.04, 0.012], { c: "charcoal" }, 0.002));
  C.salmon = {
    like: "fish", recolor: { orange: "grey", white: "lab_white" },
    description: "A silver-and-pink Pacific salmon with a friendly face: a silvery blue-gray body with white bands, a pink stripe along each side, small dark spots on its back, waving side fins and a swishing tail. Sizes: a tiny fry at size 0.3, a young fish in a school at 0.5-0.6, a strong adult leaping upstream at size 1 (about 1.1 m tall, 0.9 m long). Named parts: fin (the back fin), tail (swishes on its own).",
    tags: ["river", "ocean", "fish", "water", "life_cycle", "migration"],
    add: [P("sphere", [0, 0.55, -0.02], [0.7, 0.17, 0.88], { c: "knot_pink" }), ...spots],
  };
}

// ---------------------------------------------------------------- seahorse
{
  const hs = [0.3, 0.3, 0.3];
  const tailPts = [[0, 0.36, -0.04], [0, 0.22, -0.08], [0, 0.11, -0.05], [0, 0.055, 0.03], [0, 0.085, 0.1], [0, 0.145, 0.095], [0, 0.15, 0.045]];
  const widths = [0.2, 0.16, 0.12, 0.09, 0.07, 0.055];
  const root = tailPts[0];
  const tail = widths.map((w, i) => {
    const a = tailPts[i], b = tailPts[i + 1];
    const d = b.map((v, j) => v - a[j]);
    const L = Math.hypot(...d);
    const mid = a.map((v, j) => (v + b[j]) / 2 - root[j]);
    return P("capsule", root, [w, L + w * 0.6, w], { hang: mid, hr: r3(yTo(d)), name: "tail", idle: { r: [6, 0, 0], hz: 0.4 } });
  });
  const belly = [];
  const tc = [0, 0.52, 0.03], trd = [0.17, 0.23, 0.17];
  for (const ph of [-40, -22, -4, 14, 32]) belly.push(decor(tc, trd, 0, ph, "sphere", [0.15, 0.05, 0.02], { c: "hay" }, -0.004));
  C.seahorse = {
    color: "orange", sound: "Bloop bloop!",
    description: "A small orange seahorse that swims upright: a round head with big eyes and a little crown, a long tube snout with a tiny smiling mouth at its tip, a curved tummy with golden belly plates, a small golden back fin that flutters slowly and a curly tail that can curl around grass. About 0.95 m tall at size 1 (lift it with `at` to float it in water). Named parts: fin (back fin, flutters on its own), tail (the whole curl, pivot at its root: turn [±20, 0, 0] to curl and uncurl).",
    tags: ["ocean", "sea", "fish", "water", "reef", "small"],
    head: { at: [0, 0.84, 0.05], tilt: 0.8 },
    ...face(hs, { ex: 0.075, ey: 0.04, es: 0.07, my: -0.055, ms: 0.04, mc: [0, -0.06, 0.3], ms3: [0.08, 0.07, 0.06], cx: 0.1, cy: -0.04, cs: 0.045 }),
    bob: 0.03,
    parts: [
      P("sphere", tc, trd.map((v) => v * 2), { r: [-10, 0, 0] }),
      ...belly,
      rod([0, 0.62, 0.0], [0, 0.82, 0.03], 0.18),
      ...tail,
      P("sphere", [0, 0.56, -0.15], [0.03, 0.2, 0.14], { r: [-15, 0, 0], c: "hay", name: "fin", idle: { r: [0, 25, 0], hz: 1.2 } }),
      H("sphere", [0, 0, 0], hs),
      { ...rod([0, -0.04, 0.1], [0, -0.06, 0.28], 0.08), on: "head" },
      H("sphere", [0, -0.06, 0.29], [0.08, 0.07, 0.06]),
      H("cone", [0, 0.15, -0.02], [0.1, 0.1, 0.1], { c: "hay" }),
      H("sphere", [0.13, -0.04, -0.04], [0.02, 0.08, 0.06], { c: "hay", ...M, idle: { r: [0, 20, 0], hz: 1.4 } }),
    ],
  };
}

const out = {
  description: "Toybox 10K wave 2 wild animals: hare and arctic_hare, snake, tortoise and turtle_hatchling (from turtle), coyote and wolf (from fox), arctic_fox and arctic_fox_summer, toad and spadefoot_toad (from frog), newt, axolotl and axolotl_wild, badger, chipmunk, dormouse (from mouse), pocket_gopher, sloth, snow_leopard, elk, caribou and deer (from elk), mouse_deer, raccoon, skunk, salmon (from fish), seahorse, tardigrade and tardigrade_tun, termite, termite_soldier and termite_queen. Generated by tools/gen_tk_wild2.mjs: edit the generator and rerun it, not the JSON.",
  critters: C,
};
const file = fileURLToPath(new URL("../catalog/models/tk_wild2.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(C).length, "critters");
