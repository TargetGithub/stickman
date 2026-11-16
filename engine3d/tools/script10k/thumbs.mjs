// Designed thumbnail concepts (meta.thumbnails, never a video frame) from a lesson's short concept list. The
// lesson names the title, the stage, one teaching object and 1-2 characters; anything without `at` is laid
// out here: the title on the left, the teaching object big at the centre-right, characters at the right
// edge facing in, the bottom-right corner (YouTube's length stamp) left clear.

import { BANDS } from "./bands.mjs";
import { letterLayout } from "../../runtime/letter_layout.js";

const CAMERA = { position: [0, 1.25, 6], lookAt: [0, 1, 0], fov: 36 };
/** x slots on the right half for the teaching objects (hero first) and for the characters. */
const OBJECT_X = [1.2, 0.35, 2.0, 0.75, 1.65];
const CHARACTER_X = [2.75, 0.2];

const isCharacter = (o) => o.kind === "critter" || o.kind === "character";
/** The right half the camera shows at z = 0 (half width about 3.4 m at fov 36 from 6 m), less a margin. */
const RIGHT = [0.15, 3.25];
const CHAR_W = 0.85;

/**
 * 3D letters never cover the characters (ENGINE_REQUESTS #159): a word without at takes the right half less a
 * strip at the far edge for the characters, shrinking to fit; the characters stand in that strip.
 * @returns {number[] | null} the characters' x slots (before the side flip), or null when there is no word to place
 */
function placeLetters(objs, catalog, flip) {
  const words = objs.filter((o) => o.kind === "letter" && o.at == null);
  if (!words.length || !catalog?.fontMetrics) return null;
  const chars = objs.filter((o) => isCharacter(o) && o.at == null).length;
  const zone = [RIGHT[0], RIGHT[1] - chars * CHAR_W];
  const room = zone[1] - zone[0];
  const widthOf = (o) => {
    const L = letterLayout(o, catalog.fontMetrics);
    return L.length ? Math.max(...L.map((c) => c.x + c.w / 2)) - Math.min(...L.map((c) => c.x - c.w / 2)) : 0;
  };
  for (const o of words) {
    const w = widthOf(o);
    if (w > room * 0.94) o.size = Math.round(((o.size ?? 1) * room * 0.94 * 1000) / w) / 1000;
  }
  // Words stack in rows, the first on top (a row is a little taller than the biggest word's letters).
  const row = 1.0 * Math.max(...words.map((o) => o.size ?? 1));
  const mid = Math.round(((zone[0] + zone[1]) / 2) * 1000) / 1000;
  words.forEach((o, k) => (o.at = [mid * flip, Math.round((0.25 + (words.length - 1 - k) * row) * 1000) / 1000, 0]));
  return Array.from({ length: chars }, (_, k) => Math.round((zone[1] + CHAR_W * (k + 0.55)) * 1000) / 1000);
}

/**
 * @param {object[]} concepts lesson.thumbnails
 * @param {{ spec: object, band: string, catalog: object }} o
 */
export function buildThumbnails(concepts, { spec, band, catalog }) {
  return concepts.map((c, i) => {
    const side = c.side ?? "left";
    const flip = side === "right" ? -1 : 1;
    const objs = (c.objects ?? []).map((o) => ({ ...o }));
    let oi = 0, ci = 0;
    const charX = placeLetters(objs, catalog, flip);
    for (const o of objs) {
      if (o.at != null) continue;
      if (isCharacter(o)) {
        const x = (charX ? charX[ci++] : CHARACTER_X[ci++ % CHARACTER_X.length]) * flip;
        o.at = [x, 0, 0.6];
        o.rotation ??= [0, -28 * flip * Math.sign(x || 1), 0];
        o.feeling ??= "happy";
        if (o.kind === "character" && o.character === "robot") o.clip ??= "Wave";
      } else {
        o.at = [OBJECT_X[oi++ % OBJECT_X.length] * flip, 0, oi === 1 ? 0 : -0.4];
      }
    }
    const out = {
      name: c.name ?? `c${i + 1}`,
      title: c.title,
      ...(c.subtitle ? { subtitle: c.subtitle } : {}),
      titleColor: c.titleColor ?? "yellow",
      side,
      badge: c.badge ?? BANDS[band].badge,
      stage: c.stage ?? "playroom",
      camera: c.camera ?? CAMERA,
      objects: objs,
    };
    if (c.lights) out.lights = c.lights;
    if (c.at != null) out.at = c.at;
    return out;
  });
}
