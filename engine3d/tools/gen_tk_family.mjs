#!/usr/bin/env node
// Writes catalog/models/tk_family.json: the Toybox 10K family and story characters. Most are variants of
// catalog critters (the Bear family from `bear`; grown-up and baby versions of bunny, frog, monkey, penguin, dog,
// camel, squirrel, lion, pig and fish; story people from the br04 `toddler`), a few are new (sun, crescent moon,
// north wind, water spirit, scarecrow, oni and troll grumps, village children). Accessories are laid out here in
// the base critter's units and scaled with the variant, so edit this file, not the JSON:
//   node engine3d/tools/gen_tk_family.mjs
// Everything faces +z and stands on y = 0; +x is the critter's left.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../catalog/models/tk_family.json");
const R = (x) => Math.round(x * 1000) / 1000;
const r3 = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "number" ? R(x) : x)) : typeof v === "number" ? R(v) : v);
const DEG = Math.PI / 180;

/** Scale a list of parts (base units) to a variant's own units. */
function scaled(parts, k) {
  return parts.map((p) => {
    const q = { ...p };
    for (const key of ["at", "s", "hang"]) if (q[key] != null) q[key] = r3(Array.isArray(q[key]) ? q[key].map((x) => x * k) : q[key] * k);
    if (q.repeat) q.repeat = { ...q.repeat, radius: R(q.repeat.radius * k) };
    if (q.r) q.r = r3(q.r);
    if (q.hr) q.hr = r3(q.hr);
    return q;
  });
}
const kface = (o, k) => {
  const q = { ...o };
  if (q.at) q.at = r3(q.at.map((x) => x * k));
  if (q.size != null) q.size = R(q.size * k);
  return q;
};

/** z of the front of an ellipsoid (centre c, full size s) at (x, y). */
const frontZ = (c, s, x, y) => c[2] + (s[2] / 2) * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / (s[0] / 2)) ** 2 - ((y - c[1]) / (s[1] / 2)) ** 2));
/** Half width (x) and half depth (z) of an ellipsoid's slice at height y. */
const slice = (c, s, y) => { const f = Math.sqrt(Math.max(0, 1 - ((y - c[1]) / (s[1] / 2)) ** 2)); return [(s[0] / 2) * f, (s[2] / 2) * f]; };
/** A flat ring round an ellipsoid at height y (a knit stripe, a hem, a collar): a squashed torus lying flat. */
function band(c, s, y, color, name, { out = 0.014, thick = 0.05, m = "plush", on } = {}) {
  const [rx, rz] = slice(c, s, y);
  const p = { p: "torus", at: [c[0], y, c[2]], s: [2 * (rx + out), 2 * (rz + out), thick / 0.3], r: [90, 0, 0], c: color, m };
  if (name) p.name = name;
  if (on) p.on = on;
  return p;
}
/** Small spheres on the front of an ellipsoid (buttons, dots): [x, y] pairs. */
const onFront = (c, s, pts, size, color, name, extra = {}) =>
  pts.map(([x, y]) => ({ p: "sphere", at: [x, y, frontZ(c, s, x, y) + size[2] * 0.2], s: size, c: color, m: "glossy", ...(name ? { name } : {}), ...extra }));
/** Spheres on an ellipsoid at (yaw, height) pairs (all round it, not only the front). */
function around(c, s, pts, size, color, name, extra = {}) {
  return pts.map(([yaw, y]) => {
    const [rx, rz] = slice(c, s, y);
    const a = yaw * DEG;
    return { p: "sphere", at: [c[0] + Math.sin(a) * rx, y, c[2] + Math.cos(a) * rz], s: size, r: [0, yaw, 0], c: color, m: "glossy", ...(name ? { name } : {}), ...extra };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// The Bear family: the catalog bear (1.25 m, body sphere at y 0.38, head at [0, 0.92, 0.04]) with arms added, in
// its own units; each member scales it and adds clothes. Fur stays the bear's brown, so they read as one family.
// ---------------------------------------------------------------------------------------------------------------
const BODY = { c: [0, 0.38, 0], s: [0.7, 0.68, 0.62] };
const COVER = { c: [0, 0.37, 0.025], s: [0.735, 0.7, 0.71] }; // a sweater, romper or coat over the body
const HEAD = { c: [0, 0, 0], s: [0.64, 0.58, 0.56] };
const IDLE_ARM = { r: [0, 0, 5], hz: 0.45 };

/** Bear arms (named "arm", the point action uses it): a sleeve of `sleeve` colour (or none) and a fur paw. */
function bearArms(sleeve, { m = "plush", paw = 0.36, wide = 1 } = {}) {
  const at = [0.27, 0.6, 0.05];
  const r = [0, 0, 26];
  const out = [];
  if (sleeve) out.push({ p: "capsule", at, s: [0.19, 0.28, 0.19], r, hang: [0, -0.09, 0], c: sleeve, m, mirror: true, name: "arm", idle: IDLE_ARM });
  out.push({ p: "capsule", at, s: [0.16, paw, 0.16], r, hang: [0, -0.14, 0], mirror: true, name: "arm", idle: IDLE_ARM });
  out.push({ p: "sphere", at, s: [0.17 * wide, 0.17, 0.17 * wide], r, hang: [0, -0.29, 0.01], mirror: true, name: "arm", idle: IDLE_ARM });
  return out;
}

/** Round glasses on a face: lens centres [±x, y, z], lens size d, temples back to the ears. */
function glasses(x, y, z, d, { color = "stitch_gold", temple = true, back = 0.16, wide = 0.25 } = {}) {
  const parts = [
    { p: "capsule", at: [x, y, z], s: [0.1 * d, (Math.PI * d) / 14 * 1.25, 0.1 * d], r: [0, 0, 90], repeat: { n: 14, radius: d / 2 }, c: color, m: "metal", on: "head", mirror: true, name: "glasses" },
    { p: "capsule", at: [0, y + d * 0.06, z], r: [0, 0, 90], s: [0.022 * d / 0.2, Math.max(0.02, 2 * x - d * 0.85), 0.022 * d / 0.2], c: color, m: "glossy", on: "head", name: "glasses" },
  ];
  if (temple) parts.push({ p: "capsule", at: [x + d * 0.47, y + d * 0.05, z - back / 2], r: [90, 0, 0], s: [0.02 * d / 0.2, back, 0.02 * d / 0.2], hr: [0, 0, 0], c: color, m: "glossy", on: "head", mirror: true, name: "glasses" });
  void wide;
  return parts;
}

/** A knit cover over the body (sweater, romper, coat): the cover, a neck roll and a hem stripe. */
function bodyCover(color, name, { m = "plush", collar = color, hem = null, stripes = [], stripeColor = "white" } = {}) {
  const { c, s } = COVER;
  const parts = [{ p: "sphere", at: c, s, c: color, m, name }];
  parts.push({ p: "torus", at: [0, 0.68, 0.0], s: [0.36, 0.34, 0.5], r: [90, 0, 0], c: collar, m, name });
  for (const y of stripes) parts.push(band(c, s, y, stripeColor, name, { m }));
  if (hem) parts.push(band(c, s, hem, color, name, { m, out: 0.02, thick: 0.07 }));
  return parts;
}

function bearDressed(k, extra) { return scaled(extra, k); }

const bear = {};

// Baby Bear: honey-coloured cub, half size, bigger eyes, a curl on top, a knitted pale blue romper.
{
  const k = 0.5;
  const romper = [
    ...bodyCover("sky", "romper", { collar: "white", hem: null }),
    ...onFront(COVER.c, COVER.s, [[0, 0.56], [0, 0.46]], [0.07, 0.07, 0.05], "white", "romper"),
    { p: "heart", at: [0, 0.31, frontZ(COVER.c, COVER.s, 0, 0.31) + 0.005], s: [0.13, 0.13, 0.08], c: "yellow", m: "plush", name: "romper" },
  ];
  bear.baby_bear = {
    like: "bear",
    description: "Baby Bear: a tiny round honey-colored bear cub (0.63 m) in a pale blue knitted romper with a heart, a curl of fur on top and big eyes; crawls, toddles, babbles and reaches up to be held (arms).",
    tags: ["toy", "bear", "family", "baby"],
    scale: k,
    recolor: { brown: "bun_gold" },
    sound: "Ba-ba!",
    eyes: { size: 0.052 },
    add: bearDressed(k, [
      ...romper,
      ...bearArms("sky", { paw: 0.32 }),
      { p: "torus", at: [0.0, 0.31, 0.06], s: [0.17, 0.17, 0.3], r: [0, 90, 0], on: "head", m: "plush", name: "curl" },
    ]),
  };
}

// Mommy Bear: brown, a pink flowery headscarf tied at the back.
{
  const k = 0.96;
  const dome = { at: [0, 0.035 + 0.62 * 0.25, -0.04], s: [0.71, 0.62, 0.68], tilt: -24 };
  const flowers = [];
  // White flowers with a yellow middle on the scarf (points on the tilted dome: yaw, polar angle).
  const pts = [[0, 40], [-50, 50], [50, 50], [0, 72], [-95, 58], [95, 58], [-30, 18], [30, 18], [-140, 55], [140, 55], [180, 40]];
  for (const [yaw, pol] of pts) {
    const a = yaw * DEG, b = pol * DEG;
    let x = 0.5 * Math.sin(b) * Math.sin(a) * dome.s[0] * 1.01;
    let y = (0.5 * Math.cos(b) - 0.25) * dome.s[1];
    let z = 0.5 * Math.sin(b) * Math.cos(a) * dome.s[2] * 1.01;
    const t = dome.tilt * DEG; // tilt about x
    const y2 = y * Math.cos(t) - z * Math.sin(t), z2 = y * Math.sin(t) + z * Math.cos(t);
    const pos = [dome.at[0] + x, dome.at[1] + y2, dome.at[2] + z2];
    flowers.push({ p: "sphere", at: pos, s: [0.075, 0.075, 0.075], c: "white", m: "plush", on: "head", name: "headscarf" });
    flowers.push({ p: "sphere", at: [pos[0] * 1.06, pos[1] + 0.008, pos[2] * 1.06 - 0.002], s: [0.035, 0.035, 0.035], c: "yellow", m: "glossy", on: "head", name: "headscarf" });
  }
  bear.mommy_bear = {
    like: "bear",
    description: "Mommy Bear: a soft brown grown-up bear (1.2 m) with a pink flowery headscarf tied at the back, rosy cheeks and a warm smile; gives big gentle cuddles (arms). Bear family.",
    tags: ["toy", "bear", "family", "mother"],
    scale: k,
    cheeks: { at: r3([0.19 * k, -0.06 * k, 0.21 * k]), size: R(0.075 * k), color: "blush" },
    add: bearDressed(k, [
      { p: "dome", at: dome.at, s: dome.s, r: [dome.tilt, 0, 0], c: "pink", m: "plush", on: "head", name: "headscarf" },
      { p: "torus", at: [0, dome.at[1] - 0.25 * dome.s[1] * Math.cos(dome.tilt * DEG), dome.at[2] - 0.25 * dome.s[1] * Math.sin(dome.tilt * DEG)], s: [dome.s[0] + 0.03, dome.s[2] + 0.03, 0.3], r: [90 + dome.tilt, 0, 0], c: "pink", m: "plush", on: "head", name: "headscarf" },
      ...flowers,
      { p: "sphere", at: [0, 0.02, -0.33], s: [0.11, 0.09, 0.08], c: "pink", m: "plush", on: "head", name: "headscarf" },
      { p: "sphere", at: [0.07, -0.03, -0.32], s: [0.13, 0.07, 0.05], r: [0, 0, -40], c: "pink", m: "plush", on: "head", mirror: true, name: "headscarf" },
      ...bearArms(null),
    ]),
  };
}

// Daddy Bear: big, brown, green knitted sweater with cream stripes.
{
  const k = 1.08;
  bear.daddy_bear = {
    like: "bear",
    description: "Daddy Bear: a big soft brown grown-up bear (1.35 m) in a green knitted sweater with two cream stripes, with a gentle laugh; arms for hugs and waves. Bear family with Mommy Bear and Baby Bear.",
    tags: ["toy", "bear", "family", "father"],
    scale: k,
    sound: "Ho ho!",
    add: bearDressed(k, [...bodyCover("leaf", "sweater", { stripes: [0.42, 0.34], stripeColor: "cream", hem: 0.15 }), ...bearArms("leaf")]),
  };
}

/** An open cardigan: the knit over the body, a cream shirt showing down the front, buttons on one edge. */
function cardigan(color, { long = false } = {}) {
  const { c, s } = COVER;
  const parts = [{ p: "sphere", at: c, s, c: color, m: "plush", name: "cardigan" }];
  parts.push({ p: "sphere", at: [0, 0.47, 0.245], s: [0.2, 0.4, 0.3], c: "cream", m: "matte", name: "cardigan" });
  parts.push(...onFront(c, s, [[0.12, 0.52], [0.12, 0.41], [0.12, 0.3]], [0.05, 0.05, 0.035], "wood_dark", "cardigan"));
  parts.push(...[-1, 1].map((sx) => ({ p: "sphere", at: [0.19 * sx, 0.24, frontZ(c, s, 0.19, 0.24) - 0.01], s: [0.13, 0.11, 0.05], c: color, m: "plush", name: "cardigan" })));
  if (long) parts.push({ p: "cone", at: [0, 0.2, 0], s: [0.76, 0.3, 0.68], r: [180, 0, 0], c: color, m: "plush", name: "cardigan" });
  return parts;
}

// Grandpa Bear: gray muzzle, white brows, round glasses, a deep red cardigan.
{
  const k = 0.98;
  bear.grandpa_bear = {
    like: "bear",
    description: "Grandpa Bear: an older brown bear (1.23 m) with a gray muzzle, bushy white brows, round glasses and a deep red knitted cardigan over a cream shirt; gentle smile. Bear family.",
    tags: ["toy", "bear", "family", "grandparent"],
    scale: k,
    recolor: { sand: "grey" },
    brows: { color: "white", size: 1.6, lift: 0.15 },
    sound: "Hmm-hmm.",
    add: bearDressed(k, [...cardigan("barn_red_dark"), ...glasses(0.125, 0.065, 0.3, 0.2), ...bearArms("barn_red_dark")]),
  };
}

// Grandma Bear: gray muzzle, glasses, a little white bun of fur on top, a long purple cardigan.
{
  const k = 0.92;
  bear.grandma_bear = {
    like: "bear",
    description: "Grandma Bear: an older brown bear (1.18 m) with a gray muzzle, round glasses, a little white top bun and a long purple knitted cardigan; sings softly. Bear family.",
    tags: ["toy", "bear", "family", "grandparent"],
    scale: k,
    recolor: { sand: "grey" },
    cheeks: { at: r3([0.19 * k, -0.06 * k, 0.21 * k]), size: R(0.07 * k), color: "blush" },
    add: bearDressed(k, [
      ...cardigan("purple", { long: true }),
      ...glasses(0.125, 0.065, 0.3, 0.2),
      { p: "sphere", at: [0, 0.31, -0.04], s: [0.17, 0.14, 0.17], c: "white", m: "plush", on: "head", name: "bun" },
      ...bearArms("purple"),
    ]),
  };
}

// Auntie Bear: chestnut fur, a bright yellow raincoat with a rolled hood and white buttons.
{
  const k = 0.94;
  const { c, s } = COVER;
  bear.auntie_bear = {
    like: "bear",
    description: "Auntie Bear: a young grown-up chestnut bear (1.18 m) in a bright yellow raincoat with a rolled hood and white buttons, with a big laugh. Bear family.",
    tags: ["toy", "bear", "family", "aunt"],
    scale: k,
    recolor: { brown: "horse_brown" },
    cheeks: { at: r3([0.19 * k, -0.06 * k, 0.21 * k]), size: R(0.07 * k), color: "blush" },
    sound: "Ha ha ha!",
    add: bearDressed(k, [
      { p: "sphere", at: c, s, c: "yellow", m: "glossy", name: "raincoat" },
      { p: "torus", at: [0, 0.7, -0.05], s: [0.5, 0.42, 0.75], r: [80, 0, 0], c: "yellow", m: "glossy", name: "raincoat" },
      ...onFront(c, s, [[0, 0.55], [0, 0.43], [0, 0.31]], [0.06, 0.06, 0.04], "white", "raincoat"),
      ...bearArms("yellow", { m: "glossy" }),
    ]),
  };
}

// Uncle Bear: tall, a red-and-white striped knit hat with a pom-pom, a guitar on his back.
{
  const k = 1.04;
  const hat = { at: [0, 0.12, -0.01], s: [0.62, 0.52, 0.6] };
  const hc = [hat.at[0], hat.at[1], hat.at[2]];
  const hatParts = [{ p: "dome", at: [hat.at[0], hat.at[1] + hat.s[1] * 0.25, hat.at[2]], s: hat.s, c: "red", m: "plush", on: "head", name: "hat" }];
  for (const h of [0.07, 0.15]) {
    const f = Math.sqrt(1 - (h / (hat.s[1] / 2)) ** 2);
    hatParts.push({ p: "torus", at: [hc[0], hc[1] + h, hc[2]], s: [hat.s[0] * f + 0.025, hat.s[2] * f + 0.025, 0.15], r: [90, 0, 0], c: "white", m: "plush", on: "head", name: "hat" });
  }
  hatParts.push({ p: "torus", at: [hc[0], hc[1] + 0.005, hc[2]], s: [hat.s[0] + 0.05, hat.s[2] + 0.05, 0.3], r: [90, 0, 0], c: "red", m: "plush", on: "head", name: "hat" });
  hatParts.push({ p: "sphere", at: [hc[0], hc[1] + hat.s[1] / 2 + 0.06, hc[2]], s: [0.15, 0.15, 0.15], c: "white", m: "plush", on: "head", name: "hat" });
  // Guitar on the back, neck up to the left shoulder; strap round the chest.
  const a = 48 * DEG;
  const dir = [Math.sin(a), Math.cos(a)];
  const base = [-0.1, 0.3, -0.38];
  const g = (u, z = 0) => [base[0] + dir[0] * u, base[1] + dir[1] * u, base[2] + z];
  const gr = [0, 0, -48];
  const guitar = [
    { p: "sphere", at: g(-0.02), s: [0.32, 0.3, 0.12], r: gr, c: "orange", m: "glossy", name: "guitar" },
    { p: "sphere", at: g(0.17), s: [0.24, 0.22, 0.11], r: gr, c: "orange", m: "glossy", name: "guitar" },
    { p: "torus", at: [0, 0.38, 0], s: [0.75, 0.68, 0.1], r: [90, 42, 0], c: "ink", m: "matte", name: "guitar" },
    { p: "cylinder", at: g(0.07, -0.055), s: [0.08, 0.02, 0.08], r: [90, 0, 0], c: "ink", m: "matte", name: "guitar" },
    { p: "box", at: g(0.55, -0.01), s: [0.06, 0.66, 0.045], r: gr, c: "wood_dark", m: "toy", name: "guitar" },
    { p: "box", at: g(0.92, -0.01), s: [0.1, 0.14, 0.05], r: gr, c: "wood_dark", m: "toy", name: "guitar" },
  ];
  bear.uncle_bear = {
    like: "bear",
    description: "Uncle Bear: a tall brown grown-up bear (1.3 m, 1.45 m with the hat) in a red-and-white striped knit hat with a pom-pom and a guitar on his back (named part guitar); plays a soft strum. Bear family.",
    tags: ["toy", "bear", "family", "uncle"],
    scale: k,
    sound: "Strum!",
    add: bearDressed(k, [...hatParts, ...guitar, ...bearArms(null)]),
  };
}

// Polar bear: cream-white with a white tummy, black nose, big furry paws.
{
  const k = 1.12;
  bear.polar_bear = {
    like: "bear",
    description: "A big cream-white polar bear (1.4 m) with a white tummy, black nose, small round ears and wide furry paws (named arm); slides on ice and paddles with its front paws.",
    tags: ["toy", "bear", "arctic", "winter"],
    scale: k,
    recolor: { brown: "cream", sand: "white" },
    add: bearDressed(k, [
      ...bearArms(null, { wide: 1.35 }),
      { p: "sphere", at: [0.17, 0.05, 0.2], s: [0.25, 0.11, 0.3], c: "cream", m: "plush", mirror: true, name: "feet" },
      { p: "sphere", at: [0.17, 0.06, 0.34], s: [0.08, 0.05, 0.03], c: "grey", m: "matte", mirror: true, name: "feet" },
    ]),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Other family and story animals (variants).
// ---------------------------------------------------------------------------------------------------------------
const animals = {};

/** Simple arms for critters that have none: a capsule from the shoulder and a round paw (named "arm"). */
function arms(at, len, w, { r = 22, sleeve = null, sleeveLen = 0.6, color, m = "toy", paw = 1 } = {}) {
  const out = [];
  if (sleeve) out.push({ p: "capsule", at, s: [w * 1.15, len * sleeveLen, w * 1.15], r: [0, 0, r], hang: [0, -len * sleeveLen * 0.35, 0], c: sleeve, m: "plush", mirror: true, name: "arm", idle: IDLE_ARM });
  out.push({ p: "capsule", at, s: [w, len, w], r: [0, 0, r], hang: [0, -len * 0.4, 0], ...(color ? { c: color } : {}), m, mirror: true, name: "arm", idle: IDLE_ARM });
  out.push({ p: "sphere", at, s: [w * 1.1 * paw, w * 1.1 * paw, w * 1.1 * paw], r: [0, 0, r], hang: [0, -len * 0.85, 0.01], ...(color ? { c: color } : {}), m, mirror: true, name: "arm", idle: IDLE_ARM });
  return out;
}

/** A knitted scarf: a roll round the neck at height y (ring sizes rx, rz) and one end hanging in front. */
function scarf(y, rx, rz, color, { stripe = "cream", end = [0.1, -0.12, 0.05], len = 0.26, w = 0.1 } = {}) {
  return [
    { p: "torus", at: [0, y, 0], s: [2 * rx, 2 * rz, 0.55], r: [90, 0, 0], c: color, m: "plush", name: "scarf" },
    { p: "box", at: [end[0], y + end[1], rz + end[2]], s: [w, len, 0.04], r: [-8, 0, -10], c: color, m: "plush", name: "scarf" },
    { p: "box", at: [end[0] + 0.004, y + end[1] - len * 0.25, rz + end[2] + 0.005], s: [w * 1.02, len * 0.12, 0.042], r: [-8, 0, -10], c: stripe, m: "plush", name: "scarf" },
  ];
}

// Big Rabbit (Father Rabbit).
{
  const k = 1.15;
  animals.big_rabbit = {
    like: "bunny",
    description: "Big Rabbit (Father Rabbit, Bunny's dad): a large grown-up gray rabbit (1.75 m to the ear tips) with long ears, a red knitted scarf and arms; deep, kind voice.",
    tags: ["toy", "rabbit", "family", "father"],
    scale: k,
    recolor: { white: "grey" },
    brows: { color: "charcoal", size: 1.3 },
    add: scaled([
      ...scarf(0.64, 0.26, 0.25, "red"),
      { p: "sphere", at: [0, 0.32, 0.18], s: [0.34, 0.4, 0.28], c: "white", m: "plush", name: "tummy" },
      ...arms([0.24, 0.52, 0.04], 0.34, 0.13, { r: 24 }),
    ], k),
  };
}

// Pet rabbit: small, soft gray, white tummy, muzzle and bobtail.
{
  const k = 0.6;
  animals.pet_rabbit = {
    like: "bunny",
    description: "A small soft gray pet rabbit (0.8 m to the ear tips) with long upright ears, a white muzzle and tummy and a white bobtail (named tail); twitches its nose.",
    tags: ["toy", "rabbit", "pet", "home"],
    scale: k,
    recolor: { white: "grey" },
    add: scaled([
      { p: "sphere", at: [0, 0.32, 0.17], s: [0.36, 0.42, 0.3], c: "white", m: "plush", name: "tummy" },
      { p: "sphere", at: [0, -0.075, 0.19], s: [0.25, 0.15, 0.14], c: "white", m: "plush", on: "head", name: "muzzle" },
      { p: "sphere", at: [0, 0.3, -0.31], s: [0.23, 0.23, 0.23], c: "white", m: "plush", name: "tail", idle: { r: [0, 0, 10], hz: 1.4 } },
    ], k),
  };
}

// Grandma Frog: softer moss green, glasses on her eye bumps, a purple knitted shawl, arms.
{
  const k = 0.95;
  animals.grandma_frog = {
    like: "frog",
    description: "Grandma Frog: an older moss-green frog with round glasses on her eye bumps, white brows, a purple knitted shawl and little arms for folding paper; gentle smile.",
    tags: ["toy", "frog", "family", "grandparent"],
    scale: k,
    recolor: { green: "moss" },
    brows: { color: "white", size: 1.2 },
    add: scaled([
      ...glasses(0.18, 0.215, 0.205, 0.27, { temple: false }),
      { p: "torus", at: [0, 0.47, 0.0], s: [0.72, 0.64, 0.7], r: [90, 0, 0], c: "purple", m: "plush", name: "shawl" },
      { p: "cone", at: [0, 0.39, 0.3], s: [0.2, 0.18, 0.07], r: [190, 0, 0], c: "purple", m: "plush", name: "shawl" },
      ...arms([0.32, 0.36, 0.16], 0.26, 0.12, { r: 18 }),
    ], k),
  };
}

// Grandma Monkey: gray cheek fur, glasses, a bright teal shawl.
{
  const k = 0.95;
  animals.grandma_monkey = {
    like: "monkey",
    description: "Grandma Monkey: an older brown monkey with gray cheek fur and brows, round glasses and a bright teal shawl; gentle and smiling.",
    tags: ["toy", "monkey", "family", "grandparent"],
    scale: k,
    brows: { color: "grey", size: 1.4 },
    add: scaled([
      ...glasses(0.09, 0.055, 0.265, 0.16, { back: 0.12 }),
      { p: "sphere", at: [0.17, -0.12, 0.14], s: [0.1, 0.1, 0.08], r: [0, 0, 20], c: "grey", m: "plush", on: "head", mirror: true, name: "cheek_fur" },
      { p: "cape", at: [0, 0.52, -0.01], s: [0.64, 0.26, 0.6], c: "teal", m: "plush", name: "shawl" },
      { p: "torus", at: [0, 0.62, 0.0], s: [0.44, 0.42, 0.4], r: [90, 0, 0], c: "teal", m: "plush", name: "shawl" },
    ], k),
  };
}

// Grandpa Penguin: taller emperor-style, gray chest, gold ear patches, red scarf, white brows.
{
  const k = 1.18;
  const chest = { c: [0, 0.4, 0.12], s: [0.46, 0.68, 0.4] };
  animals.grandpa_penguin = {
    like: "penguin",
    description: "Grandpa Penguin: an older, taller emperor-style penguin (1.35 m) with a pale gray chest, gold ear patches, white brows and a red knitted scarf; calm, wise smile; holds out a flipper to help.",
    tags: ["toy", "penguin", "family", "grandparent"],
    scale: k,
    brows: { color: "white", size: 1.5 },
    add: scaled([
      { p: "sphere", at: [0, 0.4, 0.125], s: [0.44, 0.66, 0.4], c: "rain_sky", m: "toy", name: "chest" },
      { p: "sphere", at: [0.22, -0.12, 0.08], s: [0.08, 0.16, 0.1], r: [0, 0, -25], c: "gold", on: "head", mirror: true, name: "ear_patch" },
      ...scarf(0.74, 0.22, 0.21, "red", { end: [0.08, -0.12, 0.06], len: 0.24, w: 0.09 }),
    ], k),
  };
  void chest;
}

// Big Brother Dog: bigger, white sailor cap, blue-and-white striped top.
{
  const k = 1.12;
  const c = [0, 0.38, 0], s = [0.66, 0.66, 0.66];
  animals.big_brother_dog = {
    like: "dog",
    description: "Big Brother Dog: a bigger, older puppy (1.35 m) in a white sailor's cap and a blue-and-white striped top, with arms; calm and kind.",
    tags: ["toy", "dog", "family", "sibling"],
    scale: k,
    add: scaled([
      { p: "sphere", at: c, s, c: "white", m: "plush", name: "shirt" },
      ...[0.2, 0.31, 0.42, 0.53].map((y) => band(c, s, y, "blue", "shirt", { thick: 0.045 })),
      ...arms([0.25, 0.56, 0.04], 0.34, 0.13, { r: 24, sleeve: "white" }),
      { p: "cylinder", at: [0.02, 0.27, -0.01], s: [0.36, 0.13, 0.36], r: [-6, 0, -10], c: "white", m: "matte", on: "head", name: "hat" },
      { p: "torus", at: [0.0, 0.24, -0.01], s: [0.44, 0.44, 0.5], r: [84, 0, -10], c: "white", m: "matte", on: "head", name: "hat" },
      { p: "cylinder", at: [0.017, 0.29, -0.01], s: [0.365, 0.03, 0.365], r: [-6, 0, -10], c: "denim", m: "matte", on: "head", name: "hat" },
    ], k),
  };
}

// Camel cousin: taller, red striped saddle blanket with gold tassels.
{
  const k = 1.1;
  const blanket = [{ p: "box", at: [0, 0.68, -0.07], s: [0.68, 0.24, 0.3], c: "red", m: "plush", name: "blanket" }];
  for (const y of [0.6, 0.7]) blanket.push({ p: "box", at: [0, y, -0.07], s: [0.69, 0.03, 0.31], c: "gold", m: "plush", name: "blanket" });
  for (const sx of [-1, 1]) for (const z of [0.07, -0.21]) blanket.push({ p: "sphere", at: [0.34 * sx, 0.56, z], s: [0.05, 0.07, 0.05], c: "gold", m: "plush", name: "blanket" });
  animals.camel_cousin = {
    like: "camel",
    description: "Camel Cousin: a slightly taller sandy camel (1.45 m) with a red-and-gold striped saddle blanket with tassels and a friendly smile.",
    tags: ["toy", "camel", "family", "desert"],
    scale: k,
    add: scaled(blanket, k),
  };
}

// Squirrel kit and Chip: small squirrels with big eyes and an extra-fluffy tail; Chip wears an acorn cap.
const fluffyTail = [
  { p: "sphere", at: [0, 0.2, -0.2], s: [0.56, 0.95, 0.42], r: [-15, 0, -25], hang: [0, 0.4, -0.06], m: "plush", fur: { length: 0.03, shells: 12, density: 90, clump: 0.5 }, idle: { r: [0, 0, 8], hz: 0.9 }, name: "tail" },
];
{
  const k = 0.62;
  animals.squirrel_kit = {
    like: "squirrel",
    description: "A squirrel kit: a small young red-brown squirrel (0.6 m) with an extra-fluffy tail, big eyes and bouncy movements.",
    tags: ["toy", "squirrel", "forest", "baby"],
    scale: k,
    recolor: { brown: "horse_brown" },
    eyes: { size: R(0.1 * k) },
    add: scaled(fluffyTail, k),
  };
}
{
  const k = 0.6;
  animals.chip = {
    like: "squirrel",
    description: "Chip, Squirrel's little brother: a small young brown squirrel (0.6 m) with an extra-fluffy tail, wide excited eyes and a too-big acorn-cap hat (named hat).",
    tags: ["toy", "squirrel", "forest", "sibling"],
    scale: k,
    eyes: { size: R(0.105 * k) },
    add: scaled([
      ...fluffyTail,
      { p: "dome", at: [0.02, 0.235, -0.01], s: [0.6, 0.42, 0.58], r: [-8, 0, 14], c: "wood_dark", m: "matte", on: "head", name: "hat" },
      { p: "torus", at: [0.02, 0.135, -0.01], s: [0.6, 0.58, 0.35], r: [82, 0, 14], c: "twine", m: "matte", on: "head", name: "hat" },
      { p: "capsule", at: [-0.025, 0.36, -0.01], s: [0.045, 0.12, 0.045], r: [0, 0, 24], c: "wood_dark", m: "matte", on: "head", name: "hat" },
    ], k),
  };
}

// Lion King: an old lion with a paler mane, white brows, a little gold crown and a purple robe.
{
  const k = 1.05;
  const crown = [{ p: "tube", at: [0, 0.22, 0.0], s: [0.26, 0.09, 0.26], c: "gold", m: "metal", on: "head", name: "crown" }];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI;
    crown.push({ p: "cone", at: [Math.sin(a) * 0.12, 0.35, Math.cos(a) * 0.12], s: [0.06, 0.09, 0.06], c: "gold", m: "metal", on: "head", name: "crown" });
  }
  crown.push({ p: "sphere", at: [0, 0.265, 0.13], s: [0.045, 0.045, 0.03], c: "red", m: "glossy", on: "head", name: "crown" });
  animals.lion_king = {
    like: "lion",
    description: "Lion King: an old lion with a pale straw mane, white brows, a simple little gold crown and a purple robe with a white collar; can rest in bed, then stand well and smiling.",
    tags: ["toy", "lion", "story", "king"],
    scale: k,
    recolor: { orange: "hay" },
    brows: { color: "white", size: 1.4 },
    add: scaled([
      ...crown,
      { p: "cape", at: [0, 0.38, -0.03], s: [0.74, 0.64, 0.72], c: "purple", m: "plush", name: "robe" },
      { p: "torus", at: [0, 0.66, 0.0], s: [0.48, 0.46, 0.7], r: [90, 0, 0], c: "white", m: "plush", name: "robe" },
    ], k),
  };
}

// Piglet: small, in sky-blue striped pajamas, with arms.
{
  const k = 0.62;
  const c = [0, 0.38, 0.0], s = [0.81, 0.66, 0.74];
  animals.piglet = {
    like: "pig",
    description: "A small pink piglet (0.68 m) in sky-blue pajamas with white stripes and a curly tail (named tail); snuggles under a quilt and giggles.",
    tags: ["toy", "pig", "bedtime", "baby"],
    scale: k,
    sound: "Oink oink!",
    add: scaled([
      { p: "sphere", at: c, s, c: "sky", m: "plush", name: "pajamas" },
      ...[0.24, 0.38, 0.52].map((y) => band(c, s, y, "white", "pajamas", { thick: 0.04 })),
      ...onFront(c, s, [[0, 0.46], [0, 0.32]], [0.06, 0.06, 0.04], "white", "pajamas"),
      { p: "torus", at: [0, 0.44, -0.39], s: 0.14, r: [0, 90, 0], c: "rose", idle: { r: [0, 0, 20], hz: 1 }, name: "tail" },
      ...arms([0.33, 0.52, 0.06], 0.26, 0.12, { r: 26, sleeve: "sky", sleeveLen: 0.7 }),
    ], k),
  };
}

// Golden fish and Uncle Fish.
const fishMouth = (k, size = 0.07) => ({ at: r3([0, -0.13 * k, 0.335 * k]), size: R(size * k) });
{
  const k = 1.35;
  const glints = [[0.25, 0.68, 0.12], [0.22, 0.48, 0.16], [0.27, 0.6, -0.12], [0.2, 0.75, -0.02]].map(([x, y, z]) => ({ p: "sphere", at: [x, y, z], s: [0.03, 0.05, 0.05], c: "white", m: "glossy", mirror: true, name: "shimmer" }));
  animals.golden_fish = {
    like: "fish",
    description: "A large golden fish (1.3 m) with pale gold stripes, shimmering glints and kind eyes that rises to the surface of a pond.",
    tags: ["toy", "fish", "story", "magic"],
    scale: k,
    recolor: { orange: "gold", white: "hay_light" },
    mouth: fishMouth(k),
    add: scaled(glints, k),
  };
}
{
  const k = 1.18;
  animals.uncle_fish = {
    like: "fish",
    description: "Uncle Fish: a bigger, older orange fish with a gray-tipped top fin (named fin), white brows, a kind smile and a little blue octagon-shaped hat (named hat).",
    tags: ["toy", "fish", "family", "uncle"],
    scale: k,
    mouth: fishMouth(k),
    brows: { color: "white", size: 1.2 },
    add: scaled([
      { p: "sphere", at: [0, 0.96, -0.08], s: [0.085, 0.14, 0.24], r: [-20, 0, 0], hang: [0, 0.11, -0.07], c: "grey", idle: { r: [0, 0, 6], hz: 0.7 }, name: "fin" },
      { p: "octagon", at: [0, 0.33, -0.05], s: [0.36, 0.36, 0.22], r: [-90, 0, 0], c: "denim", on: "head", name: "hat" },
      { p: "octagon", at: [0, 0.39, -0.05], s: [0.26, 0.26, 0.4], r: [-90, 0, 0], c: "denim", on: "head", name: "hat" },
      { p: "sphere", at: [0, 0.455, -0.05], s: [0.06, 0.06, 0.06], c: "red", m: "glossy", on: "head", name: "hat" },
    ], k),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// New critters: sun, crescent moon, north wind, water spirit, scarecrow, oni and troll grumps.
// ---------------------------------------------------------------------------------------------------------------
const fresh = {};

/** Two short legs with round shoes (named leg_left / leg_right). */
function legs(hipY, x, w, color, shoe = color, { shoeS = null } = {}) {
  const out = [];
  for (const [sx, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    out.push({ p: "capsule", at: [x * sx, hipY, 0], s: [w, hipY * 0.95, w], hang: [0, -hipY * 0.45, 0], c: color, name });
    out.push({ p: "sphere", at: [x * sx, hipY, 0], s: shoeS ?? [w * 1.45, w * 0.8, w * 1.9], hang: [0, -hipY + w * 0.38, w * 0.35], c: shoe, m: "glossy", name });
  }
  return out;
}

fresh.sun_character = {
  color: "gold",
  sound: "Good morning!",
  description: "A warm, round, smiling sun figure (1.25 m): a glowing gold ball with twelve soft orange rays (named rays, they wave), big brown eyes, rosy cheeks, little arms and legs; walks on the ground or floats up with `at`.",
  tags: ["toy", "sky", "weather", "story"],
  head: { at: [0, 0.66, 0], tilt: 0.6, look: 0.5 },
  eyes: { at: [0.14, 0.07, 0.37], size: 0.085, iris: "eye_brown" },
  mouth: { at: [0, -0.12, 0.375], size: 0.13 },
  cheeks: { at: [0.25, -0.05, 0.31], size: 0.085, color: "rose" },
  bob: 0.03,
  parts: [
    { p: "sphere", at: [0, 0, 0], s: [0.8, 0.8, 0.76], c: "gold", m: "glow", on: "head" },
    { p: "cone", at: [0, 0, -0.04], s: [0.17, 0.2, 0.09], c: "orange", m: "toy", on: "head", repeat: { n: 12, radius: 0.5, start: 15 }, idle: { r: [0, 0, 7], hz: 0.5 }, name: "rays" },
    { p: "capsule", at: [0.33, 0.62, 0.04], s: [0.085, 0.26, 0.085], r: [0, 0, 38], hang: [0, -0.1, 0], c: "orange", mirror: true, name: "arm", idle: IDLE_ARM },
    { p: "sphere", at: [0.33, 0.62, 0.04], s: [0.1, 0.1, 0.1], r: [0, 0, 38], hang: [0, -0.23, 0], c: "orange", mirror: true, name: "arm", idle: IDLE_ARM },
    ...legs(0.3, 0.12, 0.1, "orange", "orange"),
  ],
};

// Crescent moon: horns to the right, the face on the thick part (x ~ 0), little legs.
fresh.moon_character = {
  color: "hay_light",
  sound: "Good night.",
  description: "A gentle crescent-moon figure (1.4 m): a pale glowing yellow crescent with a calm smile, big brown eyes, rosy cheeks and little legs and arms; walks beside Sun and can drift up into the night sky with `at`.",
  tags: ["toy", "sky", "night", "story"],
  head: { at: [0, 0.72, 0], tilt: 0.5, look: 0.4 },
  eyes: { at: [0.095, 0.07, 0.1], size: 0.07, iris: "eye_brown" },
  mouth: { at: [0, -0.1, 0.1], size: 0.09 },
  cheeks: { at: [0.17, -0.05, 0.095], size: 0.055, color: "blush" },
  bob: 0.03,
  parts: [
    { p: "crescent", at: [0.25, 0.0, -0.03], s: [1.3, 1.3, 0.55], c: "hay_light", m: "glow", on: "head" },
    { p: "star", at: [0.5, 0.42, 0.04], s: [0.1, 0.1, 0.06], c: "gold", m: "glow", on: "head", name: "star" },
    { p: "capsule", at: [0.2, 0.46, 0.03], s: [0.07, 0.24, 0.07], r: [0, 0, 30], hang: [0, -0.1, 0], c: "hay", mirror: true, name: "arm", idle: IDLE_ARM },
    { p: "sphere", at: [0.2, 0.46, 0.03], s: [0.09, 0.09, 0.09], r: [0, 0, 30], hang: [0, -0.21, 0], c: "hay", mirror: true, name: "arm", idle: IDLE_ARM },
    ...legs(0.27, 0.1, 0.085, "hay", "hay"),
  ],
};

// North Wind: a puffy gray cloud with round cheeks and a frown, soft white gust swirls in front.
{
  const puffs = [
    [0, 0, 0, 0.95, 0.72, 0.62], [-0.42, -0.08, -0.04, 0.6, 0.55, 0.5], [0.42, -0.08, -0.04, 0.6, 0.55, 0.5],
    [-0.2, 0.3, -0.05, 0.55, 0.5, 0.48], [0.22, 0.32, -0.07, 0.5, 0.46, 0.45], [-0.68, -0.14, -0.08, 0.38, 0.36, 0.34], [0.68, -0.14, -0.08, 0.38, 0.36, 0.34],
  ];
  const gust = (x, y, z, s, rz, hz) => ({ p: "smile", at: [x, y, z], s: [s * 1.6, s * 1.6, s], r: [0, 25, rz], c: "white", m: "matte", on: "head", name: "gust", idle: { r: [0, 0, 18], hz } });
  fresh.north_wind = {
    color: "grey",
    sound: "Whooosh!",
    description: "North Wind: a puffy gray cloud (1.6 m wide, floats: lift it with `at`) with round puffed cheeks, a frown under heavy brows and soft white swirly gusts in front (named gust); huffs harder and harder.",
    tags: ["toy", "weather", "wind", "story"],
    head: { at: [0, 0.45, 0], tilt: 0.6, look: 0.4 },
    eyes: { at: [0.15, 0.1, 0.3], size: 0.075 },
    mouth: { at: [0, -0.13, 0.31], size: 0.08 },
    cheeks: { at: [0.27, -0.06, 0.25], size: 0.11, color: "blush" },
    brows: { color: "charcoal", size: 1.6, tilt: -18, lift: 0.1 },
    bob: 0.04,
    parts: [
      ...puffs.map(([x, y, z, a, b, c]) => ({ p: "sphere", at: [x, y, z], s: [a, b, c], c: "grey", m: "plush", on: "head" })),
      { p: "sphere", at: [0.24, -0.08, 0.2], s: [0.24, 0.22, 0.18], c: "grey", m: "plush", on: "head", mirror: true, name: "cheeks" },
      gust(-0.7, -0.25, 0.42, 0.26, 0, 0.9), gust(-0.95, 0.02, 0.32, 0.2, 40, 1.2), gust(-0.5, -0.48, 0.38, 0.18, -30, 1.1),
    ],
  };
}

// Water spirit: see-through blue water, a flowing skirt to the floor, a drop curl on top, fish inside.
fresh.water_spirit = {
  color: "pond",
  sound: "Splish!",
  description: "A friendly water spirit (1.3 m): a flowing see-through blue figure of water with a drop-shaped curl on top, a wave hem, soft arms and two little orange fish swimming inside (named fish); can rise and fill a room gently.",
  tags: ["toy", "water", "magic", "story"],
  head: { at: [0, 0.86, 0], tilt: 0.6, look: 0.5 },
  eyes: { at: [0.09, 0.03, 0.22], size: 0.07, iris: "blue" },
  mouth: { at: [0, -0.09, 0.23], size: 0.07 },
  cheeks: { at: [0.15, -0.04, 0.19], size: 0.06, color: "blush" },
  bob: 0.04,
  parts: [
    { p: "cone", at: [0, 0.38, 0], s: [0.78, 0.8, 0.7], c: "pond", m: "water" },
    { p: "torus", at: [0, 0.05, 0], s: [0.8, 0.72, 0.5], r: [90, 0, 0], c: "sky", m: "water", name: "wave", idle: { r: [0, 0, 3], hz: 0.4 } },
    { p: "sphere", at: [0, 0, 0], s: [0.5, 0.46, 0.46], c: "pond", m: "water", on: "head" },
    { p: "drop", at: [0, 0.3, -0.02], s: [0.22, 0.32, 0.4], r: [0, 0, -12], c: "pond", m: "water", on: "head", idle: { r: [0, 0, 8], hz: 0.5 }, name: "curl" },
    { p: "capsule", at: [0.15, 0.72, 0.02], s: [0.1, 0.36, 0.1], r: [0, 0, 32], hang: [0, -0.15, 0], c: "pond", m: "water", mirror: true, name: "arm", idle: IDLE_ARM },
    { p: "sphere", at: [0.06, 0.35, 0.05], s: [0.12, 0.09, 0.07], c: "orange", m: "glossy", name: "fish", idle: { r: [0, 25, 0], hz: 0.6 } },
    { p: "heart", at: [0.06, 0.35, 0.05], s: [0.08, 0.08, 0.04], r: [0, 0, 90], hang: [-0.08, 0, 0], c: "orange", m: "glossy", name: "fish", idle: { r: [0, 25, 0], hz: 0.6 } },
    { p: "sphere", at: [-0.08, 0.55, -0.03], s: [0.1, 0.075, 0.06], c: "gold", m: "glossy", name: "fish", idle: { r: [0, -25, 0], hz: 0.5 } },
    { p: "heart", at: [-0.08, 0.55, -0.03], s: [0.065, 0.065, 0.035], r: [0, 0, -90], hang: [0.065, 0, 0], c: "gold", m: "glossy", name: "fish", idle: { r: [0, -25, 0], hz: 0.5 } },
  ],
};

// Scarecrow: on a wooden pole, patched brown coat, arms out with straw hands, burlap head, straw hat.
{
  const coat = { c: [0, 0.92, 0], s: [0.46, 0.52, 0.32] };
  const arm = (extra) => ({ at: [0.17, 1.08, 0], r: [0, 0, 78], mirror: true, name: "arm", idle: { r: [0, 0, 4], hz: 0.5 }, ...extra });
  fresh.scarecrow = {
    color: "horse_tan",
    sound: "Shh-shh.",
    description: "A friendly straw scarecrow (1.65 m) on a wooden pole (named pole) in a patched brown coat, arms out with straw hands (named arm), a burlap head with button eyes and a stitched smile, straw hair and a straw hat (named hat).",
    tags: ["toy", "farm", "field", "story"],
    head: { at: [0, 1.3, 0.02], tilt: 0.7 },
    eyes: { at: [0.085, 0.04, 0.19], size: 0.055 },
    mouth: { at: [0, -0.08, 0.2], size: 0.075 },
    cheeks: { at: [0.13, -0.04, 0.17], size: 0.05, color: "blush" },
    bob: 0.015,
    parts: [
      { p: "cylinder", at: [0, 0.4, -0.02], s: [0.07, 0.8, 0.07], c: "wood_dark", m: "matte", name: "pole" },
      { p: "cylinder", at: [0, 0.015, -0.02], s: [0.3, 0.03, 0.3], c: "wood_dark", m: "matte", name: "pole" },
      { p: "sphere", at: coat.c, s: coat.s, c: "twine", m: "matte", name: "coat" },
      { p: "square", at: [0.1, 0.84, frontZ(coat.c, coat.s, 0.1, 0.84) - 0.01], s: [0.11, 0.11, 0.08], r: [0, 18, 12], c: "red", m: "matte", name: "coat" },
      { p: "square", at: [-0.12, 1.0, frontZ(coat.c, coat.s, -0.12, 1.0) - 0.01], s: [0.09, 0.09, 0.08], r: [0, -20, -10], c: "denim_light", m: "matte", name: "coat" },
      ...onFront(coat.c, coat.s, [[0, 1.02], [0, 0.9], [0, 0.78]], [0.04, 0.04, 0.03], "wood_dark", "coat"),
      { p: "cone", at: [0, 0.64, 0], s: [0.34, 0.12, 0.26], r: [180, 0, 0], c: "hay", m: "matte", name: "straw" },
      arm({ p: "capsule", s: [0.13, 0.42, 0.13], hang: [0, -0.2, 0], c: "twine", m: "matte" }),
      arm({ p: "cone", s: [0.13, 0.14, 0.13], hang: [0, -0.46, 0], hr: [180, 0, 0], c: "hay", m: "matte" }),
      { p: "sphere", at: [0, 0.02, 0], s: [0.42, 0.42, 0.38], m: "matte", on: "head" },
      { p: "sphere", at: [0, -0.02, 0.19], s: [0.05, 0.045, 0.04], c: "orange", m: "matte", on: "head" },
      { p: "cone", at: [0, -0.2, 0], s: [0.12, 0.12, 0.12], c: "hay", m: "matte", on: "head", repeat: { n: 7, radius: 0.17, start: 200 }, r: [0, 0, 180], name: "straw" },
      { p: "cylinder", at: [0, 0.14, 0], s: [0.72, 0.03, 0.72], c: "hay", m: "matte", on: "head", name: "hat" },
      { p: "cylinder", at: [0, 0.24, 0], s: [0.33, 0.2, 0.33], c: "hay", m: "matte", on: "head", name: "hat" },
      { p: "cylinder", at: [0, 0.17, 0], s: [0.34, 0.05, 0.34], c: "red", m: "matte", on: "head", name: "hat" },
    ],
  };
}

// Oni grump: big, round, rosy, small rounded horns, curly dark hair, a big round nose, a tiger-stripe wrap.
{
  const body = { c: [0, 0.56, 0], s: [0.98, 0.9, 0.82] };
  const wrap = { c: [0, 0.32, 0], s: [1.0, 0.4, 0.84] };
  const stripes = [];
  for (let i = 0; i < 9; i++) {
    const yaw = -160 + i * 40;
    const a = yaw * DEG;
    const [rx, rz] = slice(wrap.c, wrap.s, 0.32);
    stripes.push({ p: "capsule", at: [Math.sin(a) * rx, 0.32, Math.cos(a) * rz], s: [0.045, 0.26, 0.04], r: [0, yaw, 8], c: "ink", m: "matte", name: "wrap" });
  }
  fresh.oni_grump = {
    color: "rose",
    sound: "Ah-CHOO!",
    description: "Oni Grump: a big, round, comic oni (1.55 m) with a rosy body, two small rounded cream horns (named horns), curly dark hair, a huge round nose, bushy brows and a yellow tiger-stripe wrap; blustery but never scary (no fangs); sneezes enormously.",
    tags: ["toy", "story", "silly", "japan"],
    head: { at: [0, 1.15, 0.05], tilt: 0.8 },
    eyes: { at: [0.13, 0.08, 0.27], size: 0.075, iris: "eye_brown" },
    mouth: { at: [0, -0.18, 0.28], size: 0.11 },
    cheeks: { at: [0.22, -0.08, 0.23], size: 0.08, color: "red" },
    brows: { color: "charcoal", size: 1.7, tilt: -8 },
    bob: 0.025,
    parts: [
      ...legs(0.24, 0.2, 0.17, "rose", "rose"),
      { p: "sphere", at: body.c, s: body.s },
      { p: "sphere", at: wrap.c, s: wrap.s, c: "yellow", m: "matte", name: "wrap" },
      ...stripes,
      { p: "capsule", at: [0.45, 0.8, 0.02], s: [0.19, 0.42, 0.19], r: [0, 0, 30], hang: [0, -0.16, 0], mirror: true, name: "arm", idle: IDLE_ARM },
      { p: "sphere", at: [0.45, 0.8, 0.02], s: [0.21, 0.21, 0.21], r: [0, 0, 30], hang: [0, -0.37, 0.01], mirror: true, name: "arm", idle: IDLE_ARM },
      { p: "sphere", at: [0, 0, 0], s: [0.66, 0.6, 0.58], on: "head" },
      { p: "sphere", at: [0, -0.04, 0.3], s: [0.2, 0.17, 0.16], c: "red", m: "glossy", on: "head", name: "nose" },
      ...[[0, 0.27, -0.04, 0.26], [-0.16, 0.24, -0.08, 0.2], [0.16, 0.24, -0.08, 0.2], [0, 0.2, -0.2, 0.24], [-0.26, 0.12, -0.12, 0.16], [0.26, 0.12, -0.12, 0.16]].map(([x, y, z, d]) => ({ p: "sphere", at: [x, y, z], s: [d, d * 0.85, d], c: "charcoal", m: "plush", on: "head", name: "hair" })),
      { p: "cone", at: [0.13, 0.33, 0.04], s: [0.09, 0.14, 0.09], r: [0, 0, -16], c: "cream", m: "toy", on: "head", mirror: true, name: "horns" },
    ],
  };
}

// Troll grump: round mossy green, big floppy ears, a long friendly nose, a grass tuft of hair.
{
  fresh.troll_grump = {
    color: "moss",
    sound: "Hmph!",
    description: "Troll Grump: a grumpy-but-comic round mossy green troll (1.15 m) with big ears (named ears), a long droopy nose (named nose), a grass tuft of hair, leaf patches and a brown tunic; lives under a bridge, splashes and paddles away grumbling; never scary.",
    tags: ["toy", "story", "silly", "bridge"],
    head: { at: [0, 0.78, 0.05], tilt: 0.8 },
    eyes: { at: [0.11, 0.09, 0.24], size: 0.07, iris: "eye_brown" },
    mouth: { at: [0, -0.15, 0.25], size: 0.09 },
    cheeks: { at: [0.18, -0.06, 0.21], size: 0.07, color: "blush" },
    brows: { color: "leaf", size: 1.8, tilt: -14 },
    bob: 0.02,
    parts: [
      ...legs(0.2, 0.15, 0.15, "moss", "moss"),
      { p: "sphere", at: [0, 0.42, 0], s: [0.8, 0.66, 0.68] },
      { p: "sphere", at: [0, 0.32, 0], s: [0.83, 0.42, 0.71], c: "twine", m: "matte", name: "tunic" },
      { p: "leaf", at: [0.22, 0.58, 0.24], s: [0.12, 0.12, 0.08], r: [0, 25, 30], c: "leaf", m: "matte", name: "leaves" },
      { p: "leaf", at: [-0.25, 0.5, 0.22], s: [0.1, 0.1, 0.08], r: [0, -30, -20], c: "grass", m: "matte", name: "leaves" },
      { p: "capsule", at: [0.36, 0.55, 0.03], s: [0.15, 0.34, 0.15], r: [0, 0, 30], hang: [0, -0.13, 0], mirror: true, name: "arm", idle: IDLE_ARM },
      { p: "sphere", at: [0.36, 0.55, 0.03], s: [0.17, 0.17, 0.17], r: [0, 0, 30], hang: [0, -0.3, 0.01], mirror: true, name: "arm", idle: IDLE_ARM },
      { p: "sphere", at: [0, 0, 0], s: [0.6, 0.52, 0.54], on: "head" },
      { p: "sphere", at: [0.33, 0.04, -0.02], s: [0.26, 0.16, 0.08], r: [0, -20, 25], hang: [0.1, 0, 0], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.5 } },
      { p: "sphere", at: [0.34, 0.04, 0.0], s: [0.17, 0.09, 0.05], r: [0, -20, 25], hang: [0.1, 0, 0], c: "blush", m: "matte", on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.5 } },
      { p: "capsule", at: [0, -0.02, 0.26], s: [0.12, 0.3, 0.12], r: [62, 0, 0], hang: [0, 0.1, 0], c: "moss", on: "head", name: "nose" },
      { p: "cone", at: [0, 0.25, 0], s: [0.07, 0.2, 0.07], c: "grass", m: "matte", on: "head", repeat: { n: 5, radius: 0.06, start: 30 }, name: "hair" },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Story people on the br04 toddler body (head group = hip pivot; legs, arms and forearms named as for toddler,
// so its poses still work). `person` swaps clothes, legs and arms; grown-ups get longer legs and arms.
// ---------------------------------------------------------------------------------------------------------------
const people = {};
const SKIN = "toddler_skin";

/**
 * @param {object} o hip: hip height (toddler 0.46), arm: arm length factor, top / sleeve / pants / shoe colours,
 *   short: bare forearms (rolled sleeves), torso: extra parts on the head group.
 */
function person(o) {
  const hip = o.hip ?? 0.46;
  const A = o.arm ?? 1;
  const leg = hip - 0.045;
  const parts = [];
  // Legs (mirror, named leg): trouser leg and a shoe.
  parts.push({ p: "capsule", at: [0.1, hip, 0], s: [0.16, leg * 0.92, 0.16], hang: [0, -leg * 0.43, 0], c: o.pants ?? "denim", m: "matte", mirror: true, name: "leg" });
  parts.push({ p: "sphere", at: [0.1, hip, 0], s: [0.16, 0.09, 0.26], hang: [0, -leg, 0.04], c: o.shoe ?? "shoe_black", m: "glossy", mirror: true, name: "leg" });
  // Arms: shoulder ball and upper arm in the sleeve colour, forearm sleeve or skin, a hand.
  for (const [sx, a, f] of [[1, "arm_l", "fore_l"], [-1, "arm_r", "fore_r"]]) {
    const at = [0.23 * sx, 0.31, 0];
    parts.push({ p: "sphere", on: "head", at, r: [0, 0, 8 * sx], s: [0.135, 0.135, 0.135], hang: [0, -0.03, 0], c: o.sleeve ?? o.top, m: "plush", name: a });
    parts.push({ p: "capsule", on: "head", at, r: [0, 0, 8 * sx], s: [0.105, 0.25 * A, 0.105], hang: [0, -0.1 * A, 0], c: o.sleeve ?? o.top, m: "plush", name: a });
    parts.push({ p: "capsule", on: a, at: [0, -0.21 * A, 0], s: [o.short ? 0.09 : 0.1, 0.22 * A, o.short ? 0.09 : 0.1], hang: [0, -0.09 * A, 0], c: o.short ? SKIN : o.sleeve ?? o.top, m: o.short ? "matte" : "plush", name: f });
    if (o.short) parts.push({ p: "torus", on: a, at: [0, -0.2 * A, 0], r: [90, 0, 0], s: [0.16, 0.16, 0.35], c: o.sleeve ?? o.top, m: "matte", name: f });
    parts.push({ p: "sphere", on: a, at: [0, -0.21 * A, 0], s: [0.12, 0.12, 0.11], hang: [0, -0.23 * A, 0], c: SKIN, m: "matte", name: f });
  }
  // Torso: a tunic over the body, down past the hips.
  parts.push({ p: "sphere", on: "head", at: [0, 0.13, 0], s: [0.45, 0.5, 0.34], c: o.top, m: "plush", name: "tunic" });
  if (o.hem !== false) parts.push({ p: "cylinder", on: "head", at: [0, -0.07, 0], s: [0.43, 0.14, 0.33], c: o.top, m: "plush", name: "tunic" });
  parts.push(...(o.torso ?? []));
  return {
    like: "toddler",
    drop: ["leg", "shirt", "shorts", "arm_l", "arm_r", "fore_l", "fore_r", ...(o.drop ?? [])],
    ...(o.recolor ? { recolor: o.recolor } : {}),
    head: { at: [0, hip, 0], look: 0.3, tilt: 0.5 },
    add: parts,
  };
}

const withScale = (v, k, desc, tags, extra = {}) => {
  // Scale the person: the variant's own scale multiplies the base; added parts are written in toddler units.
  const out = { ...v, description: desc, tags, ...extra };
  if (k !== 1) {
    out.scale = k;
    out.add = scaled(v.add, k);
    out.head = { ...v.head, at: r3(v.head.at.map((x) => x * k)) };
  }
  return out;
};

people.jun = withScale(person({ hip: 0.52, top: "blue", pants: "denim", shoe: "shoe_black", recolor: { brow: "black" },
  torso: [{ p: "torus", on: "head", at: [0, 0.33, 0], r: [90, 0, 0], s: [0.2, 0.18, 0.3], c: "white", m: "matte", name: "tunic" }],
}), 1.0, "Jun: a boy of about seven (1.35 m) in a simple blue tunic and darker blue pants with neat black hair and brown eyes; gentle and careful, loves growing flowers. Toddler-body poses (arm_l, fore_l, leg) work.", ["person", "child", "story", "boy"]);

people.jun_father = withScale(person({ hip: 0.68, arm: 1.25, top: "grey", pants: "charcoal", shoe: "shoe_black", recolor: { brow: "black" },
  torso: [
    { p: "cylinder", on: "head", at: [0, 0.76, 0], s: [0.74, 0.025, 0.74], c: "hay", m: "matte", name: "hat" },
    { p: "dome", on: "head", at: [0, 0.76 + 0.34 * 0.25, 0], s: [0.46, 0.34, 0.46], c: "hay", m: "matte", name: "hat" },
    { p: "cylinder", on: "head", at: [0, 0.79, 0], s: [0.465, 0.05, 0.465], c: "leaf", m: "matte", name: "hat" },
    { p: "cylinder", on: "head", at: [0, 0.02, 0], s: [0.44, 0.05, 0.34], c: "charcoal", m: "matte", name: "tunic" },
  ],
}), 1.05, "Jun's father: a calm grown-up man (1.65 m) in a simple gray work tunic with a belt, charcoal pants and a gardener's wide straw hat (named hat); kneels to talk to his son. Toddler-body poses work.", ["person", "adult", "story", "father"]);

people.shoemaker = withScale(person({ hip: 0.68, arm: 1.25, top: "cream", pants: "brown", shoe: "shoe_black", short: true, recolor: { brow: "grey" },
  torso: [
    { p: "box", on: "head", at: [0, -0.04, 0.165], s: [0.32, 0.56, 0.03], r: [-4, 0, 0], c: "twine", m: "matte", name: "apron" },
    { p: "capsule", on: "head", at: [0.11, 0.3, 0.1], s: [0.025, 0.24, 0.025], r: [-30, 0, 22], c: "twine", m: "matte", mirror: true, name: "apron" },
    ...glasses(0.08, 0.545, 0.215, 0.11, { temple: false }),
  ].map((p) => (p.name === "glasses" ? { ...p, at: [p.at[0], p.at[1] - 0.0, p.at[2]] } : p)),
  drop: [],
}), 1.0, "A kind, thin older shoemaker (1.55 m) with gray hair, small round spectacles (named glasses), a leather apron (named apron), a cream shirt with rolled sleeves and brown trousers. Toddler-body poses work.", ["person", "adult", "story", "worker"]);

people.shoemaker_wife = withScale(person({ hip: 0.66, arm: 1.22, top: "rose", pants: "rose", shoe: "shoe_black", hem: false, recolor: { brow: "grey" },
  torso: [
    { p: "cone", on: "head", at: [0, -0.22, 0], s: [0.64, 0.96, 0.54], c: "rose", m: "matte", name: "dress" },
    { p: "cape", on: "head", at: [0, 0.22, -0.01], s: [0.54, 0.26, 0.44], c: "purple", m: "plush", name: "shawl" },
    { p: "torus", on: "head", at: [0, 0.3, 0], r: [90, 0, 0], s: [0.34, 0.3, 0.4], c: "purple", m: "plush", name: "shawl" },
    { p: "sphere", on: "head", at: [0, 0.72, -0.17], s: [0.17, 0.15, 0.15], c: "grey", m: "plush", name: "hair" },
    { p: "box", on: "head", at: [0, -0.2, 0.2], s: [0.3, 0.42, 0.03], c: "white", m: "matte", name: "dress" },
  ],
}), 1.0, "The shoemaker's wife: a warm, practical older woman (1.5 m) with gray hair in a bun, a long rose dress with a white apron and a purple knitted shawl (named shawl); sews tiny clothes by lamplight. Toddler-body poses work.", ["person", "adult", "story", "worker"]);

people.old_emperor = withScale(person({ hip: 0.66, arm: 1.22, top: "gold", sleeve: "gold", pants: "gold", shoe: "ink", hem: false, recolor: { brow: "white" },
  torso: [
    { p: "cone", on: "head", at: [0, -0.21, 0], s: [0.66, 0.98, 0.56], c: "gold", m: "matte", name: "robe" },
    { p: "cylinder", on: "head", at: [0, 0.02, 0], s: [0.45, 0.05, 0.35], c: "red", m: "matte", name: "robe" },
    { p: "sphere", on: "head", at: [0, 0.4, 0.15], s: [0.24, 0.26, 0.14], c: "white", m: "plush", name: "beard" },
    { p: "cone", on: "head", at: [0, 0.22, 0.2], s: [0.2, 0.3, 0.1], r: [190, 0, 0], c: "white", m: "plush", name: "beard" },
    { p: "sphere", on: "head", at: [0.06, 0.465, 0.2], s: [0.1, 0.035, 0.05], r: [0, 0, -14], c: "white", m: "plush", mirror: true, name: "beard" },
    { p: "cylinder", on: "head", at: [0, 0.8, -0.01], s: [0.3, 0.14, 0.3], c: "ink", m: "matte", name: "hat" },
    { p: "cylinder", on: "head", at: [0, 0.75, -0.01], s: [0.31, 0.035, 0.31], c: "gold", m: "metal", name: "hat" },
  ],
}), 1.0, "A kind, very old emperor (1.55 m) with a long white beard, white hair, a plain golden robe with a red sash and a simple dark round hat; walks slowly with a smile; drawn respectfully in storybook style. Toddler-body poses work.", ["person", "adult", "story", "royal"], { brows: { color: "white", size: 1.4 } });

// The elf: a tiny toddler-body figure with pointed ears, a green cap, a red waistcoat and tiny shoes.
{
  const v = person({ top: "sand", sleeve: "sand", pants: "wood_dark", shoe: "wood_dark", drop: ["ears", "hair"],
    torso: [
      { p: "sphere", on: "head", at: [0, 0.6, -0.04], s: [0.45, 0.3, 0.4], c: "hay", m: "plush", name: "hair" },
      { p: "cone", on: "head", at: [0.04, 0.82, -0.02], r: [0, 0, -16], s: [0.44, 0.5, 0.42], c: "leaf", m: "plush", name: "cap" },
      { p: "torus", on: "head", at: [0, 0.64, -0.02], r: [80, 0, -6], s: [0.5, 0.48, 0.35], c: "leaf", m: "plush", name: "cap" },
      { p: "sphere", on: "head", at: [-0.1, 1.06, -0.02], s: [0.08, 0.08, 0.08], c: "yellow", m: "plush", name: "cap" },
      { p: "sphere", on: "head", at: [0, 0.16, -0.005], s: [0.47, 0.42, 0.355], c: "red", m: "plush", name: "waistcoat" },
      { p: "sphere", on: "head", at: [0, 0.2, 0.09], s: [0.12, 0.32, 0.2], c: "sand", m: "matte", name: "waistcoat" },
      ...onFront([0, 0.16, -0.005], [0.47, 0.42, 0.355], [[0.07, 0.24], [0.07, 0.14]], [0.035, 0.035, 0.03], "gold", "waistcoat"),
      { p: "cone", on: "head", at: [0.25, 0.54, -0.01], r: [0, 0, -68], s: [0.11, 0.24, 0.07], c: SKIN, m: "matte", mirror: true, name: "ears" },
    ],
  });
  // Pointy shoes on the legs (named shoes, drop them for the barefoot start).
  v.add.push({ p: "cone", at: [0.1, 0.46, 0], r: [90, 0, 0], s: [0.13, 0.22, 0.08], hang: [0, -0.43, 0.13], c: "red", m: "glossy", mirror: true, name: "shoes" });
  people.elf = withScale(v, 0.36, "A tiny friendly elf (0.47 m, knee-high to a cat) with pointed ears and a cheerful face in a red waistcoat (named waistcoat), green cap (cap) and pointy red shoes (shoes) over plain sand-colored clothes; drop those three for the thin, worn first look; sews fast and dances a jig.", ["person", "story", "magic", "tiny"]);
}

// Village children: a little crowd of three in simple tunics carrying pots of bright flowers. The middle child
// carries the face rig; the other two are simple painted faces.
{
  const pot = (x, z, flower) => [
    { p: "pot", at: [x, 0.36, z + 0.2], s: [0.16, 0.13, 0.16], c: "barn_red", m: "matte", name: "pots" },
    { p: "sphere", at: [x, 0.52, z + 0.2], s: [0.12, 0.12, 0.12], c: flower, m: "plush", name: "pots" },
    { p: "sphere", at: [x, 0.53, z + 0.2], s: [0.045, 0.045, 0.045], c: "yellow", m: "glossy", name: "pots" },
  ];
  const kid = (x, z, k, top, hair, flower) => {
    const P = [];
    const T = (v) => [x + v[0] * k, v[1] * k, z + v[2] * k];
    P.push({ p: "capsule", at: T([0.07, 0.2, 0]), s: [0.1 * k, 0.4 * k, 0.1 * k], c: "denim", m: "matte", mirror: false });
    P.push({ p: "capsule", at: T([-0.07, 0.2, 0]), s: [0.1 * k, 0.4 * k, 0.1 * k], c: "denim", m: "matte" });
    P.push({ p: "sphere", at: T([0, 0.55, 0]), s: [0.36 * k, 0.48 * k, 0.28 * k], c: top, m: "matte" });
    P.push({ p: "sphere", at: T([0, 0.98, 0]), s: [0.42 * k, 0.4 * k, 0.38 * k], c: SKIN, m: "matte" });
    P.push({ p: "sphere", at: T([0, 1.08, -0.03]), s: [0.45 * k, 0.32 * k, 0.42 * k], c: hair, m: "plush" });
    P.push({ p: "sphere", at: T([0.07, 0.99, 0.18]), s: [0.05 * k, 0.06 * k, 0.03 * k], c: "black", m: "glossy" });
    P.push({ p: "sphere", at: T([-0.07, 0.99, 0.18]), s: [0.05 * k, 0.06 * k, 0.03 * k], c: "black", m: "glossy" });
    P.push({ p: "smile", at: T([0, 0.92, 0.19]), s: [0.09 * k, 0.07 * k, 0.05 * k], c: "mouth", m: "matte" });
    P.push({ p: "sphere", at: T([0.12, 0.94, 0.15]), s: [0.06 * k, 0.04 * k, 0.02 * k], c: "blush", m: "blush" });
    P.push({ p: "sphere", at: T([-0.12, 0.94, 0.15]), s: [0.06 * k, 0.04 * k, 0.02 * k], c: "blush", m: "blush" });
    P.push({ p: "capsule", at: T([0.15, 0.62, 0.1]), r: [-60, 0, 10], s: [0.08 * k, 0.3 * k, 0.08 * k], c: SKIN, m: "matte" });
    P.push({ p: "capsule", at: T([-0.15, 0.62, 0.1]), r: [-60, 0, -10], s: [0.08 * k, 0.3 * k, 0.08 * k], c: SKIN, m: "matte" });
    P.push(...pot(x, z + 0.02 * k, flower).map((p) => ({ ...p, at: [p.at[0], p.at[1] * k, p.at[2] * k + z * (1 - k)], s: p.s.map((v) => v * k) })));
    return P;
  };
  const mid = kid(0, 0.15, 1, "teal", "black", "pink");
  // The middle child's head goes on the head group so the face rig can nod it.
  const headParts = mid.splice(3, 7).filter((p) => p.p !== "smile" && !(p.c === "black" && p.p === "sphere" && p.s[0] < 0.06) && p.c !== "blush");
  fresh.village_children = {
    color: SKIN,
    sound: "Hooray!",
    description: "Village children: a small storybook crowd of three children (about 1.15 m) in simple teal, yellow and red tunics, each carrying a pot of bright flowers (named pots); the middle child has the talking face, all drawn warmly.",
    tags: ["person", "child", "story", "group"],
    head: { at: [0, 0.98, 0.15], tilt: 0.5, look: 0.4 },
    eyes: { at: [0.07, 0.01, 0.18], size: 0.05, iris: "eye_brown", color: "black" },
    mouth: { at: [0, -0.07, 0.19], size: 0.06 },
    cheeks: { at: [0.12, -0.04, 0.15], size: 0.045, color: "blush" },
    bob: 0.015,
    parts: [
      ...kid(-0.42, -0.25, 0.92, "yellow", "brow", "red"),
      ...kid(0.42, -0.25, 0.9, "red", "black", "purple"),
      ...mid,
      ...headParts.map((p) => ({ ...p, at: [p.at[0], p.at[1] - 0.98, p.at[2] - 0.15], on: "head" })),
    ],
  };
}

const critters = { ...bear, ...animals, ...people, ...fresh };
const file = {
  description: "Toybox 10K family and story characters: the Bear family (Baby, Mommy, Daddy, Grandpa, Grandma, Auntie and Uncle Bear) and a polar bear from the catalog bear; grown-up, grandparent and baby variants of bunny, frog, monkey, penguin, dog, camel, squirrel, lion, pig and fish; a sun, a crescent moon, North Wind, a water spirit, a scarecrow, oni and troll grumps; story people on the toddler body (Jun, his father, the shoemaker and his wife, an old emperor, an elf, village children). Generated by tools/gen_tk_family.mjs: edit the generator, not this file.",
  critters,
};
writeFileSync(OUT, JSON.stringify(file, null, 1) + "\n");
console.log(`wrote ${OUT}: ${Object.keys(critters).length} critters`);
