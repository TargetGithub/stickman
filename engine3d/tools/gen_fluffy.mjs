#!/usr/bin/env node
// Writes catalog/models/fluffy.json: Fluffy (a round plush mascot in a backwards cap, denim shorts and
// sneakers) and its six looks, plus the outfit props they use. The parts are laid out here in code (shared
// pivots for arms, legs and the cap, faces placed on each body's curve), so edit this file, not the JSON:
//   node engine3d/tools/gen_fluffy.mjs
// Fluffy faces +z; its left is +x. One unit is about Fluffy's height without the cap (1.3).

import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { shapeGeometry } from "../runtime/geometry.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const FUR = { length: 0.035, shells: 16, density: 90, clump: 0.5 };
const LIMB_FUR = { length: 0.026, shells: 12, density: 100, clump: 0.5 };

/**
 * The body's surface, measured on the real shape (as the page builds it): `at(x, y, dir)` is where a ray from
 * outside along dir ([0,0,-1]: from the front) first meets it, relative to the body centre.
 */
function surface(body) {
  const mesh = new THREE.Mesh(shapeGeometry(body.p), new THREE.MeshBasicMaterial());
  mesh.scale.set(...body.s);
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  return {
    /** z of the front surface at (x, y). */
    front(x, y) {
      ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
      return ray.intersectObject(mesh)[0]?.point.z ?? 0;
    },
    /** x of the side surface at height y (and depth z). */
    side(y, z = 0) {
      ray.set(new THREE.Vector3(5, y, z), new THREE.Vector3(-1, 0, 0));
      return ray.intersectObject(mesh)[0]?.point.x ?? 0;
    },
    /** y of the top at (x, z). */
    top(x = 0.012, z = 0.012) {
      ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
      return ray.intersectObject(mesh)[0]?.point.y ?? 0;
    },
    /** y of the bottom. */
    bottom() {
      ray.set(new THREE.Vector3(0.012, -5, 0.012), new THREE.Vector3(0, 1, 0));
      return ray.intersectObject(mesh)[0]?.point.y ?? 0;
    },
  };
}

/**
 * One Fluffy-style critter.
 * body: { p, s, c, m, fur, at } the round body (also the head: the face sits on it); cap/shoes colours;
 * hat: "cap" or none; extras(S, C): more parts, given the body surface and centre; armR: the arms' rest pose.
 */
function fluffy({
  description, tags, body, cap = "cap_red", shoes = "cap_red", hat = "cap", shortsStyle = "button", limbs = "plush",
  limbFur = LIMB_FUR, extras = () => [], armR = [0, 0, 50], face = {}, sound = "Hee hee!",
}) {
  const C = body.at; // body centre = head pivot
  const S = surface(body);
  const fz = body.fur?.length ?? 0;
  const head = [0, C[1], 0];
  const eyeY = face.eyeY ?? 0.1;
  const eyeX = face.eyeX ?? 0.112;
  const eyeSize = face.eyeSize ?? 0.175;
  const eyeZ = S.front(eyeX, eyeY) + fz * 0.25;
  const parts = [];
  const add = (p) => parts.push(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
  add({ p: body.p, at: r3(C), s: body.s, c: body.c, m: body.m, fur: body.fur, name: "torso" });
  // Nose: a tiny soft bump.
  const noseY = eyeY - 0.085;
  add({ p: "sphere", on: "head", at: r3([0, noseY, S.front(0, noseY) + fz * 0.8]), s: [0.05, 0.04, 0.035], c: face.nose ?? "blush", m: "plush" });

  // Arms: one shoulder pivot each (mirrored); the arm, a mitten hand and its thumb swing together.
  const shY = face.shoulder ?? -0.02;
  const shZ = face.shoulderZ ?? 0.02;
  const sh = [S.side(shY, shZ) - 0.05, C[1] + shY, shZ];
  if (typeof armR === "function") armR = armR(sh);
  const plush = limbs === "plush";
  const limbM = plush ? "plush" : "toy";
  const limbC = plush ? undefined : body.c;
  const arm = { at: r3(sh), r: armR, mirror: true, name: "arm", idle: { r: [0, 0, 5], hz: 0.5 } };
  const lf = plush ? limbFur : undefined;
  add({ ...arm, p: "capsule", s: [0.16, 0.3, 0.16], hang: [0, -0.13, 0], c: limbC, m: limbM, fur: lf });
  add({ ...arm, p: "sphere", s: [0.2, 0.21, 0.18], hang: [0, -0.3, 0.01], c: limbC, m: limbM, fur: lf });
  add({ ...arm, p: "capsule", s: [0.08, 0.14, 0.08], hang: [-0.05, -0.27, 0.1], hr: [70, 0, 20], c: limbC, m: limbM, fur: plush ? { ...limbFur, length: 0.018, shells: 8 } : undefined });

  // Legs: a hip pivot each (named apart, so a walk can swing them in turn); leg, sneaker and laces swing together.
  // Heights below are from the floor, turned into offsets from the hip.
  const hipY = 0.3;
  const up = { c: [0, 0.085, 0.04], r: [0.115, 0.08, 0.2] }; // the sneaker's upper: centre and radii
  const upperTop = (dz) => up.c[1] + up.r[1] * Math.sqrt(Math.max(0, 1 - ((dz - up.c[2]) / up.r[2]) ** 2));
  for (const [side, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    const hip = { at: r3([side * 0.16, hipY, 0.0]), name };
    const h = (y, z = 0, x = 0) => r3([x, y - hipY, z]);
    add({ ...hip, p: "capsule", s: [0.17, 0.26, 0.17], hang: h(0.2), c: limbC, m: limbM, fur: lf });
    add({ ...hip, p: "capsule", s: [0.24, 0.46, 0.05], hang: h(0.025, 0.05), hr: [90, 0, 0], c: "white", m: "matte" }); // sole
    add({ ...hip, p: "sphere", s: up.r.map((x) => x * 2), hang: h(up.c[1], up.c[2]), c: shoes, m: "denim" }); // upper
    add({ ...hip, p: "sphere", s: [0.2, 0.09, 0.12], hang: h(0.055, 0.2), c: "white", m: "toy" }); // toe cap
    add({ ...hip, p: "torus", s: [0.19, 0.19, 0.12], hang: h(upperTop(0.0) - 0.012, -0.015), hr: [96, 0, 0], c: shoes, m: "denim" }); // collar
    for (const dz of [0.07, 0.11, 0.15]) {
      const slope = (Math.atan2(upperTop(dz - 0.01) - upperTop(dz + 0.01), 0.02) * 180) / Math.PI;
      add({ ...hip, p: "box", s: [0.12, 0.02, 0.028], hang: h(upperTop(dz) + 0.004, dz), hr: [r3([slope])[0], 0, 0], c: "white", m: "matte" });
    }
  }

  // Denim shorts: the seat (the body's own bottom, a little bigger), two leg tubes with rolled cuffs, a
  // waistband, belt loops and a button or drawstrings.
  const waistY = face.waist ?? -0.27; // relative to the centre
  const waist = C[1] + waistY;
  const grow = (k) => r3(body.s.map((x, i) => x * (1 + (i === 1 ? 0.06 : k))));
  void grow;
  const seat = body.seat ?? "egg_seat";
  if (seat === "egg_seat") add({ p: "egg_seat", at: r3(C), s: grow((fz * 0.7 + 0.006) / 0.4), c: "denim", m: "denim", name: "shorts" });
  else add({ p: "dome", at: r3([0, (waist + 0.26) / 2, 0]), r: [180, 0, 0], s: r3([S.side(waistY) * 2.12, (waist - 0.26) * 2, S.front(0, waistY) * 2.12]), c: "denim", m: "denim", name: "shorts" });
  const wx = S.side(waistY) + fz * 0.9 + 0.012;
  const wz = S.front(0, waistY) + fz * 0.9 + 0.012;
  for (const side of [1, -1]) {
    add({ p: "cylinder", at: [side * 0.165, 0.33, 0.01], s: [0.27, 0.16, 0.27], c: "denim", m: "denim", name: "shorts" });
    add({ p: "torus", at: [side * 0.165, 0.255, 0.01], r: [90, 0, 0], s: [0.3, 0.3, 0.32], c: "denim_light", m: "denim", name: "shorts" });
  }
  add({ p: "torus", at: r3([0, waist, 0]), r: [90, 0, 0], s: r3([wx * 2.02, wz * 2.02, 0.28]), c: "denim", m: "denim", name: "shorts" });
  const onWaist = (x) => wz * 1.01 * Math.sqrt(Math.max(0, 1 - (x / (wx * 1.01)) ** 2));
  for (const x of [0.2, -0.2]) add({ p: "box", at: r3([x, waist - 0.025, onWaist(x) + 0.006]), r: [0, (Math.atan2(x / wx, 1) * 180) / Math.PI, 0], s: [0.035, 0.08, 0.02], c: "denim", m: "denim", name: "shorts" });
  if (shortsStyle === "button") {
    add({ p: "disc", at: r3([0.0, waist - 0.012, wz + 0.03]), r: [90, 0, 0], s: [0.05, 0.05, 0.05], c: "gold", m: "metal", name: "shorts" });
    add({ p: "box", at: r3([0.012, waist - 0.1, S.front(0.012, waistY - 0.1) + fz + 0.016]), s: [0.008, 0.1, 0.01], r: [-30, 0, 0], c: "denim_light", m: "denim", name: "shorts" });
  } else {
    for (const x of [0.03, -0.03]) add({ p: "capsule", at: r3([x, waist - 0.07, wz + 0.03]), s: [0.025, 0.12, 0.025], r: [0, 0, x > 0 ? -8 : 8], c: "white", m: "matte", name: "shorts" });
  }

  // A backwards cap on a shared pivot (it tips and turns as one): crown, button, brim at the back, the
  // strap gap (dark hair) and strap in front.
  if (hat === "cap") {
    const tilt = -18;
    const baseY = face.capY ?? 0.31;
    const cx = S.side(baseY) + fz + 0.03;
    const cz = S.front(0, baseY) + fz + 0.03;
    const topY = S.top() + fz + 0.02;
    const h = topY - baseY + 0.05;
    const capPivot = { on: "head", at: r3([0, baseY, -0.04]), r: [tilt, 0, 0], name: "cap" };
    add({ ...capPivot, p: "dome", s: r3([cx * 2, h * 2, cz * 2.08]), hang: r3([0, h / 2, 0]), c: cap, m: "denim" }); // crown
    add({ ...capPivot, p: "sphere", s: [0.06, 0.035, 0.06], hang: r3([0, h + 0.005, 0]), c: cap, m: "denim" }); // top button
    add({ ...capPivot, p: "brim", s: [0.64, 0.8, 0.58], hang: r3([0, 0.02, -cz - 0.13]), hr: [8, 180, 0], c: cap, m: "denim" });
    add({ ...capPivot, p: "sphere", s: [0.2, 0.17, 0.03], hang: r3([0, 0.06, cz * 0.97]), c: "brow", m: "plush" }); // the gap
    add({ ...capPivot, p: "box", s: [0.24, 0.035, 0.035], hang: r3([0, 0.025, cz + 0.005]), c: cap, m: "denim" }); // strap
  }
  const browY = eyeY + 0.17;
  for (const p of extras({ S, C, fz, eye: { x: eyeX, y: eyeY, z: eyeZ, size: eyeSize }, sh, armR })) add(p);
  return {
    color: body.c ?? "plush",
    sound,
    description,
    tags,
    head: { at: r3(head) },
    eyes: { at: r3([eyeX, eyeY, eyeZ]), size: eyeSize, iris: "eye_brown", color: "black" },
    brows: { color: "brow", size: 1.05, lift: -0.25, dz: r3([S.front(eyeX + 0.02, browY) + fz * 0.8 - eyeZ])[0] },
    cheeks: { at: r3([0.2, eyeY - 0.16, S.front(0.2, eyeY - 0.16) + fz * 0.15]), size: 0.1, color: "blush" },
    mouth: { open: true, at: r3([0, eyeY - 0.2, S.front(0, eyeY - 0.2) + fz + 0.006]), size: face.mouth ?? 0.24, color: "mouth" },
    bob: 0.015,
    parts,
  };
}

const FLUFFY_BODY = { p: "egg", at: [0, 0.8, 0], s: [0.9, 1.0, 0.84], m: "plush", fur: FUR };
const base = (more) => fluffy({ body: FLUFFY_BODY, ...more });
const DEG = Math.PI / 180;

/** Where a point hung `hang` from an arm pivot ends up in the body frame, for the +x arm at rest angles r (deg). */
function onArm(sh, r, hang) {
  const e = new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG);
  return new THREE.Vector3(...hang).applyEuler(e).add(new THREE.Vector3(...sh)).toArray();
}

// Accessories, as parts (on the critters) and as props (for anyone).
const glasses = ({ eye }) => {
  const z = eye.z + eye.size * 0.3;
    const ring = eye.size * 1.5;
  return [
    { p: "torus", on: "head", at: r3([eye.x, eye.y, z]), s: r3([ring, ring * 1.05, 0.13]), c: "ink", m: "glossy", mirror: true, name: "glasses" },
    { p: "capsule", on: "head", at: r3([0, eye.y + 0.02, z + 0.005]), r: [0, 0, 90], s: [0.022, 0.06, 0.022], c: "ink", m: "glossy", name: "glasses" },
    { p: "box", on: "head", at: r3([eye.x + ring * 0.5 + 0.05, eye.y + 0.02, z - 0.1]), r: [0, -62, 0], s: [0.18, 0.024, 0.022], c: "ink", m: "glossy", mirror: true, name: "glasses" },
  ];
};
/** A cape hanging behind the body from the shoulders to the knees, flaring out past the sides. */
const cape = (color) => ({ C, S }) => [
  { p: "cape", at: r3([0, C[1] - 0.2, -0.08]), s: r3([S.side(-0.2) * 2.6, 0.7, S.front(0, -0.2) * 2.5]), c: color, m: "plush", name: "cape", idle: { r: [3, 0, 0], hz: 0.6 } },
];

/** The rest angles (deg) that put a hand (0.3 down the arm from shoulder sh) nearest the target, on a 3 degree grid. */
function aim(sh, target) {
  const s = new THREE.Vector3(...sh);
  const t = new THREE.Vector3(...target);
  let best = [Infinity, [0, 0, 0]];
  for (let x = -180; x < 180; x += 3) for (let y = -60; y <= 60; y += 6) for (let z = -180; z < 180; z += 3) {
    const d = new THREE.Vector3(0, -0.3, 0.01).applyEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG)).add(s).distanceTo(t);
    if (d < best[0]) best = [d, [x, y, z]];
  }
  return best[1];
}

const critters = {
  fluffy: base({
    description: "Fluffy: a round cream plush buddy with real fuzz, big brown eyes, thick brows and a wide grin, in a backwards red cap, denim shorts and red sneakers. Named parts: arm (mitten hands with thumbs), leg_left, leg_right, cap, shorts.",
    tags: ["fluffy", "mascot", "plush", "friend", "lead"],
  }),
  fluffy_smart: base({
    description: "Smart Fluffy: Fluffy in a green cap and round glasses, holding an open book in both hands (reading, school, stories). Named parts: arm, book, glasses, cap, leg_left, leg_right.",
    tags: ["fluffy", "mascot", "plush", "school", "reading", "books"],
    cap: "green", shoes: "green", armR: (sh) => aim(sh, [0.16, 0.5, 0.5]), sound: "Let's read!",
    face: { shoulder: -0.08, shoulderZ: 0.2 },
    extras: (f) => {
      const hand = onArm(f.sh, f.armR, [0, -0.3, 0.01]);
      const y = hand[1] + 0.05;
      const z = hand[2] + 0.05;
      const book = [];
      for (const side of [1, -1]) {
        book.push({ p: "box", at: r3([side * 0.12, y, z]), r: [-28, side * -22, 0], s: [0.23, 0.3, 0.025], c: "leaf", m: "toy", name: "book" });
        book.push({ p: "box", at: r3([side * 0.11, y + 0.005, z + 0.022]), r: [-28, side * -22, 0], s: [0.2, 0.27, 0.03], c: "white", m: "paper", name: "book" });
      }
      return [...glasses(f), ...book];
    },
  }),
  fluffy_magic: base({
    description: "Magic Fluffy: Fluffy as a little wizard, in a starry purple hat and cape, with a gold star wand in the left mitten (stories, magic, pretend play). Named parts: arm (the wand rides on it), hat, cape, leg_left, leg_right.",
    tags: ["fluffy", "mascot", "plush", "magic", "pretend", "stories"],
    hat: "wizard", shoes: "purple", sound: "Abracadabra!",
    extras: (f) => {
      const { S, fz, sh, armR } = f;
      const baseY = 0.28;
      const rx = S.side(baseY) + fz + 0.03;
      const hat = { on: "head", at: r3([0, baseY, -0.02]), r: [-10, 0, 6], name: "hat" };
      // The wand: from the mitten up and out (in the arm's own frame, world up is about (sin r, cos r)).
      const up = [Math.sin(armR[2] * DEG), Math.cos(armR[2] * DEG), 0.25];
      const along = (k) => r3([up[0] * k, -0.3 + up[1] * k, 0.04 + up[2] * k]);
      const wand = { at: r3(sh), r: armR, name: "arm", idle: { r: [0, 0, 5], hz: 0.5 } };
      return [
        { ...hat, p: "cylinder", s: r3([rx * 2.5, 0.035, rx * 2.4]), hang: [0, 0, 0], c: "purple", m: "plush" },
        { ...hat, p: "torus", s: r3([rx * 2.05, rx * 2.0, 0.3]), hang: [0, 0.03, 0], hr: [90, 0, 0], c: "purple", m: "plush" },
        { ...hat, p: "cone", s: [0.72, 0.62, 0.72], hang: [0, 0.33, 0], c: "purple", m: "plush" },
        { ...hat, p: "cone", s: [0.28, 0.26, 0.28], hang: [0.06, 0.7, -0.05], hr: [0, 0, -28], c: "purple", m: "plush" },
        { ...hat, p: "star", s: [0.13, 0.13, 0.13], hang: [0.1, 0.2, 0.25], hr: [-30, 15, 10], c: "gold", m: "glow" },
        { ...hat, p: "star", s: [0.1, 0.1, 0.1], hang: [-0.12, 0.36, 0.16], hr: [-25, -20, -15], c: "gold", m: "glow" },
        { ...hat, p: "star", s: [0.07, 0.07, 0.07], hang: [0.03, 0.52, 0.09], hr: [-20, 0, 20], c: "gold", m: "glow" },
        ...cape("purple")(f),
        { ...wand, p: "cylinder", s: [0.026, 0.34, 0.026], hang: along(0.15), hr: [r3([Math.atan2(up[2], up[1]) / DEG])[0], 0, -armR[2]], c: "brown", m: "toy" },
        { ...wand, p: "star", s: [0.14, 0.14, 0.14], hang: along(0.34), hr: [0, 0, -armR[2]], c: "gold", m: "glow" },
      ];
    },
  }),
  fluffy_sporty: base({
    description: "Sporty Fluffy: Fluffy in a blue backwards cap and a blue number 1 jersey, a basketball in the left mitten (sports, games, counting points). Named parts: arm (the ball rides on it), jersey, cap, leg_left, leg_right.",
    tags: ["fluffy", "mascot", "plush", "sports", "games", "basketball"],
    cap: "blue", shoes: "blue", sound: "Let's play!",
    extras: (f) => {
      const { S, C, fz, sh, armR } = f;
      const k = (fz + 0.05) / 0.42;
      const front = (x, y) => S.front(x, y) * (1 + k) + 0.006;
      const one = (x, y, w, h, rz = 0) => ({ p: "box", at: r3([x, C[1] + y, front(x, y)]), r: [r3([-Math.atan2(S.front(x, y + 0.02) - S.front(x, y - 0.02), 0.04) / DEG])[0], 0, rz], s: [w, h, 0.02], c: "white", m: "toy", name: "jersey" });
      const ball = { at: r3(sh), r: armR, name: "arm", idle: { r: [0, 0, 5], hz: 0.5 } };
      return [
        { p: "egg_shirt", at: r3(C), s: r3(FLUFFY_BODY.s.map((x, i) => x * (1 + (i === 1 ? 0.02 : k)))), c: "blue", m: "denim", name: "jersey" },
        { p: "torus", at: r3([0, C[1] - 0.15, 0]), r: [90, 0, 0], s: r3([(S.side(-0.15) + fz + 0.016) * 2.02, (S.front(0, -0.15) + fz + 0.016) * 2.02, 0.1]), c: "white", m: "denim", name: "jersey" },
        // A white "1" low on the chest (under the grin): a stem, a flag and a foot.
        one(0.012, -0.25, 0.045, 0.15),
        one(-0.006, -0.2, 0.034, 0.065, -45),
        one(0.012, -0.32, 0.1, 0.03),
        { ...ball, p: "sphere", s: [0.27, 0.27, 0.27], hang: [0.04, -0.42, 0.06], c: "basketball", m: "plush" },
        { ...ball, p: "torus", s: [0.28, 0.28, 0.05], hang: [0.04, -0.42, 0.06], hr: [0, 90, 0], c: "ink", m: "matte" },
        { ...ball, p: "torus", s: [0.28, 0.28, 0.05], hang: [0.04, -0.42, 0.06], hr: [90, 0, 0], c: "ink", m: "matte" },
      ];
    },
  }),
  fluffy_super: base({
    description: "Super Fluffy: Fluffy as a superhero, with a blue eye mask, a red cape and a gold star on the chest (brave, helping, hero stories). Named parts: arm, mask, cape, star, cap, leg_left, leg_right.",
    tags: ["fluffy", "mascot", "plush", "hero", "pretend", "stories"],
    sound: "To the rescue!",
    extras: (f) => {
      const { S, C, fz, eye } = f;
      return [
        { p: "mask", on: "head", at: r3([0, eye.y + 0.01, S.front(0, eye.y) + fz + 0.005]), s: [0.66, 0.62, 0.62], c: "blue", m: "toy", name: "mask" },
        ...cape("cap_red")(f),
        { p: "star", at: r3([0.0, C[1] - 0.2, S.front(0, -0.2) + fz + 0.01]), r: [-12, 0, 0], s: [0.15, 0.15, 0.25], c: "gold", m: "metal", name: "star" },
      ];
    },
  }),
  yogurt_man: fluffy({
    description: "Yogurt Man: Fluffy's smooth friend with a soft, glossy yogurt-white body, a blue backwards cap, denim shorts and blue sneakers.",
    tags: ["fluffy", "mascot", "friend", "food", "yogurt"],
    body: { p: "gumdrop", at: [0, 0.8, 0], s: [0.82, 1.04, 0.78], c: "yogurt", m: "toy", seat: "dome" },
    cap: "blue", shoes: "blue", limbs: "smooth", sound: "Smooth moves!",
    face: { eyeY: 0.1 },
  }),
  dumpling_buddy: fluffy({
    description: "Dumpling Buddy: Fluffy's friend shaped like a soft steamed dumpling with pleats on top, a yellow backwards cap, drawstring shorts and yellow sneakers.",
    tags: ["fluffy", "mascot", "friend", "food", "dumpling"],
    body: { p: "bao", at: [0, 0.74, 0], s: [0.98, 0.84, 0.9], c: "dough", m: "plush", seat: "dome" },
    cap: "yellow", shoes: "yellow", limbs: "smooth", shortsStyle: "drawstring", sound: "Yum yum!",
    face: { eyeY: 0.06, mouth: 0.22, capY: 0.22, waist: -0.22 },
  }),
};

const props = {
  basketball: {
    color: "basketball", description: "An orange basketball with dark seams.", tags: ["sports", "ball", "games", "fluffy"],
    parts: [
      { p: "sphere", at: [0, 0.3, 0], s: [0.6, 0.6, 0.6], m: "plush" },
      { p: "torus", at: [0, 0.3, 0], r: [0, 90, 0], s: [0.62, 0.62, 0.08], c: "ink", m: "matte" },
      { p: "torus", at: [0, 0.3, 0], r: [90, 0, 0], s: [0.62, 0.62, 0.08], c: "ink", m: "matte" },
      { p: "torus", at: [0, 0.3, 0], s: [0.62, 0.62, 0.08], c: "ink", m: "matte" },
    ],
  },
  magic_wand: {
    color: "brown", description: "A wooden magic wand with a glowing gold star on top.", tags: ["magic", "pretend", "stories", "fluffy"],
    parts: [
      { p: "cylinder", at: [0, 0.3, 0], s: [0.05, 0.6, 0.05], m: "toy" },
      { p: "star", at: [0, 0.68, 0], s: [0.26, 0.26, 0.26], c: "gold", m: "glow", name: "light" },
    ],
  },
  round_glasses: {
    color: "ink", description: "Round black reading glasses (on a head: parent the critter, part head).", tags: ["school", "reading", "clothes", "fluffy"],
    parts: [
      { p: "torus", at: [0.13, 0.13, 0], s: [0.24, 0.26, 0.3], m: "glossy", mirror: true },
      { p: "capsule", at: [0, 0.15, 0], r: [0, 0, 90], s: [0.02, 0.05, 0.02], m: "glossy" },
    ],
  },
  wizard_hat: {
    color: "purple", description: "A floppy purple wizard hat with gold stars.", tags: ["magic", "pretend", "clothes", "fluffy"],
    parts: [
      { p: "cylinder", at: [0, 0.015, 0], s: [0.9, 0.03, 0.9], m: "plush" },
      { p: "cone", at: [0, 0.33, 0], r: [-6, 0, 6], s: [0.56, 0.62, 0.56], m: "plush" },
      { p: "star", at: [0.06, 0.24, 0.22], r: [-15, 0, 10], s: [0.1, 0.1, 0.1], c: "gold", m: "glow" },
      { p: "star", at: [-0.08, 0.42, 0.12], r: [-15, 0, -15], s: [0.08, 0.08, 0.08], c: "gold", m: "glow" },
    ],
  },
  baseball_cap: {
    color: "cap_red", description: "A red baseball cap with a brim (turn it 180 degrees to wear it backwards).", tags: ["clothes", "sports", "fluffy"],
    parts: [
      { p: "dome", at: [0, 0.14, 0], s: [0.8, 0.56, 0.8], m: "denim" },
      { p: "brim", at: [0, 0.03, 0.5], r: [-6, 0, 0], s: [0.56, 0.8, 0.5], m: "denim" },
      { p: "sphere", at: [0, 0.29, 0], s: [0.06, 0.03, 0.06], m: "denim" },
    ],
  },
  eye_mask: {
    color: "blue", description: "A superhero eye mask with two eye holes.", tags: ["hero", "pretend", "clothes", "fluffy"],
    parts: [{ p: "mask", at: [0, 0.12, 0], s: [0.6, 0.6, 0.55], m: "toy" }],
  },
  hero_cape: {
    color: "cap_red", description: "A soft red hero cape (hang it on a critter's back).", tags: ["hero", "pretend", "clothes", "fluffy"],
    parts: [{ p: "cape", at: [0, 0.31, 0], s: [1.0, 0.62, 1.0], m: "plush", idle: { r: [3, 0, 0], hz: 0.6 } }],
  },
  star_badge: {
    color: "gold", description: "A shiny gold star badge (a hero's chest star, a sticker reward).", tags: ["hero", "reward", "fluffy"],
    parts: [{ p: "star", at: [0, 0.2, 0], s: [0.4, 0.4, 0.5], m: "metal" }],
  },
};

const out = {
  description: "Fluffy and friends: a round plush mascot (real fur shells, big cartoon eyes, a grin, a backwards cap, denim shorts and sneakers) in seven looks, and the outfit props they use. Generated by tools/gen_fluffy.mjs: edit that, not this file.",
  critters,
  props,
};
writeFileSync(new URL("../catalog/models/fluffy.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`fluffy.json: ${Object.keys(critters).length} critters, ${Object.keys(props).length} props`);
