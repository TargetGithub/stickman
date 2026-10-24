#!/usr/bin/env node
// Baaaana task 4 review sheet: every face on the four leads (lively eyes, big_grin / toothy mouths), the
// pupils darting over 8 seconds, a double blink, and the belly jiggle while laughing.
// Usage: node tools/baaaana_face_sheet.mjs [out.png]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { idleGazeAt, doubleBlinkAt } from "../engine/renderer/lively.js";
import { shadeTones } from "../engine/lighting.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/baaaana_t4_faces.png";
const cast = (id) => ({ id, ...JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url))).cast });
const LEADS = ["bn_mooka", "bobo", "tutu", "zizi"].map(cast);
const NAMES = ["Mooka (big_grin)", "Bobo (toothy)", "Tutu (big_grin)", "Zizi (toothy)"];
const FACES = catalog.faceNames;
const STAND = { lUA: -28, lFA: -15, rUA: 38, rFA: 30, lTH: 8, rTH: -8 };
const RIG = catalog.lights.rigs.noon;

const backend = await loadBackend();
const W = 1900;
const H = 2500;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "18px Inter";

/** Draw a lead; `opts` adds faceOpts (idle, blink) and jiggle inputs (time, hipDy). */
function figure(c, x, groundY, scale, face, { faceOpts = {}, time = 0.4, hipDy = 0 } = {}) {
  const plan = catalog.bodies[c.body];
  const dims = bodyPlan(catalog, c.body).dims;
  const probe = computeJoints(STAND, { x, y: 0 }, 1, scale, dims);
  const j = computeJoints(STAND, { x, y: groundY - lowestPoint(probe, scale, dims) }, 1, scale, dims);
  const look = lookFor(catalog, c);
  const ch = { j, scale, facing: 1, alpha: 1, dims, face };
  drawLookBehind(ctx, ch, look);
  drawCharacter(ctx, j, {
    color: c.color, scale, facing: 1, dims, draw: plan.draw, torsoWidth: plan.torsoWidth, look, outline: true, outlineColor: "#111111",
    face: catalog.faces[face], faceOpts: { t: time, detail: "full", ...faceOpts }, light: shadeTones(c.color, RIG),
    jiggle: plan.jiggle, time, faceName: face, hipDy,
  });
  drawLookFront(ctx, ch, look);
  return j;
}
/** A head close-up of a lead in a clipped box centred at (cx, cy). */
function closeUp(c, cx, cy, w, h, s, face, opts) {
  const dims = bodyPlan(catalog, c.body).dims;
  const j0 = computeJoints(STAND, { x: 0, y: 0 }, 1, s, dims);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - h / 2, w, h);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.translate(cx - j0.head.x - dims.headR * s * 0.25, cy - j0.head.y + dims.headR * s * 0.15);
  const probe = computeJoints(STAND, { x: 0, y: 0 }, 1, s, dims);
  figure(c, 0, lowestPoint(probe, s, dims), s, face, opts);
  ctx.restore();
}
const label = (text, x, y, align = "center") => {
  ctx.fillStyle = "#333";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
};

// Rows 1-4: every face per lead (head close-ups).
const CW = 108;
label("every face (lively eyes; mouths big_grin for Mooka and Tutu, toothy for Bobo and Zizi)", W / 2, 28);
FACES.forEach((f, i) => label(f, 200 + i * CW, 56));
LEADS.forEach((c, r) => {
  const cy = 130 + r * 150;
  label(NAMES[r], 20, cy, "left");
  FACES.forEach((f, i) => closeUp(c, 200 + i * CW, cy, CW - 6, 140, 1.7, f, { faceOpts: { idle: { f: 0, u: 0 } } }));
});

// Row 5: Mooka's pupils over 8 seconds (one frame every 0.5 s), and a double blink.
let y = 790;
label("idle glances over 8 s (Mooka, one frame per 0.5 s; * = looking at the camera)", W / 2, y);
for (let k = 0; k < 16; k++) {
  const t = k * 0.5;
  const idle = idleGazeAt(1, "bn_mooka", t);
  closeUp(LEADS[0], 120 + k * 112, y + 90, 106, 130, 1.8, "neutral", { faceOpts: { idle }, time: t });
  label(`${t.toFixed(1)}s${idle.cam ? " *" : ""}`, 120 + k * 112, y + 175);
}
y += 230;
label("double blink (Tutu): frames 0.05 s apart around a double blink", W / 2, y);
let t0 = 0;
while (!doubleBlinkAt(1, "tutu", t0)) t0 += 0.01;
for (let k = 0; k < 10; k++) {
  const t = t0 - 0.05 + k * 0.05;
  closeUp(LEADS[2], 200 + k * 160, y + 90, 150, 130, 1.8, "neutral", { faceOpts: { idle: { f: 0, u: 0 }, blink2: doubleBlinkAt(1, "tutu", t) }, time: t });
  label(`+${(t - t0).toFixed(2)}s`, 200 + k * 160, y + 175);
}

// Row 7: belly jiggle while laughing (one cycle at 6 Hz in 8 frames), then the walk bounce.
y += 260;
label("belly jiggle while laughing: one wobble in 8 frames (left), and bouncing as the hip drops / rises (right)", W / 2, y);
const g = y + 330;
for (let k = 0; k < 8; k++) figure(LEADS[2], 120 + k * 135, g, 1.5 * LEADS[2].scale, "laugh", { time: k / 48 });
[-6, 0, 6].forEach((hipDy, k) => {
  figure(LEADS[0], 1280 + k * 210, g, 1.6 * LEADS[0].scale, "happy", { hipDy });
  label(`hip ${hipDy > 0 ? "drops" : hipDy < 0 ? "rises" : "still"}`, 1280 + k * 210, g + 30);
});

// Row 8: the leads together, full figures, laughing.
const g2 = g + 380;
label("together, laughing", W / 2, g2 - 300);
LEADS.forEach((c, i) => figure(c, 300 + i * 420, g2, 1.9 * c.scale, i % 2 ? "laugh" : "happy", { time: 0.1 + i * 0.03 }));

await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
