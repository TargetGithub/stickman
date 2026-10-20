// Objects (STORY_SPEC 5.1, 8). Milestone: S1 (set pieces), S4 (all behaviors).
// Each object's `draw` key names a procedural shape (or `paths`, imported SVG). World coordinates:
// x is the object's center, y its height above the floor. Layers: back (smaller, behind characters),
// mid, front. Static objects come from the scene set plus the "object" events up to the frame's time;
// moving ones (balls, floaters, vehicles) are frame items.

import { STAGE } from "../config.js";
import { drawPaths } from "./paths.js";
import { SHAPES as BASE_SHAPES } from "./object_shapes.js";
import { PLACE_SHAPES } from "./object_shapes_places.js";
import { drawLit, pieceShadow } from "./piece_light.js";
import { GLOW_SHAPES } from "./object_shapes_travel.js";

const SHAPES = { ...BASE_SHAPES, ...PLACE_SHAPES };

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
export function drawSetPieces(ctx, catalog, set, layer, t = 0) {
  if (!set || !set.length || !catalog.objects) return;
  for (const piece of set) {
    if ((piece.layer || "mid") !== layer) continue;
    drawSetPiece(ctx, catalog, piece, t, LAYER_LOOK[layer] || LAYER_LOOK.mid);
  }
}

/** The catalog object of a set piece that draws as one (a known shape, not a prop or a frame item), else null. */
export function setPieceDef(catalog, piece) {
  const def = catalog.objects?.[piece.object];
  if (!def || (!SHAPES[def.draw] && !def.paths)) return null;
  return ["holdable", "ball", "floater", "vehicle"].includes(def.behavior) ? null : def; // props and frame items
}

/** Whether a catalog object gives light (a campfire): it keeps its own look under a light rig (ADR-035). */
export const glows = (def) => !def.paths && GLOW_SHAPES.includes(def.draw);

/** One set piece on the floor at its x (and y lift), with a layer look (scale, alpha; the depth lane passes none). */
export function drawSetPiece(ctx, catalog, piece, t = 0, look = LAYER_LOOK.mid) {
  const def = setPieceDef(catalog, piece);
  if (!def) return;
  ctx.save();
  ctx.translate(piece.x, STAGE.groundY - (piece.y ?? 0));
  ctx.scale(look.scale * (piece.facing === -1 ? -1 : 1), look.scale);
  ctx.globalAlpha = look.alpha;
  shape(ctx, def, def.animated ? { ...piece, t } : piece);
  ctx.restore();
}

/**
 * Draw moving objects (frame items with `obj`): balls and floaters around their center, vehicles on the floor.
 * r (v3 scenes under a light rig, ADR-035): balls and vehicles get contact shadows and every object the light's tones.
 */
export function drawMovingObjects(ctx, catalog, items, r = null) {
  const rig = r?.frameLight;
  for (const it of items) {
    if (!it.obj) continue;
    const def = catalog.objects?.[it.kind];
    if (!def) continue;
    const lift = def.behavior === "ball" ? def.r : 0;
    if (rig && def.behavior !== "floater") pieceShadow(ctx, rig, def, it.x, Math.max(0, STAGE.groundY - it.y));
    const draw = (g) => {
      g.save();
      g.translate(it.x, it.y - lift);
      if (def.behavior === "vehicle" && it.facing === -1) g.scale(-1, 1);
      if (def.behavior === "floater") g.rotate(it.angle || 0);
      shape(g, def, it);
      g.restore();
    };
    const w = def.w ?? (def.r ?? 40) * 2;
    const h = def.h ?? (def.r ?? 40) * 2;
    const box = { x0: it.x - w - 30, y0: it.y - lift - h * 1.3 - 30, x1: it.x + w + 30, y1: it.y + h * 0.5 + 30 };
    if (rig && !glows(def)) drawLit(ctx, r, r.framePieceTones, box, draw, Math.min(w, h) * 0.5);
    else draw(ctx);
  }
}
