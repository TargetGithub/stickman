// Generates catalog/models/tk_farm_pets.json: Toybox 10K farm animals, babies and small pets.
//   node engine3d/tools/gen_tk_farm_pets.mjs
// The babies (puppy, kitten, duckling, foal, calf) are derived from their grown-ups (dog, cat, duck, horse, cow)
// with babyify(): the body shrinks more than the head, so the head and eyes read big. Rerun after changing a base.
// cousin_kitten, mule and the dressed-up goats and grandma_llama are catalog variants (`like`).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cat = join(here, "..", "catalog");
const base = JSON.parse(readFileSync(join(cat, "models.json"), "utf8")).critters;
const farm = JSON.parse(readFileSync(join(cat, "models", "farm.json"), "utf8")).critters;
const clone = (v) => JSON.parse(JSON.stringify(v));
const r3 = (v) => (Array.isArray(v) ? v.map(r3) : typeof v === "number" ? Math.round(v * 1000) / 1000 : v);
const mul = (v, k) => (Array.isArray(v) ? v.map((x) => x * k) : v * k);

// ---------------------------------------------------------------- helpers

/** Four named legs (capsule + hoof or paw), each turning about its hip. */
function legs4({ hip, w, x, zf, zb, c, hoof = "hoof", hoofS = 1.15, hoofH = 0.1, foot = "cylinder" }) {
  const out = [];
  const L = hip - hoofH / 2;
  for (const [n, lx, lz] of [["leg_front_left", x, zf], ["leg_front_right", -x, zf], ["leg_back_left", x, zb], ["leg_back_right", -x, zb]]) {
    out.push({ p: "capsule", at: [lx, hip, lz], s: [w, L + 0.02, w], hang: [0, -L / 2 + 0.01, 0], c, name: n });
    out.push({ p: foot, at: [lx, hip, lz], s: foot === "sphere" ? [w * hoofS, hoofH, w * hoofS * 1.3] : [w * hoofS, hoofH, w * hoofS], hang: [0, -(hip - hoofH / 2), foot === "sphere" ? w * 0.2 : 0], c: hoof, m: foot === "sphere" ? "toy" : "glossy", name: n });
  }
  return out;
}

/** Shrink a grown-up into a baby: body by kb, head (and face) by kh. */
function babyify(m0, { kb, kh, lift = 0 }) {
  const m = clone(m0);
  m.parts = m.parts.map((p) => {
    const k = p.on === "head" ? kh : kb;
    const q = { ...p, at: mul(p.at ?? [0, 0, 0], k), s: typeof p.s === "number" ? p.s * k : mul(p.s, k) };
    if (p.hang) q.hang = mul(p.hang, k);
    return q;
  });
  m.head = { ...m.head, at: [m.head.at[0] * kb, m.head.at[1] * kb + lift, m.head.at[2] * kb] };
  for (const f of ["eyes", "mouth", "cheeks"]) if (m[f]) m[f] = { ...m[f], at: mul(m[f].at, kh), size: m[f].size * kh };
  if (m.talk) {
    m.talk = { ...m.talk, at: mul(m.talk.at, kh), size: m.talk.size * kh };
    if (m.talk.jaw) m.talk.jaw = { ...m.talk.jaw, at: mul(m.talk.jaw.at, kh), s: mul(m.talk.jaw.s, kh), drop: m.talk.jaw.drop * kh };
  }
  return m;
}

const recolor = (m, map) => {
  m.parts = m.parts.map((p) => ({ ...p, c: p.c != null && map[p.c] ? map[p.c] : p.c }));
  if (map[m.color]) m.color = map[m.color];
  return m;
};

const C = {};

// ---------------------------------------------------------------- goat (new)

C.goat = {
  color: "white",
  sound: "Maa-aa!",
  description:
    "A friendly white toy goat, about 1.1 m tall to the horn tips at size 1: small cream horns curving back, a little tan beard, sideways ears with pink insides, big brown eyes, a pink nose, a perky tail and four legs on dark hooves. Faces +z. Named parts: horns, beard, ears (twitch on their own), tail (flicks on its own), leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn [±25, 0, 0] about x to trot or gallop on the spot). Dressed-up variants: goat_straw_hat (gardener's straw hat, part hat), goat_neckerchief (sailor's red neckerchief, part neckerchief) and goat_bell (a bell on a red collar, part bell: use size 0.7 / 0.85 / 1 for little, middle and big billy goats).",
  tags: ["farm", "mammal", "goat", "white"],
  head: { at: [0, 1.0, 0.44], tilt: 0.8 },
  eyes: { at: [0.1, 0.05, 0.155], size: 0.075, iris: "eye_brown" },
  cheeks: { at: [0.14, -0.05, 0.14], size: 0.05, color: "blush" },
  mouth: { at: [0, -0.15, 0.25], size: 0.06 },
  bob: 0.012,
  parts: [
    { p: "sphere", at: [0, 0.62, -0.02], s: [0.5, 0.44, 0.8] },
    { p: "sphere", at: [0, 0.66, 0.24], s: [0.42, 0.44, 0.38] },
    { p: "sphere", at: [0, 0.54, 0.02], s: [0.36, 0.26, 0.66], c: "cream" },
    ...legs4({ hip: 0.52, w: 0.12, x: 0.14, zf: 0.24, zb: -0.26, c: "white" }),
    { p: "capsule", at: [0, 0.84, 0.32], s: [0.22, 0.34, 0.22], r: [28, 0, 0] },
    { p: "sphere", at: [0, 0.78, -0.38], s: [0.1, 0.18, 0.08], r: [-35, 0, 0], hang: [0, 0.06, 0], idle: { r: [0, 0, 25], hz: 1.8 }, name: "tail" },
    { p: "sphere", at: [0, 0, 0], s: [0.36, 0.34, 0.36], on: "head" },
    { p: "sphere", at: [0, -0.1, 0.14], s: [0.24, 0.2, 0.26], on: "head" },
    { p: "sphere", at: [0, -0.07, 0.262], s: [0.09, 0.05, 0.03], on: "head", c: "pig" },
    { p: "cone", at: [0, -0.24, 0.13], s: [0.085, 0.15, 0.07], r: [180, 0, 0], on: "head", c: "wood", m: "matte", name: "beard" },
    { p: "sphere", at: [0.19, 0.05, -0.01], s: [0.2, 0.065, 0.1], r: [0, 15, -18], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 8], hz: 0.45 } },
    { p: "sphere", at: [0.195, 0.052, 0.01], s: [0.14, 0.03, 0.06], r: [0, 15, -18], on: "head", c: "pig", m: "matte", mirror: true, name: "ears", idle: { r: [0, 0, 8], hz: 0.45 } },
    { p: "capsule", at: [0.07, 0.14, 0.03], s: [0.065, 0.15, 0.065], r: [-28, 0, -16], hang: [0, 0.06, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
    { p: "sphere", at: [0.104, 0.255, -0.035], s: 0.058, on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
    { p: "capsule", at: [0.104, 0.255, -0.035], s: [0.05, 0.13, 0.05], r: [-80, 0, -14], hang: [0, 0.055, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
    { p: "sphere", at: [0, 0.16, 0.08], s: [0.12, 0.07, 0.1], on: "head" },
  ],
};

const hat = [
  { p: "cylinder", at: [0, 0.17, 0.01], s: [0.62, 0.025, 0.62], r: [-8, 0, 0], on: "head", c: "hay", m: "matte", name: "hat" },
  { p: "sphere", at: [0, 0.2, 0.0], s: [0.3, 0.2, 0.3], r: [-8, 0, 0], on: "head", c: "hay", m: "matte", name: "hat" },
  { p: "cylinder", at: [0, 0.2, 0.0], s: [0.31, 0.05, 0.31], r: [-8, 0, 0], on: "head", c: "red", name: "hat" },
];
C.goat_straw_hat = {
  like: "goat",
  description: "The goat as a gardener: a wide golden straw hat with a red band sits over its horns (named part hat). All the goat's named parts and legs.",
  tags: ["farm", "mammal", "goat", "garden", "gardener"],
  add: hat,
};
C.goat_neckerchief = {
  like: "goat",
  description: "The goat as a sailor: a red neckerchief knotted at the front of its neck (named part neckerchief). Hold a small flag prop at its front hoof to wave it. All the goat's named parts and legs.",
  tags: ["farm", "mammal", "goat", "sailor"],
  add: [
    { p: "torus", at: [0, 0.86, 0.33], s: [0.3, 0.3, 0.42], r: [62, 0, 0], c: "red", name: "neckerchief" },
    { p: "cone", at: [0, 0.76, 0.45], s: [0.2, 0.2, 0.05], r: [180, 0, 0], c: "red", name: "neckerchief" },
    { p: "sphere", at: [0, 0.86, 0.45], s: [0.07, 0.06, 0.05], c: "red", name: "neckerchief" },
  ],
};
C.goat_bell = {
  like: "goat",
  description: "The goat with a gold bell on a red collar (named part bell, swings gently). For the three billy goats use size 0.7, 0.85 and 1. All the goat's named parts and legs.",
  tags: ["farm", "mammal", "goat", "bell", "story"],
  add: [
    { p: "torus", at: [0, 0.86, 0.33], s: [0.28, 0.28, 0.4], r: [62, 0, 0], c: "red", name: "bell" },
    { p: "sphere", at: [0, 0.79, 0.44], s: [0.11, 0.12, 0.11], hang: [0, -0.05, 0], c: "gold", m: "metal", name: "bell", idle: { r: [0, 0, 10], hz: 0.9 } },
  ],
};

// ---------------------------------------------------------------- babies

{
  const m = babyify(base.dog, { kb: 0.56, kh: 0.74, lift: 0.01 });
  recolor(m, { sand: "cream", cream: "white" });
  // big paws
  m.parts = m.parts.map((p) => (p.on !== "head" && p.mirror && p.at[1] < 0.06 ? { ...p, s: mul(p.s, 1.45), at: [p.at[0], p.at[1] + 0.005, p.at[2] + 0.02] } : p));
  m.parts.push({ p: "sphere", at: [-0.1, 0.07, 0.14], s: [0.16, 0.15, 0.08], r: [0, -20, 0], on: "head", c: "brown", m: "matte" });
  m.eyes = { at: [0.1, 0.06, 0.18], size: 0.08, iris: "eye_brown" };
  m.cheeks = { at: [0.15, -0.04, 0.17], size: 0.055, color: "blush" };
  m.mouth = { ...m.mouth, size: 0.055 };
  m.sound = "Yip yip!";
  m.description =
    "A tiny young puppy (the catalog dog's baby), about 0.7 m tall at size 1: a cream coat with a white chest, floppy brown ears, a brown patch round its left eye, big paws, big brown eyes and a waggy tail. Faces +z. Named part: tail (wags fast on its own).";
  m.tags = ["pet", "home", "dog", "baby_animal", "puppy"];
  C.puppy = m;
}
{
  const m = babyify(base.cat, { kb: 0.52, kh: 0.72, lift: 0.01 });
  recolor(m, { orange: "grey", cream: "white" });
  m.parts = m.parts.map((p) => (p.name === "tail" ? { ...p, s: [p.s[0] * 1.1, p.s[1] * 0.6, p.s[2] * 1.1], hang: mul(p.hang, 0.6), at: [p.at[0], p.at[1] - 0.03, p.at[2] + 0.02] } : p));
  m.parts = m.parts.map((p) => (p.on === "head" && p.p === "cone" && p.c === "pink" ? p : p));
  for (const p of m.parts) if (p.at[1] > 0.1 && p.c == null && !p.name && p.on !== "head" && p.s[0] > 0.2) { p.m = "plush"; p.fur = { length: 0.018, shells: 12, density: 90, clump: 0.4 }; }
  m.parts.push({ p: "sphere", at: [0, 0.03, 0], s: [0.46, 0.4, 0.4], on: "head", c: "grey", m: "plush", fur: { length: 0.016, shells: 12, density: 90, clump: 0.4 } });
  m.parts.push({ p: "sphere", at: [0, -0.07, 0.15], s: [0.2, 0.12, 0.1], on: "head", c: "white" });
  m.eyes = { at: [0.095, 0.03, 0.175], size: 0.08, iris: "teal" };
  m.cheeks = { at: [0.14, -0.05, 0.15], size: 0.05, color: "blush" };
  m.mouth = { at: [0, -0.1, 0.2], size: 0.05 };
  m.sound = "Mew!";
  m.description =
    "A tiny fluffy gray kitten (the catalog cat's baby), about 0.6 m tall at size 1: soft gray fur with a white chest and muzzle, pointy ears with pink insides, big teal eyes and a short tail. Faces +z. Named part: tail (swishes on its own). Pair with a ribbon prop to pounce.";
  m.tags = ["pet", "home", "cat", "baby_animal", "kitten"];
  C.kitten = m;
}
C.cousin_kitten = {
  like: "kitten",
  description:
    "Cat's cousin kitten: the kitten in a ginger stripy coat with a cream chest and green eyes, and a little blue bow on its head (named part bow). Same size and named parts as kitten.",
  tags: ["pet", "home", "cat", "baby_animal", "kitten", "cousin"],
  recolor: { grey: "orange", white: "cream", teal: "leaf" },
  sound: "Mew mew!",
  add: [
    { p: "capsule", at: [0, 0.2, 0.08], s: [0.03, 0.1, 0.03], r: [20, 0, 0], on: "head", c: "basketball" },
    { p: "capsule", at: [0.05, 0.19, 0.09], s: [0.025, 0.08, 0.025], r: [20, 0, -15], on: "head", c: "basketball", mirror: true },
    { p: "capsule", at: [0, 0.36, -0.12], s: [0.04, 0.22, 0.04], r: [0, 0, 90], c: "basketball" },
    { p: "capsule", at: [0, 0.27, -0.14], s: [0.04, 0.24, 0.04], r: [0, 0, 90], c: "basketball" },
    { p: "capsule", at: [0, 0.18, -0.135], s: [0.04, 0.22, 0.04], r: [0, 0, 90], c: "basketball" },
    { p: "sphere", at: [0.12, 0.17, 0.05], s: [0.07, 0.055, 0.035], r: [0, 0, 25], on: "head", c: "blue", name: "bow" },
    { p: "sphere", at: [0.2, 0.15, 0.03], s: [0.07, 0.055, 0.035], r: [0, 0, -25], on: "head", c: "blue", name: "bow" },
    { p: "sphere", at: [0.16, 0.16, 0.045], s: [0.03, 0.03, 0.03], on: "head", c: "blue", name: "bow" },
  ],
};
{
  const m = babyify(base.duck, { kb: 0.5, kh: 0.68, lift: 0.0 });
  m.parts.push({ p: "sphere", at: [0.04, 0.29, 0.02], s: [0.06, 0.1, 0.06], r: [0, 0, -25], on: "head" });
  m.eyes = { at: [0.09, 0.05, 0.17], size: 0.065, iris: "eye_brown" };
  m.cheeks = { at: [0.14, -0.03, 0.15], size: 0.06, color: "blush" };
  m.parts = m.parts.map((p) => (p.on !== "head" && p.idle ? { ...p, name: "wing" } : p));
  m.sound = "Peep peep!";
  m.description =
    "A small fluffy yellow duckling (the catalog duck's baby), about 0.6 m tall at size 1: a round yellow body, a big head with a fluffy tuft, a flat orange bill that opens to talk, big brown eyes and little flapping wings. Faces +z. Named part: wing. Use several at size 0.6-1 for counting rows and swimming lines.";
  m.tags = ["farm", "bird", "water", "baby_animal", "duckling"];
  C.duckling = m;
}
{
  const m = babyify(farm.horse, { kb: 0.6, kh: 0.78, lift: 0.0 });
  recolor(m, { horse_brown: "sand", horse_tan: "cream", horse_mane: "brown" });
  // longer, wobbly legs: stretch the legs and lift the rest of the body
  const dy = 0.06;
  m.parts = m.parts.map((p) => {
    if (p.name?.startsWith("leg_")) return p.p === "capsule" ? { ...p, at: [p.at[0], p.at[1] + dy, p.at[2]], s: [p.s[0] * 0.8, p.s[1] + dy, p.s[2] * 0.8], hang: [0, p.hang[1] - dy / 2, 0] } : { ...p, at: [p.at[0], p.at[1] + dy, p.at[2]], s: [p.s[0] * 0.85, p.s[1], p.s[2] * 0.85], hang: [0, p.hang[1] - dy, 0] };
    if (p.on === "head") return p;
    return { ...p, at: [p.at[0], p.at[1] + dy, p.at[2]] };
  });
  m.head.at[1] += dy;
  m.eyes = { ...m.eyes, size: m.eyes.size * 1.25 };
  m.parts = m.parts.map((p) => (p.on === "head" && p.c === "cream" && p.p === "sphere" && p.s[0] > 0.2 ? { ...p, s: mul(p.s, 0.8), at: [p.at[0], p.at[1] - 0.01, p.at[2] - 0.01] } : p));
  m.parts = m.parts.map((p) => (p.on === "head" && p.c === "brown" && p.p === "sphere" && p.s[0] < 0.06 ? { ...p, at: [p.at[0], p.at[1], p.at[2] - 0.035] } : p));
  m.mouth = { ...m.mouth, at: [m.mouth.at[0], m.mouth.at[1] + 0.01, m.mouth.at[2] - 0.035] };
  m.parts.push({ p: "sphere", at: [0, 0.6, -0.29], s: [0.12, 0.16, 0.12], r: [30, 0, 0], c: "brown", m: "matte" });
  m.sound = "Nee-hee!";
  m.description =
    "A young foal (a pony, the catalog horse's baby), about 1.05 m tall to the ear tips at size 1: a sandy coat with a cream belly and muzzle, long slim wobbly legs on dark hooves, a short fluffy brown mane and tail and big brown eyes. Faces +z. Named parts: tail, mane, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn [±25, 0, 0] about x to trot and prance). Talks with its own mouth.";
  m.tags = ["farm", "mammal", "horse", "pony", "baby_animal", "foal"];
  C.foal = m;
}
{
  const m = babyify(base.cow, { kb: 0.62, kh: 0.8 });
  const lift = 0.14;
  m.parts = m.parts.filter((p) => !(p.on !== "head" && p.mirror && p.at[1] < 0.06 && p.c === "ink"));
  m.parts = m.parts.map((p) => (p.on === "head" ? p : { ...p, at: [p.at[0], p.at[1] + lift, p.at[2]] }));
  m.head.at[1] += lift;
  m.parts.push(...legs4({ hip: 0.24, w: 0.085, x: 0.14, zf: 0.12, zb: -0.13, c: "white", hoofS: 1.2 }));
  // knobbly knees
  for (const [n, x, z] of [["leg_front_left", 0.14, 0.12], ["leg_front_right", -0.14, 0.12], ["leg_back_left", 0.14, -0.13], ["leg_back_right", -0.14, -0.13]])
    m.parts.push({ p: "sphere", at: [x, 0.24, z], s: [0.1, 0.09, 0.1], hang: [0, -0.11, 0], name: n });
  m.eyes = { at: [0.1, 0.06, 0.18], size: 0.08, iris: "eye_brown" };
  m.cheeks = { at: [0.16, -0.05, 0.16], size: 0.05, color: "blush" };
  m.mouth = { at: [0, -0.14, 0.27], size: 0.06 };
  m.parts.push({ p: "sphere", at: [0, 0.2, 0.05], s: [0.12, 0.07, 0.1], on: "head", c: "ink", m: "matte" });
  m.sound = "Mmm-oo!";
  m.description =
    "A small young calf (the catalog cow's baby), about 0.85 m tall at size 1: black-and-white like its mom, tiny cream horn buds, a black tuft, a pink snout, big brown eyes and knobbly-kneed legs on dark hooves. Faces +z. Named parts: tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn [±20, 0, 0] about x to wobble and trot).";
  m.tags = ["farm", "mammal", "cow", "baby_animal", "calf"];
  C.calf = m;
}

// ---------------------------------------------------------------- big farm animals

C.ox = {
  color: "brown",
  sound: "Mmmooo!",
  description:
    "A big gentle brown toy ox, about 1.25 m tall at size 1 and 1.4 m nose to tail: a broad body with a shoulder hump, a sandy belly and wide muzzle, short cream horns curving out and up, sideways ears, sleepy-kind brown eyes, thick legs on dark hooves and a tufted tail. Faces +z. Named parts: horns, ears, tail (swishes), leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn about x to plod). Chews: let it talk with no line, or nod its head.",
  tags: ["farm", "mammal", "ox", "cattle"],
  head: { at: [0, 0.96, 0.66], tilt: 0.7 },
  eyes: { at: [0.13, 0.07, 0.2], size: 0.075, iris: "eye_brown" },
  cheeks: { at: [0.19, -0.04, 0.18], size: 0.06, color: "blush" },
  mouth: { at: [0, -0.2, 0.33], size: 0.08 },
  bob: 0.008,
  parts: [
    { p: "sphere", at: [0, 0.7, 0], s: [0.84, 0.66, 1.2] },
    { p: "sphere", at: [0, 0.86, 0.3], s: [0.66, 0.5, 0.56] },
    { p: "sphere", at: [0, 0.58, 0.04], s: [0.62, 0.36, 0.96], c: "sand" },
    ...legs4({ hip: 0.56, w: 0.2, x: 0.25, zf: 0.34, zb: -0.36, c: "brown", hoofH: 0.12 }),
    { p: "capsule", at: [0, 0.8, -0.58], s: [0.06, 0.46, 0.06], r: [-15, 0, 0], hang: [0, -0.2, 0], idle: { r: [0, 0, 12], hz: 0.5 }, name: "tail" },
    { p: "sphere", at: [0, 0.8, -0.58], s: [0.12, 0.18, 0.12], r: [-15, 0, 0], hang: [0, -0.42, 0], c: "horse_mane", m: "matte", idle: { r: [0, 0, 12], hz: 0.5 }, name: "tail" },
    { p: "sphere", at: [0, 0, 0], s: [0.5, 0.46, 0.46], on: "head" },
    { p: "sphere", at: [0, -0.14, 0.2], s: [0.44, 0.28, 0.28], on: "head", c: "sand" },
    { p: "sphere", at: [0.09, -0.12, 0.33], s: [0.06, 0.05, 0.03], on: "head", c: "horse_mane", mirror: true },
    { p: "sphere", at: [0, 0.2, 0.06], s: [0.2, 0.1, 0.16], on: "head", c: "wood_dark", m: "matte" },
    { p: "capsule", at: [0.15, 0.17, 0], s: [0.08, 0.2, 0.08], r: [0, 0, -75], hang: [0, 0.08, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
    { p: "capsule", at: [0.3, 0.2, 0], s: [0.065, 0.15, 0.065], r: [0, 0, -15], hang: [0, 0.05, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
    { p: "sphere", at: [0.29, 0.04, -0.04], s: [0.22, 0.08, 0.13], r: [0, 0, -12], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 7], hz: 0.4 } },
    { p: "sphere", at: [0.3, 0.045, -0.015], s: [0.15, 0.04, 0.08], r: [0, 0, -12], on: "head", c: "pig", m: "matte", mirror: true, name: "ears", idle: { r: [0, 0, 7], hz: 0.4 } },
  ],
};

{
  const fringe = [];
  // long soft hair hanging from the body, all round
  for (let i = 0; i < 7; i++) {
    const z = -0.48 + i * 0.16;
    fringe.push({ p: "sphere", at: [0.35, 0.56 - (i % 2) * 0.05, z], s: [0.17, 0.5 + (i % 2) * 0.08, 0.2], r: [0, 0, -8], c: "horse_mane", m: "matte", mirror: true });
  }
  for (const x of [-0.24, -0.08, 0.08, 0.24]) fringe.push({ p: "sphere", at: [x, 0.6, 0.47], s: [0.18, 0.46, 0.16], r: [12, 0, 0], c: "horse_mane", m: "matte" });
  for (const x of [-0.2, 0, 0.2]) fringe.push({ p: "sphere", at: [x, 0.6, -0.52], s: [0.2, 0.44, 0.16], r: [-10, 0, 0], c: "horse_mane", m: "matte" });
  C.yak = {
    color: "horse_mane",
    sound: "Hmmph!",
    description:
      "A shaggy, friendly dark-brown toy yak, about 1.3 m tall to the horn tips at size 1: long soft hair hanging almost to its hooves, a cream face patch and muzzle, short cream horns curving up, a fluffy forelock, a bushy tail and a gold bell on a red ribbon. Faces +z. Named parts: horns, ears, bell (swings on its own), tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn about x to plod; mostly hidden under the hair). Huffs: a small puff prop at the nose.",
    tags: ["farm", "mammal", "yak", "mountain", "cattle"],
    head: { at: [0, 0.98, 0.62], tilt: 0.7 },
    eyes: { at: [0.12, 0.05, 0.2], size: 0.075, iris: "eye_brown" },
    cheeks: { at: [0.17, -0.05, 0.18], size: 0.055, color: "blush" },
    mouth: { at: [0, -0.19, 0.3], size: 0.07 },
    bob: 0.008,
    parts: [
      { p: "sphere", at: [0, 0.78, 0], s: [0.8, 0.66, 1.1], m: "matte" },
      { p: "sphere", at: [0, 0.94, 0.24], s: [0.62, 0.48, 0.54], m: "matte" },
      ...fringe,
      ...legs4({ hip: 0.5, w: 0.17, x: 0.22, zf: 0.3, zb: -0.32, c: "horse_mane", hoofH: 0.1 }),
      { p: "sphere", at: [0, 0.86, -0.56], s: [0.2, 0.42, 0.18], r: [-20, 0, 0], hang: [0, -0.16, 0], m: "matte", idle: { r: [0, 0, 10], hz: 0.5 }, name: "tail" },
      { p: "torus", at: [0, 0.82, 0.48], s: [0.4, 0.4, 0.4], r: [70, 0, 0], c: "red", name: "bell" },
      { p: "sphere", at: [0, 0.68, 0.6], s: [0.13, 0.14, 0.13], hang: [0, -0.04, 0], c: "gold", m: "metal", name: "bell", idle: { r: [0, 0, 10], hz: 0.8 } },
      { p: "sphere", at: [0, 0, 0], s: [0.46, 0.44, 0.44], on: "head", m: "matte" },
      { p: "sphere", at: [0, -0.06, 0.12], s: [0.34, 0.36, 0.28], on: "head", c: "cream", m: "matte" },
      { p: "sphere", at: [0, -0.14, 0.2], s: [0.36, 0.24, 0.24], on: "head", c: "wall_warm" },
      { p: "sphere", at: [0.08, -0.12, 0.315], s: [0.05, 0.04, 0.03], on: "head", c: "brow", mirror: true },
      { p: "sphere", at: [0, 0.17, 0.1], s: [0.26, 0.14, 0.2], r: [20, 0, 0], on: "head", m: "matte" },
      { p: "capsule", at: [0.15, 0.15, 0], s: [0.085, 0.2, 0.085], r: [0, 0, -72], hang: [0, 0.08, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
      { p: "sphere", at: [0.3, 0.2, 0], s: 0.075, on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
      { p: "capsule", at: [0.3, 0.2, 0], s: [0.07, 0.2, 0.07], r: [-10, 0, 10], hang: [0, 0.08, 0], on: "head", c: "cream", m: "glossy", mirror: true, name: "horns" },
      { p: "sphere", at: [0.27, 0.0, -0.04], s: [0.18, 0.08, 0.12], r: [0, 0, -15], on: "head", m: "matte", mirror: true, name: "ears", idle: { r: [0, 0, 7], hz: 0.4 } },
    ],
  };
}

C.water_buffalo = {
  color: "grey",
  sound: "Hrmmm!",
  description:
    "A big gray toy water buffalo, about 1.2 m tall at size 1: a heavy body, a broad pale nose, wide dark horns that sweep out and back, droopy ears, thick brows that start in a bossy frown (a sad or worried feeling softens them into a sheepish smile) and thick legs on dark hooves. Faces +z. Named parts: horns, ears, tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn about x to walk).",
  tags: ["farm", "mammal", "buffalo", "water", "river"],
  head: { at: [0, 0.9, 0.66], tilt: 0.7 },
  eyes: { at: [0.13, 0.05, 0.2], size: 0.07, iris: "eye_brown" },
  brows: { color: "charcoal", size: 0.11, lift: 0.02, tilt: -14 },
  cheeks: { at: [0.18, -0.06, 0.18], size: 0.055, color: "blush" },
  mouth: { at: [0, -0.2, 0.32], size: 0.08 },
  bob: 0.008,
  parts: [
    { p: "sphere", at: [0, 0.68, 0], s: [0.86, 0.64, 1.2] },
    { p: "sphere", at: [0, 0.8, 0.32], s: [0.66, 0.5, 0.5] },
    { p: "sphere", at: [0, 0.56, 0.04], s: [0.6, 0.32, 0.9], c: "rain_sky" },
    ...legs4({ hip: 0.54, w: 0.2, x: 0.25, zf: 0.34, zb: -0.36, c: "grey", hoof: "charcoal", hoofH: 0.12 }),
    { p: "capsule", at: [0, 0.8, -0.58], s: [0.06, 0.44, 0.06], r: [-12, 0, 0], hang: [0, -0.2, 0], c: "charcoal", idle: { r: [0, 0, 10], hz: 0.5 }, name: "tail" },
    { p: "sphere", at: [0, 0, 0], s: [0.5, 0.44, 0.46], on: "head" },
    { p: "sphere", at: [0, -0.14, 0.2], s: [0.48, 0.28, 0.28], on: "head", c: "rain_sky" },
    { p: "sphere", at: [0.1, -0.12, 0.335], s: [0.07, 0.05, 0.03], on: "head", c: "charcoal", mirror: true },
    { p: "sphere", at: [0, 0.19, -0.02], s: [0.36, 0.12, 0.2], on: "head", c: "charcoal" },
    { p: "crook", at: [0, 0.18, -0.3], s: [1.0, 0.8, 0.6], r: [100, 0, 0], on: "head", c: "charcoal", m: "glossy", name: "horns" },
    { p: "sphere", at: [0.5, 0.18, -0.3], s: [0.19, 0.12, 0.15], on: "head", c: "charcoal", m: "glossy", mirror: true, name: "horns" },
    { p: "cone", at: [0.5, 0.2, -0.32], s: [0.15, 0.2, 0.12], r: [-40, 0, -15], on: "head", c: "charcoal", m: "glossy", mirror: true, name: "horns" },
    { p: "sphere", at: [0.27, 0.02, -0.02], s: [0.2, 0.07, 0.12], r: [0, 0, 25], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.4 } },
  ],
};

C.mule = {
  like: "horse",
  scale: 0.9,
  recolor: { horse_brown: "grey", horse_tan: "plush", horse_mane: "charcoal" },
  description:
    "A friendly gray-brown toy mule (built on the catalog horse at 0.9 scale), about 1.55 m tall to the tips of its long upright ears: a gray coat, a pale muzzle and belly, a short dark mane and tail, big brown eyes and a gentle smile. Faces +z. Named parts: ears (long, twitch on their own), tail, mane, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn [±25, 0, 0] about x to walk; raise the front pair to hold a flute prop). Talks with its own mouth.",
  tags: ["farm", "mammal", "mule", "donkey"],
  sound: "Hee-haw!",
  add: [
    { p: "capsule", at: [0.1, 0.27, -0.03], s: [0.11, 0.36, 0.07], r: [-6, 0, -12], hang: [0, 0.14, 0], c: "grey", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.4 }, on: "head" },
  ],
};

C.llama = {
  color: "cream",
  sound: "Hmmm-mm!",
  description:
    "A tall, gentle cream-and-brown toy llama, about 1.85 m tall to the ear tips at size 1: a fluffy cream body and long fluffy neck, brown patches, long curved banana ears with brown tips, a fluffy forelock, a tan muzzle, soft brown eyes with long lashes and slim legs on dark toes. Faces +z. Named parts: neck, ears (twitch), tail, leg_front_left, leg_front_right, leg_back_left, leg_back_right (turn about x to walk). The grown-up look grandma_llama adds a woven shawl and round glasses.",
  tags: ["farm", "mammal", "llama", "mountain"],
  head: { at: [0, 1.56, 0.42], tilt: 0.8 },
  eyes: { at: [0.095, 0.05, 0.14], size: 0.07, iris: "eye_brown" },
  brows: { color: "brow", size: 0.06, lift: 0.04 },
  cheeks: { at: [0.13, -0.04, 0.13], size: 0.045, color: "blush" },
  mouth: { at: [0, -0.13, 0.215], size: 0.05 },
  bob: 0.01,
  parts: [
    { p: "sphere", at: [0, 0.82, -0.04], s: [0.52, 0.46, 0.84], m: "matte" },
    { p: "sphere", at: [0.13, 0.9, -0.12], s: 0.32, m: "matte", mirror: true },
    { p: "sphere", at: [0.12, 0.84, 0.16], s: 0.3, m: "matte", mirror: true },
    { p: "sphere", at: [0.18, 0.84, -0.18], s: [0.2, 0.26, 0.3], c: "brown", m: "matte", mirror: true },
    ...legs4({ hip: 0.66, w: 0.11, x: 0.14, zf: 0.24, zb: -0.28, c: "cream", hoof: "brown", hoofH: 0.08, foot: "sphere" }),
    { p: "capsule", at: [0, 0.95, 0.26], s: [0.27, 0.68, 0.27], r: [12, 0, 0], hang: [0, 0.28, 0], m: "matte", name: "neck" },
    { p: "sphere", at: [0, 1.04, 0.33], s: [0.34, 0.34, 0.3], m: "matte" },
    { p: "sphere", at: [0.06, 1.18, 0.34], s: [0.2, 0.2, 0.2], m: "matte", mirror: true },
    { p: "sphere", at: [0, 0.96, -0.44], s: [0.16, 0.24, 0.14], r: [-30, 0, 0], hang: [0, 0.06, 0], m: "matte", idle: { r: [0, 0, 15], hz: 0.7 }, name: "tail" },
    { p: "sphere", at: [0, 0, 0], s: [0.3, 0.3, 0.3], on: "head" },
    { p: "sphere", at: [0, -0.08, 0.12], s: [0.2, 0.18, 0.2], on: "head", c: "wood" },
    { p: "sphere", at: [0, -0.07, 0.215], s: [0.07, 0.03, 0.02], on: "head", c: "brown" },
    { p: "sphere", at: [0, 0.14, 0.04], s: [0.2, 0.12, 0.18], on: "head", m: "matte" },
    { p: "capsule", at: [0.08, 0.13, -0.04], s: [0.07, 0.22, 0.05], r: [-10, 0, -10], hr: [0, 0, 12], hang: [0, 0.1, 0], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.45 } },
    { p: "sphere", at: [0.08, 0.13, -0.04], s: [0.065, 0.08, 0.05], r: [-10, 0, -10], hang: [0.0, 0.19, 0], on: "head", c: "brown", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.45 } },
  ],
};
C.grandma_llama = {
  like: "llama",
  description:
    "Grandmother Llama: the llama with a small woven red shawl with a gold stripe round her shoulders (named part shawl) and round black glasses (named part glasses). Same named parts as llama.",
  tags: ["farm", "mammal", "llama", "grandma", "family"],
  add: [
    { p: "sphere", at: [0, 0.98, 0.2], s: [0.56, 0.28, 0.5], r: [-12, 0, 0], c: "red", m: "matte", name: "shawl" },
    { p: "sphere", at: [0, 0.965, 0.2], s: [0.575, 0.07, 0.515], r: [-12, 0, 0], c: "gold", m: "matte", name: "shawl" },
    { p: "cone", at: [0, 0.86, 0.41], s: [0.18, 0.16, 0.05], r: [190, 0, 0], c: "red", m: "matte", name: "shawl" },
    { p: "torus", at: [0.095, 0.05, 0.165], s: [0.085, 0.085, 0.1], on: "head", c: "ink", m: "glossy", mirror: true, name: "glasses" },
    { p: "capsule", at: [0, 0.055, 0.17], r: [0, 0, 90], s: [0.015, 0.06, 0.015], on: "head", c: "ink", m: "glossy", name: "glasses" },
  ],
};

// ---------------------------------------------------------------- small pets

C.rat = {
  color: "brown",
  sound: "Squeak!",
  description:
    "A small friendly brown toy rat, about 0.75 m tall at size 1 (bigger than the gray mouse, with a longer pointed snout): a brown body with a cream tummy, rounded pink ears, a pink nose with whiskers, big shiny eyes, little pink paws and a long pink curling tail. Faces +z. Named parts: ears, paw (both front paws), tail (sways on its own), nose (wiggle it to sniff).",
  tags: ["home", "farm", "mammal", "small", "rat", "pet"],
  head: { at: [0, 0.62, 0.08] },
  eyes: { at: [0.1, 0.06, 0.17], size: 0.07, iris: "ink" },
  cheeks: { at: [0.14, -0.04, 0.17], size: 0.05, color: "blush" },
  mouth: { at: [0, -0.1, 0.27], size: 0.05 },
  bob: 0.02,
  parts: [
    { p: "egg", at: [0, 0.0, -0.02], s: [0.46, 0.54, 0.5] },
    { p: "sphere", at: [0, 0.24, 0.12], s: [0.3, 0.34, 0.26], c: "cream" },
    { p: "sphere", at: [0.12, 0.03, 0.14], s: [0.12, 0.06, 0.2], c: "pig", mirror: true },
    { p: "sphere", at: [0.1, 0.4, 0.22], s: [0.07, 0.09, 0.07], hang: [0, -0.04, 0], c: "pig", mirror: true, name: "paw" },
    { p: "capsule", at: [0, 0.08, -0.26], s: [0.045, 0.75, 0.045], r: [-78, 0, -20], hang: [0, 0.35, 0], c: "pig", idle: { r: [0, 0, 18], hz: 0.6 }, name: "tail" },
    { p: "sphere", at: [0, 0, 0], s: [0.38, 0.34, 0.38], on: "head" },
    { p: "cone", at: [0, -0.05, 0.2], s: [0.24, 0.2, 0.22], r: [90, 0, 0], on: "head" },
    { p: "sphere", at: [0, -0.07, 0.18], s: [0.18, 0.12, 0.16], on: "head", c: "cream" },
    { p: "sphere", at: [0, -0.05, 0.31], s: [0.06, 0.05, 0.05], on: "head", c: "pig", m: "glossy", name: "nose" },
    { p: "sphere", at: [0.15, 0.15, -0.04], s: [0.17, 0.17, 0.06], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.5 } },
    { p: "sphere", at: [0.15, 0.15, -0.015], s: [0.12, 0.12, 0.03], on: "head", c: "pig", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.5 } },
    { p: "capsule", at: [0.1, -0.06, 0.25], s: [0.01, 0.14, 0.01], r: [0, 0, -80], hang: [0, 0.07, 0], on: "head", c: "charcoal", mirror: true },
    { p: "capsule", at: [0.1, -0.08, 0.25], s: [0.01, 0.14, 0.01], r: [0, 0, -100], hang: [0, 0.07, 0], on: "head", c: "charcoal", mirror: true },
  ],
};
C.rat.parts[0].at = [0, 0.29, -0.02];

C.hamster = {
  color: "stitch_gold",
  sound: "Squeak squeak!",
  description:
    "A small round golden toy hamster, about 0.5 m tall at size 1: one round body-head with a cream tummy and face, big puffed-out stuffed cheeks, tiny round ears with pink insides, shiny black eyes, a pink nose and tiny pink paws held up in front. Faces +z. Named parts: paw (both; raise one to wave, or use point), ears, cheeks (puff them: scale), feet.",
  tags: ["pet", "home", "mammal", "small", "hamster"],
  head: { at: [0, 0.34, 0.04] },
  eyes: { at: [0.1, 0.06, 0.19], size: 0.055 },
  cheeks: { at: [0.13, -0.04, 0.19], size: 0.05, color: "blush" },
  mouth: { at: [0, -0.06, 0.235], size: 0.04 },
  bob: 0.02,
  parts: [
    { p: "sphere", at: [0, 0.22, 0], s: [0.5, 0.44, 0.48] },
    { p: "sphere", at: [0, 0.18, 0.12], s: [0.34, 0.3, 0.28], c: "cream" },
    { p: "sphere", at: [0.12, 0.02, 0.12], s: [0.1, 0.04, 0.14], c: "pig", mirror: true, name: "feet" },
    { p: "sphere", at: [0.08, 0.22, 0.22], s: [0.07, 0.08, 0.06], hang: [0, -0.03, 0], c: "pig", mirror: true, name: "paw" },
    { p: "sphere", at: [0, 0, 0], s: [0.42, 0.36, 0.4], on: "head" },
    { p: "sphere", at: [0, -0.06, 0.12], s: [0.24, 0.16, 0.18], on: "head", c: "cream" },
    { p: "sphere", at: [0.14, -0.06, 0.07], s: [0.17, 0.16, 0.18], on: "head", c: "cream", mirror: true, name: "cheeks" },
    { p: "sphere", at: [0, -0.025, 0.215], s: [0.045, 0.035, 0.03], on: "head", c: "pig", m: "glossy" },
    { p: "sphere", at: [0.13, 0.17, -0.02], s: [0.11, 0.11, 0.05], on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.6 } },
    { p: "sphere", at: [0.13, 0.17, 0.0], s: [0.07, 0.07, 0.03], on: "head", c: "pig", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.6 } },
  ],
};

C.guinea_pig = {
  color: "basketball",
  sound: "Wheek wheek!",
  description:
    "A small round toy guinea pig, about 0.42 m tall and 0.6 m long at size 1: a plump loaf body with ginger-and-white patches, a white blaze down the face, tiny petal ears, shiny black eyes, a pink nose, tiny pink feet and no tail. Faces +z. Named parts: ears, feet. Squeaks 'wheek wheek' when happy: make it hop with a small bounce.",
  tags: ["pet", "home", "mammal", "small", "guinea_pig"],
  head: { at: [0, 0.24, 0.2] },
  eyes: { at: [0.1, 0.04, 0.15], size: 0.05 },
  cheeks: { at: [0.13, -0.04, 0.15], size: 0.045, color: "blush" },
  mouth: { at: [0, -0.07, 0.205], size: 0.04 },
  bob: 0.015,
  parts: [
    { p: "sphere", at: [0, 0.2, -0.07], s: [0.42, 0.38, 0.58] },
    { p: "sphere", at: [0, 0.24, -0.16], s: [0.4, 0.34, 0.36], c: "white" },
    { p: "sphere", at: [0.1, 0.27, -0.27], s: [0.22, 0.24, 0.2], c: "basketball", mirror: false },
    { p: "sphere", at: [0, 0.12, 0.0], s: [0.34, 0.2, 0.42], c: "white" },
    { p: "sphere", at: [0.12, 0.025, 0.1], s: [0.08, 0.04, 0.1], c: "pig", mirror: true, name: "feet" },
    { p: "sphere", at: [0.12, 0.025, -0.24], s: [0.08, 0.04, 0.1], c: "pig", mirror: true, name: "feet" },
    { p: "sphere", at: [0, 0, 0], s: [0.34, 0.3, 0.32], on: "head" },
    { p: "sphere", at: [0, 0.02, 0.1], s: [0.07, 0.24, 0.14], on: "head", c: "white" },
    { p: "sphere", at: [0, -0.05, 0.11], s: [0.2, 0.13, 0.14], on: "head", c: "white" },
    { p: "sphere", at: [0, -0.025, 0.18], s: [0.04, 0.03, 0.03], on: "head", c: "pig", m: "glossy" },
    { p: "sphere", at: [0.13, 0.12, -0.04], s: [0.09, 0.05, 0.07], r: [0, 0, -40], on: "head", c: "pig", mirror: true, name: "ears", idle: { r: [0, 0, 8], hz: 0.6 } },
  ],
};

// ---------------------------------------------------------------- write

const out = {
  description:
    "Toybox 10K farm animals, babies and small pets. GENERATED by tools/gen_tk_farm_pets.mjs (edit it and rerun, not this JSON): goat (+ goat_straw_hat, goat_neckerchief, goat_bell), the babies puppy, kitten, cousin_kitten, duckling, foal, calf (derived from dog, cat, duck, horse, cow), ox, yak, water_buffalo, mule (variant of horse), llama (+ grandma_llama), rat, hamster, guinea_pig.",
  critters: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, r3(v)])),
};
writeFileSync(join(cat, "models", "tk_farm_pets.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote", Object.keys(C).length, "critters");
