// Generates catalog/models/tk_wild.json: Toybox 10K wild animals (crab, hedgehog, otter, elephant, snail, giraffe,
// seal, bat, firefly, ant, mole, zebra, hippo, beaver, sea_otter). Spines, stripes, patches and the shell swirl are
// placed by maths here, so edit this file and rerun it (node engine3d/tools/gen_tk_wild.mjs), not the JSON.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const R = (v, n = 3) => (Array.isArray(v) ? v.map((x) => R(x, n)) : Math.round(v * 10 ** n) / 10 ** n);
const DEG = 180 / Math.PI;
/** Euler [x, 0, z] (XYZ) that turns +y onto direction d. */
const aim = (d) => {
  const l = Math.hypot(...d);
  const [x, y, z] = d.map((v) => v / l);
  return R([Math.atan2(z, y) * DEG, 0, -Math.asin(x) * DEG], 1);
};
/** z on an ellipsoid (centre c, size s) at x, y (front surface). */
const surf = (c, s, x, y) => R(c[2] + (s[2] / 2) * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / (s[0] / 2)) ** 2 - ((y - c[1]) / (s[1] / 2)) ** 2)));
const part = (p, at, s, o = {}) => ({ p, at: R(at), s: R(s), ...o });

const critters = {};

// ---------------- crab ----------------
{
  const body = [0, 0, 0], bs = [0.8, 0.44, 0.62];
  const parts = [
    part("sphere", body, bs, { on: "head", name: "shell" }),
    part("sphere", [0, -0.07, 0.03], [0.68, 0.28, 0.54], { on: "head", c: "sand" }),
    part("sphere", [0.12, 0.17, 0.02], [0.1, 0.05, 0.08], { on: "head", c: "orange", mirror: true }),
    part("capsule", [0.11, 0.16, 0.17], [0.055, 0.24, 0.055], { on: "head", r: [10, 0, -12], mirror: true }),
  ];
  // claws: arm and a two-part pincer, all on the shoulder pivot
  const cr = aim([0.75, 0.45, 0.5]);
  const claw = { r: cr, mirror: true, name: "claw", idle: { r: [0, 0, 6], hz: 0.5 } };
  parts.push(part("capsule", [0.3, 0.3, 0.12], [0.09, 0.26, 0.09], { ...claw, hang: [0, 0.12, 0] }));
  parts.push(part("sphere", [0.3, 0.3, 0.12], [0.2, 0.2, 0.17], { ...claw, hang: [0, 0.3, 0] }));
  parts.push(part("sphere", [0.3, 0.3, 0.12], [0.15, 0.26, 0.15], { ...claw, hang: [-0.035, 0.42, 0] }));
  parts.push(part("sphere", [0.3, 0.3, 0.12], [0.1, 0.18, 0.11], { ...claw, hang: [0.08, 0.41, 0], hr: [0, 0, -20] }));
  for (const z of [0.12, -0.02, -0.16]) parts.push(part("capsule", [0.3, 0.16, z], [0.05, 0.24, 0.05], { r: [0, 0, 42], hang: [0, -0.1, 0], mirror: true, name: "legs", c: "orange", idle: { r: [0, 0, 6], hz: 0.9, phase: z * 10 } }));
  critters.crab = {
    color: "basketball", sound: "Click clack!",
    description: "A small round red-orange toy crab with a sandy tummy, two friendly raised claws (named \"claw\", mirrored: turn or lift to wave and pinch), eyes on stalks and a big smile; six little legs (\"legs\") that scuttle. The round shell is the head group (\"shell\"), so a look turns the whole crab body; scuttle sideways by moving it along x. About 0.72 m tall at size 1, 0.95 m wide.",
    tags: ["ocean", "beach", "rock_pool", "sea", "crustacean", "small"],
    head: { at: [0, 0.3, 0], tilt: 0.5, look: 0.6 },
    eyes: { at: [0.14, 0.34, 0.2], size: 0.1, iris: "eye_brown" },
    cheeks: { at: [0.2, -0.01, 0.255], size: 0.08 },
    mouth: { at: [0, -0.03, 0.302], size: 0.14 },
    bob: 0.015, parts,
  };
}

// ---------------- hedgehog ----------------
{
  const cc = [0, 0.3, -0.06], cs = [0.68, 0.56, 0.74];
  const parts = [
    part("sphere", [0, 0.27, 0.02], [0.58, 0.48, 0.64], { c: "sand" }),
    part("sphere", cc, cs, { c: "brown" }),
  ];
  // soft rounded spines (gumdrops) over the back half
  let k = 0;
  for (let i = 0; i < 6; i++) {
    const el = -10 + i * 17; // elevation from the side, degrees
    const n = [9, 9, 9, 8, 6, 3][i];
    for (let j = 0; j < n; j++) {
      const az = -170 + (j + (i % 2) * 0.5) * (300 / n); // around y, 0 = front
      const a = az / DEG, e = el / DEG;
      const nx = Math.cos(e) * Math.sin(a), ny = Math.sin(e), nz = Math.cos(e) * Math.cos(a);
      if (nz > 0.42 || (i === 5 && j > 2)) continue;
      const p = [cc[0] + nx * cs[0] / 2, cc[1] + ny * cs[1] / 2, cc[2] + nz * cs[2] / 2];
      const d = [nx / cs[0], ny / cs[1] + 0.25, nz / cs[2]];
      const l = Math.hypot(...d);
      parts.push(part("gumdrop", [p[0] + d[0] / l * 0.05, p[1] + d[1] / l * 0.05, p[2] + d[2] / l * 0.05], [0.13, 0.17, 0.13], { r: aim(d), c: k++ % 3 ? "wood_dark" : "horse_mane", name: "spines" }));
    }
  }
  parts.push(part("gumdrop", [0, 0.6, -0.05], [0.13, 0.17, 0.13], { r: [-10, 0, 0], c: "wood_dark", name: "spines" }));
  parts.push(
    part("sphere", [0, 0, 0], [0.4, 0.36, 0.36], { on: "head", c: "sand" }),
    part("sphere", [0, -0.05, 0.17], [0.17, 0.15, 0.24], { on: "head", c: "sand" }),
    part("sphere", [0, -0.03, 0.3], [0.08, 0.07, 0.07], { on: "head", c: "ink", m: "glossy" }),
    part("sphere", [0.13, 0.15, 0.02], [0.11, 0.11, 0.05], { on: "head", c: "brown", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.4 } }),
    part("sphere", [0.13, 0.15, 0.035], [0.06, 0.06, 0.03], { on: "head", c: "pig", mirror: true, name: "ears", idle: { r: [0, 0, 6], hz: 0.4 } }),
    part("sphere", [0.15, 0.04, 0.16], [0.12, 0.08, 0.15], { c: "sand", mirror: true, name: "legs" }),
    part("sphere", [0.15, 0.04, -0.2], [0.12, 0.08, 0.15], { c: "sand", mirror: true, name: "legs" }),
  );
  critters.hedgehog = {
    color: "sand", sound: "Snuffle snuffle!",
    description: "A small round toy hedgehog with a tan face and pointed snout, a shiny black nose, little round ears (\"ears\") and a coat of soft rounded cartoon spines (\"spines\", brown, gumdrop-shaped, never sharp: turn them a few degrees to bristle); tiny feet (\"legs\"). Curl up by tipping the whole hedgehog forward. About 0.68 m tall at size 1.",
    tags: ["garden", "woods", "forest", "mammal", "small", "autumn"],
    head: { at: [0, 0.33, 0.27] },
    eyes: { at: [0.09, 0.05, 0.145], size: 0.07 },
    cheeks: { at: [0.13, -0.05, 0.12], size: 0.07 },
    mouth: { at: [0, -0.1, 0.235], size: 0.06 },
    bob: 0.015, parts,
  };
}

// ---------------- otter ----------------
const whiskers = (y, z, x = 0.12) => [
  part("capsule", [x, y, z], [0.012, 0.17, 0.012], { on: "head", c: "charcoal", r: [0, 0, 80], mirror: true }),
  part("capsule", [x, y - 0.03, z], [0.012, 0.17, 0.012], { on: "head", c: "charcoal", r: [0, 0, 100], mirror: true }),
];
{
  const arm = { r: [-50, 0, -18], mirror: true, name: "paw" };
  const parts = [
    part("sphere", [0, 0.44, 0], [0.5, 0.8, 0.44]),
    part("sphere", [0, 0.44, 0.12], [0.34, 0.58, 0.24], { c: "cream" }),
    part("capsule", [0.19, 0.64, 0.06], [0.1, 0.28, 0.1], { ...arm, hang: [0, -0.11, 0] }),
    part("sphere", [0.19, 0.64, 0.06], [0.12, 0.1, 0.12], { ...arm, hang: [0, -0.26, 0] }),
    part("capsule", [0, 0.14, -0.18], [0.14, 0.5, 0.12], { r: [-100, 0, 0], hang: [0, 0.22, 0], name: "tail", idle: { r: [0, 0, 10], hz: 0.6 } }),
    part("sphere", [0.12, 0.04, 0.08], [0.15, 0.08, 0.22], { mirror: true, name: "legs" }),
    part("sphere", [0, 0, 0], [0.42, 0.36, 0.38], { on: "head", name: "head_fur" }),
    part("sphere", [0, -0.07, 0.15], [0.24, 0.15, 0.16], { on: "head", c: "cream" }),
    part("sphere", [0, -0.03, 0.225], [0.08, 0.055, 0.05], { on: "head", c: "ink", m: "glossy" }),
    part("sphere", [0.17, 0.12, -0.02], [0.08, 0.08, 0.05], { on: "head", mirror: true, name: "ears" }),
    ...whiskers(-0.06, 0.2),
  ];
  critters.otter = {
    color: "wood_dark", sound: "Squeak squeak!",
    description: "A sleek brown toy river otter standing upright, with a cream chest and muzzle, whiskers, small round ears (\"ears\"), short arms with paws (\"paw\", mirrored: lift both toward the middle to clap), a long thick tail (\"tail\") and flat feet (\"legs\"). Floats on its back with rotation [-90, 0, 0]. About 1.06 m tall at size 1.",
    tags: ["river", "pond", "water", "mammal", "woods"],
    head: { at: [0, 0.9, 0.03] },
    eyes: { at: [0.09, 0.05, 0.155], size: 0.065 },
    cheeks: { at: [0.13, -0.05, 0.13], size: 0.07 },
    mouth: { at: [0, -0.11, 0.2], size: 0.06 },
    bob: 0.02, parts,
  };
}

// ---------------- elephant ----------------
{
  const parts = [part("sphere", [0, 0.8, -0.05], [1.05, 0.9, 1.2]), part("sphere", [0, 0.68, 0.05], [0.8, 0.6, 0.9], { c: "grey" })];
  for (const [n, x, z] of [["leg_front_left", 0.27, 0.3], ["leg_front_right", -0.27, 0.3], ["leg_back_left", 0.27, -0.36], ["leg_back_right", -0.27, -0.36]]) {
    parts.push(part("capsule", [x, 0.6, z], [0.3, 0.62, 0.3], { hang: [0, -0.29, 0], name: n }));
    for (const dx of [-0.07, 0, 0.07]) parts.push(part("sphere", [x, 0.6, z], [0.07, 0.07, 0.04], { hang: [dx, -0.53, 0.135], c: "cream", name: n }));
  }
  parts.push(
    part("capsule", [0, 0.9, -0.62], [0.05, 0.3, 0.05], { r: [25, 0, 0], hang: [0, -0.14, 0], name: "tail", idle: { r: [0, 0, 14], hz: 0.6 } }),
    part("sphere", [0, 0.9, -0.62], [0.08, 0.1, 0.08], { r: [25, 0, 0], hang: [0, -0.3, 0], c: "charcoal", m: "matte", name: "tail", idle: { r: [0, 0, 14], hz: 0.6 } }),
    part("sphere", [0, 0, 0], [0.7, 0.66, 0.62], { on: "head" }),
    part("sphere", [0.3, 0.06, -0.04], [0.56, 0.62, 0.08], { on: "head", r: [0, 22, 0], hang: [0.22, 0, 0], mirror: true, name: "ears", idle: { r: [0, 10, 0], hz: 0.45 } }),
    part("sphere", [0.3, 0.06, -0.04], [0.42, 0.48, 0.04], { on: "head", r: [0, 22, 0], hang: [0.23, 0, 0.03], c: "pig", m: "matte", mirror: true, name: "ears", idle: { r: [0, 10, 0], hz: 0.45 } }),
    part("capsule", [0, -0.02, 0.24], [0.21, 0.32, 0.21], { on: "head", r: [-22, 0, 0], hang: [0, -0.12, 0], name: "trunk", idle: { r: [4, 0, 4], hz: 0.35 } }),
    part("capsule", [0, -0.25, 0], [0.17, 0.26, 0.17], { on: "trunk", r: [-22, 0, 0], hang: [0, -0.1, 0], name: "trunk_mid" }),
    part("capsule", [0, -0.21, 0], [0.14, 0.2, 0.14], { on: "trunk_mid", r: [-55, 0, 0], hang: [0, -0.07, 0], name: "trunk_tip" }),
    part("cylinder", [0, -0.17, 0], [0.1, 0.02, 0.1], { on: "trunk_tip", c: "pig", m: "matte" }),
  );
  critters.elephant = {
    color: "grey", sound: "Pawoo!",
    description: "A big friendly gray toy elephant with large soft flapping ears (\"ears\", mirrored, pink inside), a long trunk in three segments that each turn at their root (\"trunk\" at the face, \"trunk_mid\" on it, \"trunk_tip\" on that: turn each by [-30, 0, 0] to curl the trunk up and forward, \"trunk\" alone to lift it), four thick legs with cream toenails (leg_front_left, leg_front_right, leg_back_left, leg_back_right) and a little tufted tail (\"tail\"). About 1.5 m tall at size 1.",
    tags: ["savanna", "jungle", "zoo", "mammal", "big"],
    head: { at: [0, 1.1, 0.55], tilt: 0.7 },
    eyes: { at: [0.15, 0.08, 0.26], size: 0.085 },
    cheeks: { at: [0.22, -0.06, 0.22], size: 0.1 },
    mouth: { at: [0, -0.2, 0.235], size: 0.09 },
    bob: 0.012, parts,
  };
}

// ---------------- snail ----------------
{
  const sc = [0, 0.44, -0.16], ss = [0.34, 0.62, 0.62];
  const parts = [
    part("capsule", [0, 0.08, 0.02], [0.28, 0.78, 0.16], { r: [90, 0, 0] }),
    part("capsule", [0, 0.2, 0.3], [0.22, 0.34, 0.22], { r: [12, 0, 0] }),
    part("sphere", sc, ss, { c: "orange", name: "shell" }),
  ];
  // swirl: a piped line of small beads spiralling in on each side of the shell
  const turns = 2.3, N = 46;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const a = t * turns * 2 * Math.PI + Math.PI / 2;
    const r = 0.27 * (1 - t * 0.9);
    const y = sc[1] + Math.sin(a) * r, z = sc[2] + Math.cos(a) * r;
    const q = 1 - ((y - sc[1]) / (ss[1] / 2)) ** 2 - ((z - sc[2]) / (ss[2] / 2)) ** 2;
    const x = (ss[0] / 2) * Math.sqrt(Math.max(0, q));
    parts.push(part("sphere", [x, y, z], [0.04, 0.05, 0.05], { c: "cream", mirror: true, name: "shell" }));
  }
  parts.push(
    part("sphere", [0, 0, 0], [0.3, 0.28, 0.28], { on: "head" }),
    part("capsule", [0.07, 0.17, 0], [0.04, 0.22, 0.04], { on: "head", r: [0, 0, -16], mirror: true }),
    part("capsule", [0.06, -0.05, 0.12], [0.025, 0.08, 0.025], { on: "head", r: [60, 0, -20], mirror: true }),
  );
  critters.snail = {
    color: "leaf_light", sound: "Slow and smiley!",
    description: "A friendly toy garden snail with a lime-green body that glides on its long foot, a round orange shell with a cream swirl on both sides (\"shell\") and big eyes on two eye stalks (the stalks are part of the head: wave them with a look or a head tilt). No legs: glide it slowly along. About 0.68 m tall at size 1, 0.8 m long.",
    tags: ["garden", "minibeast", "leaf", "rain", "small", "slow"],
    head: { at: [0, 0.37, 0.36], tilt: 0.8 },
    eyes: { at: [0.1, 0.28, 0.02], size: 0.08, iris: "eye_brown" },
    cheeks: { at: [0.09, -0.02, 0.105], size: 0.06 },
    mouth: { at: [0, -0.05, 0.13], size: 0.07 },
    bob: 0.01, parts,
  };
}

// ---------------- giraffe ----------------
{
  const bc = [0, 1.02, -0.05], bs = [0.66, 0.6, 1.0];
  const parts = [part("sphere", bc, bs)];
  for (const [n, x, z] of [["leg_front_left", 0.18, 0.3], ["leg_front_right", -0.18, 0.3], ["leg_back_left", 0.18, -0.34], ["leg_back_right", -0.18, -0.34]]) {
    parts.push(part("capsule", [x, 0.92, z], [0.15, 0.92, 0.15], { hang: [0, -0.43, 0], name: n }));
    parts.push(part("cylinder", [x, 0.92, z], [0.17, 0.1, 0.17], { hang: [0, -0.87, 0], c: "hoof", m: "glossy", name: n }));
  }
  // patches on the body
  const spots = [[30, 20], [80, 30], [130, 15], [160, 40], [-30, 15], [-80, 35], [-130, 20], [-160, 45], [0, 60], [60, 70], [-60, 65], [110, 65], [-110, 70], [180, 75], [20, -10], [-20, -15], [90, -10], [-90, -5], [150, -15], [-150, -10]];
  for (const [az, el] of spots) {
    const a = az / DEG, e = el / DEG;
    const n = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
    const p = [bc[0] + n[0] * bs[0] / 2, bc[1] + n[1] * bs[1] / 2, bc[2] + n[2] * bs[2] / 2];
    const d = [n[0] / bs[0], n[1] / bs[1], n[2] / bs[2]];
    parts.push(part("sphere", p, [0.15, 0.025, 0.13], { r: aim(d), c: "horse_brown", m: "matte" }));
  }
  parts.push(
    part("capsule", [0, 1.15, -0.55], [0.05, 0.32, 0.05], { r: [25, 0, 0], hang: [0, -0.15, 0], name: "tail", idle: { r: [0, 0, 14], hz: 0.6 } }),
    part("sphere", [0, 1.15, -0.55], [0.08, 0.12, 0.08], { r: [25, 0, 0], hang: [0, -0.32, 0], c: "horse_mane", m: "matte", name: "tail", idle: { r: [0, 0, 14], hz: 0.6 } }),
  );
  // neck (on the head group, which pivots at the shoulders) and head
  const nr = 12, nl = 0.78, base = [0, 0.32, 0.06];
  const ax = [0, Math.cos(nr / DEG), Math.sin(nr / DEG)];
  parts.push(part("capsule", base, [0.24, nl, 0.24], { on: "head", r: [nr, 0, 0] }));
  for (let i = 0; i < 6; i++) {
    const u = -0.3 + i * 0.12, side = i % 2 ? 1 : -1;
    const c = [base[0], base[1] + ax[1] * u, base[2] + ax[2] * u];
    const ang = (side * (40 + (i * 23) % 50)) / DEG;
    const n = [Math.sin(ang), -Math.cos(ang) * ax[2], Math.cos(ang) * ax[1]];
    parts.push(part("sphere", [c[0] + n[0] * 0.12, c[1] + n[1] * 0.12, c[2] + n[2] * 0.12], [0.11, 0.022, 0.1], { on: "head", r: aim(n), c: "horse_brown", m: "matte" }));
  }
  for (let i = 0; i < 7; i++) {
    const u = -0.32 + i * 0.1;
    parts.push(part("sphere", [0, base[1] + ax[1] * u - ax[2] * 0.11, base[2] + ax[2] * u - ax[1] * 0.11], [0.05, 0.11, 0.08], { on: "head", r: [nr, 0, 0], c: "horse_mane", m: "matte" }));
  }
  const hc = [0, 0.8, 0.2];
  parts.push(
    part("sphere", hc, [0.34, 0.32, 0.42], { on: "head" }),
    part("sphere", [0, 0.74, 0.36], [0.26, 0.22, 0.26], { on: "head", c: "sand" }),
    part("sphere", [0.045, 0.78, 0.48], [0.035, 0.025, 0.02], { on: "head", c: "horse_mane", mirror: true }),
    part("capsule", [0.07, 0.98, 0.14], [0.05, 0.15, 0.05], { on: "head", r: [-8, 0, -8], mirror: true, name: "horns" }),
    part("sphere", [0.082, 1.06, 0.13], [0.075, 0.075, 0.075], { on: "head", c: "horse_brown", mirror: true, name: "horns" }),
    part("sphere", [0.15, 0.9, 0.12], [0.07, 0.17, 0.045], { on: "head", r: [0, 0, -70], mirror: true, name: "ears", idle: { r: [0, 0, 8], hz: 0.4 } }),
  );
  critters.giraffe = {
    color: "hay", sound: "Munch munch!",
    description: "A tall gentle golden toy giraffe with orange-brown patches, a long neck with a dark mane, little ossicone horns (\"horns\"), soft brown eyes, a sandy muzzle, flicking ears (\"ears\"), long legs on dark hooves (leg_front_left, leg_front_right, leg_back_left, leg_back_right) and a tufted tail (\"tail\"). The head group pivots at the shoulders and carries the whole neck: turn \"#head\" by [70, 0, 0] to bend the neck down low and say hello (the `neck` is the head group; feelings tip it only a little). About 2.17 m tall at size 1.",
    tags: ["savanna", "zoo", "mammal", "tall", "big"],
    head: { at: [0, 1.15, 0.33], tilt: 0.3, look: [0.45, 0.25] },
    eyes: { at: [0.1, 0.87, 0.34], size: 0.075, iris: "eye_brown" },
    cheeks: { at: [0.13, 0.78, 0.33], size: 0.07 },
    mouth: { at: [0, 0.7, 0.475], size: 0.08 },
    bob: 0.01, parts,
  };
}

// ---------------- seal ----------------
{
  const parts = [
    part("sphere", [0, 0.24, -0.08], [0.56, 0.48, 0.78]),
    part("sphere", [0, 0.16, -0.45], [0.36, 0.26, 0.46]),
    part("sphere", [0, 0.44, 0.12], [0.46, 0.52, 0.44]),
    part("sphere", [0.1, 0.07, -0.7], [0.22, 0.05, 0.26], { r: [0, 30, 0], mirror: true, name: "tail", idle: { r: [0, 0, 6], hz: 0.5 } }),
    part("sphere", [0.22, 0.42, 0.2], [0.08, 0.32, 0.18], { r: [10, 0, 35], hang: [0, -0.13, 0], mirror: true, name: "flipper", idle: { r: [0, 0, 8], hz: 0.5 } }),
    part("sphere", [0, 0, 0], [0.42, 0.38, 0.4], { on: "head" }),
    part("sphere", [0, -0.07, 0.15], [0.24, 0.15, 0.16], { on: "head", c: "white" }),
    part("sphere", [0, -0.03, 0.225], [0.08, 0.055, 0.05], { on: "head", c: "ink", m: "glossy" }),
    ...whiskers(-0.06, 0.2, 0.13),
  ];
  critters.seal = {
    color: "grey", sound: "Arf arf!",
    description: "A round smooth gray toy seal sitting up on its tummy, with big dark eyes, a white whiskery muzzle, front flippers (\"flipper\", mirrored: flap to clap or swim) and tail flippers (\"tail\"). Flops and swims by moving along the ground. About 0.85 m tall at size 1.",
    tags: ["ocean", "ice", "sea", "arctic", "mammal", "water"],
    head: { at: [0, 0.68, 0.2] },
    eyes: { at: [0.1, 0.05, 0.16], size: 0.1 },
    cheeks: { at: [0.15, -0.05, 0.14], size: 0.07 },
    mouth: { at: [0, -0.11, 0.2], size: 0.06 },
    bob: 0.02, parts,
  };
}

// ---------------- bat ----------------
{
  const wing = { r: [0, 25, 8], mirror: true, name: "wing", idle: { r: [0, 0, 12], hz: 0.5 } };
  const parts = [
    part("sphere", [0, 0.3, 0], [0.36, 0.42, 0.34]),
    part("sphere", [0, 0.29, 0.1], [0.24, 0.3, 0.18], { c: "sand" }),
    part("sphere", [0.17, 0.44, -0.04], [0.62, 0.3, 0.025], { ...wing, hang: [0.31, 0.02, 0], c: "horse_mane", m: "matte" }),
    ...[[0.12, -0.1], [0.31, -0.12], [0.5, -0.09]].map(([x, y]) => part("sphere", [0.17, 0.44, -0.04], [0.2, 0.16, 0.024], { ...wing, hang: [x, y, 0], c: "horse_mane", m: "matte" })),
    part("capsule", [0.17, 0.44, -0.04], [0.035, 0.62, 0.035], { ...wing, hang: [0.31, 0.15, 0.004], hr: [0, 0, 90] }),
    ...[[0.2, -60], [0.4, -40]].map(([x, a]) => part("capsule", [0.17, 0.44, -0.04], [0.022, 0.28, 0.022], { ...wing, hang: [x, 0.02, 0.016], hr: [0, 0, a] })),
    part("sphere", [0.08, 0.07, 0.04], [0.08, 0.06, 0.1], { c: "charcoal", mirror: true, name: "legs" }),
    part("sphere", [0, 0, 0], [0.38, 0.34, 0.34], { on: "head" }),
    part("sphere", [0, -0.06, 0.13], [0.2, 0.14, 0.14], { on: "head", c: "sand" }),
    part("sphere", [0, -0.03, 0.2], [0.06, 0.045, 0.04], { on: "head", c: "rose", m: "glossy" }),
    part("cone", [0.13, 0.17, -0.01], [0.15, 0.24, 0.08], { on: "head", r: [0, 0, -22], mirror: true, name: "ears", idle: { r: [0, 0, 5], hz: 0.4 } }),
    part("cone", [0.13, 0.16, 0.02], [0.09, 0.15, 0.04], { on: "head", r: [0, 0, -22], c: "pig", m: "matte", mirror: true, name: "ears", idle: { r: [0, 0, 5], hz: 0.4 } }),
  ];
  critters.bat = {
    color: "brown", sound: "Squeak!",
    description: "A small friendly brown toy fruit bat with a sandy tummy and muzzle, big pink-lined ears (\"ears\"), big brown eyes and soft dark-chocolate wings (\"wing\", mirrored, flap slowly on their own). Hangs upside down to rest with rotation [0, 0, 180] (its feet at the top). About 0.88 m tall at size 1 to the ear tips, 1.5 m wingspan.",
    tags: ["night", "cave", "woods", "mammal", "small", "halloween"],
    head: { at: [0, 0.62, 0.02] },
    eyes: { at: [0.085, 0.04, 0.15], size: 0.085, iris: "eye_brown" },
    cheeks: { at: [0.12, -0.05, 0.13], size: 0.06 },
    mouth: { at: [0, -0.1, 0.18], size: 0.06 },
    bob: 0.03, parts,
  };
}

// ---------------- firefly ----------------
{
  const parts = [
    part("sphere", [0, 0.42, 0], [0.36, 0.34, 0.34]),
    part("sphere", [0, 0.2, -0.05], [0.42, 0.38, 0.4], { c: "yellow", m: "light", name: "glow" }),
    part("dome", [0.08, 0.36, -0.12], [0.2, 0.3, 0.42], { r: [-80, 0, -12], c: "charcoal", mirror: true }),
    part("circle", [0.12, 0.5, -0.16], [0.3, 0.42, 0.16], { r: [0, 20, -55], hang: [0, 0.2, 0], c: "sky", m: "water", mirror: true, name: "wing", idle: { r: [0, 18, 0], hz: 1.2 } }),
    part("capsule", [0.12, 0.42, 0.12], [0.035, 0.16, 0.035], { r: [-40, 0, -30], hang: [0, -0.07, 0], c: "charcoal", mirror: true, name: "arm" }),
    part("sphere", [0.1, 0.05, 0.08], [0.08, 0.06, 0.1], { c: "charcoal", mirror: true, name: "legs" }),
    part("sphere", [0, 0, 0], [0.4, 0.36, 0.36], { on: "head", c: "orange" }),
    part("capsule", [0.07, 0.16, 0], [0.025, 0.18, 0.025], { on: "head", c: "charcoal", r: [-15, 0, -22], hang: [0, 0.08, 0], mirror: true, name: "antennae", idle: { r: [0, 0, 8], hz: 0.8 } }),
    part("sphere", [0.07, 0.16, 0], [0.055, 0.055, 0.055], { on: "head", c: "orange", r: [-15, 0, -22], hang: [0, 0.18, 0], mirror: true, name: "antennae", idle: { r: [0, 0, 8], hz: 0.8 } }),
  ];
  critters.firefly = {
    color: "charcoal", sound: "Glow, glow!",
    description: "A small round friendly toy firefly standing up: an orange head with bobbly antennae (\"antennae\"), a dark body with little arms (\"arm\") and see-through wings (\"wing\", mirrored, flutter on their own), and a big round softly glowing yellow tail (\"glow\", light material: pulse it slowly, under 1 Hz, never flash; color \"gold\" for a golden glow). About 0.83 m tall at size 1 to the antenna tips.",
    tags: ["night", "garden", "insect", "minibeast", "summer", "light", "small"],
    head: { at: [0, 0.68, 0.03] },
    eyes: { at: [0.09, 0.04, 0.156], size: 0.075 },
    cheeks: { at: [0.13, -0.05, 0.135], size: 0.065 },
    mouth: { at: [0, -0.09, 0.165], size: 0.07 },
    bob: 0.04, parts,
  };
}

// ---------------- ant ----------------
{
  const parts = [
    part("sphere", [0, 0.26, -0.3], [0.36, 0.32, 0.44]),
    part("sphere", [0, 0.28, -0.07], [0.12, 0.12, 0.14]),
    part("sphere", [0, 0.32, 0.06], [0.24, 0.26, 0.26]),
    part("capsule", [0, 0.42, 0.1], [0.11, 0.18, 0.11], { r: [20, 0, 0] }),
  ];
  for (const z of [0.0, -0.1]) parts.push(part("capsule", [0.09, 0.28, z + 0.06], [0.035, 0.36, 0.035], { r: [z ? 20 : -15, 0, 42], hang: [0, -0.16, 0], mirror: true, name: "legs", idle: { r: [6, 0, 0], hz: 0.9, phase: z * 20 } }));
  parts.push(
    part("capsule", [0.1, 0.38, 0.12], [0.035, 0.28, 0.035], { r: [-35, 0, 40], hang: [0, -0.12, 0], mirror: true, name: "arm" }),
    part("sphere", [0.1, 0.38, 0.12], [0.06, 0.06, 0.06], { r: [-35, 0, 40], hang: [0, -0.27, 0], mirror: true, name: "arm" }),
    part("torus", [0, 0.46, 0.11], [0.19, 0.19, 0.14], { r: [70, 0, 0], c: "cap_red", m: "matte", name: "neckerchief" }),
    part("cone", [0, 0.39, 0.2], [0.16, 0.13, 0.05], { r: [190, 0, 0], c: "cap_red", m: "matte", name: "neckerchief" }),
    part("sphere", [0, 0, 0], [0.38, 0.34, 0.34], { on: "head" }),
    part("capsule", [0.07, 0.15, 0.02], [0.025, 0.2, 0.025], { on: "head", r: [-20, 0, -28], hang: [0, 0.09, 0], mirror: true, name: "antennae", idle: { r: [0, 0, 8], hz: 0.8 } }),
    part("torus", [0.07, 0.15, 0.02], [0.1, 0.1, 0.12], { on: "head", r: [-20, 0, -28], hang: [0.03, 0.21, 0], hr: [0, 90, 0], mirror: true, name: "antennae", idle: { r: [0, 0, 8], hz: 0.8 } }),
  );
  critters.ant = {
    color: "charcoal", sound: "March, march!",
    description: "A small cheerful dark toy ant with big white cartoon eyes, a smile, two curly antennae (\"antennae\"), a tiny red neckerchief (\"neckerchief\": drop it in a variant), two front arms (\"arm\", mirrored: wave and carry) and four thin legs (\"legs\"), six in all; a round thorax and a big round abdomen behind. Recolor charcoal to brown for a red-brown ant. About 0.75 m tall at size 1 to the antenna curls.",
    tags: ["garden", "insect", "minibeast", "teamwork", "small"],
    head: { at: [0, 0.6, 0.16] },
    eyes: { at: [0.08, 0.04, 0.14], size: 0.085, iris: "eye_brown" },
    cheeks: { at: [0.12, -0.06, 0.125], size: 0.06, color: "rose" },
    mouth: { at: [0, -0.09, 0.155], size: 0.07, color: "white" },
    bob: 0.02, parts,
  };
}

// ---------------- mole ----------------
{
  const paw = { r: [0, -25, 0], mirror: true, name: "paw", idle: { r: [0, 0, 6], hz: 0.5 } };
  const parts = [
    part("sphere", [0, 0.3, 0], [0.56, 0.58, 0.52], { m: "plush" }),
    part("sphere", [0.24, 0.36, 0.14], [0.22, 0.2, 0.08], { ...paw, hang: [0.06, -0.06, 0.04], c: "pig", m: "matte" }),
    part("sphere", [0.24, 0.42, 0.04], [0.12, 0.1, 0.1], { ...paw, c: "charcoal", m: "plush" }),
  ];
  for (const dx of [-0.06, -0.01, 0.04, 0.09]) parts.push(part("sphere", [0.24, 0.36, 0.14], [0.05, 0.07, 0.05], { ...paw, hang: [0.06 + dx, -0.16, 0.05], c: "pig", m: "matte" }));
  parts.push(
    part("sphere", [0.13, 0.04, 0.1], [0.14, 0.07, 0.18], { c: "pig", m: "matte", mirror: true, name: "legs" }),
    part("capsule", [0, 0.12, -0.24], [0.04, 0.12, 0.04], { r: [-60, 0, 0], hang: [0, 0.05, 0], c: "pig", m: "matte", name: "tail" }),
    part("sphere", [0, 0, 0], [0.44, 0.38, 0.4], { on: "head", m: "plush" }),
    part("sphere", [0, -0.06, 0.2], [0.13, 0.11, 0.2], { on: "head", c: "pig", m: "matte" }),
    part("sphere", [0, -0.04, 0.3], [0.08, 0.07, 0.06], { on: "head", c: "rose", m: "glossy" }),
  );
  critters.mole = {
    color: "charcoal", sound: "Dig dig!",
    description: "A small velvety dark-gray toy mole (plush) with tiny eyes, a long pink nose and big pink digging paws with four fingers (\"paw\", mirrored: wiggle to dig, lift to wave), pink feet (\"legs\") and a little pink tail (\"tail\"). Blinks on its own. About 0.82 m tall at size 1.",
    tags: ["garden", "underground", "soil", "mammal", "small"],
    head: { at: [0, 0.62, 0.05] },
    eyes: { at: [0.09, 0.07, 0.165], size: 0.055, iris: "ink" },
    cheeks: { at: [0.13, -0.04, 0.155], size: 0.07, color: "rose" },
    mouth: { at: [0, -0.13, 0.17], size: 0.06, color: "pig" },
    bob: 0.02, parts,
  };
}

// ---------------- hippo ----------------
{
  const parts = [part("sphere", [0, 0.5, -0.06], [0.95, 0.78, 1.05]), part("sphere", [0, 0.4, 0.05], [0.74, 0.5, 0.8], { c: "pig", m: "matte" })];
  for (const [n, x, z] of [["leg_front_left", 0.26, 0.26], ["leg_front_right", -0.26, 0.26], ["leg_back_left", 0.26, -0.36], ["leg_back_right", -0.26, -0.36]])
    parts.push(part("capsule", [x, 0.3, z], [0.25, 0.32, 0.25], { hang: [0, -0.14, 0], name: n }));
  parts.push(
    part("capsule", [0, 0.55, -0.56], [0.05, 0.14, 0.05], { r: [30, 0, 0], hang: [0, -0.06, 0], name: "tail", idle: { r: [0, 0, 18], hz: 0.8 } }),
    part("sphere", [0, 0, 0], [0.6, 0.5, 0.5], { on: "head" }),
    part("sphere", [0, -0.1, 0.24], [0.62, 0.4, 0.42], { on: "head", c: "pig" }),
    part("sphere", [0.1, 0.06, 0.4], [0.07, 0.05, 0.05], { on: "head", c: "rose", m: "glossy", mirror: true }),
    part("sphere", [0.2, 0.24, -0.04], [0.11, 0.11, 0.06], { on: "head", mirror: true, name: "ears", idle: { r: [0, 0, 10], hz: 0.5 } }),
    part("sphere", [0.2, 0.24, -0.02], [0.06, 0.06, 0.04], { on: "head", c: "pig", mirror: true, name: "ears", idle: { r: [0, 0, 10], hz: 0.5 } }),
    part("sphere", [0.13, 0.17, 0.12], [0.13, 0.1, 0.12], { on: "head", mirror: true }),
  );
  critters.hippo = {
    color: "grey", sound: "Hrumph!",
    description: "A large round gray toy hippo with a pink tummy and a big wide pink muzzle, eyes up high, little twitching ears (\"ears\"), stubby legs (leg_front_left, leg_front_right, leg_back_left, leg_back_right) and a tiny tail (\"tail\"). Puffs out her cheeks with a joyful feeling; wades with its legs hidden in water. About 1.04 m tall at size 1.",
    tags: ["river", "savanna", "zoo", "water", "mammal", "big"],
    head: { at: [0, 0.76, 0.42] },
    eyes: { at: [0.13, 0.19, 0.17], size: 0.08 },
    cheeks: { at: [0.24, -0.06, 0.37], size: 0.12, color: "rose" },
    mouth: { at: [0, -0.15, 0.435], size: 0.2 },
    bob: 0.012, parts,
  };
}

// ---------------- beaver ----------------
{
  const arm = { r: [-30, 0, 18], mirror: true, name: "paw" };
  const parts = [
    part("sphere", [0, 0.38, 0], [0.66, 0.7, 0.6]),
    part("sphere", [0, 0.34, 0.17], [0.42, 0.48, 0.3], { c: "sand" }),
    part("capsule", [0.27, 0.56, 0.08], [0.12, 0.2, 0.12], { ...arm, hang: [0, -0.08, 0] }),
    part("sphere", [0.27, 0.56, 0.08], [0.12, 0.1, 0.12], { ...arm, hang: [0, -0.19, 0], c: "horse_mane" }),
    part("sphere", [0.15, 0.04, 0.14], [0.2, 0.07, 0.26], { c: "horse_mane", mirror: true, name: "legs" }),
    part("sphere", [0, 0.1, -0.3], [0.36, 0.06, 0.52], { r: [-12, 0, 0], hang: [0, 0, -0.24], c: "horse_mane", m: "matte", name: "tail", idle: { r: [4, 0, 0], hz: 0.5 } }),
    part("sphere", [0, 0, 0], [0.52, 0.46, 0.46], { on: "head" }),
    part("sphere", [0, -0.08, 0.19], [0.3, 0.2, 0.18], { on: "head", c: "sand" }),
    part("sphere", [0, -0.02, 0.28], [0.1, 0.07, 0.06], { on: "head", c: "horse_mane", m: "glossy" }),
    part("box", [0.026, -0.205, 0.255], [0.045, 0.08, 0.025], { on: "head", c: "white", m: "glossy", mirror: true, name: "teeth" }),
    part("sphere", [0.2, 0.18, -0.02], [0.11, 0.11, 0.06], { on: "head", mirror: true, name: "ears" }),
    ...whiskers(-0.07, 0.25, 0.13),
  ];
  critters.beaver = {
    color: "horse_brown", sound: "Slap slap!",
    description: "A round chunky chestnut-brown toy beaver with a sandy tummy and muzzle, two big white front teeth (\"teeth\"), small round ears (\"ears\"), little arms with dark paws (\"paw\", mirrored: drag branches), dark webbed back feet (\"legs\") and a flat dark paddle tail (\"tail\": turn it [-20, 0, 0] and back to slap). About 1.09 m tall at size 1.",
    tags: ["river", "pond", "woods", "builder", "mammal", "water"],
    head: { at: [0, 0.86, 0.04] },
    eyes: { at: [0.11, 0.06, 0.19], size: 0.075 },
    cheeks: { at: [0.16, -0.06, 0.165], size: 0.075 },
    mouth: { at: [0, -0.15, 0.265], size: 0.07 },
    bob: 0.02, parts,
  };
}

// ---------------- kangaroo ----------------
{
  const joey = { name: "joey" };
  const parts = [
    part("sphere", [0, 0.62, -0.02], [0.52, 0.78, 0.48]),
    part("sphere", [0, 0.6, 0.12], [0.36, 0.52, 0.28], { c: "sand" }),
    part("capsule", [0, 0.97, 0.03], [0.2, 0.2, 0.2]),
    // joey: sits inside the pouch; move "#joey" by [0, 0.1, 0.02] to peek out
    part("sphere", [0, 0.39, 0.19], [0.13, 0.12, 0.12], joey),
    part("sphere", [0, 0.375, 0.25], [0.07, 0.055, 0.06], { ...joey, c: "sand" }),
    part("sphere", [0, 0.385, 0.28], [0.03, 0.022, 0.02], { ...joey, c: "ink", m: "glossy" }),
    part("sphere", [0.03, 0.41, 0.245], [0.022, 0.026, 0.015], { ...joey, c: "ink", m: "glossy", mirror: true }),
    part("sphere", [0.04, 0.46, 0.18], [0.04, 0.09, 0.025], { ...joey, r: [0, 0, -15], mirror: true }),
    part("sphere", [0, 0.41, 0.21], [0.34, 0.2, 0.18], { c: "sand", name: "pouch" }),
    part("torus", [0, 0.48, 0.22], [0.24, 0.1, 0.12], { r: [90, 0, 0], c: "horse_tan", m: "matte", name: "pouch" }),
    part("sphere", [0.17, 0.4, -0.03], [0.22, 0.38, 0.42], { mirror: true, name: "legs" }),
    part("sphere", [0.13, 0.04, 0.1], [0.14, 0.08, 0.44], { mirror: true, name: "legs" }),
    part("capsule", [0.15, 0.14, 0.0], [0.11, 0.3, 0.11], { r: [-30, 0, 0], mirror: true, name: "legs" }),
    part("capsule", [0.17, 0.8, 0.13], [0.08, 0.22, 0.08], { r: [-40, 0, 12], hang: [0, -0.09, 0], mirror: true, name: "arm" }),
    part("capsule", [0, 0.32, -0.2], [0.17, 0.72, 0.17], { r: [-115, 0, 0], hang: [0, 0.32, 0], name: "tail", idle: { r: [0, 0, 5], hz: 0.5 } }),
    part("sphere", [0, 0, 0], [0.34, 0.32, 0.36], { on: "head" }),
    part("sphere", [0, -0.05, 0.15], [0.2, 0.16, 0.24], { on: "head", c: "sand" }),
    part("sphere", [0, -0.01, 0.27], [0.07, 0.05, 0.05], { on: "head", c: "ink", m: "glossy" }),
    part("sphere", [0.1, 0.2, -0.03], [0.11, 0.27, 0.05], { on: "head", r: [0, 0, -16], mirror: true, name: "ears", idle: { r: [0, 0, 5], hz: 0.4 } }),
    part("sphere", [0.1, 0.2, -0.01], [0.06, 0.18, 0.03], { on: "head", r: [0, 0, -16], c: "pig", m: "matte", mirror: true, name: "ears", idle: { r: [0, 0, 5], hz: 0.4 } }),
  ];
  critters.kangaroo = {
    color: "horse_brown", sound: "Boing boing!",
    description: "A red-brown toy kangaroo standing up on big back legs and long feet (\"legs\"), with a sandy tummy and snout, tall pink-lined ears (\"ears\"), little arms (\"arm\", mirrored), a long thick tail (\"tail\") and a pouch (\"pouch\"). A tiny joey (\"joey\") sits hidden inside the pouch: move \"#joey\" by [0, 0.1, 0.02] to make it peek out. Hops by moving up and down. About 1.42 m tall at size 1 to the ear tips.",
    tags: ["australia", "grassland", "outback", "mammal", "zoo"],
    head: { at: [0, 1.1, 0.04] },
    eyes: { at: [0.08, 0.05, 0.14], size: 0.065 },
    cheeks: { at: [0.11, -0.04, 0.125], size: 0.06 },
    mouth: { at: [0, -0.1, 0.24], size: 0.055 },
    bob: 0.02, parts,
  };
}

// ---------------- ape ----------------
{
  const arm = { r: [0, 0, 12], mirror: true, name: "arm", idle: { r: [0, 0, 4], hz: 0.4 } };
  const parts = [
    part("sphere", [0, 0.62, 0], [0.8, 0.86, 0.66], { m: "plush" }),
    part("sphere", [0, 0.64, 0.2], [0.5, 0.56, 0.32], { c: "grey", m: "matte" }),
    part("capsule", [0.18, 0.32, 0], [0.24, 0.34, 0.24], { hang: [0, -0.12, 0], mirror: true, name: "legs", m: "plush" }),
    part("sphere", [0.18, 0.32, 0], [0.22, 0.1, 0.32], { hang: [0, -0.28, 0.06], mirror: true, name: "legs", c: "grey", m: "matte" }),
    part("capsule", [0.38, 0.9, 0.04], [0.21, 0.6, 0.21], { ...arm, hang: [0, -0.28, 0], m: "plush" }),
    part("sphere", [0.38, 0.9, 0.04], [0.21, 0.17, 0.21], { ...arm, hang: [0, -0.62, 0.02], c: "grey", m: "matte" }),
    part("sphere", [0, 0, 0], [0.5, 0.48, 0.46], { on: "head", m: "plush" }),
    part("sphere", [0, 0.16, -0.05], [0.34, 0.28, 0.34], { on: "head", m: "plush" }),
    part("sphere", [0, -0.03, 0.13], [0.38, 0.36, 0.26], { on: "head", c: "grey", m: "matte" }),
    part("sphere", [0, -0.12, 0.2], [0.28, 0.18, 0.18], { on: "head", c: "grey", m: "matte" }),
    part("sphere", [0.03, -0.08, 0.285], [0.035, 0.025, 0.02], { on: "head", c: "charcoal", mirror: true }),
    part("sphere", [0.24, 0, 0], [0.08, 0.11, 0.06], { on: "head", c: "grey", m: "matte", mirror: true, name: "ears" }),
  ];
  critters.ape = {
    color: "charcoal", sound: "Hoo hoo!",
    description: "A big gentle toy gorilla-like ape with soft dark plush fur, a gray chest, a gray kind face with brown eyes, long strong arms with gray hands (\"arm\", mirrored), short legs with gray feet (\"legs\"), small ears (\"ears\") and no tail. Moves slowly. About 1.42 m tall at size 1.",
    tags: ["jungle", "rainforest", "zoo", "mammal", "big", "primate"],
    head: { at: [0, 1.16, 0.1] },
    eyes: { at: [0.08, 0.03, 0.245], size: 0.07, iris: "eye_brown" },
    cheeks: { at: [0.13, -0.06, 0.215], size: 0.07 },
    mouth: { at: [0, -0.16, 0.278], size: 0.08 },
    bob: 0.012, parts,
  };
}

// ---------------- arctic_tern ----------------
{
  const wing = { mirror: true, name: "wing", idle: { r: [0, 0, 8], hz: 0.8 } };
  const parts = [
    part("sphere", [0, 0.25, -0.04], [0.27, 0.3, 0.54]),
    part("sphere", [0, 0.29, -0.06], [0.3, 0.2, 0.44], { c: "grey" }),
    part("sphere", [0.15, 0.33, 0.04], [0.06, 0.12, 0.62], { ...wing, r: [-12, 0, -10], hang: [0, -0.02, -0.24], c: "grey" }),
    part("sphere", [0.15, 0.33, 0.04], [0.04, 0.06, 0.3], { ...wing, r: [-12, 0, -10], hang: [0, -0.01, -0.5], c: "charcoal" }),
    part("capsule", [0.03, 0.23, -0.24], [0.03, 0.4, 0.03], { r: [-100, 0, -12], hang: [0, 0.19, 0], mirror: true, name: "tail", idle: { r: [0, 0, 4], hz: 0.6 } }),
    part("capsule", [0.05, 0.11, 0.02], [0.035, 0.12, 0.035], { hang: [0, -0.045, 0], c: "red", mirror: true, name: "legs" }),
    part("sphere", [0.05, 0.11, 0.02], [0.07, 0.03, 0.1], { hang: [0, -0.095, 0.03], c: "red", mirror: true, name: "legs" }),
    part("sphere", [0, 0, 0], [0.24, 0.22, 0.24], { on: "head" }),
    part("sphere", [0, 0.05, -0.035], [0.25, 0.15, 0.24], { on: "head", c: "ink", name: "cap" }),
    part("cone", [0, -0.015, 0.19], [0.05, 0.2, 0.05], { on: "head", r: [95, 0, 0], c: "red", m: "glossy", name: "beak" }),
  ];
  critters.arctic_tern = {
    color: "white", sound: "Kee-arr!",
    description: "A small sleek toy arctic tern: a white seabird with a gray back, a black cap (\"cap\"), a red pointed beak (\"beak\"), red feet (\"legs\"), long pointed gray wings with dark tips (\"wing\", mirrored: turn about z to flap) and two long white tail streamers (\"tail\"). About 0.57 m tall at size 1.",
    tags: ["arctic", "ocean", "sea", "bird", "migration", "small"],
    head: { at: [0, 0.45, 0.14] },
    eyes: { at: [0.07, 0.01, 0.09], size: 0.055, iris: "eye_brown" },
    cheeks: { at: [0.09, -0.05, 0.075], size: 0.045 },
    mouth: { at: [0, -0.06, 0.105], size: 0.04 },
    bob: 0.02, parts,
  };
}

// ---------------- variants ----------------
// zebra: the farm horse in black and white with stripe bands round body, neck and legs.
{
  const add = [];
  const bc = [0, 0.66, -0.02], a = 0.33, b = 0.3, c = 0.5;
  for (const dz of [-0.36, -0.22, -0.08, 0.06, 0.2, 0.33]) {
    const k = Math.sqrt(1 - (dz / c) ** 2) * 1.025;
    add.push(part("cylinder", [0, bc[1], bc[2] + dz], [2 * a * k, 0.06, 2 * b * k], { r: [90, 0, 0], c: "ink", m: "matte", name: "stripes" }));
  }
  for (const y of [-0.16, -0.05, 0.06, 0.17]) add.push(part("cylinder", [0, 0.98, 0.3], [0.315, 0.05, 0.335], { r: [28, 0, 0], hang: [0, y, 0], c: "ink", m: "matte", name: "stripes" }));
  for (const [n, x, z] of [["leg_front_left", 0.17, 0.25], ["leg_front_right", -0.17, 0.25], ["leg_back_left", 0.17, -0.3], ["leg_back_right", -0.17, -0.3]])
    for (const y of [-0.12, -0.24]) add.push(part("cylinder", [x, 0.5, z], [0.2, 0.04, 0.2], { hang: [0, y, 0], c: "ink", m: "matte", name: n }));
  add.push(part("sphere", [0, -0.09, 0.33], [0.3, 0.17, 0.22], { on: "head", c: "charcoal", m: "matte" }));
  // Muzzle bridge: joins the horse's head ball and muzzle so the front view reads as one head, not two.
  add.push(part("sphere", [0, -0.05, 0.13], [0.4, 0.34, 0.4], { on: "head" }));
  critters.zebra = {
    like: "horse", recolor: { horse_brown: "white", horse_tan: "white", horse_mane: "ink", hoof: "charcoal" }, add,
    color: "white", sound: "Neigh-hee!",
    description: "A friendly black-and-white toy zebra (the farm horse with bold stripes round its body, neck and legs, a dark nose, a short black mane and big brown eyes). Same named parts as horse: tail, mane, leg_front_left, leg_front_right, leg_back_left, leg_back_right (the leg stripes move with the legs), plus \"stripes\". About 1.5 m tall at size 1.",
    tags: ["savanna", "zoo", "mammal", "stripes", "grassland"],
  };
}
critters.sea_otter = {
  like: "otter", recolor: { wood_dark: "horse_mane" }, drop: ["head_fur"],
  add: [part("sphere", [0, 0, 0], [0.42, 0.36, 0.38], { on: "head", c: "sand", name: "head_fur" })],
  sound: "Squeak!",
  description: "A sleek dark-brown toy sea otter with a pale sandy whiskery face, small round ears, cream chest and muzzle: the river otter's body and named parts (paw, tail, ears, legs). Floats on its back with rotation [-90, 0, 0] and holds a flat rock on its tummy. About 1.06 m tall at size 1.",
  tags: ["ocean", "sea", "kelp", "water", "mammal"],
};

// unicorn: the farm horse in white with a rainbow mane and tail and a golden spiral horn.
{
  const rainbow = ["pink", "orange", "yellow", "grass", "sky", "purple"];
  const mane = [[0.829, 0.073, 0.16], [0.935, 0.129, 0.19], [1.041, 0.185, 0.2], [1.147, 0.242, 0.2], [1.244, 0.293, 0.18], [1.324, 0.335, 0.15]];
  const add = mane.map(([y, z, h], i) => part("sphere", [0, y, z], [0.15, h, h * 0.75], { r: [28, 0, 0], c: rainbow[i], m: "matte", name: "mane" }));
  const tail = { r: [30, 0, 0], m: "matte", name: "tail", idle: { r: [0, 0, 12], hz: 0.6 } };
  add.push(part("capsule", [0, 0.8, -0.46], [0.13, 0.3, 0.13], { ...tail, hang: [0, -0.12, 0], c: "pink" }));
  ["orange", "yellow", "sky", "purple"].forEach((c, i) => add.push(part("sphere", [0, 0.8, -0.46], [0.19 - i * 0.015, 0.13, 0.17 - i * 0.015], { ...tail, hang: [0, -0.24 - i * 0.075, 0], c })));
  const horn = { on: "head", r: [22, 0, 0], name: "horn" };
  add.push(part("cone", [0, 0.31, 0.15], [0.075, 0.3, 0.075], { ...horn, hang: [0, 0.14, 0], c: "gold", m: "glossy" }));
  for (let i = 0; i < 4; i++) add.push(part("torus", [0, 0.31, 0.15], [0.07 - i * 0.014, 0.07 - i * 0.014, 0.05], { ...horn, hang: [0, 0.03 + i * 0.06, 0], hr: [90, 0, 12], c: "gold", m: "glossy" }));
  // Muzzle bridge: joins the horse's head ball and muzzle so the front view reads as one head, not two.
  add.push(part("sphere", [0, -0.05, 0.13], [0.4, 0.34, 0.4], { on: "head" }));
  critters.unicorn = {
    like: "horse", recolor: { horse_brown: "white", horse_tan: "cream", horse_mane: "pink", hoof: "gold" }, drop: ["mane", "tail"], add,
    color: "white", sound: "Neigh, sparkle!",
    description: "A friendly storybook toy unicorn: the farm horse in white with a cream muzzle, a pastel rainbow mane (\"mane\") and tail (\"tail\"), a pink forelock, golden hooves and a golden spiral horn (\"horn\"). Same named legs as horse (leg_front_left, leg_front_right, leg_back_left, leg_back_right). About 1.6 m tall at size 1 to the horn tip.",
    tags: ["fantasy", "story", "magic", "rainbow", "farm"],
  };
}

const out = {
  description: "Toybox 10K wave 2 wild animals: crab, hedgehog, otter, elephant, snail, giraffe, seal, bat, firefly, ant, mole, hippo, beaver, kangaroo (with a joey in the pouch), ape, arctic_tern, and the variants zebra and unicorn (of horse) and sea_otter (of otter). Generated by tools/gen_tk_wild.mjs (spines, stripes, patches and the shell swirl are placed by maths): edit the generator and rerun it, not the JSON.",
  critters,
};
const file = fileURLToPath(new URL("../catalog/models/tk_wild.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(file, Object.keys(critters).length);
