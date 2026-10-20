// World items for the renderer (split from renderer/index.js in V3.6): loose and thrown props, held-object
// states, and slash trails. Pure drawing from the frame data.

import { drawProp } from "./props.js";
import { holdableData } from "../objects.js";

/** A holdable with states (the rainbow crystal) shows its latest state, carried across scenes. */
export function withState(r, sv, name, data, t) {
  const def = r.catalog.objects?.[name];
  if (!def?.states || def.behavior !== "holdable") return data;
  const e = r.heldStates.findLast((x) => x.kind === name && x.videoT <= t);
  return { ...data, state: e?.state ?? sv.set?.find((p) => p.object === name && p.state)?.state ?? def.states[0] };
}

/** Loose props: lying ones before the characters, thrown (flying) ones after. */
export function drawItems(ctx, r, items, flying, sv, t) {
  for (const it of items.filter((i) => i.flying === flying)) {
    if (it.obj) continue; // moving objects are drawn by drawMovingObjects
    const held = holdableData(r.catalog, it.name);
    if (!held) continue;
    const data = withState(r, sv, it.name, held, t);
    const scale = 1;
    const half = (data.len * scale) / 2;
    const dx = Math.cos(it.angle) * half;
    const dy = Math.sin(it.angle) * half;
    drawProp(ctx, data, { butt: { x: it.x - dx, y: it.y - dy }, tip: { x: it.x + dx, y: it.y + dy }, grip: { x: it.x, y: it.y } }, scale);
  }
}

/** Slash trails behind weapon tips. */
export function drawTrails(ctx, n, sv, trails, r, charsAt) {
  for (const t of trails.filter((x) => x.kind === "slash" && x.part)) {
    const pts = [];
    for (let back = 8; back >= 0; back--) {
      if (n - back < 0) continue;
      const c = charsAt(r, n - back).find((x) => x.id === t.actorId);
      if (c && c.j[t.part]) pts.push(c.j[t.part]);
    }
    ctx.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${(i / pts.length) * 0.85})`;
      ctx.lineWidth = 3 + 9 * (i / pts.length);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  }
}
