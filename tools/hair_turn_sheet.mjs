#!/usr/bin/env node
// Hair in turned views: Doopi (spiky), Doomi (ponytail), Dony (cap) and Nani (bun) as head close-ups at the
// side (yaw 90), three-quarter (yaw 30, the maxTurn 60 cap), front (0) and back (180), drawn as the renderer
// draws a turned humanoid (turnedHumanoid + drawCharacter). With --before <png>, that earlier sheet is stacked
// above this one (a before/after review image).
// Usage: node tools/hair_turn_sheet.mjs [out.png] [--before old.png]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { drawBehind, drawFront } from "../engine/renderer/accessories.js";
import { turnedHumanoid } from "../engine/renderer/turnaround_draw.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const bi = args.indexOf("--before");
const before = bi >= 0 ? args.splice(bi, 2)[1] : null;
const out = args[0] || "out/demos/hair_turn_fix.png";

const IDS = ["doopi", "doomi", "dony", "nani"];
const VIEWS = [["side", 90], ["three_quarter", 30], ["front", 0], ["back", 180]];
const preset = (id) => JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url)));
const CAST = IDS.map((id) => { const p = preset(id); return { id, name: p.name, ...p.cast, body: p.cast.body || "stickman" }; });
const POSE = { lUA: 6, rUA: -8, rFA: 10 };

const backend = await loadBackend();
const CELL = 240;
const TOP = 60;
const LEFT = 190;
const W = LEFT + CELL * VIEWS.length + 20;
const H = TOP + CELL * CAST.length + 20;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "20px Inter";
ctx.fillStyle = "#333";
ctx.textAlign = "center";
VIEWS.forEach(([name, yaw], i) => ctx.fillText(`${name} (yaw ${yaw})`, LEFT + CELL * (i + 0.5), 36));

const S = 3.4;
CAST.forEach((cast, row) => {
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";
  ctx.fillText(`${cast.name} (${cast.appearance?.hair || "-"})`, 12, TOP + CELL * (row + 0.5));
  const dims = bodyPlan(catalog, cast.body).dims;
  const p = catalog.bodies[cast.body];
  const look = lookFor(catalog, cast);
  VIEWS.forEach(([, yaw], col) => {
    const j0 = computeJoints(POSE, { x: 0, y: 0 }, 1, S, dims);
    const c0 = { j: j0, scale: S, facing: 1, alpha: 1, dims, face: "happy" };
    const t = turnedHumanoid(c0, yaw, p);
    const j = t ? t.j : j0;
    const cx = LEFT + CELL * (col + 0.5);
    const cy = TOP + CELL * (row + 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - CELL / 2 + 6, cy - CELL / 2 + 6, CELL - 12, CELL - 12);
    ctx.clip();
    ctx.fillStyle = "#ebe9e2";
    ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
    ctx.translate(cx - j.head.x, cy - j.head.y + 40);
    const c = { ...c0, j };
    drawBehind(ctx, c, () => null, look.style);
    drawLookBehind(ctx, c, look);
    drawCharacter(ctx, j, {
      color: cast.color, scale: S, facing: 1, dims, draw: p.draw, torsoWidth: p.torsoWidth, look,
      face: catalog.faces.happy, faceOpts: { t: 0.4, detail: "full" },
      ...(t ? { faceShift: t.faceShift, hideFace: t.hideFace, farBrightness: t.farBrightness, wrap: t.wrap } : {}),
    });
    drawFront(ctx, c, () => null, look.style);
    drawLookFront(ctx, c, look);
    ctx.restore();
  });
});

if (before) {
  const img = await backend.loadImage(before);
  const both = backend.createCanvas(W, img.height + H + 40);
  const b = both.getContext("2d");
  b.fillStyle = "#ffffff";
  b.fillRect(0, 0, W, both.height);
  b.font = "bold 22px Inter";
  b.fillStyle = "#b00020";
  b.textAlign = "left";
  b.drawImage(img, 0, 20);
  b.fillText("BEFORE", 12, 26);
  b.drawImage(canvas, 0, img.height + 40);
  b.fillStyle = "#1b7f3b";
  b.fillText("AFTER", 12, img.height + 46);
  await backend.savePng(both, out);
} else await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
