// Where the kit's screen furniture goes so it stays off the teaching text (#200, #201): the screen rectangles of
// text in view (text cards, letter words, page, board and card pieces) at a time, a free spot for a cue badge, and a
// lane for an options row below the text. Pure: no three.js, no I/O.

import { shotBounds } from "./bounds_teach.js";
import { BADGE_D, CAPTION_TOP, projectPoint } from "./retain_layout.js";

/** HUD half extents: the HUD is NDC scaled to 16 x 9 units. */
export const HUD = { x: 8, y: 4.5 };
/** Cue spots in the order auto tries them (HUD units). */
export const CUE_SPOTS = { top: [0, 3.15, 0], top_right: [4.4, 3.15, 0], top_left: [-4.4, 3.15, 0], right: [6.6, 1.2, 0], left: [-6.6, 1.2, 0], bottom_right: [6.6, -1.5, 0] };
export const CUE_PLACES = ["auto", ...Object.keys(CUE_SPOTS)];
const TEXT_KINDS = new Set(["text_card", "letter"]);

/** A world box -> its screen rectangle in HUD units, or null when it is behind the camera or off screen. */
export function screenRect(box, cam) {
  const pts = [];
  for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) pts.push(projectPoint([x, y, z], cam));
  if (pts.every((p) => p.z <= 0.05)) return null;
  const f = pts.filter((p) => p.z > 0.05);
  const r = { x0: Math.min(...f.map((p) => p.x)) * HUD.x, x1: Math.max(...f.map((p) => p.x)) * HUD.x, y0: Math.min(...f.map((p) => p.y)) * HUD.y, y1: Math.max(...f.map((p) => p.y)) * HUD.y };
  if (r.x1 < -HUD.x || r.x0 > HUD.x || r.y1 < -HUD.y || r.y0 > HUD.y) return null;
  return r;
}

/**
 * Screen rectangles of the text in view at t (HUD units). shown(id, t): whether an object shows then.
 * @returns {{ id: string, x0: number, x1: number, y0: number, y1: number }[]}
 */
export function textRects({ objects, catalog, now, obj, shown, t }) {
  const cam = { position: now("camera", "position", t), lookAt: now("camera", "lookAt", t), fov: now("camera", "fov", t) };
  if (!cam.position || !cam.lookAt) return [];
  const list = [...objects.values()];
  const out = [];
  for (const o of list) {
    if (!TEXT_KINDS.has(o.kind) || o.hud || !shown(o.id, t)) continue;
    if (o.parent != null && !shown(o.parent, t)) continue;
    let box;
    try {
      box = shotBounds(o, catalog, now, obj, t, list, true);
    } catch {
      continue;
    }
    const r = screenRect(box, cam);
    // A letter word's box keeps room for tails below the baseline (0.47 of 1.92 x size); without g, j, p, q or y
    // that room is empty, so it comes off the bottom here (the camera keeps the roomier box).
    if (r && o.kind === "letter" && o.lift !== "descender" && !/[gjpqy,;]/.test(String(o.text ?? ""))) r.y0 += (r.y1 - r.y0) * (0.47 / 1.92);
    if (r) out.push({ id: o.id, ...r });
  }
  return out;
}

const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/**
 * The spot for a cue badge: place names a spot, or "auto" takes the first spot clear of busy (text and HUD things),
 * else the least covered one. size: the badge's size factor.
 */
export function cueSpot({ place = "auto", busy = [], size = 1.2 }) {
  if (place !== "auto") return [...(CUE_SPOTS[place] ?? CUE_SPOTS.top)];
  const h = (BADGE_D * size) / 2 + 0.12;
  const rect = (s) => ({ x0: s[0] - h, x1: s[0] + h, y0: s[1] - h, y1: s[1] + h });
  let best = null;
  for (const s of Object.values(CUE_SPOTS)) {
    const cover = busy.reduce((a, b) => a + overlap(rect(s), b), 0);
    if (cover === 0) return [...s];
    if (!best || cover < best.cover) best = { s, cover };
  }
  return [...best.s];
}

/**
 * The lane an options row should use (#201): the screen height (HUD y) for the row's middle, below the text in
 * view, but never into the captions (with no room below the text it sits as low as the captions allow), or null
 * when there is no text in view. rowH: the row's height in HUD units.
 */
export function optionsLane({ texts, rowH = 1.6 }) {
  if (!texts.length) return null;
  const bottom = Math.min(...texts.map((r) => r.y0));
  const y = Math.max(bottom - 0.25 - rowH / 2, CAPTION_TOP + 0.1 + rowH / 2);
  return Math.round(y * 1000) / 1000;
}
