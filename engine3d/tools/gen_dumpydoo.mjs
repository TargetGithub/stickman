#!/usr/bin/env node
// Writes catalog/models/dumpydoo.json: DumpyDoo, a smooth steamed-bun friend (an onion-shaped dough body
// gathering in pleats to a top knot, a green leaf collar with an orange button, long gloved arms and
// feet, wide anime eyes and a big grin). The face is placed by measuring the real body shape; heights below are
// shares of the body's height measured off the reference picture. Edit this file, not the JSON:
//   node engine3d/tools/gen_dumpydoo.mjs
// DumpyDoo faces +z; its left is +x. Heights are from the floor.

import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { shapeGeometry } from "../runtime/geometry.js";
import { BAO_COLLAR, COLLAR_BAND } from "../runtime/dough.js";
import { OVERALLS } from "../runtime/bao_clothes.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const DEG = Math.PI / 180;

const FEET = 0.2; // the body's bottom sits this high, on longer legs
const ARM_LENGTH = [0.17, 0.12]; // shoulder to elbow, elbow to wrist: long, thin Minion-style arms
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

function dumpyDoo() {
  const S = surface();
  const parts = [];
  const add = (p) => parts.push(p);
  const rel = (v) => r3([v[0] - HEAD[0], v[1] - HEAD[1], v[2] - HEAD[2]]); // body frame -> head frame

  // Body: the head (above the collar, tilts with feelings) and the belly overlap inside the collar; the knot
  // sits in the pinch on top.
  add({ p: "bao_head", on: "head", at: rel(C), s: BODY.s, c: BODY.c, m: BODY.m });
  add({ p: "bao_belly", at: r3(C), s: BODY.s, c: BODY.c, m: BODY.m, name: "belly" });
  // The top knot: bubblegum pink with a black hair tie at its base (recolor knot_pink to change it).
  add({ p: "bao_knot", on: "head", at: rel([0, S.top() + 0.045, 0]), s: [0.18, 0.15, 0.17], c: "knot_pink", m: "glossy", name: "knot" });
  add({ p: "torus", on: "head", at: rel([0, S.top() - 0.012, 0]), r: [90, 0, 0], s: [0.135, 0.135, 0.14], c: "glove_black", m: "rubber", name: "knot" });

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
  // and scale), a lighter rolled lip and an orange button in front. (No leaf flaps: the leaf_flap shape is still in
  // the catalog for other looks.)
  add({ p: "leaf_collar", at: r3(C), s: BODY.s, c: "leaf_lime", m: "toy", name: "collar" });
  add({ p: "collar_lip", at: r3(C), s: BODY.s, c: "leaf_light", m: "toy", name: "collar" });
  const by = share((COLLAR_BAND.lo + COLLAR_BAND.hi) / 2);
  add({ p: "sphere", at: r3([0, by, S.front(0, by) + 0.03]), s: [0.075, 0.06, 0.045], c: "button_orange", m: "glossy", name: "collar" });

  // Arms: long curvy Minion-style arms with an elbow. The upper arm hangs from a shoulder pivot (name "arm",
  // mirrored) just under the collar; the forearm hangs from the elbow on the arm (name "forearm", on: "arm"), so it
  // swings with the arm and bends on its own, and carries the gloved hand. In each part's frame the limb hangs
  // down -y and +z is the front. A wave holds the upper arm out sideways (under the collar) and bends the forearm
  // up, so the hand rises outside the collar instead of through it.
  const shY = share(0.2);
  const sh = r3([S.side(shY, 0.17) - 0.035, shY, 0.17]);
  const arm = { at: sh, r: [-30, 0, 18], mirror: true, name: "arm", c: BODY.c, m: BODY.m, idle: { r: [3, 0, 4], hz: 0.5 } };
  const [L1, L2] = ARM_LENGTH;
  add({ ...arm, p: "dd_upper_arm", s: [1, 1, 1] }); // true size: its end points straight down into the elbow
  add({ ...arm, p: "sphere", s: [0.072, 0.072, 0.072], hang: r3([0, -L1, 0]) }); // the elbow: as thick as the tube there
  const fore = { on: "arm", at: r3([0, -L1, 0]), r: [-22, 0, 0], mirror: true, name: "forearm", c: BODY.c, m: BODY.m };
  add({ ...fore, p: "dd_forearm", s: [1, 1, 1] }); // starts straight down out of the elbow, bows to the wrist
  // Black rubber gloves (Minion style): a flared cuff, the glove's wrist, a puffy palm, three fingers, a thumb.
  // They ride the forearm, coloured glove_black: recolor { glove_black: "bao_dough" } takes them off.
  const glove = { ...fore, c: "glove_black", m: "rubber" };
  add({ ...glove, p: "torus", s: [0.125, 0.125, 0.11], hang: r3([0, -L2 + 0.035, 0]), hr: [90, 0, 0] });
  add({ ...glove, p: "cylinder", s: [0.088, 0.06, 0.088], hang: r3([0, -L2 + 0.005, 0]) });
  add({ ...glove, p: "sphere", s: [0.125, 0.11, 0.105], hang: r3([0, -L2 - 0.015, 0]) });
  for (const [dz, tilt] of [[-0.036, 18], [0, 0], [0.036, -18]]) {
    add({ ...glove, p: "capsule", s: [0.044, 0.095, 0.044], hang: r3([0.004, -L2 - 0.08, dz]), hr: [tilt, 0, 6] });
  }
  add({ ...glove, p: "capsule", s: [0.046, 0.085, 0.046], hang: r3([-0.024, -L2 - 0.025, 0.062]), hr: [-62, 0, 18] });

  // Overalls (runtime/bao_clothes.js, Minion style): twill-patterned denim pants to the waist, a bib in front and
  // a panel behind, straps up from them under the collar with a gold button where each meets its panel, a bib
  // pocket and gold stitching, all named "jeans". The sides are open: the arms come straight out of the dough.
  for (const p of ["bao_pants", "bao_bib", "bao_back", "bao_straps", "bao_pocket"]) add({ p, at: r3(C), s: BODY.s, c: "denim", m: "denim", name: "jeans" });
  add({ p: "bao_stitches", at: r3(C), s: BODY.s, c: "stitch_gold", m: "matte", name: "jeans" });
  for (const [a, y] of [[OVERALLS.strapFront, OVERALLS.bibTop], [-OVERALLS.strapFront, OVERALLS.bibTop], [Math.PI - OVERALLS.strapBack, OVERALLS.backTop], [Math.PI + OVERALLS.strapBack, OVERALLS.backTop]]) {
    const by2 = share(y - 0.03);
    const rr = S.around(by2, a) + OVERALLS.off + 0.016;
    add({ p: "sphere", at: r3([Math.sin(a) * rr, by2, Math.cos(a) * rr]), r: [0, r3([a / DEG])[0], 0], s: [0.042, 0.042, 0.018], c: "stitch_gold", m: "metal", name: "jeans" });
  }


  // Legs: a longer leg each with a denim trouser leg and a rolled cuff, ending in a round glossy black shoe with a
  // sole, on hip pivots named apart (for walks).
  const hipY = FEET + 0.06;
  for (const [side, name] of [[1, "leg_left"], [-1, "leg_right"]]) {
    const hip = { at: r3([side * 0.16, hipY, 0.0]), name, c: BODY.c, m: BODY.m };
    const h = (y, z = 0) => r3([0, y - hipY, z]); // a height from the floor, as a hang from the hip
    add({ ...hip, p: "capsule", s: r3([0.13, hipY - 0.03, 0.13]), hang: h((hipY + 0.06) / 2) });
    add({ ...hip, p: "cylinder", s: [0.172, 0.11, 0.172], hang: h(FEET - 0.025), c: "denim", m: "denim" }); // trouser leg
    add({ ...hip, p: "torus", s: [0.19, 0.19, 0.15], hang: h(FEET - 0.08), hr: [90, 0, 0], c: "denim_light", m: "denim" }); // rolled cuff
    add({ ...hip, p: "sphere", s: [0.175, 0.105, 0.26], hang: h(0.058, 0.035), c: "shoe_black", m: "glossy" }); // shoe
    add({ ...hip, p: "sphere", s: [0.18, 0.035, 0.265], hang: h(0.017, 0.035), c: "charcoal", m: "matte" }); // sole
  }

  // Eye frame (toon_face.js): width 1 = size, origin at the dome's centre line, the lash line 0.3 below it.
  const eye = { x: 0.222, y: share(0.74), size: 0.16 };
  eye.z = S.front(eye.x, eye.y) + 0.007; // just off the dough, so the white layer never sinks into it
  const browY = share(0.844);
  const mouthY = share(0.553);
  const mouthTop = share(0.625); // the 3D mouth's frame: its lip corners (the opening hangs below them)
  // How far the face leans back at the mouth (the bun bulges out below it), so the grin lies on the dough.
  const lean = r3([Math.atan2(S.front(0, mouthY - 0.05) - S.front(0, mouthY + 0.05), 0.1) / DEG])[0];
  return {
    color: BODY.c,
    sound: "Bao bao!",
    description: "DumpyDoo: a smooth cream steamed-bun friend, an onion-shaped body gathering in pleats to a little top knot, wide anime eyes under thick lids, thin brows, a big open grin and pink cheeks, in a green leaf collar with an orange button, on long curvy Minion-style arms in black rubber gloves, in Minion-style denim overalls (open at the sides) with rolled cuffs, round black shoes, a pink top knot with a black hair tie. Named parts: arm and forearm (mirrored; the forearm hangs on the arm at the elbow; wave: liftSide -1 on both, see scenes/dumpydoo_demo.js), leg_left, leg_right, collar (band, lip and button: remove or swap it), jeans, knot, belly, nose, cheeks. No gloves: recolor { glove_black: \"bao_dough\" }.",
    tags: ["dumpydoo", "bao", "mascot", "dumpling", "food", "friend", "lead"],
    head: { at: r3(HEAD), tilt: 0.4, look: [0.4, 0.15] }, // feelings tip the bun gently, so the collar stays in view
    eyes: { at: rel([eye.x, eye.y, eye.z]), size: eye.size, turn: S.turn(eye.x, eye.y), iris: "bao_iris", rim: "bao_iris_rim", color: "bao_pupil", pupilLow: "bao_pupil_blue", crescent: "bao_glint", white: "eye_white_cool", shade: "eye_shade_cool", lid: "bao_line" },
    brows: { shape: "brow_thin", color: "bao_brow", size: 0.74, lift: r3([(browY - eye.y) / eye.size - 1.25])[0], dz: r3([S.front(eye.x, browY) - eye.z + 0.006])[0] },
    mouth: { open: true, at: rel([0, mouthTop, S.front(0, mouthTop) + 0.002]), tilt: -lean, size: 0.29, shape: "mouth3d", lip: "bao_lip", color: "bao_mouth", tongue: "bao_tongue", talk: "grin" },
    bob: 0.012,
    parts,
  };
}

/** A black rubber glove on its own (a prop): the cuff at the bottom, fingers up. */
const blackGlove = {
  color: "glove_black",
  description: "A black rubber glove, Minion style: a flared cuff, a puffy palm, three fingers and a thumb (dress-up, helpers, cleaning).",
  tags: ["clothes", "glove", "dress-up", "bao"],
  parts: [
    { p: "torus", at: [0, 0.03, 0], r: [90, 0, 0], s: [0.3, 0.3, 0.26], m: "rubber" },
    { p: "cylinder", at: [0, 0.09, 0], s: [0.21, 0.12, 0.21], m: "rubber" },
    { p: "sphere", at: [0, 0.2, 0], s: [0.3, 0.26, 0.24], m: "rubber" },
    { p: "capsule", at: [-0.085, 0.36, 0], r: [0, 0, 12], s: [0.1, 0.22, 0.1], m: "rubber" },
    { p: "capsule", at: [0, 0.38, 0], s: [0.1, 0.22, 0.1], m: "rubber" },
    { p: "capsule", at: [0.085, 0.36, 0], r: [0, 0, -12], s: [0.1, 0.22, 0.1], m: "rubber" },
    { p: "capsule", at: [0.15, 0.22, 0.05], r: [0, 0, -55], s: [0.11, 0.2, 0.11], m: "rubber" },
  ],
};

const out = {
  description: "DumpyDoo: a smooth steamed-bun mascot (dough body, leaf collar, anime eyes, open grin). Generated by tools/gen_dumpydoo.mjs: edit that, not this file.",
  critters: { dumpydoo: dumpyDoo() },
  props: { black_glove: blackGlove },
};
writeFileSync(new URL("../catalog/models/dumpydoo.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log("dumpydoo.json: 1 critter");
