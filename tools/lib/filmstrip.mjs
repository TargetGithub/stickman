// Move filmstrips for review (S5): rows of evenly spaced frames, one row per move and body plan.
// Used by tools/draft.mjs (a drafted move) and tools/move_sheet.mjs (a batch of catalog moves).

import { loadBackend } from "./canvas.mjs";
import { catalog } from "../../data/index.js";
import { prepareCatalog } from "../../engine/moves.js";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { holdableData, holdableProps } from "../../engine/objects.js";

/** A holdable for a needsProp kind (story holdables first, then the v1 props). */
function holding(kind) {
  if (!kind) return null;
  const name = kind === "any" ? "sword" : Object.keys(catalog.objects).find((n) => catalog.objects[n].hold?.kind === kind) || Object.keys(catalog.props).find((n) => catalog.props[n].kind === kind);
  const data = name ? holdableData(catalog, name) : null;
  return data ? { name, kind: data.kind, data } : null;
}

/**
 * @param {object[]} defs  raw move entries (catalog moves or drafts)
 * @param {{ plans?: string[], frames?: number, cell?: [number, number], color?: string }} opts
 */
export async function moveSheet(defs, out, opts = {}) {
  const plans = opts.plans || ["stickman"];
  const frames = opts.frames || 8;
  const [cw, ch] = opts.cell || [150, 300];
  const names = new Set(defs.map((d) => d.name));
  const moves = prepareCatalog([...catalog.moves.filter((m) => !names.has(m.name)), ...defs], catalog.poses, holdableProps(catalog));
  const backend = await loadBackend();
  const labelW = 170;
  const rows = defs.length * plans.length;
  const canvas = backend.createCanvas(labelW + cw * frames, ch * rows);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let row = 0;
  for (const def of defs) {
    const prepared = moves.get(def.name);
    const total = prepared.duration * (prepared.params.cycles || 1);
    for (const plan of plans) {
      const ground = ch * (row + 1) - 24;
      ctx.fillStyle = "#333333";
      ctx.font = "18px Inter";
      ctx.fillText(def.name, 10, ch * row + ch / 2);
      ctx.fillStyle = "#888888";
      ctx.font = "14px Inter";
      ctx.fillText(`${plan} · ${prepared.category} · ${total.toFixed(1)}s`, 10, ch * row + ch / 2 + 20);
      for (let k = 0; k < frames; k++) {
        const a = Object.assign(createActor({ id: "a", x: 0, facing: 1, groundY: ground, color: opts.color || "#22aaff" }), bodyPlan(catalog, plan));
        a.prop = holding(prepared.needsProp);
        playMove(a, def.name, moves);
        let j = stepActor(a, 0, moves).joints;
        for (let i = 0; i < Math.round((k / (frames - 1)) * total * 60); i++) j = stepActor(a, 1 / 60, moves).joints;
        const x0 = labelW + cw * k;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, ch * row, cw, ch);
        ctx.clip();
        ctx.translate(x0 + cw / 2 - (j.hip.x + j.head.x) / 2, 0); // travelling and lying moves stay in their cell
        const p = catalog.bodies[plan];
        drawCharacter(ctx, j, { color: opts.color || "#22aaff", scale: 1, facing: a.facing, dims: a.dims, draw: p.draw, torsoWidth: p.torsoWidth,
          prop: a.prop ? { data: a.prop.data, angle: a.propAngle } : undefined,
          face: catalog.faces[prepared.face || "neutral"], faceOpts: { detail: "full" } });
        ctx.restore();
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "13px Inter";
        ctx.fillText(`t=${(k / (frames - 1)).toFixed(2)}`, x0 + 6, ch * row + 16);
      }
      ctx.strokeStyle = "#e4e4e4";
      ctx.beginPath();
      ctx.moveTo(labelW, ground);
      ctx.lineTo(canvas.width, ground);
      ctx.moveTo(0, ch * (row + 1));
      ctx.lineTo(canvas.width, ch * (row + 1));
      ctx.stroke();
      row++;
    }
  }
  await backend.savePng(canvas, out);
}
