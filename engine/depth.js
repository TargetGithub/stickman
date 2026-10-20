// The depth lane (ENGINE_V3_SPEC 5.1, ADR-023). Milestone: V3.2.
// Every scene node has z: 0 is the stage line, positive is toward the camera, negative away. A node at z
// is drawn with scale s = focal / (focal - z), about the camera's x (far things gather toward the camera's
// x, near ones spread out) and about a feet line that rises toward a horizon as things recede. Pure
// functions; the renderer and the simulation share them so both see the same depth at the same time.

import { clamp, lerp } from "./math.js";

/** Scene defaults: `depth: { near, far, focal, horizon }` on a v3 scene overrides them. */
export const DEPTH = Object.freeze({ focal: 2400, near: 600, far: -2000, horizon: 260 });
/** How close in z two characters must be to touch, collide or hit (px). */
export const DEPTH_TOUCH = 60;
/**
 * The v2 layer names as z presets. Chosen so a v3 script that says "back" or "front" draws at the legacy
 * layer scales of 0.75 and 1.15 (STORY_SPEC 14) with the default focal length: 2400 / 3200 and 2400 / 2087.
 */
export const LAYER_Z = Object.freeze({ back: -800, mid: 0, front: 2400 - 2400 / 1.15 });
/** A walk in depth also covers at least this share of |dz| in x (the figure drifts diagonally, as in cartoons). */
export const DEPTH_WALK_DRIFT = 0.5;

/** A scene's depth settings (defaults filled in). */
export function depthOf(scene) {
  const d = scene?.depth || {};
  return { focal: d.focal ?? DEPTH.focal, near: d.near ?? DEPTH.near, far: d.far ?? DEPTH.far, horizon: d.horizon ?? DEPTH.horizon };
}

/** The z of a placement, set piece or extras entry: its `z`, else its layer's preset, else the stage line. */
export function zOf(node, depth = DEPTH) {
  const z = typeof node?.z === "number" ? node.z : LAYER_Z[node?.layer ?? "mid"] ?? 0;
  return clamp(z, depth.far, depth.near);
}

/** Draw scale of a node at z. */
export function projectScale(z, focal = DEPTH.focal) {
  return focal / Math.max(1, focal - z);
}

/**
 * The transform for drawing a node at z whose feet stand at world (x, groundY): draw it unchanged in world
 * space inside `ctx.transform(s, 0, 0, s, tx, ty)`.
 * @param {{ x:number }} cam  camera state (world x the projection is about)
 */
export function depthTransform(z, x, cam, groundY, depth = DEPTH) {
  const s = projectScale(z, depth.focal);
  const feetX = cam.x + (x - cam.x) * s;
  const feetY = groundY - (1 - s) * depth.horizon;
  return { s, tx: feetX - x * s, ty: feetY - groundY * s };
}

/** A world point on a node at z, projected (where its joints really are on screen, in world units). */
export function projectPoint(p, z, x, cam, groundY, depth = DEPTH) {
  const t = depthTransform(z, x, cam, groundY, depth);
  return { x: p.x * t.s + t.tx, y: p.y * t.s + t.ty };
}

/** A character's joints projected for overlays (bubbles, HP bars, particle anchors). */
export function projectJoints(j, z, x, cam, groundY, depth = DEPTH) {
  if (Math.abs(z) < 1e-6) return j;
  const t = depthTransform(z, x, cam, groundY, depth);
  const out = {};
  for (const [k, p] of Object.entries(j)) out[k] = p && typeof p.x === "number" ? { x: p.x * t.s + t.tx, y: p.y * t.s + t.ty } : p;
  return out;
}

/**
 * A character's z at story time t from its depth events (walks in depth and layer beats), in order.
 * @param {Array<{ storyT:number, z0:number, z1:number, dur:number }>} events
 * @param {number} z0  the scene placement's z
 */
export function depthAt(events, z0, t) {
  let z = z0;
  for (const e of events) {
    if (e.storyT > t) break;
    z = e.dur > 0 ? lerp(e.z0, e.z1, clamp((t - e.storyT) / e.dur, 0, 1)) : e.z1;
  }
  return z;
}

/**
 * Plan a walk that changes depth (`to: { x?, z }`): where it ends and how long it takes, so the sim and
 * the renderer can lerp z over the walk. The x leg is at least DEPTH_WALK_DRIFT × |dz| so the walk has
 * ground to cover (a figure walking straight at the camera would not move its feet).
 * @param {{ x:number, z:number, facing:1|-1 }} actor
 * @param {{ x?:number, z:number }} to
 * @param {number} speed  ground px per second the walk covers
 * @param {{ lo:number, hi:number }} stage  allowed x range
 */
export function planDepthWalk(actor, to, depth, speed, stage) {
  const z1 = clamp(to.z, depth.far, depth.near);
  const dz = z1 - actor.z;
  let x = typeof to.x === "number" ? clamp(to.x, stage.lo, stage.hi) : actor.x;
  const minDx = Math.abs(dz) * DEPTH_WALK_DRIFT;
  if (Math.abs(x - actor.x) < minDx) {
    const dir = typeof to.x === "number" && to.x !== actor.x ? Math.sign(to.x - actor.x) : actor.facing;
    const nudged = actor.x + dir * minDx;
    x = nudged >= stage.lo && nudged <= stage.hi ? nudged : clamp(actor.x - dir * minDx, stage.lo, stage.hi);
  }
  const dur = Math.max(0.2, Math.abs(x - actor.x) / Math.max(1, speed));
  return { x, z1, dur };
}

/** Do two characters share a depth (touch, collide, hit)? */
export const sameDepth = (a, b) => Math.abs((a.z || 0) - (b.z || 0)) <= DEPTH_TOUCH;

/**
 * Nodes sorted far to near (stable: ties keep their order), with the stage-line group (|z| below 0.5)
 * kept together so the v2 draw order inside it is unchanged.
 * @template T
 * @param {Array<T & { z:number }>} nodes
 * @returns {T[]}
 */
export function depthOrder(nodes) {
  const key = (n) => (Math.abs(n.z) < 0.5 ? 0 : n.z);
  return nodes.map((n, i) => [n, i]).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(([n]) => n);
}
