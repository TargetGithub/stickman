// Generates catalog/models/tk_birds.json: the Toybox 10K wave 2 birds (puffin, goose, parrot, bluebird, crow,
// peacock, ...). Edit this file and rerun it (node engine3d/tools/gen_tk_birds.mjs), not the JSON.
// Every bird faces +z, stands on y = 0, has a face rig (eyes, mouth, a lower beak that drops to talk), a named
// mirrored `wing` (so `point` and flaps work) and a named `tail`. Long-legged birds have `leg_left` / `leg_right`.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../catalog/models/tk_birds.json", import.meta.url));
const r3 = (v) => Math.round(v * 1000) / 1000;
const R = (a) => a.map(r3);

/** A point on a sphere of radius r (in the head's frame) at x, y, on the front (+z). */
const onBall = (r, x, y, k = 0.98) => R([x, y, Math.sqrt(Math.max(0, r * r - x * x - y * y)) * k]);
const S = (at, s, o = {}) => ({ p: "sphere", at: R(at), s: Array.isArray(s) ? R(s) : r3(s), ...o });
const H = (part) => ({ ...part, on: "head" });

/** Wings: one named mirrored `wing` (pivot at the shoulder, the mesh hangs below it), plus an optional tip. */
function wing({ at, s, r = [0, 0, -8], c, tip, hz = 0.8, amp = 10 }) {
  const idle = { r: [0, 0, amp], hz };
  const base = { p: "sphere", at: R(at), s: R(s), r, hang: R([0, -s[1] * 0.32, 0]), mirror: true, idle, name: "wing" };
  if (c) base.c = c;
  const out = [base];
  if (tip) out.push({ p: "sphere", at: R(at), s: R(tip.s), c: tip.c, r, hang: R([0, -s[1] * 0.62, tip.z ?? -0.02]), mirror: true, idle, name: "wing" });
  return out;
}

/** A tail pivoting at the rump; r[0] > 0 lifts its end, < 0 drops it. */
const tail = ({ at, s, r, c, hang, idle, m }) => ({ p: "sphere", at: R(at), s: R(s), r, hang: R(hang ?? [0, 0, -s[2] * 0.42]), ...(c ? { c } : {}), ...(m ? { m } : {}), ...(idle ? { idle } : {}), name: "tail" });

/** Little feet (mirrored flat ovals) and optional short legs. */
const feet = ({ x, z = 0.08, s = [0.09, 0.04, 0.13], c = "orange", leg }) => [
  ...(leg ? [{ p: "cylinder", at: R([x, leg / 2 + 0.02, z - 0.04]), s: R([0.03, leg, 0.03]), c, mirror: true }] : []),
  S([x, 0.02, z], s, { c, mirror: true }),
];

/** A beak cone pointing +z from a head of radius r, with the lower beak that drops to talk. */
function beak({ r, y = -0.02, len = 0.12, w = 0.09, c = "orange", hook = false, sx }) {
  const z = r * 0.86 + len * 0.42;
  const part = hook
    ? H({ p: "cone", at: R([0, y - 0.01, z]), s: R([sx ?? w, len, w]), r: [140, 0, 0], c })
    : H({ p: "cone", at: R([0, y, z]), s: R([sx ?? w, len, w]), r: [90, 0, 0], c });
  const jaw = { p: "sphere", at: R([0, y - w * 0.3, r * 0.86 + len * 0.18]), s: R([(sx ?? w) * 0.8, w * 0.35, len * 0.55]), c, drop: r3(Math.max(0.035, w * 0.5)) };
  const mouth = { at: R([0, y - w * 0.42, r * 0.86 + len * 0.08]), size: r3(Math.max(0.05, w * 0.6)) };
  return { part, jaw, mouth };
}

/** Face fields for a round head of radius r: eyes, cheeks, mouth and talk from the beak. */
function face({ r, ex = 0.42, ey = 0.18, size = 0.3, iris, b, cheek = "pink", cheekY = -0.32, eyeK = 0.97 }) {
  const eyes = { at: onBall(r, r * ex, r * ey, eyeK), size: r3(r * size) };
  if (iris) eyes.iris = iris;
  const cheeks = { at: onBall(r, r * ex * 1.55, r * cheekY, 0.92), size: r3(r * 0.32), color: cheek };
  return { eyes, cheeks, mouth: b.mouth, talk: { at: b.mouth.at, size: b.mouth.size, jaw: b.jaw } };
}

const birds = {};
const add = (name, m) => { birds[name] = m; };

// ---------------------------------------------------------------- bluebird (base for thrush and wren)
{
  const r = 0.2;
  const b = beak({ r, y: -0.03, len: 0.1, w: 0.075, c: "gold" });
  add("bluebird", {
    color: "blue", sound: "Tweet tweet!",
    description: "A small round toy bluebird, about 0.8 m tall at size 1: a soft blue back and head, a pale cream chest, a short gold beak (it drops a lower beak to talk), button eyes and blush. Named parts: wing (mirrored, flaps; turn one up with point, or [0, 0, -20] to tuck it), tail (lift it with [20, 0, 0]). Faces +z.",
    tags: ["bird", "garden", "forest", "songbird", "spring"],
    head: { at: [0, 0.6, 0.06] }, ...face({ r, b }), bob: 0.03,
    parts: [
      S([0, 0.33, 0], [0.56, 0.54, 0.6]),
      S([0, 0.3, 0.11], [0.42, 0.42, 0.42], { c: "cream" }),
      ...wing({ at: [0.25, 0.44, -0.04], s: [0.12, 0.36, 0.32], r: [0, 0, -10], hz: 0.8, amp: 8 }),
      tail({ at: [0, 0.3, -0.26], s: [0.18, 0.05, 0.26], r: [25, 0, 0], idle: { r: [8, 0, 0], hz: 0.5 } }),
      ...feet({ x: 0.1, z: 0.1, s: [0.08, 0.035, 0.12], leg: 0.08 }),
      H(S([0, 0, 0], 2 * r)),
      b.part,
    ],
  });
}
// thrush: a bigger brown bluebird with a speckled chest
{
  const k = 1.1, C = [0, 0.3 * k, 0.11 * k], Rr = 0.21 * k;
  const dots = [[-0.35, 0.25], [0.35, 0.25], [0, 0.1], [-0.5, -0.05], [0.5, -0.05], [-0.2, -0.2], [0.2, -0.2], [0, -0.4], [-0.15, 0.4], [0.15, 0.4]]
    .map(([u, v]) => { const x = u * Rr, y = v * Rr; return S([x, C[1] + y, C[2] + Math.sqrt(Rr * Rr - x * x - y * y) * 0.99], [0.04, 0.05, 0.02], { c: "wood_dark", m: "matte" }); });
  add("thrush", {
    like: "bluebird", scale: k, recolor: { blue: "brown" },
    description: "A song thrush: a small toy bird, about 0.9 m tall at size 1, with a warm brown back and head, a cream chest speckled with brown spots, a short gold beak (talks with a dropping lower beak) and bright eyes. Named parts: wing (mirrored), tail. Variant of bluebird.",
    tags: ["bird", "garden", "forest", "songbird"], sound: "Tweedle-ee!", add: dots,
  });
}
// wren: a tiny round light-brown bluebird with its tail cocked straight up
add("wren", {
  like: "bluebird", scale: 0.82, recolor: { blue: "horse_brown", cream: "horse_tan" }, drop: ["tail"],
  description: "A tiny round toy wren, about 0.65 m tall at size 1: chestnut brown with a tan chest, bright eyes, a short gold beak (talks with a dropping lower beak) and a little tail cocked straight up. Named parts: wing (mirrored), tail (cocked up; wiggle it about x). Variant of bluebird.",
  tags: ["bird", "garden", "forest", "songbird", "small"], sound: "Chit-chit!",
  add: [
    tail({ at: [0, 0.27, -0.2], s: [0.13, 0.04, 0.24], r: [72, 0, 0], c: "horse_brown", idle: { r: [6, 0, 0], hz: 0.7 } }),
    H(S([0.07, 0.075, 0.13], [0.1, 0.025, 0.04], { c: "horse_tan", mirror: true, r: [0, 25, -12], m: "matte" })),
  ],
});

// ---------------------------------------------------------------- baby_bird
{
  const r = 0.17;
  const b = beak({ r, y: -0.05, len: 0.09, w: 0.12, sx: 0.18, c: "yellow" });
  add("baby_bird", {
    color: "denim_light", sound: "Peep peep!",
    description: "A tiny fluffy gray-blue baby bird, about 0.5 m tall at size 1: a round fuzzy body, a pale sky-blue tummy, a little tuft on top and a wide yellow beak that opens wide for food when it talks. Named parts: wing (mirrored, little stubs), tail. Sits nicely in the catalog `nest` prop. Faces +z.",
    tags: ["bird", "baby", "nest", "garden", "spring"],
    head: { at: [0, 0.38, 0.04] }, ...face({ r, b, size: 0.36, ey: 0.22 }), bob: 0.035,
    parts: [
      S([0, 0.2, 0], [0.42, 0.38, 0.42], { m: "plush", fur: { length: 0.025 } }),
      S([0, 0.19, 0.09], [0.3, 0.28, 0.28], { c: "sky", m: "plush" }),
      ...wing({ at: [0.19, 0.27, -0.02], s: [0.08, 0.18, 0.18], r: [0, 0, -20], hz: 0.9, amp: 14 }),
      tail({ at: [0, 0.17, -0.19], s: [0.1, 0.035, 0.1], r: [20, 0, 0] }),
      ...feet({ x: 0.07, z: 0.08, s: [0.06, 0.03, 0.08], c: "orange" }),
      H(S([0, 0, 0], 2 * r, { m: "plush", fur: { length: 0.02 } })),
      H(S([0, r + 0.02, -0.01], [0.04, 0.09, 0.04], { r: [-20, 0, 0] })),
      H(S([0.03, r + 0.01, -0.02], [0.03, 0.07, 0.03], { r: [-15, 0, -25] })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- parrot (base for budgie)
{
  const r = 0.21;
  const b = beak({ r, y: -0.02, len: 0.16, w: 0.12, c: "cream", hook: true });
  add("parrot", {
    color: "green", sound: "Hello! Squawk!",
    description: "A bright toy parrot, about 1.05 m tall at size 1, standing upright: a green body, a red head with white eye patches, a curved cream beak (it drops a lower beak to talk), red-and-blue wing tips, a long blue-and-red tail and gray perching feet. Named parts: wing (mirrored), tail. Bob #head to copy words. Faces +z.",
    tags: ["bird", "jungle", "rainforest", "pet", "tropical"],
    head: { at: [0, 0.84, 0.05] }, ...face({ r, b, size: 0.3, ex: 0.45, ey: 0.15 }), bob: 0.025,
    parts: [
      S([0, 0.44, 0], [0.48, 0.68, 0.48]),
      S([0, 0.42, 0.1], [0.36, 0.5, 0.34], { c: "leaf" }),
      ...wing({ at: [0.23, 0.62, -0.04], s: [0.13, 0.52, 0.32], r: [0, 0, -6], tip: { s: [0.11, 0.2, 0.26], c: "blue" }, hz: 0.7, amp: 8 }),
      S([0.24, 0.6, 0.02], [0.08, 0.14, 0.14], { c: "red", mirror: true, r: [0, 0, -6] }),
      tail({ at: [0, 0.22, -0.16], s: [0.15, 0.06, 0.52], r: [-58, 0, 0], c: "blue", idle: { r: [0, 0, 5], hz: 0.5 } }),
      { ...tail({ at: [0, 0.22, -0.16], s: [0.1, 0.05, 0.36], r: [-58, 0, 0], c: "red", hang: [0, -0.03, -0.17], idle: { r: [0, 0, 5], hz: 0.5 } }) },
      ...feet({ x: 0.09, z: 0.08, s: [0.08, 0.05, 0.12], c: "grey", leg: 0.08 }),
      H(S([0, 0, 0], 2 * r, { c: "red" })),
      H(S([0.095, 0.03, 0.15], [0.14, 0.14, 0.06], { c: "white", mirror: true, m: "matte" })),
      b.part,
    ],
  });
}
add("budgie", {
  like: "parrot", scale: 0.72, recolor: { red: "yellow", blue: "teal" },
  description: "A small toy budgie, about 0.75 m tall at size 1: a green body, a sunny yellow head with blue cheek spots and little black throat dots, a short curved cream beak (talks with a dropping lower beak), teal wing tips and tail. Named parts: wing (mirrored), tail. Variant of parrot.",
  tags: ["bird", "pet", "home", "small"], sound: "Chirrup!",
  add: [
    H(S([0.1, -0.04, 0.105], [0.05, 0.05, 0.03], { c: "blue", mirror: true })),
    H(S([0.04, -0.1, 0.105], [0.025, 0.025, 0.02], { c: "ink", mirror: true })),
    H(S([0, -0.11, 0.1], [0.025, 0.025, 0.02], { c: "ink" })),
  ],
});

// ---------------------------------------------------------------- crow (base for pigeon)
{
  const r = 0.21;
  const b = beak({ r, y: -0.03, len: 0.13, w: 0.09, c: "gold" });
  add("crow", {
    color: "ink", sound: "Caw caw!",
    description: "A glossy black toy crow, about 1.05 m tall at size 1, with a friendly round face, big cartoon eyes, a little yellow beak (it drops a lower beak to talk), a red showman's bow tie and yellow feet. Named parts: wing (mirrored, flaps), tail, bow_tie (drop it in a variant). Rainbow feathers: give it a `recolor` such as { ink: \"purple\" }. Faces +z.",
    tags: ["bird", "farm", "town", "fable", "clever"],
    head: { at: [0, 0.82, 0.05] }, ...face({ r, b, size: 0.36, iris: "eye_brown", ex: 0.4, ey: 0.16 }), bob: 0.025,
    parts: [
      S([0, 0.44, 0], [0.54, 0.7, 0.56], { m: "glossy" }),
      S([0, 0.42, 0.12], [0.38, 0.5, 0.36], { c: "charcoal" }),
      ...wing({ at: [0.27, 0.62, -0.04], s: [0.13, 0.54, 0.36], r: [0, 0, -8], hz: 0.8, amp: 9 }),
      tail({ at: [0, 0.24, -0.24], s: [0.24, 0.06, 0.36], r: [-30, 0, 0], m: "glossy" }),
      ...feet({ x: 0.1, z: 0.1, s: [0.09, 0.04, 0.14], c: "gold", leg: 0.09 }),
      H(S([0, 0, 0], 2 * r, { m: "glossy" })),
      b.part,
      S([0.06, 0.66, 0.24], [0.11, 0.09, 0.05], { c: "red", mirror: true, r: [0, 0, 10], name: "bow_tie" }),
      S([0, 0.66, 0.26], [0.05, 0.05, 0.04], { c: "red", name: "bow_tie" }),
    ],
  });
}
add("pigeon", {
  like: "crow", scale: 0.88, recolor: { ink: "grey", charcoal: "lab_floor", gold: "charcoal" }, drop: ["bow_tie"],
  eyes: { iris: "orange" },
  description: "A small gray toy town pigeon, about 0.9 m tall at size 1: soft gray body, a shimmering teal-and-purple neck, bright orange eyes, a little dark beak with a white tip (talks with a dropping lower beak), dark wing bars, pink feet and rosy cheeks for blushing. Named parts: wing (mirrored), tail. Variant of crow.",
  tags: ["bird", "town", "city", "park"], sound: "Coo coo!",
  add: [
    S([0, 0.6, 0.12], [0.24, 0.1, 0.14], { c: "teal", m: "glossy" }),
    S([0, 0.56, 0.13], [0.26, 0.08, 0.14], { c: "purple", m: "glossy" }),
    S([0.235, 0.36, 0.0], [0.04, 0.05, 0.22], { c: "charcoal", mirror: true, r: [0, 0, -8] }),
  ],
});
birds.pigeon.add.push(...feet({ x: 0.088, z: 0.088, s: [0.08, 0.035, 0.12], c: "pig" }));

// ---------------------------------------------------------------- puffin
{
  const r = 0.2;
  const b = beak({ r, y: -0.03, len: 0.16, w: 0.17, sx: 0.12, c: "orange" });
  add("puffin", {
    color: "ink", sound: "Arr-arr!",
    description: "A small black-and-white toy puffin, about 0.85 m tall at size 1: a black back, wings and cap, a white face disc and chest, a tall flat orange beak with a gold stripe at its base (it drops a lower beak to talk) and bright orange feet. Named parts: wing (mirrored; clap them with a quick flap), tail. Faces +z.",
    tags: ["bird", "ocean", "sea", "coast", "arctic"],
    head: { at: [0, 0.66, 0.04] }, ...face({ r, b, size: 0.3, ex: 0.42, ey: 0.16, cheek: "rose" }), bob: 0.03,
    parts: [
      S([0, 0.36, 0], [0.5, 0.62, 0.5]),
      S([0, 0.34, 0.1], [0.4, 0.5, 0.36], { c: "white" }),
      ...wing({ at: [0.23, 0.5, -0.03], s: [0.11, 0.4, 0.28], r: [0, 0, -6], hz: 0.9, amp: 10 }),
      tail({ at: [0, 0.18, -0.22], s: [0.16, 0.05, 0.16], r: [-20, 0, 0] }),
      ...feet({ x: 0.1, z: 0.1, s: [0.12, 0.04, 0.16], c: "orange", leg: 0.06 }),
      H(S([0, 0, 0], 2 * r, { c: "white" })),
      H(S([0, 0.06, -0.04], [0.41, 0.3, 0.4])),
      b.part,
      H({ p: "cylinder", at: [0, -0.03, r * 0.86 + 0.01], s: [0.13, 0.03, 0.18], r: [90, 0, 0], c: "gold" }),
    ],
  });
}

// ---------------------------------------------------------------- goose (base for fairy_godmother)
{
  const r = 0.18;
  const b = beak({ r, y: -0.02, len: 0.14, w: 0.1, c: "orange" });
  add("goose", {
    color: "white", sound: "Honk honk!",
    description: "A white farmyard toy goose, about 1.25 m tall at size 1: a plump body, a long curved neck, a small round head with kind eyes, an orange beak with a little knob (it drops a lower beak to talk), wide white wings and big orange feet. Named parts: wing (mirrored), tail. Faces +z.",
    tags: ["farm", "bird", "pond", "rhymes", "stories"],
    head: { at: [0, 1.1, 0.3] }, ...face({ r, b, size: 0.36, ex: 0.42, ey: 0.15 }), bob: 0.02,
    parts: [
      S([0, 0.46, -0.06], [0.62, 0.56, 0.88]),
      S([0, 0.38, 0.06], [0.5, 0.44, 0.6], { c: "cream" }),
      { p: "capsule", at: [0, 0.8, 0.2], s: [0.25, 0.52, 0.25], r: [16, 0, 0] },
      ...wing({ at: [0.29, 0.62, -0.05], s: [0.12, 0.42, 0.6], r: [0, 0, -6], hz: 0.7, amp: 8 }),
      tail({ at: [0, 0.52, -0.46], s: [0.2, 0.08, 0.2], r: [35, 0, 0], idle: { r: [0, 0, 8], hz: 0.6 } }),
      ...feet({ x: 0.13, z: 0.1, s: [0.14, 0.04, 0.2], c: "orange", leg: 0.12 }),
      H(S([0, 0, 0], 2 * r)),
      b.part,
      H(S([0, 0.03, r * 0.92], [0.06, 0.06, 0.05], { c: "orange" })),
    ],
  });
}
{
  // A poncho-like shawl (a wide cone around the neck) with gold stars on its surface, and round glasses.
  const BASE = 0.5, TOP = 0.96, RX = 0.43, RZ = 0.56, CZ = -0.04;
  const stars = [[35, 0.3], [-35, 0.3], [80, 0.25], [-80, 0.25], [130, 0.3], [-130, 0.3], [180, 0.3], [0, 0.55], [60, 0.55], [-60, 0.55], [115, 0.55], [-115, 0.55]].map(([lon, h]) => {
    const u = lon * Math.PI / 180, k = (1 - h) * 1.03;
    const at = R([Math.sin(u) * RX * k, BASE + h * (TOP - BASE), CZ + Math.cos(u) * RZ * k]);
    return { p: "star", at, s: [0.075, 0.075, 0.03], r: [-40, lon, 0], c: "gold", m: "glow", name: "shawl" };
  });
  add("fairy_godmother", {
    like: "goose",
    description: "A kind fairy godmother played by an old white goose (the goose model) in a purple starry shawl with a gold trim and round gold glasses, about 1.25 m tall at size 1. Named parts: wing (mirrored, as goose), tail, shawl, glasses. Her sparkling wand is the `magic_wand` prop parented by the script: parent: \"<id>\", part: \"wing\", at about [0.06, -0.3, 0.12], rotation [-60, 0, 0], size 0.6.",
    tags: ["stories", "fairy_tale", "magic", "bird", "cinderella"], sound: "Bibbidi-boo!",
    add: [
      { p: "cone", at: [0, (BASE + TOP) / 2, CZ], s: R([2 * RX, TOP - BASE, 2 * RZ]), c: "purple", m: "plush", name: "shawl" },
      ...stars,
      { p: "torus", at: [0.076, 0.027, 0.17], s: [0.1, 0.1, 0.08], c: "gold", m: "metal", on: "head", name: "glasses" },
      { p: "torus", at: [-0.076, 0.027, 0.17], s: [0.1, 0.1, 0.08], c: "gold", m: "metal", on: "head", name: "glasses" },
    ],
  });
}

// ---------------------------------------------------------------- gosling
{
  const r = 0.15;
  const b = beak({ r, y: -0.03, len: 0.08, w: 0.07, c: "orange" });
  add("gosling", {
    color: "yellow", sound: "Peep peep!",
    description: "A fluffy toy gosling (a baby goose), about 0.6 m tall at size 1: a soft yellow body with a gray-olive back and crown, a short neck, big dark eyes, a tiny orange beak (talks with a dropping lower beak) and big soft orange feet. Named parts: wing (mirrored, little stubs), tail. Faces +z.",
    tags: ["farm", "bird", "baby", "pond", "spring"],
    head: { at: [0, 0.48, 0.13] }, ...face({ r, b, size: 0.42, ex: 0.42, ey: 0.14 }), bob: 0.035,
    parts: [
      S([0, 0.24, -0.03], [0.42, 0.38, 0.52], { m: "plush", fur: { length: 0.02 } }),
      S([0, 0.33, -0.08], [0.34, 0.2, 0.42], { c: "grey", m: "plush" }),
      { p: "capsule", at: [0, 0.36, 0.09], s: [0.17, 0.22, 0.17], r: [15, 0, 0], m: "plush" },
      ...wing({ at: [0.21, 0.32, -0.02], s: [0.08, 0.2, 0.26], r: [0, 0, -18], c: "grey", hz: 0.9, amp: 12 }),
      tail({ at: [0, 0.27, -0.28], s: [0.1, 0.05, 0.1], r: [30, 0, 0], c: "grey" }),
      ...feet({ x: 0.08, z: 0.08, s: [0.1, 0.035, 0.14], c: "orange", leg: 0.05 }),
      H(S([0, 0, 0], 2 * r, { m: "plush", fur: { length: 0.015 } })),
      H(S([0, 0.08, -0.03], [0.26, 0.15, 0.26], { c: "grey", m: "plush" })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- mommy_duck
{
  const r = 0.26;
  const b = beak({ r, y: -0.06, len: 0.14, w: 0.11, sx: 0.24, c: "orange" });
  b.part.p = "sphere"; b.part.s = [0.28, 0.1, 0.26]; b.part.r = [0, 0, 0]; b.part.at = R([0, -0.06, 0.29]);
  add("mommy_duck", {
    color: "brown", sound: "Quack quack!",
    description: "Mommy Duck: a grown-up toy duck, about 1.2 m tall at size 1, the same round shape as the yellow duck: a soft brown body with a cream chest, a soft green stripe around her neck, a blue wing patch, an orange bill (it drops a lower bill to talk) and orange feet. Named parts: wing (mirrored), tail. Leads ducklings (the `duck` or `chick` at size 0.5). Faces +z.",
    tags: ["farm", "bird", "pond", "family", "mommy"],
    head: { at: [0, 0.92, 0.14] }, eyes: { at: [0.12, 0.06, 0.24], size: 0.08 }, cheeks: { at: [0.2, -0.04, 0.2], size: 0.09, color: "pink" },
    mouth: { at: [0, -0.115, 0.36], size: 0.1 }, talk: { at: [0, -0.115, 0.36], size: 0.15, jaw: { p: "sphere", at: [0, -0.1, 0.3], s: [0.24, 0.06, 0.22], c: "orange", drop: 0.07 } }, bob: 0.025,
    parts: [
      S([0, 0.42, 0], [0.78, 0.68, 0.86]),
      S([0, 0.38, 0.14], [0.56, 0.5, 0.58], { c: "sand" }),
      ...wing({ at: [0.37, 0.58, -0.04], s: [0.14, 0.38, 0.5], r: [0, 0, -10], tip: { s: [0.1, 0.1, 0.24], c: "teal", z: 0.0 }, hz: 0.8, amp: 9 }),
      tail({ at: [0, 0.52, -0.4], s: [0.16, 0.1, 0.26], r: [40, 0, 0], idle: { r: [0, 0, 10], hz: 0.7 } }),
      ...feet({ x: 0.16, z: 0.18, s: [0.2, 0.06, 0.3] }),
      S([0, 0.72, 0.1], [0.5, 0.09, 0.46], { c: "leaf" }),
      H(S([0, 0, 0], 2 * r)),
      H(S([0.1, 0.05, 0.12], [0.16, 0.04, 0.2], { c: "wood_dark", mirror: true, r: [0, 25, -8], m: "matte" })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- cockerel
{
  const r = 0.19;
  const b = beak({ r, y: -0.02, len: 0.12, w: 0.09, c: "gold" });
  const tailFeather = (rx, rz, len, c, z = 0) => ({ p: "sphere", at: [0, 0.7, -0.36], s: R([0.08, len, 0.16]), r: [rx, 0, rz], hang: R([0, len * 0.42, z]), c, idle: { r: [0, 0, 5], hz: 0.5 }, name: "tail" });
  add("cockerel", {
    color: "cap_red", sound: "Cock-a-doodle-doo!",
    description: "A proud toy cockerel (a rooster), about 1.35 m tall at size 1: a red body, a gold head and neck ruff, a tall red comb and wattle, a gold beak (it drops a lower beak to talk), brown-and-gold wings, a high curling tail of dark green and black feathers and yellow legs. Named parts: wing (mirrored), tail, comb. Faces +z.",
    tags: ["farm", "bird", "morning", "rhymes"],
    head: { at: [0, 0.98, 0.18] }, ...face({ r, b, size: 0.32, ex: 0.42, ey: 0.15 }), bob: 0.025,
    parts: [
      S([0, 0.56, -0.04], [0.58, 0.56, 0.78]),
      S([0, 0.76, 0.1], [0.4, 0.44, 0.36], { c: "gold" }),
      ...wing({ at: [0.28, 0.66, -0.06], s: [0.12, 0.36, 0.5], r: [0, 0, -8], c: "horse_brown", tip: { s: [0.1, 0.12, 0.3], c: "gold" }, hz: 0.8, amp: 10 }),
      tailFeather(-20, 0, 0.62, "ink"),
      tailFeather(-40, 0, 0.56, "leaf", -0.02),
      tailFeather(-5, 14, 0.5, "chalkboard"),
      tailFeather(-5, -14, 0.5, "chalkboard"),
      tailFeather(-62, 0, 0.42, "ink", -0.04),
      { p: "cylinder", at: [0.11, 0.17, 0.0], s: [0.05, 0.3, 0.05], c: "yellow", mirror: true },
      S([0.11, 0.025, 0.07], [0.12, 0.05, 0.2], { c: "yellow", mirror: true }),
      H(S([0, 0, 0], 2 * r, { c: "gold" })),
      H(S([0, -0.15, 0.17], [0.08, 0.14, 0.07], { c: "red" })),
      H(S([0, 0.22, 0.1], [0.08, 0.16, 0.11], { c: "red", name: "comb" })),
      H(S([0, 0.26, 0.0], [0.085, 0.19, 0.12], { c: "red", name: "comb" })),
      H(S([0, 0.24, -0.1], [0.08, 0.16, 0.11], { c: "red", name: "comb" })),
      H(S([0, 0.19, -0.18], [0.07, 0.11, 0.09], { c: "red", name: "comb" })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- peacock
{
  const r = 0.14;
  const b = beak({ r, y: -0.02, len: 0.09, w: 0.065, c: "sand" });
  // The fan: `tail` is its root at the rump (one part; turn it about x to raise or lower the whole fan); the
  // middle feathers ride on it unnamed; the outer pairs are `fan` (mirrored, on tail) and swing in to fold.
  const feather = (ang, len, name) => {
    const o = { at: [0, 0, 0], r: [0, 0, -ang], on: "tail", ...(ang ? { mirror: true } : {}), ...(name ? { name } : {}) };
    return [
      { p: "sphere", ...o, s: R([0.2, len, 0.04]), hang: R([0, len * 0.5, 0]), c: "leaf" },
      { p: "sphere", ...o, s: [0.13, 0.15, 0.03], hang: R([0, len * 0.82, 0.02]), c: "gold", m: "glossy" },
      { p: "sphere", ...o, s: [0.09, 0.1, 0.03], hang: R([0, len * 0.82, 0.035]), c: "teal", m: "glossy" },
      { p: "sphere", ...o, s: [0.05, 0.06, 0.03], hang: R([0, len * 0.82, 0.05]), c: "midnight", m: "glossy" },
    ];
  };
  add("peacock", {
    color: "blue", sound: "May-awe!",
    description: "A proud toy peacock, about 1.25 m tall at size 1 with the fan folded and 1.75 m with it open: a shimmering blue body and neck, a little crest, a white eye stripe, brown-barred wings and long gray legs, and a huge green fan tail with gold-and-teal eye spots. Named parts: wing (mirrored), tail (the whole fan, pivot at the rump), fan (the outer feathers). The fan rests OPEN and upright. To fold it: turn `#fan` to [0, 0, 50] (the outer feathers swing in behind the middle ones) and `#tail` to [-62, 0, 0] (it lowers back into a train); turn both back to [0, 0, 0] to open it. Faces +z.",
    tags: ["bird", "zoo", "garden", "colors", "proud"],
    head: { at: [0, 1.06, 0.2] }, ...face({ r, b, size: 0.34, ex: 0.44, ey: 0.14 }), bob: 0.015,
    parts: [
      S([0, 0.62, -0.04], [0.42, 0.5, 0.56], { m: "glossy" }),
      { p: "capsule", at: [0, 0.86, 0.12], s: [0.15, 0.4, 0.15], r: [18, 0, 0], m: "glossy" },
      ...wing({ at: [0.2, 0.74, -0.06], s: [0.09, 0.32, 0.42], r: [0, 0, -6], c: "sand", tip: { s: [0.07, 0.12, 0.3], c: "horse_brown" }, hz: 0.7, amp: 8 }),
      { p: "sphere", at: [0, 0.6, -0.3], s: [0.3, 0.26, 0.12], r: [-14, 0, 0], c: "leaf", name: "tail" },
      ...feather(0, 1.0),
      ...feather(16, 0.98),
      ...feather(32, 0.92, "fan"),
      ...feather(48, 0.84, "fan"),
      ...feather(64, 0.74, "fan"),
      { p: "cylinder", at: [0.08, 0.2, 0.0], s: [0.04, 0.4, 0.04], c: "grey", mirror: true },
      S([0.08, 0.02, 0.06], [0.08, 0.04, 0.16], { c: "grey", mirror: true }),
      H(S([0, 0, 0], 2 * r, { m: "glossy" })),
      H(S([0.1, 0.03, 0.06], [0.04, 0.03, 0.12], { c: "white", mirror: true, r: [0, 30, 0] })),
      H({ p: "cylinder", at: [0, 0.18, 0], s: [0.015, 0.12, 0.015], c: "blue", r: [-10, 0, 0] }),
      H({ p: "cylinder", at: [0.03, 0.17, -0.01], s: [0.015, 0.11, 0.015], c: "blue", r: [-10, 0, -15], mirror: true }),
      H(S([0, 0.25, -0.01], 0.04, { c: "teal" })),
      H(S([0.045, 0.235, -0.02], 0.035, { c: "teal", mirror: true })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- woodpecker
{
  const r = 0.18;
  const b = beak({ r, y: -0.02, len: 0.17, w: 0.085, c: "grey" });
  add("woodpecker", {
    color: "ink", sound: "Tap-tap-tap!",
    description: "A small toy woodpecker, about 0.85 m tall at size 1, standing upright: a black back and wings with white spots, a white face and chest, a bright red cap on the back of its head, a straight gray beak (it drops a lower beak to talk) and a stiff black tail it props itself on. Tap a tree by turning `#head` [20, 0, 0] and back quickly. Named parts: wing (mirrored), tail. Faces +z.",
    tags: ["bird", "forest", "woods", "tree", "garden"],
    head: { at: [0, 0.7, 0.05] }, ...face({ r, b, size: 0.32, ex: 0.42, ey: 0.15 }), bob: 0.02,
    parts: [
      S([0, 0.38, -0.02], [0.44, 0.62, 0.44]),
      S([0, 0.37, 0.08], [0.34, 0.48, 0.32], { c: "white" }),
      ...wing({ at: [0.21, 0.52, -0.04], s: [0.1, 0.42, 0.28], r: [0, 0, -6], hz: 0.8, amp: 8 }),
      S([0.255, 0.42, -0.02], [0.03, 0.05, 0.05], { c: "white", mirror: true }),
      S([0.25, 0.33, -0.06], [0.03, 0.05, 0.05], { c: "white", mirror: true }),
      S([0.245, 0.45, -0.12], [0.03, 0.05, 0.05], { c: "white", mirror: true }),
      tail({ at: [0, 0.2, -0.2], s: [0.14, 0.05, 0.3], r: [-62, 0, 0] }),
      ...feet({ x: 0.08, z: 0.08, s: [0.07, 0.04, 0.11], c: "charcoal", leg: 0.08 }),
      H(S([0, 0, 0], 2 * r, { c: "white" })),
      H(S([0, 0.07, -0.04], [0.33, 0.28, 0.32], { c: "ink" })),
      H(S([0, 0.12, -0.02], [0.27, 0.16, 0.28], { c: "red" })),
      H(S([0.12, -0.07, 0.07], [0.12, 0.03, 0.12], { c: "ink", mirror: true, r: [0, 30, -10] })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- hummingbird
{
  const r = 0.13;
  const b = beak({ r, y: -0.01, len: 0.32, w: 0.03, c: "charcoal" });
  b.part.p = "cylinder"; b.part.r = [100, 0, 0];
  add("hummingbird", {
    color: "green", sound: "Hmmmm!",
    description: "A tiny ruby-throated toy hummingbird, about 0.6 m tall at size 1: a shimmering green back and head, a white chest, a red throat patch, a long thin beak (it drops a thin lower beak to talk) and long narrow wings held up. The wings idle gently (under 1 Hz): to hover, lift it with `at` and flap `#wing` slowly ([0, 0, ±30] about 1-2 times a second), never a fast flicker. Named parts: wing (mirrored), tail. Faces +z.",
    tags: ["bird", "garden", "flowers", "pollinator", "small"],
    head: { at: [0, 0.5, 0.06] }, ...face({ r, b, size: 0.36, ex: 0.42, ey: 0.15 }), bob: 0.03,
    parts: [
      S([0, 0.3, -0.04], [0.28, 0.42, 0.3], { r: [-20, 0, 0], m: "glossy" }),
      S([0, 0.27, 0.04], [0.2, 0.3, 0.2], { c: "white" }),
      S([0, 0.4, 0.08], [0.16, 0.08, 0.1], { c: "red", m: "glossy" }),
      ...wing({ at: [0.1, 0.38, -0.06], s: [0.06, 0.4, 0.12], r: [10, 0, 140], c: "teal", hz: 0.9, amp: 14 }),
      tail({ at: [0, 0.14, -0.12], s: [0.12, 0.03, 0.18], r: [-50, 0, 0], c: "ink" }),
      ...feet({ x: 0.04, z: 0.02, s: [0.04, 0.03, 0.06], c: "charcoal", leg: 0.06 }),
      H(S([0, 0, 0], 2 * r, { m: "glossy" })),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- toucan
{
  const r = 0.19;
  const b = beak({ r, y: -0.02, len: 0.4, w: 0.16, sx: 0.12, c: "orange" });
  b.part = H(S([0, -0.05, r * 0.8 + 0.17], [0.13, 0.17, 0.44], { c: "orange", r: [22, 0, 0] }));
  b.jaw = { p: "sphere", at: [0, -0.1, r * 0.8 + 0.12], s: [0.1, 0.05, 0.34], c: "yellow", drop: 0.05 };
  b.mouth = { at: [0, -0.1, r * 0.9], size: 0.06 };
  add("toucan", {
    color: "ink", sound: "Croak-croak!",
    description: "A black toy toucan, about 1.0 m tall at size 1: a black body, a white throat and chest, a blue patch around each kind eye, a huge light orange beak with a yellow top ridge and a dark tip (it drops a yellow lower beak to talk), a red patch under the tail and blue feet. Named parts: wing (mirrored), tail. Faces +z.",
    tags: ["bird", "jungle", "rainforest", "tropical", "zoo"],
    head: { at: [0, 0.8, 0.04] }, ...face({ r, b, size: 0.3, ex: 0.58, ey: 0.3 }), bob: 0.025,
    parts: [
      S([0, 0.44, -0.02], [0.48, 0.66, 0.46]),
      S([0, 0.52, 0.11], [0.34, 0.3, 0.26], { c: "white" }),
      ...wing({ at: [0.23, 0.6, -0.05], s: [0.12, 0.48, 0.32], r: [0, 0, -6], hz: 0.8, amp: 8 }),
      S([0, 0.2, -0.12], [0.2, 0.1, 0.16], { c: "red" }),
      tail({ at: [0, 0.24, -0.2], s: [0.18, 0.06, 0.36], r: [-50, 0, 0] }),
      ...feet({ x: 0.09, z: 0.08, s: [0.08, 0.04, 0.12], c: "blue", leg: 0.08 }),
      H(S([0, 0, 0], 2 * r)),
      H(S([0, -0.05, 0.08], [0.3, 0.22, 0.24], { c: "white" })),
      H(S([0.11, 0.057, 0.115], [0.1, 0.09, 0.05], { c: "teal", mirror: true })),
      b.part,
      H(S([0, 0.02, r * 0.8 + 0.17], [0.08, 0.05, 0.4], { c: "yellow", r: [22, 0, 0] })),
      H(S([0, -0.13, r * 0.8 + 0.36], [0.07, 0.08, 0.07], { c: "ink" })),
    ],
  });
}

// ---------------------------------------------------------------- swallow (base for swift)
{
  const r = 0.16;
  const b = beak({ r, y: -0.03, len: 0.07, w: 0.06, c: "ink" });
  const streamer = (side) => ({ p: "sphere", at: [0, 0.3, -0.22], s: [0.06, 0.04, 0.5], r: [10, side * 18, 0], hang: [0, 0, -0.22], c: "night", m: "glossy", name: "tail" });
  add("swallow", {
    color: "night", sound: "Twitter-twee!",
    description: "A small toy swallow, about 0.7 m tall at size 1: a dark blue back, head and long pointed wings, a cream chest, a little black beak (it drops a lower beak to talk) and a long forked tail. Named parts: wing (mirrored, long and swept back), tail (both streamers). A tiny splint for a hurt wing can be added in a variant (a white `sphere` named splint on the wing). Faces +z.",
    tags: ["bird", "sky", "farm", "spring", "migration"],
    head: { at: [0, 0.54, 0.06] }, ...face({ r, b, size: 0.32, ex: 0.42, ey: 0.15 }), bob: 0.03,
    parts: [
      S([0, 0.33, -0.02], [0.38, 0.4, 0.5]),
      S([0, 0.29, 0.08], [0.3, 0.3, 0.34], { c: "cream" }),
      ...wing({ at: [0.17, 0.42, -0.02], s: [0.07, 0.56, 0.2], r: [55, 0, -10], hz: 0.8, amp: 8 }),
      streamer(1), streamer(-1),
      ...feet({ x: 0.06, z: 0.06, s: [0.05, 0.03, 0.08], c: "charcoal", leg: 0.1 }),
      H(S([0, 0, 0], 2 * r)),
      b.part,
    ],
  });
}
add("swift", {
  like: "swallow", scale: 1, recolor: { night: "charcoal", cream: "charcoal" }, drop: ["wing", "tail"],
  description: "A dark toy swift, about 0.7 m tall at size 1: sooty dark gray all over, a tiny black beak (talks with a dropping lower beak), long sickle-shaped crescent wings held out to the sides as it glides and a short forked tail. Named parts: wing (mirrored), tail. Variant of swallow; it races over rooftops (move it with `at`) and rarely lands.",
  tags: ["bird", "sky", "town", "summer", "fast"], sound: "Screee!",
  add: [
    { p: "sphere", at: [0.17, 0.42, -0.04], s: [0.06, 0.42, 0.16], r: [35, 0, 62], hang: [0, -0.18, 0], mirror: true, idle: { r: [0, 0, 8], hz: 0.8 }, name: "wing" },
    { p: "sphere", at: [0.17, 0.42, -0.04], s: [0.05, 0.32, 0.12], r: [35, 0, 62], hang: [-0.05, -0.43, -0.02], hr: [0, 0, -22], mirror: true, idle: { r: [0, 0, 8], hz: 0.8 }, name: "wing" },
    { p: "sphere", at: [0, 0.3, -0.22], s: [0.06, 0.04, 0.2], r: [10, 22, 0], hang: [0, 0, -0.09], c: "charcoal", name: "tail" },
    { p: "sphere", at: [0, 0.3, -0.22], s: [0.06, 0.04, 0.2], r: [10, -22, 0], hang: [0, 0, -0.09], c: "charcoal", name: "tail" },
  ],
});

// ---------------------------------------------------------------- eagle and red_kite (variants of batch3 hawk)
add("eagle", {
  like: "hawk", scale: 1.22, recolor: { brown: "horse_mane", cream: "horse_mane", gold: "yellow", sand: "hoof" }, drop: ["tail"],
  description: "A big gentle toy bald eagle, about 1.35 m tall at size 1: a dark brown body and wide brown wings, a white head and a white fan tail, a yellow hooked beak and yellow feet, big kind eyes. Named parts: wing (mirrored; spread them with [0, 0, 70]), tail. Variant of hawk (bigger, darker, white tail).",
  tags: ["bird", "sky", "mountains", "america", "predator"], sound: "Kleek-kik-ik!",
  mouth: { at: [0, -0.1, 0.27], size: 0.08 }, talk: { jaw: { p: "sphere", at: [0, -0.09, 0.26], s: [0.12, 0.05, 0.12], c: "yellow", drop: 0.05 } },
  add: [{ p: "sphere", at: [0, 0.2, -0.32], s: [0.46, 0.08, 0.48], r: [-25, 0, 0], hang: [0, 0, -0.12], c: "white", name: "tail" }],
});
add("red_kite", {
  like: "hawk", scale: 1.08, recolor: { brown: "horse_brown", white: "grey", cream: "horse_tan", sand: "ink" }, drop: ["tail", "wing"],
  description: "A large toy red kite, about 1.15 m tall at size 1: a russet-brown body, a pale gray head, long angled wings with dark tips, a deeply forked russet tail (it twists to steer: turn `#tail` [0, 0, ±15]), a gold hooked beak and yellow feet. Named parts: wing (mirrored), tail. Variant of hawk.",
  tags: ["bird", "sky", "countryside", "predator"], sound: "Weee-oo!",
  mouth: { at: [0, -0.09, 0.24], size: 0.07 }, talk: { jaw: { p: "sphere", at: [0, -0.08, 0.23], s: [0.11, 0.045, 0.11], c: "gold", drop: 0.045 } },
  add: [
    { p: "sphere", at: [0.32, 0.66, -0.04], s: [0.15, 0.78, 0.36], r: [0, 0, -8], hang: [0, -0.26, 0], c: "horse_brown", mirror: true, idle: { r: [0, 0, 10], hz: 0.8 }, name: "wing" },
    { p: "sphere", at: [0.32, 0.66, -0.04], s: [0.12, 0.24, 0.3], r: [0, 0, -8], hang: [0, -0.58, 0], c: "ink", mirror: true, idle: { r: [0, 0, 10], hz: 0.8 }, name: "wing" },
    { p: "sphere", at: [0, 0.2, -0.28], s: [0.12, 0.06, 0.5], r: [-25, 20, 0], hang: [0, 0, -0.2], c: "horse_brown", name: "tail" },
    { p: "sphere", at: [0, 0.2, -0.28], s: [0.12, 0.06, 0.5], r: [-25, -20, 0], hang: [0, 0, -0.2], c: "horse_brown", name: "tail" },
  ],
});

// ---------------------------------------------------------------- heron
{
  const r = 0.15;
  const b = beak({ r, y: -0.03, len: 0.3, w: 0.07, c: "gold" });
  const leg = (side, name) => [
    { p: "cylinder", at: [side * 0.1, 0.8, 0], s: [0.055, 0.8, 0.055], hang: [0, -0.4, 0], c: "gold", name },
    { p: "sphere", at: [side * 0.1, 0.8, 0], s: [0.1, 0.035, 0.2], hang: [0, -0.782, 0.05], c: "gold", name },
  ];
  add("heron", {
    color: "grey", sound: "Kraak!",
    description: "A tall calm toy gray heron, about 1.7 m tall at size 1: a long gray body with darker wing tips, a white chest plume, a long white curved neck, a white head with a black crest plume, small round glasses, a long gold beak (it drops a lower beak to talk) and long thin gold legs. Named parts: wing (mirrored), tail, glasses, leg_left, leg_right (each turns about the hip: [±20, 0, 0] to wade). Faces +z.",
    tags: ["bird", "pond", "river", "wetland", "wise"],
    head: { at: [0, 1.56, 0.26] }, ...face({ r, b, size: 0.3, ex: 0.42, ey: 0.15 }), bob: 0.012,
    parts: [
      S([0, 1.02, -0.06], [0.5, 0.56, 0.82]),
      S([0, 1.0, 0.18], [0.3, 0.42, 0.26], { c: "white", m: "matte" }),
      { p: "capsule", at: [0, 1.22, 0.14], s: [0.17, 0.36, 0.17], r: [28, 0, 0], c: "white" },
      { p: "capsule", at: [0, 1.42, 0.22], s: [0.15, 0.3, 0.15], r: [-8, 0, 0], c: "white" },
      ...wing({ at: [0.22, 1.2, -0.06], s: [0.11, 0.48, 0.7], r: [0, 0, -4], tip: { s: [0.09, 0.2, 0.5], c: "charcoal", z: -0.08 }, hz: 0.6, amp: 6 }),
      tail({ at: [0, 0.94, -0.44], s: [0.2, 0.05, 0.22], r: [-25, 0, 0], c: "charcoal" }),
      ...leg(1, "leg_left"), ...leg(-1, "leg_right"),
      H(S([0, 0, 0], 2 * r, { c: "white" })),
      H(S([0, 0.07, -0.1], [0.045, 0.045, 0.34], { c: "ink", r: [20, 0, 0] })),
      H({ p: "torus", at: [0.06, 0.025, 0.15], s: [0.08, 0.08, 0.07], c: "ink", m: "glossy", name: "glasses" }),
      H({ p: "torus", at: [-0.06, 0.025, 0.15], s: [0.08, 0.08, 0.07], c: "ink", m: "glossy", name: "glasses" }),
      b.part,
    ],
  });
}

// ---------------------------------------------------------------- ostrich (base for emu)
{
  const r = 0.17;
  const b = beak({ r, y: -0.05, len: 0.13, w: 0.075, sx: 0.13, c: "sand" });
  const leg = (side, name) => [
    { p: "capsule", at: [side * 0.15, 0.95, 0.0], s: [0.17, 0.36, 0.17], hang: [0, -0.16, 0], c: "pig", name },
    { p: "cylinder", at: [side * 0.15, 0.95, 0.0], s: [0.07, 0.62, 0.07], hang: [0, -0.62, 0.02], c: "pig", name },
    { p: "sphere", at: [side * 0.15, 0.95, 0.0], s: [0.14, 0.06, 0.24], hang: [0, -0.925, 0.07], c: "pig", name },
  ];
  add("ostrich", {
    color: "ink", sound: "Boom-boom!",
    description: "A tall friendly toy ostrich, about 2.0 m tall at size 1 (it stands well above the bear): a big fluffy black body with white wing and tail plumes, a long bare pink neck, a small round head with big curious eyes, a wide flat beak (it drops a lower beak to talk) and long bare pink legs. Named parts: wing (mirrored), tail, leg_left, leg_right (each leg turns about the hip: [±25, 0, 0] to stride). Faces +z.",
    tags: ["bird", "savanna", "africa", "zoo", "tall"],
    head: { at: [0, 1.86, 0.36] }, ...face({ r, b, size: 0.38, ex: 0.44, ey: 0.15, iris: "eye_brown" }), bob: 0.012,
    parts: [
      S([0, 1.12, -0.06], [0.74, 0.58, 0.92], { m: "plush", fur: { length: 0.035 } }),
      { p: "capsule", at: [0, 1.48, 0.26], s: [0.16, 0.78, 0.16], r: [10, 0, 0], c: "pig" },
      ...wing({ at: [0.34, 1.26, -0.04], s: [0.16, 0.44, 0.66], r: [0, 0, -14], c: "white", hz: 0.6, amp: 8 }),
      tail({ at: [0, 1.22, -0.48], s: [0.32, 0.22, 0.3], r: [35, 0, 0], c: "white", idle: { r: [0, 0, 6], hz: 0.5 } }),
      ...leg(1, "leg_left"), ...leg(-1, "leg_right"),
      H(S([0, 0, 0], 2 * r, { c: "pig" })),
      H(S([0, 0.11, -0.03], [0.16, 0.08, 0.16], { c: "grey", m: "plush" })),
      b.part,
    ],
  });
}
{
  add("emu", {
    like: "ostrich", scale: 0.92, recolor: { ink: "horse_mane", white: "brown", pig: "grey" },
    description: "A tall friendly toy emu, about 1.85 m tall at size 1: a shaggy brown body, a gray-blue neck and face, curious brown eyes, a wide flat beak (talks with a dropping lower beak) and long gray legs. Named parts: wing (mirrored, small), tail, leg_left, leg_right (stride with [±25, 0, 0]). Variant of ostrich (all brown with a gray neck, a little shorter).",
    tags: ["bird", "australia", "outback", "zoo", "tall"], sound: "Thrum-thrum!",
  });
}

writeFileSync(OUT, JSON.stringify({
  description: "Toybox 10K wave 2 birds: bluebird, thrush, wren, baby_bird, parrot, budgie, crow, pigeon, puffin, goose, fairy_godmother, gosling, mommy_duck, cockerel, peacock (fan opens and closes), woodpecker, hummingbird, toucan, swallow, swift, eagle and red_kite (variants of hawk), heron, ostrich and emu. Every bird has a named mirrored wing and a tail. **Generated** by tools/gen_tk_birds.mjs: edit the generator and rerun it, not the JSON.",
  critters: birds,
}, null, 1) + "\n");
console.log(OUT, Object.keys(birds).length);
