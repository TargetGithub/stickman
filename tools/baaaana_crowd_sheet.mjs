#!/usr/bin/env node
// Baaaana task 6 review sheet: 30 seeded members of the baaaana_crowd kind (three rows of ten), the four leads
// for comparison, and the same 30 as a crowd on the park at medium and far distance.
// Usage: node tools/baaaana_crowd_sheet.mjs [out.png] [--seed N]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { crowdMember } from "../engine/story/crowd.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { drawFront } from "../engine/renderer/accessories.js";
import { idleGazeAt } from "../engine/renderer/lively.js";
import { shadeTones } from "../engine/lighting.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--seed") || "out/demos/baaaana_t6_crowd.png";
const SEED = Number(args.includes("--seed") ? args[args.indexOf("--seed") + 1] : 1);
const KIND = catalog.crowds.baaaana_crowd;
const MEMBERS = Array.from({ length: 30 }, (_, i) => ({ id: `m${i + 1}`, ...crowdMember(KIND, SEED, "sheet", i) }));
const LEADS = ["bn_mooka", "bobo", "tutu", "zizi"].map((id) => ({ id, ...JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url))).cast }));
const FACES = ["happy", "laugh", "neutral", "surprised", "love", "happy"];
const POSES = [
  { lUA: -28, lFA: -15, rUA: 38, rFA: 30, lTH: 8, rTH: -8 },
  { lUA: -60, lFA: -40, rUA: 125, rFA: -45, lTH: 8, rTH: -8 }, // near hand up beside the head, cheering
  { lUA: -20, lFA: -30, rUA: 100, rFA: -20, lTH: 6, rTH: -6 }, // reaching out front
];
const RIG = catalog.lights.rigs.noon;

const backend = await loadBackend();
const W = 1900;
const H = 2000;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "18px Inter";

function figure(c, x, groundY, scale, face, pose, facing = 1, t = 0.4) {
  const plan = catalog.bodies[c.body];
  const dims = bodyPlan(catalog, c.body).dims;
  const probe = computeJoints(pose, { x, y: 0 }, facing, scale, dims);
  const j = computeJoints(pose, { x, y: groundY - lowestPoint(probe, scale, dims) }, facing, scale, dims);
  const look = lookFor(catalog, c);
  const ch = { j, scale, facing, alpha: 1, dims, face };
  drawLookBehind(ctx, ch, look);
  drawCharacter(ctx, j, {
    color: c.color, scale, facing, dims, draw: plan.draw, torsoWidth: plan.torsoWidth, look, outline: true, outlineColor: "#111111",
    face: catalog.faces[face], faceOpts: { t, detail: "full", idle: idleGazeAt(SEED, c.id, t) }, light: shadeTones(c.color, RIG),
  });
  drawFront(ctx, ch, () => null, look.style);
  drawLookFront(ctx, ch, look);
}
const label = (text, x, y, align = "center") => {
  ctx.fillStyle = "#333";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
};
const floor = (y) => {
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(W - 20, y);
  ctx.stroke();
};

// Rows 1-3: the 30 members, ten per row, each with its number.
label(`baaaana_crowd: 30 seeded members (seed ${SEED}), each with its own shape, shade, height, sprout, mouth and maybe an accent`, W / 2, 28);
for (let r = 0; r < 3; r++) {
  const g = 300 + r * 300;
  floor(g);
  for (let k = 0; k < 10; k++) {
    const i = r * 10 + k;
    const m = MEMBERS[i];
    const x = 105 + k * 188;
    figure(m, x, g, 1.55 * m.scale, FACES[i % FACES.length], POSES[(i * 7) % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0], i % 4 === 3 ? -1 : 1, 0.4 + i * 0.37);
    label(`${i + 1}`, x, g + 24);
  }
}

// Row 4: the leads next to a few members, for size and family likeness.
let g = 1270;
label("the four leads (left) with members 1-6 (right): one family, the leads still stand out", W / 2, g - 270);
floor(g);
LEADS.forEach((c, k) => figure(c, 110 + k * 200, g, 1.55 * c.scale, "happy", POSES[0]));
MEMBERS.slice(0, 6).forEach((m, k) => figure(m, 980 + k * 150, g, 1.55 * m.scale, "happy", POSES[0], 1, 1 + k));

// Row 5: the whole crowd on the park, medium and far.
g = 1600;
label("the 30 on city_park: medium (about 120 px tall) and far (about 55 px)", W / 2, g - 250);
ctx.fillStyle = catalog.themes.city_park.characterBg;
ctx.fillRect(20, g - 220, W - 40, 250);
MEMBERS.forEach((m, i) => {
  const row = i % 2;
  figure(m, 60 + (i % 15) * 60 + row * 30, g - 40 + row * 30, 0.75 * m.scale, FACES[i % FACES.length], POSES[i % 3], i % 3 === 0 ? -1 : 1, i * 0.5);
});
MEMBERS.forEach((m, i) => figure(m, 1020 + i * 28, g + 10 - (i % 3) * 12, 0.36 * m.scale, "happy", POSES[i % 3], i % 2 ? -1 : 1, i));

await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
