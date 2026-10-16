#!/usr/bin/env node
// Body plan review sheet (S3 demo): rows are body plans, columns are moves at a telling moment.
// Usage: node tools/body_sheet.mjs [out.png] [--moves a,b,c] [--scale 1.3]

import { loadBackend } from "./lib/canvas.mjs";
import { createActor, playMove, stepActor } from "../engine/actor.js";
import { prepareCatalog } from "../engine/moves.js";
import { bodyPlan } from "../engine/story/bodies.js";
import { lookFor } from "../engine/renderer/looks.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { drawBehind, drawFront } from "../engine/renderer/accessories.js";
import { catalog } from "../data/index.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const out = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "out/demos/s3_bodies.png";
const MOVES = flag("--moves", "idle,walk,jab,front_kick,flying_kick,hit_heavy,cry,victory").split(",");
const scale = Number(flag("--scale", 1.3));
const moves = prepareCatalog(catalog.moves, catalog.poses, catalog.props);

// Each plan in a look from the reference story (STORY_SPEC Appendix A) or a typical role.
const CAST = {
  stickman: { color: "#3fd8ff", style: { headband: "#ff3b5c" } },
  buddy: { color: "#2fd3c0", appearance: { accessories: { antenna: "#ffcc00" } } },
  kid: { color: "#ff9f43", appearance: { hair: "cap", hairColor: "#3a6df0", accessories: { backpack: "#7a4fd8" } } },
  bulky: { color: "#ff7a3d", appearance: { outfit: "armor", outfitColor: "#8a96a8" } },
  slim: { color: "#8a2be2", style: { cape: "#1a1a1a" }, appearance: { hair: "spiky", hairColor: "#222222" } },
  elder: { color: "#c9a26b", appearance: { outfit: "robe", outfitColor: "#5b6e9a", accessories: { bowtie: "#d94b4b" } } },
};
const FACES = { idle: "neutral", walk: "happy", jab: "determined", front_kick: "determined", flying_kick: "furious", hit_heavy: "hurt", cry: "cry", victory: "laugh" };

/** Move time to show: the hit window middle for attacks, else a key moment. */
const moment = (def) => (def.hits.length ? (def.hits[0].t0 + def.hits[0].t1) / 2 : def.name === "walk" ? 0.3 : 0.45);

const cellW = 250;
const cellH = 440;
const left = 150;
const backend = await loadBackend();
const plans = Object.keys(catalog.bodies);
const canvas = backend.createCanvas(left + cellW * MOVES.length, 60 + cellH * plans.length);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = "24px Inter";
ctx.fillStyle = "#333";
ctx.textAlign = "center";
MOVES.forEach((m, i) => ctx.fillText(m, left + cellW * (i + 0.5), 36));

plans.forEach((plan, row) => {
  const groundY = 60 + cellH * (row + 1) - 30;
  ctx.textAlign = "left";
  ctx.fillStyle = "#333";
  ctx.fillText(plan, 16, groundY - cellH / 2);
  const cast = { id: plan, body: plan, ...CAST[plan] };
  const look = lookFor(catalog, cast);
  MOVES.forEach((name, col) => {
    const def = moves.get(name);
    const x0 = left + cellW * (col + 0.5);
    const actor = Object.assign(createActor({ x: x0, groundY, scale, facing: 1, color: cast.color }), bodyPlan(catalog, plan));
    playMove(actor, name, moves);
    const steps = Math.round((moment(def) * def.duration) / (1 / 60));
    let j = stepActor(actor, 0, moves).joints;
    for (let i = 0; i < steps; i++) j = stepActor(actor, 1 / 60, moves).joints;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left + cellW * col, 60 + cellH * row, cellW, cellH);
    ctx.clip();
    // Root motion (a flying kick's travel) would carry the figure out of its cell: centre the body.
    const shift = x0 - (j.hip.x + j.shoulder.x) / 2;
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + cellW * col + 10, groundY);
    ctx.lineTo(left + cellW * (col + 1) - 10, groundY);
    ctx.stroke();
    ctx.translate(shift, 0);
    const c = { id: plan, j, scale, facing: actor.facing, alpha: 1, color: cast.color, dims: actor.dims, face: FACES[name] };
    const past = () => j;
    drawBehind(ctx, c, past, look.style);
    drawCharacter(ctx, j, {
      color: cast.color, scale, facing: actor.facing, dims: actor.dims === undefined ? undefined : actor.dims,
      draw: catalog.bodies[plan].draw, torsoWidth: catalog.bodies[plan].torsoWidth, look,
      face: catalog.faces[FACES[name]], faceOpts: { t: 0.3, detail: "full" },
    });
    drawFront(ctx, c, past, look.style);
    ctx.restore();
  });
});
await backend.savePng(canvas, out);
console.log(`wrote ${out} (${plans.length} body plans x ${MOVES.length} moves)`);
