#!/usr/bin/env node
// Render every named pose into a labeled grid PNG for visual review (M0 demo).
// Usage: node tools/pose_sheet.mjs [out.png] [--backend napi|skia] [--color #22aaff]

import { loadBackend, DEFAULT_BACKEND } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { catalog } from "../catalog/index.js";

const { poses } = catalog;

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const out = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "out/demos/m0_poses.png";
const backend = await loadBackend(flag("--backend", DEFAULT_BACKEND));
const color = flag("--color", "#22aaff");

const names = Object.keys(poses);
const cols = 6;
const cellW = 300;
const cellH = 400;
const rows = Math.ceil(names.length / cols) * 2; // each pose: facing right row + facing left row
const canvas = backend.createCanvas(cols * cellW, rows * cellH);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, canvas.width, canvas.height);

names.forEach((name, i) => {
  for (const facing of [1, -1]) {
    const col = i % cols;
    const row = Math.floor(i / cols) * 2 + (facing === 1 ? 0 : 1);
    const ox = col * cellW + cellW / 2;
    const groundY = row * cellH + cellH - 50;

    // Ground contact (spec 5.4): place the lowest point of the body on the ground line.
    const raw = computeJoints(poses[name], { x: ox, y: 0 }, facing, 1.25);
    const j = computeJoints(poses[name], { x: ox, y: groundY - lowestPoint(raw, 1.25) }, facing, 1.25);

    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(col * cellW + 20, groundY);
    ctx.lineTo(col * cellW + cellW - 20, groundY);
    ctx.stroke();

    drawCharacter(ctx, j, { color, scale: 1.25, facing, mouth: name === "victory" ? "grin" : name.startsWith("hit") ? "shout" : "neutral" });

    ctx.fillStyle = "#444444";
    ctx.font = "26px Inter";
    ctx.textAlign = "center";
    ctx.fillText(`${name} ${facing === 1 ? "→" : "←"}`, ox, groundY + 36);
  }
});

await backend.savePng(canvas, out);
console.log(`wrote ${out} (${names.length} poses, backend ${backend.name})`);
