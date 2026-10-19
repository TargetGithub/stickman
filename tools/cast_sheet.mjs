#!/usr/bin/env node
// Doopi & Friends cast sheet (package A2 review): every cast preset (Becky included) in the neutral,
// happy, angry and scared faces, a close-up row, and checks for the new options: the cast far away
// on the park (horns and sprout in silhouette), the bracelet's slots, and Tony's stub-horn gag.
// Usage: node tools/cast_sheet.mjs [out.png]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { holdableData } from "../engine/objects.js";
import { lookFor, lookAt } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { drawBehind, drawFront } from "../engine/renderer/accessories.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/a2_cast.png";
const IDS = ["doopi", "dony", "doomi", "mooka", "becky", "nani", "motumal", "peepa", "tony", "kony", "thunda"];
const preset = (id) => JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url)));
const CAST = IDS.map((id) => { const p = preset(id); return { id, name: p.name, ...p.cast, body: p.cast.body || "stickman" }; });
const FACES = ["neutral", "happy", "angry", "scared"];
const DOG_STAND = { lUA: 4, rUA: -4, lTH: 16, lSH: 28, rTH: 10, rSH: 24 };
const poseOf = (c) => (catalog.bodies[c.body].quad ? DOG_STAND : { lUA: 6, rUA: -8, rFA: 10 });

const backend = await loadBackend();
const W = 2000;
const COL = 166;
const X0 = 150;
const H = 2500;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "20px Inter";

/** Joints for a character standing on groundY at x. */
function place(cast, pose, x, groundY, scale, facing) {
  const dims = bodyPlan(catalog, cast.body).dims;
  const probe = computeJoints(pose, { x, y: 0 }, facing, scale, dims);
  return computeJoints(pose, { x, y: groundY - lowestPoint(probe, scale, dims) }, facing, scale, dims);
}

/** Draw a character as the renderer does (accessories behind, body, accessories in front). */
function figure(cast, x, groundY, scale, faceName, { facing = 1, pose = poseOf(cast), look = lookFor(catalog, cast), t = 0.4 } = {}) {
  const j = place(cast, pose, x, groundY, scale, facing);
  const p = catalog.bodies[cast.body];
  const dims = bodyPlan(catalog, cast.body).dims;
  const prop = cast.prop ? { data: holdableData(catalog, cast.prop), angle: 0 } : undefined;
  const c = { j, scale, facing, alpha: 1, dims, face: faceName, quad: p.quad };
  const past = () => null;
  drawBehind(ctx, c, past, look.style);
  drawLookBehind(ctx, c, look);
  drawCharacter(ctx, j, {
    color: cast.color, scale, facing, dims, draw: p.draw, torsoWidth: p.torsoWidth, quad: p.quad, prop,
    look, face: catalog.faces[faceName], faceOpts: { t, detail: "full" }, faceName, id: cast.id, time: t,
  });
  drawFront(ctx, c, past, look.style);
  drawLookFront(ctx, c, look);
  return j;
}
const label = (text, x, y, align = "center", color = "#333") => {
  ctx.fillStyle = color;
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
const colX = (i) => X0 + COL * (i + 0.5);

// Header: names.
label("Doopi & Friends: the cast (package A2), scale 0.8 x each preset's scale", W / 2, 30);
CAST.forEach((c, i) => label(c.name, colX(i), 64));

// Rows 1-4: faces.
const ROW = 330;
const BASE = 0.8;
FACES.forEach((face, r) => {
  const g = 80 + ROW * (r + 1);
  ground(g);
  label(face, 20, g - ROW / 2, "left");
  CAST.forEach((c, i) => figure(c, colX(i) + (c.body === "dog_small" ? 20 : 0), g, BASE * (c.scale ?? 1), face));
});

// Row 5: close-ups (happy), the same head size for everyone.
let y = 80 + ROW * 4 + 30;
label("close-up", 20, y + 90, "left");
CAST.forEach((c, i) => {
  const s = c.body === "dog_small" ? 2.6 : 3.0;
  const j0 = place(c, poseOf(c), 0, 0, s, 1);
  const cx = colX(i);
  const cy = y + 90;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 80, cy - 90, 160, 180);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - 80, cy - 90, 160, 180);
  ctx.translate(cx - j0.head.x, cy - j0.head.y + 22);
  figure(c, 0, 0, s, "happy");
  ctx.restore();
});

// Row 6: far away on the park (character height about 30 px and 60 px).
y += 220;
label("far away on city_park: about 30 px tall (left) and 60 px tall (right)", W / 2, y);
const parkBg = catalog.themes.city_park.characterBg;
ctx.fillStyle = parkBg;
ctx.fillRect(20, y + 15, W - 40, 150);
for (const [k, x0] of [[0.2, 60], [0.4, 1020]]) {
  const g = y + 140;
  CAST.forEach((c, i) => figure(c, x0 + i * (k === 0.2 ? 60 : 82), g, k * (c.scale ?? 1), "happy"));
}

// Row 7: the bracelet (slots 0, 3, 7) on Doopi's left wrist, and Tony's stub-horn gag.
y += 200;
label("bracelet on Doopi's left wrist: slots 0, 3, 7 (set_appearance slots)", 520, y);
label("Tony: stub_horns, then set_appearance remove", 1500, y);
const doopi = CAST[0];
const ARM = { lUA: 95, lFA: 25, rUA: -10 };
[0, 3, 7].forEach((slots, i) => {
  const look = lookAt(lookFor(catalog, doopi), [{ videoT: 0, params: { who: "doopi", accessory: "bracelet", color: "#e6b84a", slots } }], 1);
  const s = 3.2;
  const j0 = place(doopi, ARM, 0, 0, s, 1);
  const cx = 200 + i * 300;
  const cy = y + 150;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 130, cy - 120, 260, 240);
  ctx.clip();
  ctx.fillStyle = "#ebe9e2";
  ctx.fillRect(cx - 130, cy - 120, 260, 240);
  ctx.translate(cx - (j0.lHand.x + j0.head.x) / 2, cy - (j0.lHand.y + j0.head.y) / 2);
  figure(doopi, 0, 0, s, "happy", { pose: ARM, look });
  ctx.restore();
  label(`slots ${slots}`, cx, cy + 145);
});
const tony = CAST[8];
const g7 = y + 380;
ground(g7, 1150, 1850);
figure(tony, 1330, g7, 1.6, "smug");
const bare = lookAt(lookFor(catalog, tony), [{ videoT: 0, params: { who: "tony", accessory: "stub_horns", remove: true } }], 1);
figure(tony, 1670, g7, 1.6, "surprised", { look: bare });

await backend.savePng(canvas, out);
console.log(`wrote ${out} (${CAST.length} characters, ${FACES.length} faces)`);
