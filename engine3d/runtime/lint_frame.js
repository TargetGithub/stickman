// Frame-safety lint (#219): text that the camera crops at the frame edge, pushes into the caption band while a caption
// shows, or slides under the HUD tracker or a badge. Sampled on the compiled plan; one warning per object and problem,
// with when it happens. Pure: no three.js, no I/O.

import { badgeRect, CAPTION_TOP, trackerRect } from "./retain_layout.js";
import { HUD, textRects } from "./retain_place.js";

const STEP = 0.5;
/** A problem must last this long (seconds) to be reported. */
const MIN_HOLD = 1;
/** How far (HUD units) text may poke past an edge before it counts as cropped. */
const EDGE = 0.12;

const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const cut = (a, b) => ({ x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) });

/**
 * @param {object} plan     compileScript's plan
 * @param {object} catalog  loadCatalog3d()
 * @returns {Array<{ code: string, path: string, message: string }>}
 */
export function frameLints(plan, catalog) {
  const tl = plan.timeline;
  const objects = new Map(plan.objects.map((o) => [o.id, o]));
  const now = (id, prop, t) => tl.valueAt(id, prop, t);
  const obj = (id) => objects.get(String(id).split("#")[0]);
  // Shown when it and everything it rides on is visible and not scaled to nothing.
  const shown = (id, t) => {
    for (let o = objects.get(id); o; o = o.parent != null ? objects.get(o.parent) : null) {
      if (now(o.id, "visible", t) === false || (now(o.id, "scale", t) ?? [1])[0] <= 1e-3) return false;
    }
    return true;
  };
  const root = (id) => {
    let o = objects.get(id);
    while (o?.parent != null && objects.get(o.parent)) o = objects.get(o.parent);
    return o?.id ?? id;
  };
  const sceneAt = (t) => Math.max(0, plan.scenes.findLastIndex((s) => s.start <= t + 1e-6));
  const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
  const found = []; // { root, piece, kind, from, to }: one per stretch of time
  const open = new Map(); // `${root}|${kind}` -> its latest stretch
  const hit = (kind, id, t) => {
    const key = `${root(id)}|${kind}`;
    const f = open.get(key);
    if (f && f.to === t) return; // several pieces of one card in the same sample
    if (f && t - f.to <= STEP + 1e-6) f.to = t;
    else {
      const n = { root: root(id), piece: id, kind, from: t, to: t };
      found.push(n);
      open.set(key, n);
    }
  };
  const hudObjs = plan.objects.filter((o) => o.hud);
  for (let t = 0; t <= plan.duration + 1e-9; t += STEP) {
    const texts = textRects({ objects, catalog, now, obj, shown, t });
    if (!texts.length) continue;
    const caption = plan.captions?.some((c) => t >= c.start && t <= c.start + c.dur);
    const busy = [];
    for (const o of hudObjs) {
      if (!shown(o.id, t)) continue;
      const p = now(o.id, "position", t) ?? o.at;
      if (o.kind === "tracker") busy.push({ what: "the tracker", r: trackerRect(o, p) });
      else if (o.kind === "badge" && o.parent == null) busy.push({ what: "a badge", r: badgeRect(p, (now(o.id, "scale", t) ?? [1])[0]) });
      else if (o.kind === "timer_ring") busy.push({ what: "a badge", r: badgeRect(p, 1.2 * (now(o.id, "scale", t) ?? [1])[0]) });
    }
    for (const r of texts) {
      const a = area(r);
      if (a <= 1e-4) continue;
      // (a) Cropped: most of it shows but the frame edge cuts some off (a sliver of a sign at the edge is set dressing).
      const inFrame = area(cut(r, { x0: -HUD.x - EDGE, x1: HUD.x + EDGE, y0: -HUD.y - EDGE, y1: HUD.y + EDGE })) / a;
      if (inFrame >= 0.4 && inFrame < 0.97) hit("crop", r.id, t);
      // (b) In the caption band while a caption shows (more than a sliver of the text).
      if (caption && area(cut(r, { x0: -HUD.x, x1: HUD.x, y0: -HUD.y, y1: CAPTION_TOP })) > 0.15 * a) hit("caption", r.id, t);
      // (c) Under the tracker or a badge.
      for (const b of busy) if (area(cut(r, b.r)) > Math.min(0.2, 0.1 * a)) hit(b.what === "the tracker" ? "tracker" : "badge", r.id, t);
    }
  }
  const SAY = {
    crop: "runs off the edge of the frame",
    caption: "sits in the caption band while a caption shows",
    tracker: "is under the HUD tracker",
    badge: "is under a cue badge, keyword badge or timer",
  };
  // Held for at least MIN_HOLD: a camera passing over text on its way somewhere is not a held frame.
  return found
    .filter((f) => f.to + STEP - f.from >= MIN_HOLD - 1e-6)
    .sort((a, b) => a.from - b.from)
    .slice(0, 40)
    .map((f) => ({
      code: "W3D_TEXT_UNSAFE",
      path: `scenes[${sceneAt(f.from)}]`,
      message: `text "${f.root}"${f.piece !== f.root ? ` (${f.piece})` : ""} ${SAY[f.kind]} from ${clock(f.from)} to ${clock(f.to + STEP)}: move the camera back, raise the text or use shot clear: "hud"`,
    }));
}
