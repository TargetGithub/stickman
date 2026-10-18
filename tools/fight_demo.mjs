#!/usr/bin/env node
// M2 demo: a hard-coded choreographed fight (hero 1.0 vs boss 2.2) showing all five outcomes,
// knockback, launch, knockdown and get-up. Uses engine/world.js directly (the director arrives in M3).
// Usage: node tools/fight_demo.mjs [--out out/demos/m2_fight.mp4]

import { spawn } from "node:child_process";
import { loadBackend } from "./lib/canvas.mjs";
import { createActor } from "../engine/actor.js";
import { prepareCatalog } from "../engine/moves.js";
import { createWorld, command, stepWorld } from "../engine/world.js";
import { requiredStartX } from "../engine/combat.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { mulberry32 } from "../engine/math.js";
import { COMBAT, SHAKE } from "../engine/config.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/demos/m2_fight.mp4";
const W = 1920;
const H = 1080;
const DT = 1 / 60;
const moves = prepareCatalog(catalog.moves, catalog.poses);

const hero = createActor({ id: "hero", x: 900, facing: 1, scale: 1, color: "#22aaff", hp: 100 });
const boss = createActor({ id: "boss", x: 1500, facing: -1, scale: 2.2, color: "#ff3b3b", hp: 200 });
const world = createWorld({ actors: [boss, hero], moves });

const STEPS = [
  { who: "hero", move: "jab", target: "boss", outcome: "hit", caption: "hero jab → hit (lands low on a big target)" },
  { who: "hero", move: "cross", target: "boss", outcome: "blocked", caption: "hero cross → blocked" },
  { who: "boss", move: "front_kick", target: "hero", outcome: "dodged", caption: "boss front kick → dodged" },
  { who: "boss", move: "cross", target: "hero", outcome: "parried", caption: "boss cross → parried (boss staggers)" },
  { who: "hero", move: "front_kick", target: "boss", outcome: "whiff", caption: "hero front kick → whiff" },
  { who: "hero", move: "cross", target: "boss", outcome: "hit", caption: "hero cross → hit (heavy reaction)" },
  { who: "boss", move: "jab", target: "hero", outcome: "hit", caption: "boss jab → hit (aims down at the hero's head)" },
  { who: "hero", move: "front_kick", target: "boss", outcome: "hit", params: { damage: 20 }, caption: "hero front kick, damage 20 → launch + knockdown" },
  { who: "boss", move: "get_up", caption: "boss gets up" },
];

/** Walk in (or hop back) so the attack starts within nudge range, then queue the attack. */
function runStep(step) {
  const actor = world.byId.get(step.who);
  if (!step.target) return command(world, step.who, step.move, {});
  const target = world.byId.get(step.target);
  const def = moves.get(step.move);
  const params = { ...def.params, ...(step.params || {}) };
  const need = (requiredStartX(actor, target, def, params, step.outcome) - actor.x) * Math.sign(target.x - actor.x);
  const slack = COMBAT.maxNudge * actor.scale * 0.5;
  if (need > slack) command(world, step.who, "walk", { target: step.target, params: { distance: need } });
  else if (need < -slack) command(world, step.who, "dodge_back", { target: step.target, params: { distance_back: -need / (1.08 * actor.scale) } });
  command(world, step.who, step.move, { target: step.target, outcome: step.outcome, params: step.params, queue: need > slack || need < -slack });
}

const backend = await loadBackend();
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${W}x${H}`, "-framerate", "60", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));

const rng = mulberry32(7);
const flashes = [];
let shake = null;
let hitstop = 0;
let stepIndex = -1;
let pause = 1.0;
let caption = "M2 demo: choreographed outcomes";
let camX = (hero.x + boss.x) / 2;
const busy = (a) => a.move && a.move.def.name !== "idle";
const hitFrames = [];

function drawFrame() {
  ctx.fillStyle = "#f7f7f5";
  ctx.fillRect(0, 0, W, H);
  camX += ((hero.x + boss.x) / 2 - camX) * 0.08;
  let sx = 0;
  let sy = 0;
  if (shake) {
    const k = shake.left / shake.total;
    sx = (rng() * 2 - 1) * shake.amp * k;
    sy = (rng() * 2 - 1) * shake.amp * k;
    if (--shake.left <= 0) shake = null;
  }
  ctx.save();
  ctx.translate(W / 2 - camX + sx, sy);
  ctx.fillStyle = "#e4e2dc";
  ctx.fillRect(camX - W, 880, W * 2, H - 880);
  ctx.strokeStyle = "#b9b6ad";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(camX - W, 880); ctx.lineTo(camX + W, 880); ctx.stroke();
  for (const a of [...world.actors].sort((p, q) => q.scale - p.scale)) {
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.beginPath(); ctx.ellipse(a.joints.hip.x, 882, 40 * a.scale, 7 * a.scale, 0, 0, Math.PI * 2); ctx.fill();
    drawCharacter(ctx, a.joints, { color: a.color, scale: a.scale, facing: a.facing, mouth: a.mouth });
  }
  for (const f of flashes) {
    const k = f.left / 12;
    ctx.strokeStyle = f.kind === "hit" ? `rgba(255, 190, 0, ${k})` : `rgba(80, 170, 255, ${k})`;
    ctx.lineWidth = 6;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + f.rot;
      const r0 = 14 + (1 - k) * 30;
      const r1 = r0 + 30 * k + 10;
      ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); ctx.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.stroke();
    }
    f.left--;
  }
  for (let i = flashes.length - 1; i >= 0; i--) if (flashes[i].left <= 0) flashes.splice(i, 1);
  ctx.restore();

  for (const [i, a] of [hero, boss].entries()) {
    const x = i === 0 ? 60 : W - 60 - 600;
    ctx.fillStyle = "#333333";
    ctx.fillRect(x, 50, 600, 26);
    ctx.fillStyle = a.color;
    const w = (600 * Math.max(0, a.hp)) / a.maxHp;
    ctx.fillRect(i === 0 ? x : x + 600 - w, 50, w, 26);
    ctx.font = "28px Bangers";
    ctx.fillStyle = "#222222";
    ctx.textAlign = i === 0 ? "left" : "right";
    ctx.fillText(`${a.id.toUpperCase()}  ${Math.round(a.hp)}`, i === 0 ? x : x + 600, 112);
  }
  ctx.textAlign = "center";
  ctx.font = "46px Inter";
  ctx.fillStyle = "#222222";
  ctx.fillText(caption, W / 2, 190);
  if (hitstop > 0) {
    ctx.font = "26px Inter";
    ctx.fillStyle = "#999999";
    ctx.fillText("hitstop", W / 2, 236);
  }
}

let frame = 0;
for (; frame < 60 * 40; frame++) {
  if (hitstop <= 0 && !busy(hero) && !busy(boss) && !boss.holding || stepIndex === STEPS.length - 2 && boss.holding && !busy(hero)) {
    pause -= DT;
    if (pause <= 0) {
      stepIndex++;
      if (stepIndex >= STEPS.length) break;
      caption = STEPS[stepIndex].caption;
      runStep(STEPS[stepIndex]);
      pause = 0.6;
    }
  }
  const events = stepWorld(world, hitstop > 0 ? 0 : DT);
  if (hitstop > 0) hitstop -= DT;
  for (const e of events) {
    if (e.type === "hitstop") hitstop = Math.max(hitstop, e.seconds);
    if (e.type === "hit") {
      flashes.push({ x: e.point.x, y: e.point.y, left: 12, kind: e.kind, rot: rng() * Math.PI });
      const preset = e.shake || (e.kind === "hit" ? "small" : null);
      if (preset) shake = { amp: SHAKE[preset].amplitude, total: Math.round(SHAKE[preset].duration * 60), left: Math.round(SHAKE[preset].duration * 60) };
      hitFrames.push(frame);
      console.log(`t=${(frame / 60).toFixed(2)}s  ${e.attacker} ${e.move} → ${e.kind} on ${e.target} (damage ${e.damage.toFixed(1)})`);
    }
    if (e.type === "positionError") console.log(`positionError ${e.actor} ${e.move} ${e.error.toFixed(0)}px`);
  }
  drawFrame();
  if (!ff.stdin.write(Buffer.from(backend.readRGBA(canvas).buffer))) await new Promise((r) => ff.stdin.once("drain", r));
}
for (let i = 0; i < 60; i++) {
  stepWorld(world, DT);
  drawFrame();
  if (!ff.stdin.write(Buffer.from(backend.readRGBA(canvas).buffer))) await new Promise((r) => ff.stdin.once("drain", r));
  frame++;
}
ff.stdin.end();
await done;
console.log(`wrote ${out} (${(frame / 60).toFixed(1)} s); hit frames: ${hitFrames.join(",")}`);
