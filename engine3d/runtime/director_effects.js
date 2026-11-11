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

  /** A critter's arms as [part, side]: side +1 for an arm on its left (+x; a mirrored arm moves both), -1 on its right. */
  const armsOf = (o) => {
    const names = new Set((catalog.critters?.[o.species]?.parts ?? []).map((p) => p.name).filter(Boolean));
    if (names.has("arm_l") || names.has("arm_r")) return [["arm_l", 1], ["arm_r", -1]].filter(([n]) => names.has(n));
    const n = ["arm", "wing", "paw", "flipper"].find((x) => names.has(x));
    return n ? [[n, 1]] : [];
  };

  // hide, show, pop and paint on a critter's or prop's named part (#118, #126, #137): "lamp#light" dims, a beam hides.
  const partOf = (target) => {
    const m = /^(.+)#([A-Za-z_][\w]*)$/.exec(String(target));
    if (!m || /^c\d+$/.test(m[2])) return null;
    const o = objects.get(m[1]);
    if (!o || (o.kind !== "critter" && o.kind !== "prop")) return null;
    return { o, key: target, name: m[2] };
  };
  const baseScale = (key) => {
    if (!tl.hasBase(key, "scale")) tl.base(key, "scale", [1, 1, 1]); // a pose may have set it (scale 0: starts hidden)
  };
  const partColor = (o, name) => {
    const model = o.kind === "critter" ? catalog.critters[o.species] : catalog.props[o.model];
    const c = model?.parts?.find((p) => p.name === name)?.c ?? o.color ?? model?.color ?? "white";
    const hex = catalog.colors[o.recolor?.[c] ?? c]?.hex ?? "#ffffff";
    return [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
  };
  const wrap = (name, fn) => {
    const prev = d[name];
    d[name] = (id, opts = {}) => {
      const p = partOf(id);
      return p ? fn(p, opts) : prev(id, opts);
    };
  };
  wrap("hide", ({ key }, { at: t = 0, dur = 0.3 }) => (baseScale(key), tl.tween(key, "scale", { start: t, dur, to: [0, 0, 0], ease: "backIn" }), d));
  wrap("show", ({ key }, { at: t = 0, dur = 0.4 }) => (baseScale(key), tl.tween(key, "scale", { start: t, dur, from: [0, 0, 0], to: [1, 1, 1], ease: "backOut" }), d));
  wrap("pop", ({ key }, { at: t = 0, dur = 0.5, sound: s = "pop" }) => {
    baseScale(key);
    tl.tween(key, "scale", { start: t, dur, from: [0, 0, 0], to: [1, 1, 1], ease: "elasticOut" });
    if (s) sound(s, t);
    return d;
  });
  wrap("paint", ({ o, key, name }, { at: t = 0, color, dur = 0.8, ease = "sineInOut" }) => {
    if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
    if (!tl.hasBase(key, "tint")) tl.base(key, "tint", partColor(o, name));
    const hex = catalog.colors[color].hex;
    tl.tween(key, "tint", { start: t, dur, to: [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255), ease });
    return d;
  });

  Object.assign(d, {
    /**
     * Slide a sound-box token up into its box (#135): token k of a sound_boxes object glides into box k and settles
     * with a soft tap. clear: true sends every token back to its place under the boxes.
     */
    fill_box(id, { at: t = 0, box: k = 1, dur = 0.5, clear = false, sound: s = "pop" } = {}) {
      if (clear) {
        for (let i = 1; objects.has(`${id}_t${i}`); i++) tl.tween(`${id}_t${i}`, "position", { start: t, dur, to: objects.get(`${id}_t${i}`).at, ease: "quadInOut" });
        if (s) sound("whoosh", t, { volume: 0.4 });
        return d;
      }
      const tok = objects.get(`${id}_t${k}`);
      const bx = objects.get(`${id}_b${k}`);
      if (!tok || !bx) throw new Error(`fill_box: "${id}" has no box ${k}`);
      // A token (a disc turned to face the camera) is centred on its at: it lands on the box's middle.
      const to = [bx.at[0], bx.at[1], tok.at[2]];
      tl.tween(`${id}_t${k}`, "position", { start: t, dur, to: to.map(r4), ease: "backOut" });
      if (s) sound(s, t + dur * 0.6, { volume: 0.6 });
      return d;
    },
    /**
     * A photo moment (#116): a white camera flash over the whole picture with a shutter click, then a white photo
     * border round the screen that holds for dur (the moment "frozen" as a snapshot) and pops away.
     */
    photo({ at: t = 0, dur = 1.6, frame = true, sound: s = "snap" } = {}) {
      const k = ++puffs;
      const fid = `photo${k}_flash`;
      d.add({ id: fid, kind: "shape", shape: "plate", color: "white", material: "glow", hud: true, at: [0, 0, 10], rotation: [90, 0, 0], scale: [17, 1, 10], hidden: true, internal: true });
      tl.base(fid, "fade", 0);
      tl.set(fid, "visible", true, t);
      tl.set(fid, "scale", [17, 1, 10], t);
      tl.set(fid, "fade", 0.95, t);
      tl.tween(fid, "fade", { start: t + 0.06, dur: 0.45, to: 0, ease: "quadOut" });
      tl.set(fid, "visible", false, t + 0.55);
      if (frame) {
        const gid = `photo${k}`;
        d.add({ id: gid, kind: "group", hud: true, at: [0, 0, 9], hidden: true, internal: true });
        for (const [n, x, y, w, h] of [["top", 0, 4.25, 16.5, 0.6], ["bottom", 0, -4.1, 16.5, 0.9], ["left", -7.85, 0, 0.6, 9], ["right", 7.85, 0, 0.6, 9]]) {
          d.add({ id: `${gid}_${n}`, kind: "shape", shape: "plate", color: "white", material: "matte", hud: true, parent: gid, at: [x, y, 0], rotation: [90, 0, 0], scale: [w, 1, h], internal: true });
        }
        tl.set(gid, "visible", true, t + 0.05);
        tl.tween(gid, "scale", { start: t + 0.05, dur: 0.3, from: [1.08, 1.08, 1], to: [1, 1, 1], ease: "backOut" });
        tl.tween(gid, "scale", { start: t + dur, dur: 0.25, to: [1.15, 1.15, 1], ease: "quadIn" });
        tl.set(gid, "visible", false, t + dur + 0.25);
      }
      if (s) sound(s, t, { volume: 0.9 });
      return d;
    },

    /**
     * Several critters swim or run round in a circle together (#115): each glides to its own place on the circle
     * (evenly spaced), then goes round `turns` times facing the way it moves, bobbing gently. sink: how far down
     * they sit (in a pond: only their tops show above the water); dir -1 goes the other way.
     */
    circle({ at: t = 0, targets = [], center = [0, 0, 0], radius = 1.5, turns = 1, dur = 4, sink = 0, bob = true, dir = 1 } = {}) {
      const n = targets.length;
      const steps = Math.max(8, Math.round(24 * Math.abs(turns)));
      const lead = 0.5;
      targets.forEach((id, i) => {
        obj(id);
        const a0 = (2 * Math.PI * i) / n;
        const at = (a) => [r4(center[0] + radius * Math.sin(a)), r4(center[1] - sink), r4(center[2] + radius * Math.cos(a))];
        const yawAt = (a) => r4(((a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2)) * 180) / Math.PI);
        tl.tween(id, "position", { start: t, dur: lead, to: at(a0), ease: "quadInOut" });
        tl.tween(id, "rotation", { start: t, dur: lead, to: [0, yawAt(a0), 0], ease: "quadOut" });
        const sd = (dur - lead) / steps;
        for (let k = 0; k < steps; k++) {
          const a1 = a0 + (dir * 2 * Math.PI * turns * (k + 1)) / steps;
          const s0 = t + lead + k * sd;
          tl.tween(id, "position", { start: s0, dur: sd, to: at(a1), ease: "linear" });
          tl.tween(id, "rotation", { start: s0, dur: sd, to: [0, yawAt(a1 - (dir * Math.PI * turns) / steps), 0], ease: "linear" });
          if (bob) tl.tween(id, "hop", { start: s0, dur: sd, to: k % 2 ? 0 : 0.06, ease: "sineInOut" });
        }
        if (bob) tl.set(id, "hop", 0, t + dur);
      });
      return d;
    },

    /**
     * A gesture (#109): wide (arms thrown wide: a big stretch, "this big!"), snap (an arm flicks up with a finger
     * snap), thumbs_up / thumbs_down (an arm lifts and a big thumb pops up beside the head). Critters without arms
     * stretch tall instead; the thumb and the sound still come.
     */
    gesture(id, { at: t = 0, kind = "wide", dur = 1.4, sound: s } = {}) {
      const o = obj(id);
      const arms = o.kind === "critter" ? armsOf(o) : [];
      const back = t + Math.max(0.6, dur - 0.35);
      const raise = (deg, list, up = 0.3) => {
        for (const [part, side] of list) {
          const key = `${id}#${part}`;
          tl.tween(key, "rotation", { start: t, dur: up, to: [0, 0, side * deg], ease: "backOut" });
          tl.tween(key, "rotation", { start: back, dur: 0.35, to: [0, 0, 0], ease: "quadInOut" });
        }
      };
      if (kind === "wide") {
        if (arms.length) raise(75, arms);
        else {
          const sc = now(id, "scale", t) ?? [1, 1, 1];
          tl.tween(id, "scale", { start: t, dur: 0.35, to: [sc[0] * 0.94, sc[1] * 1.12, sc[2] * 0.94], ease: "backOut" });
          tl.tween(id, "scale", { start: back, dur: 0.35, to: sc, ease: "quadInOut" });
        }
        if (s) sound(s, t);
      } else if (kind === "snap") {
        raise(110, arms.slice(0, 1), 0.18);
        sound(s ?? "snap", t + 0.18, { volume: 0.8 });
      } else if (kind === "thumbs_up" || kind === "thumbs_down") {
        raise(95, arms.slice(0, 1));
        const b = shotBounds(o, catalog, now, obj, t, [], true);
        const size = Math.max(0.6, Math.min(1.2, (b.max[1] - b.min[1]) * 0.55));
        const tid = `${id}~thumb${++puffs}`;
        const pos = [r4(b.max[0] + 0.25 * size), r4(b.min[1] + (b.max[1] - b.min[1]) * 0.8), r4((b.min[2] + b.max[2]) / 2 + 0.2)];
        d.add({ id: tid, kind: "prop", model: "thumb_icon", size: r4(size), at: pos, rotation: kind === "thumbs_down" ? [0, 0, 180] : [0, 0, 0], hidden: true, internal: true });
        d.pop(tid, { at: t + 0.15, sound: s ?? (kind === "thumbs_up" ? "ding" : "boing") });
        d.hide(tid, { at: back, dur: 0.3 });
      } else throw new Error(`gesture "${id}": kind must be wide, snap, thumbs_up or thumbs_down`);
      return d;
    },

    /**
     * Mist over one object (a sentence, a picture): soft white puffs drift in front of it and hide it; clear: true
     * blows them apart and away. amount 0-1: how thick (default 0.9).
     */
    mist(id, { at: t = 0, dur = 1, clear = false, amount = 0.9, size: puff, sound: s } = {}) {
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
      const step = puff != null ? Math.max(0.1, puff * 0.6) : 0.55;
      const cols = Math.max(2, Math.ceil(w / step));
      const rows = Math.max(1, Math.ceil(h / step));
      const ids = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pid = `${id}~mist${++puffs}`;
          // A fixed scatter (no randomness): puffs overlap so nothing shows between them.
          const jx = ((c * 7 + r * 3) % 5) / 5 - 0.4;
          const jy = ((c * 3 + r * 5) % 4) / 4 - 0.35;
          const x = b.min[0] + ((c + 0.5) * w) / cols + jx * 0.18;
          const y = b.min[1] + ((r + 0.5) * h) / rows + jy * 0.15;
          // size (#134): the puffs' size in metres; by default they follow the object (0.75-1.2 m).
          const size = puff ?? Math.max(0.75, Math.min(1.2, (w / cols) * 1.9));
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
