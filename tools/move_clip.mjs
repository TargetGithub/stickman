#!/usr/bin/env node
// Render moves for review.
//   node tools/move_clip.mjs                      → out/demos/m1_moves.mp4 (grid of every move, looping, 8 s)
//   node tools/move_clip.mjs --strip front_kick   → out/demos/strip_front_kick.png (12 evenly spaced frames)
// Options: --moves a,b,c  --seconds 8  --scale 1.4

import { spawn } from "node:child_process";
import { loadBackend } from "./lib/canvas.mjs";
import { createActor, playMove, stepActor } from "../engine/actor.js";
import { prepareCatalog } from "../engine/moves.js";
import { computeJoints, lowestPoint } from "../engine/skeleton.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { holdableProps } from "../engine/objects.js";
import { catalog } from "../data/index.js";
import { propByKind } from "../engine/props.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const DT = 1 / 60;
const moves = prepareCatalog(catalog.moves, catalog.poses, holdableProps(catalog));

/** Armed moves are previewed holding their prop ("any" → sword). */
function arm(actor, def) {
  if (!def.needsProp) return;
  const held = holdableProps(catalog);
  const data = def.needsProp === "any" ? catalog.props.sword : propByKind(held, def.needsProp);
  const name = Object.keys(held).find((k) => held[k] === data);
  actor.prop = { name, kind: data.kind, data };
}
const propStyle = (actor) => (actor.prop ? { data: actor.prop.data, angle: actor.propAngle } : undefined);
const names = flag("--moves", [...moves.keys()].join(",")).split(",");
const scale = Number(flag("--scale", 1.4));
const backend = await loadBackend();

/** One review cell: an actor replaying a move with a short idle gap, plus a grey dummy for attacks. */
function makeCell(name, x0, groundY) {
  const actor = createActor({ x: x0, groundY, scale, facing: 1 });
  const def = moves.get(name);
  let wait = 0;
  const restart = () => {
    actor.x = x0;
    arm(actor, def);
    playMove(actor, name, moves);
  };
  restart();
  return {
    name,
    def,
    step() {
      const r = stepActor(actor, DT, moves);
      if (actor.move?.def.name === "idle" && name !== "idle") {
        wait += DT;
        if (wait > 0.4) {
          wait = 0;
          restart();
        }
      }
      return r;
    },
    actor,
  };
}

function drawCell(ctx, cell, box, frameInfo) {
  const { x, y, w, h, groundY } = box;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, groundY);
  ctx.lineTo(x + w - 10, groundY);
  ctx.stroke();

  if (cell.def.category === "attack") {
    const dummyX = x + w * 0.72;
    const raw = computeJoints(catalog.poses.stand, { x: dummyX, y: 0 }, -1, scale);
    const j = computeJoints(catalog.poses.stand, { x: dummyX, y: groundY - lowestPoint(raw, scale) }, -1, scale);
    drawCharacter(ctx, j, { color: "#bbbbbb", scale, facing: -1 });
  }
  const r = frameInfo;
  drawCharacter(ctx, r.joints, { color: "#22aaff", scale, facing: cell.actor.facing, mouth: cell.actor.mouth, prop: propStyle(cell.actor) });
  for (const win of r.openWindows) {
    const p = r.joints[win.hit.part];
    if (!p) continue;
    ctx.strokeStyle = "rgba(255, 60, 60, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#333333";
  ctx.font = "28px Inter";
  ctx.textAlign = "left";
  ctx.fillText(`${cell.name}  ${cell.def.duration.toFixed(2)}s`, x + 16, y + 38);
  ctx.restore();
}

if (args.includes("--strip")) {
  const name = flag("--strip");
  const def = moves.get(name);
  if (!def) throw new Error(`unknown move ${name}`);
  const count = 12;
  const cellW = 260;
  const cellH = 380;
  const canvas = backend.createCanvas(cellW * count, cellH);
  const ctx = canvas.getContext("2d");
  const actor = createActor({ x: 0, groundY: cellH - 50, scale: 1.2, facing: 1 });
  arm(actor, def);
  playMove(actor, name, moves, { blend: 0 });
  const total = Math.ceil(def.duration * 60);
  const pick = new Set(Array.from({ length: count }, (_, i) => Math.round((i * (total - 1)) / (count - 1))));
  let col = 0;
  for (let f = 0; f < total; f++) {
    const startX = actor.x;
    const r = stepActor(actor, DT, moves);
    if (!pick.has(f)) continue;
    const ox = col * cellW + 90 - startX;
    ctx.save();
    ctx.translate(ox, 0);
    drawCell(ctx, { name: `t=${(f / (total - 1)).toFixed(2)}`, def: { duration: f / 60, category: "" }, actor }, { x: -ox + col * cellW, y: 0, w: cellW, h: cellH, groundY: cellH - 50 }, r);
    ctx.restore();
    col++;
  }
  const out = `out/demos/strip_${name}.png`;
  await backend.savePng(canvas, out);
  console.log(`wrote ${out}`);
} else {
  const W = 1920;
  const H = 1080;
  const cols = 4;
  const rowsN = Math.ceil(names.length / cols);
  const cw = W / cols;
  const ch = H / rowsN;
  const cells = names.map((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const box = { x: col * cw, y: row * ch, w: cw, h: ch, groundY: row * ch + ch - 40 };
    const cell = makeCell(n, box.x + cw * (moves.get(n).flags.loop && n !== "idle" ? 0.12 : 0.3), box.groundY);
    return { cell, box };
  });
  const canvas = backend.createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const seconds = Number(flag("--seconds", 8));
  const out = "out/demos/m1_moves.mp4";
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${W}x${H}`, "-framerate", "60", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  for (let f = 0; f < seconds * 60; f++) {
    ctx.fillStyle = "#e9e9ec";
    ctx.fillRect(0, 0, W, H);
    for (const { cell, box } of cells) {
      // Loop moves (walk, run) wrap around inside their cell.
      if (cell.actor.x > box.x + box.w - 40) cell.actor.x = box.x + 40;
      drawCell(ctx, cell, { ...box, x: box.x + 4, y: box.y + 4, w: box.w - 8, h: box.h - 8 }, cell.step());
    }
    if (!ff.stdin.write(Buffer.from(backend.readRGBA(canvas).buffer))) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  console.log(`wrote ${out} (${names.length} moves, ${seconds}s)`);
}
