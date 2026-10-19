// The scene graph for one frame (ENGINE_V3_SPEC 3, 5.1; ADR-023). Milestone: V3.2.
// sceneNodes() lists what the renderer draws in a v3 scene, each with its z, sorted far to near:
// set pieces, extras, characters and the stage-line group (loose props, particles, trails, moving objects),
// which keeps the v2 order inside it. Pure: the renderer gives it the frame's data and draws the result.

import { depthOrder, depthAt, zOf, LAYER_Z } from "./depth.js";

/** Node kinds in the order they draw when they share a z. */
export const NODE_KINDS = ["piece", "extras", "shadow", "character", "stage"];

/**
 * @param {object} o
 * @param {object[]} o.chars  frame characters (id, j, scale, alpha, ...)
 * @param {object[]} o.pieces  set pieces in place this frame ({ id, object, x, z?, layer? })
 * @param {object[]} o.extras  extras plans ({ layer, ... })
 * @param {Map<string, object[]>} o.depthEvents  character id → its depth events (storyT, z0, z1, dur), in order
 * @param {Map<string, number>} o.placementZ  character id → the z it was placed at
 * @param {number} o.storyT  scene story time of the frame
 * @param {object} o.depth  the scene's depth settings (depthOf)
 * @returns {Array<{ kind:string, z:number, ref:any }>}  far to near; the "stage" node is the z = 0 group
 */
export function sceneNodes({ chars, pieces, extras, depthEvents, placementZ, storyT, depth }) {
  const nodes = [];
  for (const p of pieces) nodes.push({ kind: "piece", z: zOf(p, depth), ref: p });
  const layers = new Set(extras.map((e) => e.layer ?? "back"));
  for (const layer of ["back", "mid", "front"]) if (layers.has(layer)) nodes.push({ kind: "extras", z: LAYER_Z[layer], ref: layer });
  for (const c of chars) {
    const z = depthAt(depthEvents.get(c.id) || [], placementZ.get(c.id) ?? 0, storyT);
    nodes.push({ kind: "character", z, ref: c });
  }
  nodes.push({ kind: "stage", z: 0, ref: null });
  const order = NODE_KINDS;
  // Within one z (the stage line, mostly): pieces, extras, characters largest first, then the stage group.
  return depthOrder(nodes.map((n, i) => ({ ...n, i }))).sort((a, b) => {
    const dz = (Math.abs(a.z) < 0.5 ? 0 : a.z) - (Math.abs(b.z) < 0.5 ? 0 : b.z);
    if (dz) return 0; // already in depth order; keep it
    const dk = order.indexOf(a.kind) - order.indexOf(b.kind);
    if (dk) return dk;
    if (a.kind === "character") return b.ref.scale - a.ref.scale || a.i - b.i;
    return a.i - b.i;
  }).map(({ i, ...n }) => n);
}

/** The z of each character this frame, by id (for overlays and particle anchors). */
export function characterDepths(nodes) {
  return new Map(nodes.filter((n) => n.kind === "character").map((n) => [n.ref.id, n.z]));
}
