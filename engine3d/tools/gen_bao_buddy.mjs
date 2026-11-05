#!/usr/bin/env node
// Writes catalog/models/bao_buddy.json: Bao Buddy, a smooth steamed-bun friend (teardrop dough body with
// twisting pleats and a top knot, a green leaf collar with an orange button, stubby arms and feet, anime eyes and
// a big grin). The face is placed by measuring the real body shape, so edit this file, not the JSON:
//   node engine3d/tools/gen_bao_buddy.mjs
// Bao Buddy faces +z; its left is +x. Heights are from the floor; one unit is about its height.

import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { shapeGeometry } from "../runtime/geometry.js";
import { BAO_COLLAR } from "../runtime/dough.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);

const FEET = 0.1; // the body's bottom sits on the feet
const BODY = { s: [1.0, 1.0, 0.92], c: "bao_dough", m: "dough" };
const C = [0, FEET + BODY.s[1] / 2, 0]; // body centre
const share = (k) => FEET + k * BODY.s[1]; // height of a share of the body
const HEAD = [0, share(BAO_COLLAR) + 0.01, 0]; // head pivot: the collar's middle

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
  };
}

function baoBuddy() {
  const S = surface();
  const parts = [];
  const add = (p) => parts.push(p);
  const rel = (v) => r3([v[0] - HEAD[0], v[1] - HEAD[1], v[2] - HEAD[2]]); // body frame -> head frame

  // Body: the head (above the collar, tilts with feelings) and the belly overlap inside the collar.
  add({ p: "bao_head", on: "head", at: rel(C), s: BODY.s, c: BODY.c, m: BODY.m });
  add({ p: "bao_belly", at: r3(C), s: BODY.s, c: BODY.c, m: BODY.m, name: "belly" });
  const top = S.top();
  add({ p: "bao_knot", on: "head", at: rel([0, top + 0.06, 0]), s: [0.22, 0.19, 0.21], c: BODY.c, m: BODY.m, name: "knot" });

  // Face (the eyes, brows, cheeks and grin are face-rig fields below); two tiny nose dots.
  const eye = { x: 0.185, y: share(0.745), size: 0.155 };
  eye.z = S.front(eye.x, eye.y) - 0.04;
  const noseY = share(0.672);
  add({ p: "sphere", on: "head", at: rel([0.026, noseY, S.front(0.026, noseY) + 0.003]), s: [0.024, 0.018, 0.014], c: "brow", m: "matte", mirror: true, name: "nose" });

  // Leaf collar: hugs the bun just under its widest, flaps out at the sides; an orange button in front.
  const collarY = share(0.355);
  const cx = S.side(collarY) + 0.006;
  const cz = S.front(0, collarY) + 0.006;
  add({ p: "leaf_collar", at: r3([0, collarY, 0]), s: r3([cx * 2, 0.75, cz * 2]), c: "leaf_lime", m: "toy", name: "collar" });
  const by = collarY - 0.045;
  add({ p: "sphere", at: r3([0, by, S.front(0, by) + 0.03]), s: [0.08, 0.06, 0.045], c: "button_orange", m: "glossy", name: "collar" });

  // Arms: a stubby nub each, just under the collar, on a shoulder pivot (mirrored).
  const shY = share(0.24);
  const sh = r3([S.side(shY, 0.04) - 0.06, shY, 0.04]);
  const arm = { at: sh, r: [0, 0, 50], mirror: true, name: "arm", c: BODY.c, m: BODY.m, idle: { r: [0, 0, 4], hz: 0.5 } };
  add({ ...arm, p: "capsule", s: [0.11, 0.16, 0.11], hang: [0, -0.06, 0] });
  add({ ...arm, p: "sphere", s: [0.13, 0.12, 0.12], hang: [0, -0.13, 0.01] });

  // Feet: a short round leg and a soft round foot each, on hip pivots named apart (for walks).
  for (const [side, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    const hip = { at: r3([side * 0.18, 0.17, 0.0]), name, c: BODY.c, m: BODY.m };
    add({ ...hip, p: "capsule", s: [0.17, 0.17, 0.17], hang: [0, -0.05, 0] });
    add({ ...hip, p: "sphere", s: [0.2, 0.12, 0.24], hang: [0, -0.11, 0.04] });
  }

  const mouthY = share(0.555);
  const cheekY = share(0.64);
  const browY = share(0.85);
  return {
    color: BODY.c,
    sound: "Bao bao!",
    description: "Bao Buddy: a smooth cream steamed-bun friend, a teardrop body with pleats twisting up to a little top knot, big anime eyes, thin brows, a wide open grin and pink cheeks, in a green leaf collar with an orange button, on stubby arms and feet. Named parts: arm (mirrored), leg_left, leg_right, collar (remove or swap it), knot, belly, nose.",
    tags: ["bao", "bao_buddy", "mascot", "dumpling", "food", "friend", "lead"],
    head: { at: r3(HEAD) },
    eyes: { at: rel([eye.x, eye.y, eye.z]), size: eye.size, iris: "eye_brown", color: "black", lid: "black" },
    brows: { shape: "brow_thin", color: "brow", size: 0.8, lift: r3([(browY - eye.y) / eye.size - 1.25])[0], dz: r3([S.front(eye.x, browY) - eye.z + 0.004])[0] },
    cheeks: { at: rel([0.235, cheekY, S.front(0.235, cheekY) - 0.012]), size: 0.15, color: "bao_blush" },
    mouth: { open: true, at: rel([0, mouthY, S.front(0, mouthY) - 0.012]), size: 0.32, teeth: 0.05, color: "bao_mouth", tongue: "bao_tongue" },
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
