#!/usr/bin/env node
// Baaaana task 3 review sheet: the four leads next to Becky and Doopi's Mooka for the drawing level, flat and
// under the noon light rig, in four faces, in close-up, facing left, and far away on the park.
// Usage: node tools/baaaana_cast_sheet.mjs [out.png]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { drawBehind, drawFront } from "../engine/renderer/accessories.js";
import { shadeTones } from "../engine/lighting.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/baaaana_t3_cast.png";
const preset = (id) => JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url)));
const cast = (id) => { const p = preset(id); return { id, name: p.name, ...p.cast }; };
const LEADS = ["bn_mooka", "bobo", "tutu", "zizi"].map(cast);
const REF = [cast("becky"), { ...cast("mooka"), name: "Mooka (Doopi)" }];
const FACES = ["neutral", "laugh", "sad", "surprised"];
const DOG_STAND = { lUA: 4, rUA: -4, lTH: 16, lSH: 28, rTH: 10, rSH: 24 };
const STAND = { lUA: -28, lFA: -15, rUA: 38, rFA: 30, lTH: 8, rTH: -8 }; // near arm forward, far arm peeking behind
const HOLD = { ...STAND, rUA: 70, rFA: 75 };
const poseOf = (c) => (catalog.bodies[c.body].quad ? DOG_STAND : c.appearance?.accessories?.clipboard ? HOLD : STAND);
const RIG = catalog.lights.rigs.noon;

const backend = await loadBackend();
const W = 1800;
const H = 2350;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "20px Inter";

function place(c, pose, x, groundY, scale, facing) {
  const dims = bodyPlan(catalog, c.body).dims;
  const probe = computeJoints(pose, { x, y: 0 }, facing, scale, dims);
  return computeJoints(pose, { x, y: groundY - lowestPoint(probe, scale, dims) }, facing, scale, dims);
}
function figure(cast, x, groundY, scale, faceName, { facing = 1, lit = false } = {}) {
  const pose = poseOf(cast);
  const j = place(cast, pose, x, groundY, scale, facing);
  const p = catalog.bodies[cast.body];
  const dims = bodyPlan(catalog, cast.body).dims;
  const look = lookFor(catalog, cast);
  const c = { j, scale, facing, alpha: 1, dims, face: faceName, quad: p.quad };
  const past = () => null;
  drawBehind(ctx, c, past, look.style);
  drawLookBehind(ctx, c, look);
  drawCharacter(ctx, j, {
    color: cast.color, scale, facing, dims, draw: p.draw, torsoWidth: p.torsoWidth, quad: p.quad, look, outline: true, outlineColor: "#111111",
    face: catalog.faces[faceName], faceOpts: { t: 0.4, detail: "full" }, faceName, id: cast.id, time: 0.4,
    ...(lit ? { light: shadeTones(cast.color, RIG) } : {}),
  });
  drawFront(ctx, c, past, look.style);
  drawLookFront(ctx, c, look);
  return j;
}
const label = (text, x, y, align = "center") => {
  ctx.fillStyle = "#333";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
};
const ground = (y) => {
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(W - 20, y);
  ctx.stroke();
};

// Rows 1-2: the leads with Becky and Doopi's Mooka for the drawing level, flat and lit (noon).
const ALL = [...LEADS, ...REF];
const colX = (i) => 160 + i * 290;
[false, true].forEach((lit, r) => {
  const g = 300 + r * 320;
  label(lit ? "under the noon light rig (v3 scenes)" : "flat (v2 look), scale 1.6 x preset scale, next to Becky and Doopi's Mooka", W / 2, g - 262);
  ground(g);
  ALL.forEach((c, i) => {
    figure(c, colX(i) + (c.body === "dog_small" ? 30 : 0), g, 1.6 * (c.scale ?? 1), "happy", { lit });
    if (!lit) label(c.name, colX(i), g + 30);
  });
});

// Rows 3-6: faces for the leads.
FACES.forEach((face, r) => {
  const g = 860 + r * 200;
  ground(g);
  label(face, 20, g - 80, "left");
  LEADS.forEach((c, i) => figure(c, 260 + i * 220, g, 1.15 * c.scale, face, { lit: true }));
  LEADS.forEach((c, i) => figure(c, 1150 + i * 160, g, 1.15 * c.scale, face, { facing: -1 }));
});
label("faces, lit (facing right) and flat (facing left)", W / 2, 660);

// Row 7: close-ups.
const cy = 1730;
label("close-ups (laugh, lit)", W / 2, cy - 130);
LEADS.forEach((c, i) => {
  const s = 3.4;
  const j0 = place(c, poseOf(c), 0, 0, s, 1);
  const cx = 230 + i * 440;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 200, cy - 110, 400, 300);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - 200, cy - 110, 400, 300);
  ctx.translate(cx - j0.head.x, cy - j0.head.y + 50);
  figure(c, 0, 0, s, "laugh", { lit: true });
  ctx.restore();
});

// Row 8: far away on the park, about 40 px and 70 px tall.
const fy = 2120;
label("far away on city_park", W / 2, fy - 150);
ctx.fillStyle = catalog.themes.city_park.characterBg;
ctx.fillRect(20, fy - 130, W - 40, 160);
[[0.35, 80], [0.6, 900]].forEach(([k, x0]) => ALL.forEach((c, i) => figure(c, x0 + i * (k < 0.5 ? 90 : 140), fy, k * (c.scale ?? 1), "happy", { lit: true })));

await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
