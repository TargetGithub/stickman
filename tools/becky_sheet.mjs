#!/usr/bin/env node
// Quadruped look sheet (package A1, review 1): Becky in static poses next to Doopi, at three camera
// distances, and in every face. Poses here are drafts for the look review; the moves come in A1.4.
// Usage: node tools/becky_sheet.mjs [out.png] [--body dog_small]

import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { readFileSync } from "node:fs";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const out = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "out/demos/r1_becky_look.png";
const BODY = flag("--body", "dog_small");

const BECKY = { id: "becky", ...JSON.parse(readFileSync(new URL("../catalog/characters/presets/becky.json", import.meta.url))).cast, body: BODY };
const DOOPI = { id: "doopi", body: "stickman", color: "#3fb8ff", appearance: { eyes: "big", hair: "spiky", hairColor: "#2a1a14", mouthStyle: "cartoon", accessories: { headband: "#ff3b5c" } } };

const POSES = {
  stand: { lUA: 4, rUA: -4, lTH: 16, lSH: 28, rTH: 10, rSH: 24 },
  sit: { lean: 35, head: -10, lUA: -33, rUA: -38, lTH: 38, lSH: 150, rTH: 32, rSH: 146 },
  lie: { lean: 0, head: 22, lUA: 82, lFA: -6, rUA: 76, rFA: -4, lTH: 84, lSH: 165, rTH: 78, rSH: 160 },
  bark: { lean: 6, head: -28, lUA: 10, rUA: -10, lTH: 18, lSH: 30, rTH: 8, rSH: 22 },
  play_bow: { lean: -18, head: -8, lUA: 88, lFA: 30, rUA: 82, rFA: 26, lTH: 20, lSH: 22, rTH: 14, rSH: 18 },
  beg: { lean: 68, head: 62, lUA: 12, lFA: 82, rUA: 6, rFA: 76, lTH: 2, lSH: 150, rTH: -4, rSH: 146 },
};
const POSE_FACE = { stand: "happy", sit: "neutral", lie: "asleep", bark: "angry", play_bow: "laugh", beg: "love" };

const backend = await loadBackend();
const W = 1800;
const H = 2000;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "22px Inter";
ctx.textAlign = "center";

/** Joints for a character standing on groundY at x in a pose. */
function place(cast, pose, x, groundY, scale, facing) {
  const dims = bodyPlan(catalog, cast.body).dims;
  const probe = computeJoints(pose, { x, y: 0 }, facing, scale, dims);
  return computeJoints(pose, { x, y: groundY - lowestPoint(probe, scale, dims) }, facing, scale, dims);
}
/** Draw one character standing on groundY at x in a pose; returns its joints. */
function figure(cast, pose, x, groundY, scale, faceName, facing = 1, t = 0.4) {
  const j = place(cast, pose, x, groundY, scale, facing);
  const p = catalog.bodies[cast.body];
  drawCharacter(ctx, j, {
    color: cast.color, scale, facing, dims: bodyPlan(catalog, cast.body).dims, draw: p.draw, torsoWidth: p.torsoWidth, quad: p.quad,
    look: lookFor(catalog, cast), face: catalog.faces[faceName], faceOpts: { t, detail: "full" }, faceName, id: cast.id, time: t,
  });
  return j;
}
function ground(x0, x1, y) {
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}
const label = (text, x, y) => {
  ctx.fillStyle = "#333";
  ctx.fillText(text, x, y);
};

// Row 1: the six poses at 1.6x, Doopi standing at the left for size.
label("Poses (drafts for the look; moves come later) at 1.6x, Doopi for size", W / 2, 34);
const g1 = 470;
ground(20, W - 20, g1);
figure(DOOPI, {}, 90, g1, 1.6, "happy");
Object.keys(POSES).forEach((name, i) => {
  const x = 330 + i * 245;
  figure(BECKY, POSES[name], x, g1, 1.6, POSE_FACE[name]);
  label(`${name} (${POSE_FACE[name]})`, x, g1 + 34);
});

// Row 2: three camera distances, Becky and Doopi facing each other.
label("Camera distances: 0.6x, 1x, 2x (Becky's back at Doopi's knee)", W / 2, 560);
const g2 = 1280;
ground(20, W - 20, g2);
[[0.6, 170], [1, 560], [2, 1250]].forEach(([s, x]) => {
  figure(DOOPI, {}, x - 70 * s, g2, s, "happy", 1);
  figure(BECKY, POSES.stand, x + 110 * s, g2, s, "happy", -1);
  label(`${s}x`, x + 20 * s, g2 + 34);
});

// Rows 3-4: every face, as head close-ups at 3.2x.
label("Every face (head close-ups at 3.2x)", W / 2, 1360);
const faces = Object.keys(catalog.faces);
const perRow = 8;
faces.forEach((name, i) => {
  const cx = 115 + (i % perRow) * 224;
  const cy = 1500 + Math.floor(i / perRow) * 260;
  const j0 = place(BECKY, POSES.stand, 0, 0, 3.2, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 105, cy - 115, 210, 210);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - 105, cy - 115, 210, 210);
  ctx.translate(cx - j0.head.x - 10, cy - j0.head.y + 10);
  figure(BECKY, POSES.stand, 0, 0, 3.2, name);
  ctx.restore();
  label(name, cx, cy + 125);
});

await backend.savePng(canvas, out);
console.log(`wrote ${out} (${Object.keys(POSES).length} poses, ${faces.length} faces)`);
