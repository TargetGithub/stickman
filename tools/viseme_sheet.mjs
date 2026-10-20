#!/usr/bin/env node
// Every talking mouth shape (ADR-032) in close-up, for the lip-sync review: the cartoon mouth style (Doopi),
// the line style (Dony) and a jaw (quadrupeds), each with a happy and an angry face.
// Usage: node tools/viseme_sheet.mjs [out.png]

import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, BODY } from "../engine/skeleton.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/lipsync_visemes.png";
const backend = await loadBackend();
const names = Object.keys(catalog.visemes);
const ROWS = [
  { label: "cartoon (Doopi)", color: "#5ec8ff", look: { eyes: "big", mouthStyle: "cartoon" }, face: "happy" },
  { label: "cartoon, angry", color: "#5ec8ff", look: { eyes: "big", mouthStyle: "cartoon" }, face: "angry" },
  { label: "line (Dony)", color: "#4cd964", look: {}, face: "happy" },
  { label: "jaw (Becky)", color: "#f3e3c3", look: { eyes: "big", mouthStyle: "cartoon" }, face: "happy", jaw: true },
];
const cellW = 200;
const cellH = 220;
const canvas = backend.createCanvas(220 + names.length * cellW, 60 + ROWS.length * cellH);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = "22px Inter";
ctx.fillStyle = "#333";
ctx.textAlign = "center";
names.forEach((n, i) => ctx.fillText(n === "rest" ? "rest (face)" : n, 220 + cellW * (i + 0.5), 36));
const scale = 70 / BODY.headR;
ROWS.forEach((row, ri) => {
  const y0 = 60 + ri * cellH;
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";
  ctx.fillText(row.label, 12, y0 + cellH / 2);
  names.forEach((v, i) => {
    const ox = 220 + cellW * (i + 0.5);
    const raw = computeJoints(catalog.poses.stand, { x: ox, y: 0 }, 1, scale);
    const j = computeJoints(catalog.poses.stand, { x: ox, y: y0 + 25 - (raw.head.y - BODY.headR * scale) }, 1, scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox - cellW / 2, y0, cellW, cellH);
    ctx.clip();
    const lip = { v, k: 1, shape: catalog.visemes[v], jaw: !!row.jaw };
    drawCharacter(ctx, j, { color: row.color, scale, facing: 1, look: row.look, face: catalog.faces[row.face], faceOpts: { t: 0.3, detail: "full", talking: v !== "rest", lip } });
    ctx.restore();
  });
});
await backend.savePng(canvas, out);
console.log(`wrote ${out} (${names.length} shapes x ${ROWS.length} styles)`);
