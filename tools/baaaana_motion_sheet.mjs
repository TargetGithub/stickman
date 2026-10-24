#!/usr/bin/env node
// Baaaana task 5 review sheet: the jelly squash after a landing (frame by frame), stretch in the air, the squash
// of a step, the laugh shake, and the sprout leaning with each face and trailing the head's motion.
// Usage: node tools/baaaana_motion_sheet.mjs [out.png]

import { readFileSync } from "node:fs";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawLookBehind, drawLookFront } from "../engine/renderer/accessories_more.js";
import { jellySquash, sproutLean } from "../engine/motion_jelly.js";
import { shadeTones } from "../engine/lighting.js";
import { catalog } from "../catalog/index.js";

const out = process.argv[2] || "out/demos/baaaana_t5_motion.png";
const cast = (id) => ({ id, ...JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url))).cast });
const LEADS = ["bn_mooka", "bobo", "tutu", "zizi"].map(cast);
const STAND = { lUA: -28, lFA: -15, rUA: 38, rFA: 30, lTH: 8, rTH: -8 };
const RIG = catalog.lights.rigs.noon;
const GROUND = 1000; // the floor the jelly maths measures "in the air" against

const backend = await loadBackend();
const W = 1900;
const H = 2150;
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, W, H);
ctx.font = "18px Inter";

const jointsAt = (c, x, groundY, scale) => {
  const dims = bodyPlan(catalog, c.body).dims;
  const probe = computeJoints(STAND, { x, y: 0 }, 1, scale, dims);
  return computeJoints(STAND, { x, y: groundY - lowestPoint(probe, scale, dims) }, 1, scale, dims);
};
/** Draw a lead with an optional squash matrix ({ m, pivot }) and a sprout lean. */
function figure(c, j, scale, face, { sq = null, lean = 0, time = 0.4 } = {}) {
  const plan = catalog.bodies[c.body];
  const dims = bodyPlan(catalog, c.body).dims;
  const look = lookFor(catalog, c);
  ctx.save();
  if (sq) {
    const [a, b, cc, d] = sq.m;
    const { x, y } = sq.pivot;
    ctx.transform(a, b, cc, d, x - a * x - cc * y, y - b * x - d * y);
  }
  const ch = { j, scale, facing: 1, alpha: 1, dims, face };
  drawLookBehind(ctx, ch, look);
  drawCharacter(ctx, j, {
    color: c.color, scale, facing: 1, dims, draw: plan.draw, torsoWidth: plan.torsoWidth, look, outline: true, outlineColor: "#111111",
    face: catalog.faces[face], faceOpts: { t: time, detail: "full", idle: { f: 0, u: 0 } }, light: shadeTones(c.color, RIG), sproutLean: lean,
  });
  drawLookFront(ctx, ch, look);
  ctx.restore();
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
/** Shift a joint set by (0, dy). */
const moved = (j, dy) => Object.fromEntries(Object.entries(j).map(([k, p]) => [k, p && typeof p.x === "number" ? { x: p.x, y: p.y + dy } : p]));

// Row 1: Tutu lands (squishy 2.1): one frame every 1/30 s for half a second.
let g = 330;
label("landing wobble (Tutu): 1/30 s apart, squashed then over- and under-shooting back to round", W / 2, g - 280);
floor(g);
const tutu = LEADS[2];
for (let k = 0; k < 13; k++) {
  const x = 90 + k * 142;
  const j = jointsAt(tutu, x, g, 1.25 * tutu.scale);
  const t = k / 30;
  const sq = jellySquash([moved(j, -8), moved(j, -4), j], [{ type: "land", videoT: 0 }], t, g, catalog.bodies[tutu.body].squishy, "happy");
  figure(tutu, j, 1.25 * tutu.scale, "happy", { sq, lean: sproutLean("happy", 0, t) });
  label(`${Math.round(t * 1000)} ms`, x, g + 26);
}

// Row 2: stretch in the air (Zizi rising and falling), a step down and up (Mooka), the laugh shake (Bobo).
g += 380;
label("in the air: Zizi stretches rising and falling | a step: Mooka squashes as the hip drops | Bobo laughing over 1/6 s", W / 2, g - 300);
floor(g);
const [mooka, bobo, , zizi] = LEADS;
[["rising", -14], ["top", 0], ["falling", 14]].forEach(([name, dy], k) => {
  const x = 120 + k * 170;
  const j = moved(jointsAt(zizi, x, g, 1.6 * zizi.scale), -90);
  const sq = jellySquash([moved(j, -dy), moved(j, -dy / 2), j], [], 1, GROUND, catalog.bodies[zizi.body].squishy, "happy");
  figure(zizi, j, 1.6 * zizi.scale, "surprised", { sq, lean: sproutLean("surprised", -dy * 0.01, 1) });
  label(name, x, g + 26);
});
[["hip rises", -6], ["still", 0], ["hip drops", 6]].forEach(([name, dy], k) => {
  const x = 680 + k * 190;
  const j = jointsAt(mooka, x, g, 1.6 * mooka.scale);
  const sq = jellySquash([moved(j, -dy), moved(j, -dy / 2), j], [], 1, g, catalog.bodies[mooka.body].squishy, "happy");
  figure(mooka, j, 1.6 * mooka.scale, "happy", { sq, lean: sproutLean("happy", dy * 0.02, 1) });
  label(name, x, g + 26);
});
for (let k = 0; k < 4; k++) {
  const x = 1320 + k * 150;
  const t = k / 24;
  const j = jointsAt(bobo, x, g, 1.4 * bobo.scale);
  const sq = jellySquash([j, j, j], [], t, g, catalog.bodies[bobo.body].squishy, "laugh");
  figure(bobo, j, 1.4 * bobo.scale, "laugh", { sq, lean: sproutLean("laugh", 0, t), time: t });
}

// Row 3: the sprout with each mood (Mooka), at rest.
g += 380;
const MOODS = ["happy", "surprised", "neutral", "scared", "dizzy", "tired", "sad", "cry", "asleep"];
label("the sprout follows the mood: perks up when happy or surprised, droops when sad, tired or asleep (Mooka, Tutu, Zizi)", W / 2, g - 290);
floor(g);
MOODS.forEach((face, k) => {
  const x = 110 + k * 205;
  const c = LEADS[[0, 2, 3][k % 3]];
  const j = jointsAt(c, x, g, 1.6 * c.scale);
  figure(c, j, 1.6 * c.scale, face, { lean: sproutLean(face, 0, 0.4) });
  label(face, x, g + 26);
});

// Row 4: the sprout trailing the head's motion (Bobo walking left to right, then stopping).
g += 380;
label("trailing the motion: the sprout leans back while moving and swings forward when stopping (hair sway -0.25 to +0.2)", W / 2, g - 290);
floor(g);
[-0.25, -0.15, -0.05, 0, 0.1, 0.2, 0.1, 0].forEach((sway, k) => {
  const x = 130 + k * 225;
  const j = jointsAt(bobo, x, g, 1.4 * bobo.scale);
  figure(bobo, j, 1.4 * bobo.scale, "happy", { lean: sproutLean("happy", sway, 0.4) });
  label(`sway ${sway}`, x, g + 26);
});

await backend.savePng(canvas, out);
console.log(`wrote ${out}`);
