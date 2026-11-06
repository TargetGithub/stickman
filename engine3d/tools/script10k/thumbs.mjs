// Designed thumbnail concepts (meta.thumbnails, never a video frame) from a lesson's short concept list. The
// lesson names the title, the stage, one teaching object and 1-2 characters; anything without `at` is laid
// out here: the title on the left, the teaching object big at the centre-right, characters at the right
// edge facing in, the bottom-right corner (YouTube's length stamp) left clear.

import { BANDS } from "./bands.mjs";

const CAMERA = { position: [0, 1.25, 6], lookAt: [0, 1, 0], fov: 36 };
/** x slots on the right half for the teaching objects (hero first) and for the characters. */
const OBJECT_X = [1.2, 0.35, 2.0, 0.75, 1.65];
const CHARACTER_X = [2.75, 0.2];

const isCharacter = (o) => o.kind === "critter" || o.kind === "character";

/**
 * @param {object[]} concepts lesson.thumbnails
 * @param {{ spec: object, band: string, catalog: object }} o
 */
export function buildThumbnails(concepts, { spec, band }) {
  return concepts.map((c, i) => {
    const side = c.side ?? "left";
    const flip = side === "right" ? -1 : 1;
    const objs = (c.objects ?? []).map((o) => ({ ...o }));
    let oi = 0, ci = 0;
    for (const o of objs) {
      if (o.at != null) continue;
      if (isCharacter(o)) {
        const x = CHARACTER_X[ci++ % CHARACTER_X.length] * flip;
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
