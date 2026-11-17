// Toybox 10K round 36 moves: a flour or dust puff (#147), ripple on one letter piece (#150), circle that turns its
// riders back to the front when it ends (#150) and an echo on sounds (#158). Pure: only timeline data.

import { shotBounds } from "./bounds_teach.js";
import { letterLayout } from "./letter_layout.js";
import { localBounds } from "./bounds.js";
import { HUD, optionsLane, screenRect, textRects } from "./retain_place.js";

/**
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, objects: Map }} k  director internals
 */
export function installFx2(d, { catalog, tl, obj, now, sound, objects }) {
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  let puffs = 0;

  /**
   * A puff of flour or dust (#147): soft puffs burst out from the foot of an object (or from `from` [x, y, z]),
   * rise, spread and fade. color: cream (flour) by default; amount 0-1 how thick; size the cloud's width.
   */
  d.dust = (id, { at: t = 0, dur = 1.4, color = "cream", amount = 0.85, size, from, count = 9, sound: s = "whoosh" } = {}) => {
    if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
    let c = from;
    let w = size ?? 1;
    if (!c) {
      const o = obj(id);
      const b = shotBounds(o, catalog, now, obj, t, [...objects.values()], true);
      c = [(b.min[0] + b.max[0]) / 2, b.min[1] + 0.1, b.max[2]];
      w = size ?? Math.max(0.6, Math.min(2.4, (b.max[0] - b.min[0]) * 1.1));
    }
    for (let i = 0; i < count; i++) {
      const pid = `${id ?? "dust"}~dust${++puffs}`;
      // A fixed fan (no randomness): puffs spread left and right and up, the middle ones highest.
      const u = count > 1 ? i / (count - 1) - 0.5 : 0;
      const r = r4(w * (0.18 + 0.06 * (i % 3)));
      const start = [r4(c[0] + u * 0.2), r4(c[1]), r4(c[2] + 0.1 + (i % 2) * 0.08)];
      const end = [r4(c[0] + u * w), r4(c[1] + 0.25 + (0.5 - Math.abs(u)) * w * 0.7), start[2]];
      d.add({ id: pid, kind: "shape", shape: "sphere", color, material: "matte", at: start, scale: [r, r, r], hidden: true, internal: true });
      const t0 = t + (i % 3) * 0.05;
      tl.base(pid, "fade", 0);
      tl.set(pid, "visible", true, t0);
      tl.tween(pid, "scale", { start: t0, dur: dur * 0.5, from: [r * 0.3, r * 0.3, r * 0.3], to: [r * 1.6, r * 1.3, r * 1.6].map(r4), ease: "quadOut" });
      tl.tween(pid, "position", { start: t0, dur, to: end, ease: "quadOut" });
      tl.tween(pid, "fade", { start: t0, dur: dur * 0.25, to: amount, ease: "quadOut" });
      tl.tween(pid, "fade", { start: t0 + dur * 0.45, dur: dur * 0.55, to: 0, ease: "sineIn" });
      tl.set(pid, "visible", false, t0 + dur);
    }
    if (s) sound(s, t, { volume: 0.45 });
    return d;
  };

  // ripple / stress on one letter piece (#150): "word#c3" ripples just that character.
  const stress = d.stress;
  d.stress = (id, opts = {}) => {
    const m = /^(.+)#c(\d+)$/.exec(String(id));
    if (m && objects.get(m[1])?.kind === "letter") return stress(m[1], { ...opts, chars: opts.chars ?? [Number(m[2])] });
    return stress(id, opts);
  };

  // circle (#150): when the ride ends the riders turn back the way they faced before it (face: "travel" keeps them
  // facing along the ring).
  const circle = d.circle;
  d.circle = (opts = {}) => {
    const { at: t = 0, dur = 4, targets = [], face = "front" } = opts;
    if (face !== "front" && face !== "travel") throw new Error('circle: face must be "front" or "travel"');
    const before = targets.map((id) => [id, now(id, "rotation", t) ?? [0, 0, 0]]);
    circle(opts);
    if (face === "front") for (const [id, rot] of before) tl.tween(id, "rotation", { start: t + dur, dur: 0.45, to: rot, ease: "quadInOut" });
    return d;
  };

  // rewind path: true (#174): objects run back through where they went (sampled about 8 times a second), not in a
  // straight line; the badge and sound are the plain rewind's.
  const rewind = d.rewind;
  d.rewind = (opts = {}) => {
    if (!opts.path) return rewind(opts);
    const { at: t = 0, back = 2, dur = 1.2 } = opts;
    const ids = opts.targets ?? [...objects.values()].filter((o) => !o.internal && o.parent == null && !o.hud && !String(o.id).startsWith("set_")).map((o) => o.id);
    const n = Math.max(4, Math.min(48, Math.round(back * 8)));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const id of ids) {
      obj(id);
      for (const prop of ["position", "rotation", "scale"]) {
        const pts = Array.from({ length: n + 1 }, (_, k) => now(id, prop, Math.max(0, t - (back * k) / n)));
        if (pts[0] == null || pts.every((v) => same(v, pts[0]))) continue;
        for (let k = 1; k <= n; k++) tl.tween(id, prop, { start: t + (dur * (k - 1)) / n, dur: dur / n, to: pts[k], ease: "linear" });
      }
      const vis = now(id, "visible", Math.max(0, t - back));
      if (vis != null && vis !== now(id, "visible", t)) tl.set(id, "visible", vis, vis ? t : t + dur);
    }
    return rewind({ ...opts, targets: [] });
  };

  // camera via (#176): the camera passes a waypoint on the way (up and over a page, round a wall) instead of
  // cutting straight through what lies between; the two legs share dur by their lengths, eased as one glide.
  const camera = d.camera;
  d.camera = (opts = {}) => {
    if (opts.via == null || opts.position == null) return camera(opts);
    const { at: t = 0, dur = 1.5, via, position } = opts;
    const p0 = now("camera", "position", t) ?? [0, 1.3, 7];
    const len = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    const l1 = len(p0, via);
    const k = l1 / Math.max(1e-6, l1 + len(via, position));
    const t1 = Math.round(dur * Math.min(0.85, Math.max(0.15, k)) * 1e4) / 1e4;
    camera({ ...opts, position: undefined, via: undefined }); // lookAt and fov over the whole move
    tl.tween("camera", "position", { start: t, dur: t1, to: via, ease: "sineIn" });
    tl.tween("camera", "position", { start: t + t1, dur: dur - t1, to: position, ease: "sineOut" });
    return d;
  };

  /**
   * Punctuation helpers (#182) on a letter word: a breath cloud over each comma (and ; :), a stop sign over each full
   * stop (and ! ?), popping in one after another `gap` s apart. chars picks marks by character number; kind forces
   * breath or stop; clear: true takes the word's marks away.
   */
  const punct = new Map();
  d.punct_mark = (id, { at: t = 0, chars, kind, gap = 0.5, color, clear = false, sound: s } = {}) => {
    const o = obj(id);
    if (o.kind !== "letter") throw new Error(`punct_mark: "${id}" is a ${o.kind}, not a letter word`);
    if (clear) {
      for (const m of punct.get(id) ?? []) d.hide(m, { at: t, dur: 0.3 });
      punct.set(id, []);
      return d;
    }
    const L = letterLayout(o, catalog.fontMetrics);
    const sel = (chars ?? L.filter((c) => /[,.;:!?]/.test(c.ch)).map((c) => c.n)).map((n) => L[n - 1]);
    if (!sel.length || sel.some((c) => !c)) throw new Error(`punct_mark "${id}": no punctuation to mark (chars must be character numbers 1-${L.length})`);
    const k = o.size ?? 1;
    const list = punct.get(id) ?? [];
    sel.forEach((c, i) => {
      const type = kind ?? (/[.!?]/.test(c.ch) ? "stop" : "breath");
      const gid = `${id}~punct${list.length + 1}`;
      const x = r4(c.x);
      d.add({ id: gid, kind: "group", parent: id, at: [x, r4(0.95 * k), 0.08], hidden: true, internal: true });
      const part = (n, spec) => d.add({ id: `${gid}_${n}`, parent: gid, internal: true, ...spec });
      if (type === "stop") {
        part("post", { kind: "shape", shape: "box", color: "grey", at: [0, r4(-0.55 * k), -0.02], scale: [r4(0.05 * k), r4(0.6 * k), r4(0.05 * k)] });
        part("rim", { kind: "shape", shape: "octagon", color: "white", at: [0, r4(0.02 * k), -0.01], rotation: [0, 0, 22.5], size: r4(0.56 * k) });
        part("sign", { kind: "shape", shape: "octagon", color: color ?? "red", material: "glossy", at: [0, r4(0.05 * k), 0], rotation: [0, 0, 22.5], size: r4(0.48 * k) });
      } else {
        for (const [n, dx, dy, r] of [["a", -0.18, 0, 0.3], ["b", 0.06, 0.1, 0.38], ["c", 0.3, 0, 0.26]]) {
          part(n, { kind: "shape", shape: "sphere", color: color ?? "white", material: "matte", at: [r4(dx * k), r4(dy * k), 0], size: r4(r * k) });
        }
      }
      d.pop(gid, { at: t + i * gap, sound: s === undefined ? (type === "stop" ? "pop" : "whoosh") : s });
      list.push(gid);
    });
    punct.set(id, list);
    return d;
  };

  /**
   * A magic swirl round an object (#180): sparkles (glowing stars spiralling up round it and fading) or a ribbon (a
   * helix of light drawn round it, then fading). turns: times round; colors: cycled per sparkle.
   */
  let swirls = 0;
  d.swirl = (id, { at: t = 0, dur = 2.4, style = "sparkles", turns = 2, count = 14, colors = ["gold", "pink", "sky", "white"], color, sound: s = "magic_sparkle" } = {}) => {
    const o = obj(id);
    for (const c of color ? [color] : colors) if (!catalog.colors[c]) throw new Error(`unknown color "${c}"`);
    const b = shotBounds(o, catalog, now, obj, t, [...objects.values()], true);
    const c = [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2];
    const R = Math.max(0.35, Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2 + 0.25);
    const H = Math.max(0.6, b.max[1] - b.min[1]);
    const at = (u, ph) => {
      const a = ph + 2 * Math.PI * turns * u;
      return [r4(c[0] + R * Math.sin(a)), r4(c[1] + 0.1 + H * u), r4(c[2] + R * Math.cos(a))];
    };
    const n = ++swirls;
    if (style === "ribbon") {
      const rid = `${id}~ribbon${n}`;
      const pts = Array.from({ length: Math.round(24 * turns) + 1 }, (_, k) => at(k / Math.round(24 * turns), 0).map((v, i) => r4(v - [c[0], c[1], c[2]][i])));
      d.add({ id: rid, kind: "stroke", points: pts, smooth: true, width: 0.06, color: color ?? colors[0], material: "glow", at: c.map(r4), hidden: true, internal: true });
      d.draw(rid, { at: t, dur: dur * 0.7 });
      d.hide(rid, { at: t + dur, dur: 0.5 });
    } else {
      const steps = Math.max(8, Math.round(12 * turns));
      for (let i = 0; i < count; i++) {
        const pid = `${id}~swirl${n}_${i + 1}`;
        const ph = (2 * Math.PI * i) / count;
        const t0 = t + (i % 4) * 0.08;
        const u0 = (i % 3) * 0.08;
        const sz = r4(0.12 + 0.05 * (i % 3));
        d.add({ id: pid, kind: "shape", shape: "star", color: color ?? colors[i % colors.length], material: "glow", at: at(u0, ph), size: sz, hidden: true, internal: true });
        tl.base(pid, "fade", 1);
        tl.set(pid, "visible", true, t0);
        tl.set(pid, "scale", [1, 1, 1], t0); // added hidden: its scale starts at 0
        for (let k = 1; k <= steps; k++) tl.tween(pid, "position", { start: t0 + ((k - 1) * dur) / steps, dur: dur / steps, to: at(u0 + ((1 - u0) * k) / steps, ph), ease: "linear" });
        tl.tween(pid, "rotation", { start: t0, dur, to: [0, 0, 360 * turns], ease: "linear" });
        tl.tween(pid, "fade", { start: t0 + dur * 0.7, dur: dur * 0.3, to: 0, ease: "quadIn" });
        tl.set(pid, "visible", false, t0 + dur);
      }
    }
    if (s) sound(s, t, { volume: 0.7 });
    return d;
  };

  // choices lane: "below_text" (#201): when the row shows, it drops so it sits under the text in view (a story
  // page, a board) instead of over it, keeping above the captions; it stays where it was when nothing is in the way.
  const shown = (id, t) => now(id, "visible", t) !== false && (now(id, "scale", t) ?? [1])[0] > 1e-3;
  const lane = (id, t) => {
    const o = objects.get(id);
    if (!o?.lane || o.kind !== "group") return;
    const cam = { position: now("camera", "position", t), lookAt: now("camera", "lookAt", t), fov: now("camera", "fov", t) ?? 40 };
    const texts = textRects({ objects, catalog, now, obj, shown, t }).filter((r) => !r.id.startsWith(`${id}_`));
    const list = [...objects.values()];
    const pieces = list.filter((p) => p.parent === id);
    if (!pieces.length || !cam.position) return;
    const boxes = pieces.map((p) => shotBounds(p, catalog, now, obj, t, list, true));
    const box = { min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]))), max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]))) };
    const row = screenRect(box, cam);
    if (!row || !texts.some((r) => r.x0 < row.x1 && r.x1 > row.x0 && r.y0 < row.y1 && r.y1 > row.y0)) return;
    const y = optionsLane({ texts, rowH: row.y1 - row.y0 });
    if (y == null) return;
    const dyHud = y - (row.y0 + row.y1) / 2;
    if (dyHud >= 0) return;
    const p = now(id, "position", t) ?? o.at;
    const depth = Math.hypot(...p.map((v, i) => v - cam.position[i]));
    const dy = (dyHud / HUD.y) * depth * Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
    tl.set(id, "position", [p[0], r4(Math.max(0, p[1] + dy)), p[2]], t);
  };
  for (const name of ["show", "pop"]) {
    const prev = d[name];
    d[name] = (id, opts = {}) => {
      lane(id, opts.at ?? 0);
      return prev(id, opts);
    };
  }

  /**
   * fill / drain (#195): a prop's water part (a bathtub's, a sink's) rises or sinks to `level` (0 empty - 1 as built)
   * over dur, its bottom staying on the floor of the tub. target "tub" (its part "water") or "tub#<part>".
   */
  d.fill = (target, { at: t = 0, level = 1, dur = 2, part, ease = "sineInOut", sound: s } = {}) => {
    const [id, named] = String(target).split("#");
    const o = obj(id);
    const name = named ?? part ?? "water";
    const m = o.kind === "prop" ? catalog.props[o.model] : o.kind === "critter" ? catalog.critters[o.species] : null;
    const spec = m?.parts?.find((x) => x.name === name);
    if (!spec) throw new Error(`fill "${target}": "${id}" has no part "${name}"`);
    const h = Array.isArray(spec.s) ? spec.s[1] : spec.s ?? 1;
    const key = `${id}#${name}`;
    if (!tl.hasBase(key, "scale")) tl.base(key, "scale", [1, 1, 1]);
    if (!tl.hasBase(key, "position")) tl.base(key, "position", [0, 0, 0]);
    const k = Math.max(0.001, Math.min(1, level));
    tl.tween(key, "scale", { start: t, dur, to: [1, r4(k), 1], ease });
    tl.tween(key, "position", { start: t, dur, to: [0, r4(-(1 - k) * h / 2), 0], ease });
    if (level <= 0.001) tl.set(key, "scale", [1e-4, 1e-4, 1e-4], t + dur); // drained: gone
    if (s !== false) sound(s ?? (level > 0.001 ? "pour" : "splash"), t, { volume: 0.5 });
    return d;
  };

  // lie on (#197): onto the top of a cushion, a bed or a mat first (its middle), then lie there.
  const lie = d.lie;
  d.lie = (id, opts = {}) => {
    if (opts.on == null) return lie(id, opts);
    const { at: t = 0, dur = 0.8 } = opts;
    const base = objects.get(opts.on);
    if (!base) throw new Error(`lie "${id}": on "${opts.on}" is not an object`);
    const b = shotBounds(base, catalog, now, obj, t, [...objects.values()], true);
    // A cushion gives a little: the rider sinks a fifth of its height into it.
    const top = [r4((b.min[0] + b.max[0]) / 2), r4(b.max[1] - 0.2 * (b.max[1] - b.min[1])), r4((b.min[2] + b.max[2]) / 2)];
    // Lying on its side turns it about its feet, so its body ends up half its height to one side: aim past the
    // middle by that much so the body, not the feet, lands on the cushion.
    if ((opts.pose ?? "side") === "side") {
      const me = localBounds({ ...obj(id), at: [0, 0, 0], rotation: [0, 0, 0] }, catalog);
      top[0] = r4(top[0] + ((opts.side ?? 1) * (me.max[1] - me.min[1])) / 2);
    }
    tl.tween(id, "position", { start: t, dur: dur * 0.5, to: top, ease: "quadInOut" });
    tl.tween(id, "hop", { start: t, dur: dur * 0.5, from: 0, to: 0.25, ease: "hop" });
    return lie(id, { ...opts, on: undefined, at: t + dur * 0.5, dur: dur * 0.5 });
  };

  // reparent hold (#199): carried in front of a critter's tummy, whatever its size (to on a critter with no part is
  // in metres from its foot, so a guessed height often landed at its head).
  const reparent = d.reparent;
  d.reparent = (id, opts = {}) => {
    if (!opts.hold || opts.parent == null || opts.to != null || opts.part != null) return reparent(id, opts);
    const p = obj(opts.parent);
    const b = localBounds({ ...p, at: [0, 0, 0], rotation: [0, 0, 0] }, catalog);
    const h = b.max[1] - b.min[1];
    return reparent(id, { ...opts, hold: undefined, to: [0, r4(0.32 * h), r4(b.max[2] + 0.05)] });
  };

  // sound echo (#158): the sound comes back softer, `echo` times (true: 3), 0.35 s apart (echoGap), halving each time.
  const play = d.sound;
  d.sound = (name, opts = {}) => {
    play(name, opts);
    const n = opts.echo === true ? 3 : opts.echo ?? 0;
    if (!(Number.isInteger(n) && n >= 0 && n <= 6)) throw new Error("sound: echo must be true or 0-6 repeats");
    const gap = opts.echoGap ?? 0.35;
    for (let k = 1; k <= n; k++) play(name, { ...opts, at: (opts.at ?? 0) + k * gap, volume: r4((opts.volume ?? 1) * 0.5 ** k) });
    return d;
  };
}
