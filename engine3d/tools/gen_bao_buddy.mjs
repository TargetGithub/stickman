#!/usr/bin/env node
// Writes catalog/models/bao_buddy.json: Bao Buddy, a smooth steamed-bun friend (an onion-shaped dough body
// gathering in pleats to a top knot, a leaf collar with an orange button and two leaf flaps, stubby arms and
// feet, wide anime eyes and a big grin). The face is placed by measuring the real body shape; heights below are
// shares of the body's height measured off the reference picture. Edit this file, not the JSON:
//   node engine3d/tools/gen_bao_buddy.mjs
// Bao Buddy faces +z; its left is +x. Heights are from the floor.

import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { shapeGeometry } from "../runtime/geometry.js";
import { BAO_COLLAR, COLLAR_BAND } from "../runtime/dough.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const DEG = Math.PI / 180;

const FEET = 0.12; // the body's bottom sits on the feet
const ARM_LENGTH = 0.26; // shoulder to palm: long, thin Minion-style arms
const BODY = { s: [1.03, 1.0, 1.03], c: "bao_dough", m: "dough" };
const C = [0, FEET + BODY.s[1] / 2, 0]; // body centre
const share = (k) => FEET + k * BODY.s[1]; // height of a share of the body
const HEAD = [0, share(BAO_COLLAR) + 0.01, 0]; // head pivot: inside the collar

/** The whole bun's surface as the page builds it (raycast): front z at (x, y), side x at y; y is from the floor. */
function surface() {
  const mesh = new THREE.Mesh(shapeGeometry("bao_drop"), new THREE.MeshBasicMaterial());
  mesh.scale.set(...BODY.s);
  mesh.position.set(...C);
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const hit = (o, d) => {
    ray.set(new THREE.Vector3(...o), new THREE.Vector3(...d));
    return ray.intersectObject(mesh)[0]?.point;
  };
  return {
    front: (x, y) => hit([x, y, 5], [0, 0, -1])?.z ?? 0,
    side: (y, z = 0) => hit([5, y, z], [-1, 0, 0])?.x ?? 0,
    top: () => hit([0.004, 5, 0.004], [0, -1, 0])?.y ?? 0,
    /** The surface's turn at (x, y) as [pitch, yaw] in degrees: how to stand a flat face part on it. */
    turn: (x, y) => {
      const h = 0.01;
      const f = (u, v) => hit([u, v, 5], [0, 0, -1])?.z ?? 0;
      const dx = (f(x + h, y) - f(x - h, y)) / (2 * h), dy = (f(x, y + h) - f(x, y - h)) / (2 * h);
      return r3([Math.atan(dy) / DEG, Math.atan(-dx) / DEG]);
    },
    /** Distance from the centre line to the surface at height y, in direction angle a (from the front). */
    around: (y, a) => {
      const p = hit([Math.sin(a) * 5, y, Math.cos(a) * 5], [-Math.sin(a), 0, -Math.cos(a)]);
      return p ? Math.hypot(p.x, p.z) : 0;
    },
  };
}

function baoBuddy() {
  const S = surface();
  const parts = [];
  const add = (p) => parts.push(p);
  const rel = (v) => r3([v[0] - HEAD[0], v[1] - HEAD[1], v[2] - HEAD[2]]); // body frame -> head frame

  // Body: the head (above the collar, tilts with feelings) and the belly overlap inside the collar; the knot
  // sits in the pinch on top.
  add({ p: "bao_head", on: "head", at: rel(C), s: BODY.s, c: BODY.c, m: BODY.m });
  add({ p: "bao_belly", at: r3(C), s: BODY.s, c: BODY.c, m: BODY.m, name: "belly" });
  add({ p: "bao_knot", on: "head", at: rel([0, S.top() + 0.045, 0]), s: [0.18, 0.15, 0.17], c: BODY.c, m: BODY.m, name: "knot" });

  // Nose: two short slanted dashes, \ /, rising outward.
  const noseY = share(0.676);
  const nt = S.turn(0.026, noseY);
  add({ p: "capsule", on: "head", at: rel([0.026, noseY, S.front(0.026, noseY) + 0.002]), r: [nt[0], nt[1], -72], s: [0.009, 0.026, 0.006], c: "bao_nose", m: "matte", mirror: true, name: "nose" });

  // Cheeks: a soft blush, seven see-through ovals stacked so the pink fades out at the edge, lying on the dough.
  const cheek = { x: 0.285, y: share(0.636) };
  const ct = S.turn(cheek.x, cheek.y);
  [1, 0.88, 0.77, 0.66, 0.55, 0.45, 0.36].forEach((k, i) => {
    add({ p: "sphere", on: "head", at: rel([cheek.x, cheek.y, S.front(cheek.x, cheek.y) + 0.001 + i * 0.0006]), r: [ct[0], ct[1], 0], s: r3([0.165 * k, 0.07 * k, 0.003]), c: "bao_blush", m: "blush", mirror: true, name: "cheeks" });
  });

  // Leaf collar: a tight band squeezing the dough (built on the bun's own surface, so it shares the bun's centre
  // and scale), a lighter rolled lip, an orange button in front and a cupped leaf flap at each side.
  const top = share(COLLAR_BAND.hi);
  const R = (a) => S.around(top - 0.03, a) + 0.017;
  add({ p: "leaf_collar", at: r3(C), s: BODY.s, c: "leaf_lime", m: "toy", name: "collar" });
  add({ p: "collar_lip", at: r3(C), s: BODY.s, c: "leaf_light", m: "toy", name: "collar" });
  const by = share((COLLAR_BAND.lo + COLLAR_BAND.hi) / 2);
  add({ p: "sphere", at: r3([0, by, S.front(0, by) + 0.03]), s: [0.075, 0.06, 0.045], c: "button_orange", m: "glossy", name: "collar" });
  // The leaves face forward and up (hr turns the leaf's face to the front; not mirrored, so both cup the same way).
  const fa = 40 * DEG;
  const fr = R(fa) - 0.025;
  for (const side of [1, -1]) {
    add({ p: "leaf_flap", at: r3([side * Math.sin(fa) * fr, top - 0.04, Math.cos(fa) * fr]), r: [-58, side * 26, side * 86], hr: [0, -90, 0], s: [0.31, 0.31, 0.31], c: "leaf_lime", m: "toy", name: "collar" });
  }

  // Arms: long thin Minion-style arms hanging at the sides from under the leaves, each on a shoulder pivot
  // (mirrored): the arm, a round palm, three fingers fanned front to back and a thumb pointing forward. In the
  // arm's frame the arm hangs down -y and +z is the front.
  const shY = share(0.225);
  const sh = r3([S.side(shY, 0.1) - 0.035, shY, 0.1]);
  const arm = { at: sh, r: [-10, 0, 20], mirror: true, name: "arm", c: BODY.c, m: BODY.m, idle: { r: [3, 0, 4], hz: 0.5 } };
  const L = ARM_LENGTH;
  add({ ...arm, p: "capsule", s: r3([0.075, L + 0.02, 0.075]), hang: r3([0, -L / 2, 0]) });
  add({ ...arm, p: "sphere", s: [0.115, 0.1, 0.095], hang: r3([0, -L - 0.015, 0]) });
  for (const [dz, tilt] of [[-0.034, 18], [0, 0], [0.034, -18]]) {
    add({ ...arm, p: "capsule", s: [0.04, 0.09, 0.04], hang: r3([0.004, -L - 0.075, dz]), hr: [tilt, 0, 6] });
  }
  add({ ...arm, p: "capsule", s: [0.042, 0.08, 0.042], hang: r3([-0.022, -L - 0.025, 0.058]), hr: [-62, 0, 18] });

  // Feet: a short round stump and a soft rounded toe each, on hip pivots named apart (for walks).
  for (const [side, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    const hip = { at: r3([side * 0.165, 0.2, 0.0]), name, c: BODY.c, m: BODY.m };
    add({ ...hip, p: "capsule", s: [0.155, 0.27, 0.155], hang: [0, -0.105, 0] });
    add({ ...hip, p: "sphere", s: [0.155, 0.1, 0.15], hang: [0, -0.19, 0.06] });
  }

  // Eye frame (toon_face.js): width 1 = size, origin at the dome's centre line, the lash line 0.3 below it.
  const eye = { x: 0.222, y: share(0.74), size: 0.16 };
  eye.z = S.front(eye.x, eye.y) + 0.007; // just off the dough, so the white layer never sinks into it
  const browY = share(0.844);
  const mouthY = share(0.553);
  // How far the face leans back at the mouth (the bun bulges out below it), so the grin lies on the dough.
  const lean = r3([Math.atan2(S.front(0, mouthY - 0.05) - S.front(0, mouthY + 0.05), 0.1) / DEG])[0];
  return {
    color: BODY.c,
    sound: "Bao bao!",
    description: "Bao Buddy: a smooth cream steamed-bun friend, an onion-shaped body gathering in pleats to a little top knot, wide anime eyes under thick lids, thin brows, a big open grin and pink cheeks, in a green leaf collar with an orange button, on stubby arms and feet. Named parts: arm (mirrored), leg_left, leg_right, collar (band, lip, button and leaf flaps: remove or swap it), knot, belly, nose.",
    tags: ["bao", "bao_buddy", "mascot", "dumpling", "food", "friend", "lead"],
    head: { at: r3(HEAD), tilt: 0.4, look: [0.4, 0.15] }, // feelings tip the bun gently, so the collar stays in view
    eyes: { at: rel([eye.x, eye.y, eye.z]), size: eye.size, turn: S.turn(eye.x, eye.y), iris: "bao_iris", rim: "bao_iris_rim", color: "bao_pupil", pupilLow: "bao_pupil_blue", crescent: "bao_glint", white: "eye_white_cool", shade: "eye_shade_cool", lid: "bao_line" },
    brows: { shape: "brow_thin", color: "bao_brow", size: 0.74, lift: r3([(browY - eye.y) / eye.size - 1.25])[0], dz: r3([S.front(eye.x, browY) - eye.z + 0.006])[0] },
    mouth: { open: true, at: rel([0, mouthY, S.front(0, mouthY) - 0.012]), tilt: -lean, size: 0.28, shape: "grin_wide", teethShape: "grin_wide_teeth", tongueShape: "grin_wide_tongue", color: "bao_mouth", tongue: "bao_tongue" },
    bob: 0.012,
    parts,
  };
}

const out = {
  description: "Bao Buddy: a smooth steamed-bun mascot (dough body, leaf collar, anime eyes, open grin). Generated by tools/gen_bao_buddy.mjs: edit that, not this file.",
  critters: { bao_buddy: baoBuddy() },
};
writeFileSync(new URL("../catalog/models/bao_buddy.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log("bao_buddy.json: 1 critter");
