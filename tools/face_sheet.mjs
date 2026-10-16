#!/usr/bin/env node
// Every face at three on-screen sizes (far, medium, close-up) for the S2 review.
// Usage: node tools/face_sheet.mjs [out.png] [--color #3fd8ff]
// Sizes are the head radius on a 1080p screen: 13 px (wide shot), 26 px (normal), 70 px (close-up).

import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint, BODY } from "../engine/skeleton.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { poses } from "../data/poses.js";
import { faces, FACE_NAMES } from "../data/faces.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const out = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "out/demos/s2_faces.png";
const color = flag("--color", "#3fd8ff");
const backend = await loadBackend();

const SIZES = [13, 26, 70].map((px) => px / BODY.headR); // body scale giving that head radius
const cellW = 330;
const cellH = [190, 330, 330];
const cols = FACE_NAMES.length;
const canvas = backend.createCanvas(170 + cols * cellW / 2.2, cellH.reduce((a, b) => a + b, 0) + 60);
const W = canvas.width;
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, canvas.height);
const colW = (W - 170) / cols;

let y0 = 60;
ctx.font = "22px Inter";
ctx.fillStyle = "#333";
FACE_NAMES.forEach((name, i) => {
  ctx.save();
  ctx.translate(170 + colW * (i + 0.5), 36);
  ctx.textAlign = "center";
  ctx.fillText(name, 0, 0);
  ctx.restore();
});
SIZES.forEach((scale, row) => {
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";
  ctx.fillText(["far", "normal", "close-up"][row], 16, y0 + cellH[row] / 2);
  FACE_NAMES.forEach((name, i) => {
    const ox = 170 + colW * (i + 0.5);
    // Close-ups show the head only: place the head in the cell, the body runs off the bottom.
    const raw = computeJoints(poses.stand, { x: ox, y: 0 }, 1, scale);
    const headTop = raw.head.y - BODY.headR * scale;
    const ground = row === 2 ? y0 + 20 - headTop : y0 + cellH[row] - 14 - lowestPoint(raw, scale);
    const j = computeJoints(poses.stand, { x: ox, y: ground }, 1, scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox - colW / 2, y0, colW, cellH[row]);
    ctx.clip();
    const r = BODY.headR * scale;
    drawCharacter(ctx, j, { color, scale, facing: 1, face: faces[name], faceOpts: { t: 0.3, detail: r >= 30 ? "full" : "simple", neutral: name === "neutral" } });
    ctx.restore();
  });
  y0 += cellH[row];
});
await backend.savePng(canvas, out);
console.log(`wrote ${out} (${FACE_NAMES.length} faces x 3 sizes)`);
