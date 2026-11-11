// Effects over the lesson (#106): mist over one thing (a sentence hidden in fog, then blown clear) and a rewind
// (objects run back to where they were a moment ago, with a rewind badge on screen). Pure: only timeline data.

import { shotBounds } from "./bounds_teach.js";

/**
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, objects: Map }} k  director internals
 */
export function installEffects(d, { catalog, tl, obj, now, sound, objects }) {
  let puffs = 0;
  const mists = new Map(); // target id -> its mist puff ids
  const r4 = (v) => Math.round(v * 1e4) / 1e4;

  Object.assign(d, {
    /**
     * Mist over one object (a sentence, a picture): soft white puffs drift in front of it and hide it; clear: true
     * blows them apart and away. amount 0-1: how thick (default 0.9).
     */
    mist(id, { at: t = 0, dur = 1, clear = false, amount = 0.9, sound: s } = {}) {
      const o = obj(id);
      if (clear) {
        for (const [i, pid] of (mists.get(id) ?? []).entries()) {
          const p = now(pid, "position", t);
          tl.tween(pid, "position", { start: t, dur, to: [r4(p[0] + (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.4)), r4(p[1] + 0.4 + (i % 4) * 0.15), p[2]], ease: "quadIn" });
          tl.tween(pid, "fade", { start: t, dur, to: 0, ease: "quadIn" });
          tl.set(pid, "visible", false, t + dur);
        }
        mists.set(id, []);
        sound(s === undefined ? "whoosh" : s, t, { volume: 0.5 });
        return d;
      }
      const b = shotBounds(o, catalog, now, obj, t, [...objects.values()], true);
      const [w, h] = [b.max[0] - b.min[0], b.max[1] - b.min[1]];
      const z = b.max[2] + 0.15;
      const cols = Math.max(2, Math.ceil(w / 0.55));
      const rows = Math.max(1, Math.ceil(h / 0.55));
      const ids = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pid = `${id}~mist${++puffs}`;
          // A fixed scatter (no randomness): puffs overlap so nothing shows between them.
          const jx = ((c * 7 + r * 3) % 5) / 5 - 0.4;
          const jy = ((c * 3 + r * 5) % 4) / 4 - 0.35;
          const x = b.min[0] + ((c + 0.5) * w) / cols + jx * 0.18;
          const y = b.min[1] + ((r + 0.5) * h) / rows + jy * 0.15;
          const size = Math.max(0.75, Math.min(1.2, (w / cols) * 1.9));
          const pz = r4(z + ((c + r) % 3) * 0.05);
          d.add({ id: pid, kind: "shape", shape: "sphere", color: "white", material: "matte", at: [r4(x), r4(y - size * 0.35), pz], scale: [r4(size), r4(size * 0.7), 0.25], hidden: true, internal: true });
          tl.base(pid, "fade", 0);
          tl.set(pid, "visible", true, t);
          tl.set(pid, "scale", [r4(size), r4(size * 0.7), 0.25], t);
          tl.tween(pid, "fade", { start: t, dur, to: amount, ease: "sineInOut" });
          // A slow drift so the fog feels alive.
          tl.tween(pid, "position", { start: t, dur: dur + 6, from: [r4(x - 0.15), r4(y - size * 0.35), pz], to: [r4(x + 0.15), r4(y - size * 0.35 + 0.05), pz], ease: "sineInOut" });
          ids.push(pid);
        }
      }
      mists.set(id, [...(mists.get(id) ?? []), ...ids]);
      if (s) sound(s, t, { volume: 0.5 });
      return d;
    },

    /**
     * Rewind: the targets (default every object in the scene) run back to where, how turned and how big they were
     * `back` seconds ago, over dur, while a rewind badge (two arrows pointing left) pulses at the top of the screen.
     */
    rewind({ at: t = 0, back = 2, dur = 1.2, targets, sound: s = "whoosh" } = {}) {
      const then = Math.max(0, t - back);
      const ids = targets ?? [...objects.values()].filter((o) => !o.internal && o.parent == null && !o.hud && !String(o.id).startsWith("set_")).map((o) => o.id);
      for (const id of ids) {
        for (const prop of ["position", "rotation", "scale"]) {
          const v = now(id, prop, then);
          if (v != null && JSON.stringify(v) !== JSON.stringify(now(id, prop, t))) tl.tween(id, prop, { start: t, dur, to: v, ease: "quadInOut" });
        }
        const vis = now(id, "visible", then);
        if (vis != null && vis !== now(id, "visible", t)) tl.set(id, "visible", vis, vis ? t : t + dur);
      }
      // The badge: two arrows pointing left on a round dark plate, top centre of the screen.
      const bid = `rewind${++puffs}`;
      d.add({ id: bid, kind: "group", hud: true, at: [0, 3.0, 0], hidden: true, internal: true });
      d.add({ id: `${bid}_plate`, kind: "shape", shape: "circle", color: "charcoal", material: "matte", hud: true, parent: bid, at: [0, -0.45, -0.05], scale: [0.95, 0.95, 0.3], internal: true });
      for (const [k, x] of [["a1", -0.14], ["a2", 0.16]]) {
        d.add({ id: `${bid}_${k}`, kind: "shape", shape: "triangle", color: "white", material: "glossy", hud: true, parent: bid, at: [x, -0.02, 0], rotation: [0, 0, 90], scale: [0.36, 0.36, 0.3], internal: true });
      }
      tl.set(bid, "visible", true, t);
      tl.tween(bid, "scale", { start: t, dur: 0.25, from: [0, 0, 0], to: [1, 1, 1], ease: "backOut" });
      tl.tween(bid, "scale", { start: t + dur, dur: 0.25, to: [0, 0, 0], ease: "backIn" });
      tl.set(bid, "visible", false, t + dur + 0.25);
      if (s) sound(s, t, { volume: 0.6 });
      return d;
    },
  });
}
