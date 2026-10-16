// Objects (STORY_SPEC 5.1, 8). Milestone: S1 (set pieces), S4 (all behaviors).
// Each object's `draw` key names a procedural shape (or `paths`, imported SVG). World coordinates:
// x is the object's center, y its height above the floor. Layers: back (smaller, behind characters),
// mid, front. Static objects come from the scene set plus the "object" events up to the frame's time;
// moving ones (balls, floaters, vehicles) are frame items.

import { STAGE } from "../config.js";
import { drawPaths } from "./paths.js";
import { SHAPES } from "./object_shapes.js";

/** Shape names objects can use as `draw` (drafts and the validator check against this list). */
export const OBJECT_SHAPES = () => Object.keys(SHAPES);

// Back-layer pieces are smaller and a little transparent, so they sink into the background (STORY_SPEC 14).
const LAYER_LOOK = { back: { scale: 0.75, alpha: 0.8 }, mid: { scale: 1, alpha: 1 }, front: { scale: 1.15, alpha: 0.95 } };

/** Draw one object shape at the current origin. */
function shape(ctx, def, piece) {
  if (def.paths) return drawPaths(ctx, def.paths, def.colors);
  const draw = SHAPES[def.draw];
  if (draw) draw(ctx, def.colors || {}, piece, def);
}

/**
 * Static objects shown at video time t: the scene's set pieces plus spawned static objects, with
 * state changes, removals and breaks from the scene's "object" events (moving ones are frame items).
 * @param {object[]} set  set pieces; events: the scene's object events in time order
 */
export function staticObjectsAt(catalog, set, events, t) {
  const byId = new Map();
  for (const p of set || []) {
    const def = catalog.objects?.[p.object];
    if (def && !["holdable", "ball", "floater", "vehicle"].includes(def.behavior)) byId.set(p.id, { ...p, state: p.state ?? def.states?.[0] });
  }
  for (const e of events) {
    if (e.videoT > t) break;
    if (e.what === "spawn" && !["ball", "floater", "vehicle"].includes(catalog.objects?.[e.kind]?.behavior)) {
      byId.set(e.id, { id: e.id, object: e.kind, x: e.x, y: e.y, layer: e.layer, facing: e.facing, state: e.state });
    } else if (e.what === "state" && byId.has(e.id)) byId.set(e.id, { ...byId.get(e.id), state: e.state });
    else if ((e.what === "remove" || e.what === "break") && byId.has(e.id)) byId.delete(e.id);
  }
  return [...byId.values()];
}

/**
 * Draw the static objects of one layer in world space (the world transform is set by the caller).
 * @param {object} catalog  needs catalog.objects (no-op without it)
 * @param {Array<{ id, object, x, y?, layer?, facing?, state? }>} set
 */
export function drawSetPieces(ctx, catalog, set, layer) {
  if (!set || !set.length || !catalog.objects) return;
  for (const piece of set) {
    if ((piece.layer || "mid") !== layer) continue;
    const def = catalog.objects[piece.object];
    if (!def || (!SHAPES[def.draw] && !def.paths)) continue;
    if (["holdable", "ball", "floater", "vehicle"].includes(def.behavior)) continue; // props and frame items
    const look = LAYER_LOOK[layer] || LAYER_LOOK.mid;
    ctx.save();
    ctx.translate(piece.x, STAGE.groundY - (piece.y ?? 0));
    ctx.scale(look.scale * (piece.facing === -1 ? -1 : 1), look.scale);
    ctx.globalAlpha = look.alpha;
    shape(ctx, def, piece);
    ctx.restore();
  }
}

/** Draw moving objects (frame items with `obj`): balls and floaters around their center, vehicles on the floor. */
export function drawMovingObjects(ctx, catalog, items) {
  for (const it of items) {
    if (!it.obj) continue;
    const def = catalog.objects?.[it.kind];
    if (!def) continue;
    ctx.save();
    const lift = def.behavior === "ball" ? def.r : 0;
    ctx.translate(it.x, it.y - lift);
    if (def.behavior === "vehicle" && it.facing === -1) ctx.scale(-1, 1);
    if (def.behavior === "floater") ctx.rotate(it.angle || 0);
    shape(ctx, def, it);
    ctx.restore();
  }
}
