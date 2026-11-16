// Toybox 10K round 36 moves: a flour or dust puff (#147), ripple on one letter piece (#150), circle that turns its
// riders back to the front when it ends (#150) and an echo on sounds (#158). Pure: only timeline data.

import { shotBounds } from "./bounds_teach.js";

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
