#!/usr/bin/env node
// Batch A5 review sheet (Doopi & Friends): every new object at three camera distances, the held
// ones in Doopi's hand, and the rainbow crystal in all its states.
// Usage: node tools/a5_sheet.mjs [out.png]

import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawProp } from "../engine/renderer/props.js";
import { SHAPES } from "../engine/renderer/object_shapes.js";
import { holdableData } from "../engine/objects.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/a5_objects.png";
const DOOPI = { id: "doopi", color: "#5ec8ff", appearance: { eyes: "big", hair: "spiky", hairColor: "#2a1a14", mouthStyle: "cartoon", accessories: { headband: "#ff3b5c" } } };
const SET = ["haystack", "cart", "market_stall", "basket", "kite", "apple"];
const HELD = ["rainbow_crystal", "gloom_horn", "jalebi", "jalebi_plate", "apple", "kite", "basket"];
// Arm poses per held object (the use pose; the crystal held up high; the plate on the left hand).
const USE = { lean: -4, head: -6, lUA: 14, lFA: 10, rUA: 95, rFA: 35, lTH: 6, lSH: 0, rTH: -6, rSH: 0 };
const POSE = {
  rainbow_crystal: [{ ...USE, rUA: 150, rFA: 20, head: -14 }, 0],
  gloom_horn: [USE, 20],
  jalebi_plate: [{ ...USE, lUA: 70, lFA: 30, rUA: 30, rFA: 40 }, 0],
  kite: [{ ...USE, rUA: 140, rFA: 10, head: -18 }, 0],
};

const backend = await loadBackend();
const W = 2400;
const H = 2560;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "22px Inter";
ctx.textAlign = "center";
const label = (text, x, y, size = 22) => {
  ctx.font = `${size}px Inter`;
  ctx.fillStyle = "#333";
  ctx.fillText(text, x, y);
};
function ground(y) {
  ctx.fillStyle = "#e3dfd2";
  ctx.fillRect(20, y, W - 40, 6);
}

/** A set piece (or a ball or floater shape) at bottom center x, y and a scale. */
function piece(name, x, y, s, state) {
  const def = catalog.objects[name];
  ctx.save();
  const lift = def.behavior === "ball" ? def.r : def.behavior === "floater" ? def.r * 4 : 0;
  ctx.translate(x, y - lift * s);
  ctx.scale(s, s);
  SHAPES[def.draw](ctx, def.colors || {}, { state: state ?? def.states?.[0], wheel: 0.3, angle: 0.1 }, def);
  ctx.restore();
}
const width = (name) => {
  const d = catalog.objects[name];
  return d.w ?? (d.r ? d.r * 3 : 60);
};

/** Doopi standing on y at x, holding a holdable in its pose. */
function holder(name, x, y, s, state) {
  const [pose, angle] = POSE[name] || [USE, 10];
  const probe = computeJoints(pose, { x, y: 0 }, 1, s);
  const j = computeJoints(pose, { x, y: y - lowestPoint(probe, s) }, 1, s);
  const data = { ...holdableData(catalog, name), ...(state ? { state } : {}) };
  drawCharacter(ctx, j, { color: DOOPI.color, scale: s, facing: 1, look: lookFor(catalog, DOOPI), face: catalog.faces.happy, faceOpts: { t: 0.4, detail: "full" }, prop: { data, angle } });
}

label("A5 objects (Doopi & Friends): set pieces, balls and floaters at three camera distances", W / 2, 40, 28);
let y = 120;
for (const s of [1, 0.55, 0.3]) {
  const base = y + 420 * s + 20;
  ground(base);
  label(`${s}x`, 60, base - 10);
  let x = 160;
  for (const name of SET) {
    const w = width(name) * s;
    piece(name, x + w / 2, base, s);
    if (s === 1) label(name, x + w / 2, base + 34);
    x += w + 110 * s + 40;
  }
  // The broken basket shows nothing (it breaks into pieces with the prop_break effect).
  y = base + (s === 1 ? 70 : 40);
}

label("Held by Doopi (1x, 0.55x, 0.3x)", W / 2, y + 30, 26);
y += 40;
for (const s of [1, 0.55, 0.3]) {
  const base = y + 300 * s + 30;
  ground(base);
  label(`${s}x`, 60, base - 10);
  HELD.forEach((name, i) => {
    const x = 220 + i * 300 * Math.max(s, 0.45);
    holder(name, x, base, s);
    if (s === 1) label(name, x + 10, base + 34);
  });
  y = base + (s === 1 ? 60 : 30);
}

label("rainbow_crystal states (2x, then held at 1x)", W / 2, y + 30, 26);
const states = catalog.objects.rainbow_crystal.states;
const cy = y + 120;
// A dark strip behind the gems shows the glow.
ctx.fillStyle = "#2b2f3a";
ctx.fillRect(120, cy - 70, W - 240, 140);
states.forEach((state, i) => {
  const x = 260 + i * 270;
  const hold = { ...holdableData(catalog, "rainbow_crystal"), state };
  drawProp(ctx, hold, { butt: { x, y: cy + 28 * 2 * 0.5 }, tip: { x, y: cy - 28 * 2 * 0.62 } }, 2);
  label(state, x, cy + 100);
});
const hy = cy + 420;
ground(hy);
states.forEach((state, i) => holder("rainbow_crystal", 220 + i * 280, hy, 1, state));

await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
