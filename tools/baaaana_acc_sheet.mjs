#!/usr/bin/env node
// Baaaana task 2 review sheet: each new accessory (sprout kinds, party_hat, whistle, clipboard) on a mint
// buddy facing right and left, in close-up and far away, then a first look at the four leads' combinations.
// Usage: node tools/baaaana_acc_sheet.mjs [out.png]

import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { drawBehind, drawFront } from "../engine/renderer/accessories.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/baaaana_t2_accessories.png";
const BASE = { eyes: "big", mouthStyle: "cartoon", cheeks: "#ffb3c7", belly: "#c9b6ff" };
const MINT = "#7fe8c4";
const ITEMS = [
  ["leaf_sprout", "#3fae5a"], ["curly_vine", "#3fae5a"], ["flower_bud", "#ff7eb6"], ["flower_bloom", "#ff7eb6"],
  ["party_hat", "#ff5d73"], ["whistle", "#e63946"], ["clipboard", "#c98a4b"],
];
// First idea of the leads (task 3 makes the presets); the colors stay in the green family.
const LEADS = [
  ["Mooka", MINT, 0.85, { leaf_sprout: "#3fae5a", mittens: "#ff9f43" }],
  ["Bobo", "#6fd6c8", 1.05, { sprout: "#3fae5a", mittens: "#ff9f43", whistle: "#e63946", clipboard: "#c98a4b" }],
  ["Tutu (bud)", "#a6e88a", 0.95, { flower_bud: "#ff7eb6", mittens: "#ff9f43" }],
  ["Tutu (bloom)", "#a6e88a", 0.95, { flower_bloom: "#ff7eb6", mittens: "#ff9f43" }],
  ["Zizi", "#5cc9a0", 0.7, { curly_vine: "#3fae5a", mittens: "#ff9f43", backpack: "#ffb347" }],
  ["party!", MINT, 0.85, { party_hat: "#ff5d73", leaf_sprout: "#3fae5a", mittens: "#ff9f43" }],
];
const HOLD = { lUA: 6, rUA: -60, rFA: -70 }; // the near arm raised to show the clipboard
const STAND = { lUA: 6, rUA: -8, rFA: 10 };

const backend = await loadBackend();
const W = 1700;
const H = 2350;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "20px Inter";

const plan = bodyPlan(catalog, "buddy");
const body = catalog.bodies.buddy;
function place(pose, x, groundY, scale, facing) {
  const probe = computeJoints(pose, { x, y: 0 }, facing, scale, plan.dims);
  return computeJoints(pose, { x, y: groundY - lowestPoint(probe, scale, plan.dims) }, facing, scale, plan.dims);
}
function figure(color, acc, x, groundY, scale, { facing = 1, face = "happy", pose = acc.clipboard ? HOLD : STAND } = {}) {
  const cast = { body: "buddy", color, appearance: { ...BASE, accessories: acc } };
  const look = lookFor(catalog, cast);
  const j = place(pose, x, groundY, scale, facing);
  const c = { j, scale, facing, alpha: 1, dims: plan.dims, face };
  const past = () => null;
  drawBehind(ctx, c, past, look.style);
  drawLookBehind(ctx, c, look);
  drawCharacter(ctx, j, { color, scale, facing, dims: plan.dims, draw: body.draw, torsoWidth: body.torsoWidth, look, face: catalog.faces[face], faceOpts: { t: 0.4, detail: "full" }, faceName: face, time: 0.4 });
  drawFront(ctx, c, past, look.style);
  drawLookFront(ctx, c, look);
  return j;
}
const label = (text, x, y, align = "center") => {
  ctx.fillStyle = "#333";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
};
const ground = (y, x0 = 20, x1 = W - 20) => {
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
};

label("Baaaana task 2: new accessories on a mint buddy (right, left, close-up, far away 30 px)", W / 2, 32);
const ROW = 250;
ITEMS.forEach(([name, color], i) => {
  const g = 60 + ROW * (i + 1) - 30;
  ground(g, 220, 900);
  label(name, 20, g - ROW / 2 + 10, "left");
  const acc = { [name]: color, mittens: "#ff9f43" };
  figure(MINT, acc, 380, g, 1.4);
  figure(MINT, acc, 680, g, 1.4, { facing: -1 });
  // Close-up on the head.
  const s = 3.2;
  const j0 = place(acc.clipboard ? HOLD : STAND, 0, 0, s, 1);
  const cx = 1150;
  const cy = g - ROW / 2 + 8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 170, cy - 112, 340, 230);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - 170, cy - 112, 340, 230);
  const focus = acc.clipboard ? { x: (j0.head.x + j0.rHand.x) / 2, y: (j0.head.y + j0.rHand.y) / 2 }
    : acc.whistle ? { x: j0.neckTop.x, y: j0.neckTop.y + 30 } : { x: j0.head.x, y: j0.head.y - 85 };
  ctx.translate(cx - focus.x, cy - focus.y);
  figure(MINT, acc, 0, 0, s);
  ctx.restore();
  // Far away: about 30 px tall.
  ctx.fillStyle = catalog.themes.city_park.characterBg;
  ctx.fillRect(1360, g - 70, 300, 80);
  [0, 1, 2].forEach((k) => figure(MINT, acc, 1420 + k * 90, g, 0.25, { facing: k === 1 ? -1 : 1 }));
});

const g = 60 + ROW * 8 + 70;
label("first look at the leads (presets come in task 3)", W / 2, g - 255);
ground(g);
LEADS.forEach(([name, color, scale, acc], i) => {
  const x = 170 + i * 270;
  figure(color, acc, x, g, 1.5 * scale, { face: name.includes("bloom") || name === "party!" ? "laugh" : "happy" });
  label(name, x, g + 34);
});

await backend.savePng(canvas, out);
console.log(`wrote ${out} (${ITEMS.length} accessories, ${LEADS.length} lead looks)`);
