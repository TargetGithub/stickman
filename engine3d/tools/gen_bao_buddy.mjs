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
import { BAO_COLLAR } from "../runtime/dough.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const DEG = Math.PI / 180;

const FEET = 0.16; // the body's bottom sits on the feet
const BODY = { s: [1.06, 1.0, 0.96], c: "bao_dough", m: "dough" };
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

  // Nose: two tiny dots.
  const noseY = share(0.677);
  add({ p: "sphere", on: "head", at: rel([0.03, noseY, S.front(0.03, noseY) + 0.002]), s: [0.022, 0.017, 0.012], c: "bao_line", m: "matte", mirror: true, name: "nose" });

  // Leaf collar: an upright band under the bun's tuck, a lighter rolled lip, an orange button in front and a
  // cupped leaf flap at each side sweeping out and a little back.
  const top = share(0.35);
  const R = (a) => S.around(top, a) + 0.008;
  const band = { at: r3([0, top, 0]), s: r3([R(Math.PI / 2) * 2, 0.95, R(0) * 2]), name: "collar" };
  add({ ...band, p: "leaf_collar", c: "leaf_lime", m: "toy" });
  add({ ...band, p: "collar_lip", s: r3([band.s[0], 1, band.s[2]]), c: "leaf_light", m: "toy" });
  const by = top - 0.05;
  add({ p: "sphere", at: r3([0, by, S.front(0, by) + 0.045]), s: [0.075, 0.06, 0.05], c: "button_orange", m: "glossy", name: "collar" });
  // The leaves face forward and up (hr turns the leaf's face to the front; not mirrored, so both cup the same way).
  const fa = 52 * DEG;
  const fr = R(fa) - 0.025;
  for (const side of [1, -1]) {
    add({ p: "leaf_flap", at: r3([side * Math.sin(fa) * fr, top - 0.04, Math.cos(fa) * fr]), r: [-50, side * 15, side * 72], hr: [0, -90, 0], s: [0.3, 0.3, 0.3], c: "leaf_lime", m: "toy", name: "collar" });
  }

  // Arms: a stubby nub each, poking out under the leaf flaps, on a shoulder pivot (mirrored).
  const shY = share(0.22);
  const sh = r3([S.side(shY, 0.13) - 0.05, shY, 0.13]);
  const arm = { at: sh, r: [0, 0, 72], mirror: true, name: "arm", c: BODY.c, m: BODY.m, idle: { r: [0, 0, 4], hz: 0.5 } };
  add({ ...arm, p: "capsule", s: [0.12, 0.15, 0.12], hang: [0, -0.05, 0] });
  add({ ...arm, p: "sphere", s: [0.14, 0.13, 0.13], hang: [0, -0.12, 0.01] });

  // Feet: a short round stump and a soft rounded toe each, on hip pivots named apart (for walks).
  for (const [side, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    const hip = { at: r3([side * 0.165, 0.24, 0.0]), name, c: BODY.c, m: BODY.m };
    add({ ...hip, p: "capsule", s: [0.155, 0.27, 0.155], hang: [0, -0.105, 0] });
    add({ ...hip, p: "sphere", s: [0.155, 0.1, 0.15], hang: [0, -0.19, 0.06] });
  }

  const eye = { x: 0.2, y: share(0.755), size: 0.165 };
  eye.z = S.front(eye.x, eye.y) - 0.022;
  const browY = share(0.848);
  const mouthY = share(0.553);
  // How far the face leans back at the mouth (the bun bulges out below it), so the grin lies on the dough.
  const lean = r3([Math.atan2(S.front(0, mouthY - 0.05) - S.front(0, mouthY + 0.05), 0.1) / DEG])[0];
  const cheekY = share(0.64);
  return {
    color: BODY.c,
    sound: "Bao bao!",
    description: "Bao Buddy: a smooth cream steamed-bun friend, an onion-shaped body gathering in pleats to a little top knot, wide anime eyes under thick lids, thin brows, a big open grin and pink cheeks, in a green leaf collar with an orange button, on stubby arms and feet. Named parts: arm (mirrored), leg_left, leg_right, collar (band, lip, button and leaf flaps: remove or swap it), knot, belly, nose.",
    tags: ["bao", "bao_buddy", "mascot", "dumpling", "food", "friend", "lead"],
    head: { at: r3(HEAD), tilt: 0.4 }, // feelings tip the bun gently, so the collar stays in view
    eyes: { at: rel([eye.x, eye.y, eye.z]), size: eye.size, iris: "eye_brown", color: "pupil_dark", lid: "bao_line" },
    brows: { shape: "brow_thin", color: "brow", size: 0.72, lift: r3([(browY - eye.y) / eye.size - 1.25])[0], dz: r3([S.front(eye.x, browY) - eye.z + 0.006])[0] },
    cheeks: { at: rel([0.235, cheekY, S.front(0.235, cheekY) - 0.014]), size: 0.15, tall: 0.42, color: "bao_blush" },
    mouth: { open: true, at: rel([0, mouthY, S.front(0, mouthY) - 0.012]), tilt: -lean, size: 0.29, shape: "grin_wide", teeth: [0.4, 0.045], tongueSize: [0.5, 0.3], color: "bao_mouth", tongue: "bao_tongue" },
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
