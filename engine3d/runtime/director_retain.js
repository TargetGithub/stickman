// The retention kit's director moves (ENGINE_RETENTION_KIT.md): the timer ring and its countdown, pulsing answer
// options and their results, keyword badges, progress trackers and cue badges. The speaking beats (hook,
// challenge, call, say keywords) are in retain_compile.js and call these. Every move also records an engagement
// cue (plan.engagement) that the retention lints read. Pure: no three.js, no I/O, no clocks.

import { focusPoint, localBounds } from "./bounds.js";
import { BADGE_D, ICONS, SPOTS, badgeRect, keywordSpot, projectPoint, trackerFit, trackerRect } from "./retain_layout.js";

/** Actions this module adds (compile.js dispatches them with d[name](target, opts)). */
export const RETAIN_ACTIONS = ["timer", "options", "answer", "keyword", "progress"];
/** Classic actions that also count as an interaction for the lints (a pop-in or a prompt on screen). */
export const ENGAGING = ["pop", "mark", "highlight", "emphasize", "burst"];
/** Steps a tracker has: its slots plus the surprise. */
export const trackerSteps = (o) => (o.slots ?? 1) + (o.surprise ? 1 : 0);

/**
 * Defaults for the kit's kinds, applied before an object is placed: badges and timer rings start hidden, and HUD
 * timer rings and trackers take their screen spot when they have no at.
 */
export function retainDefaults(spec) {
  if (spec?.kind === "timer_ring") return { hidden: true, ...(spec.hud && spec.at == null ? { at: [...SPOTS.timer] } : {}), ...spec };
  if (spec?.kind === "badge") return { hidden: true, ...spec };
  if (spec?.kind === "tracker" && spec.hud && spec.at == null) return { ...spec, at: trackerFit(spec).anchor };
  return spec;
}

/**
 * Add the kit's moves to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, objects: Map }} k  director internals
 * @returns {{ bases: (o:object) => void, engagement: object[] }}
 */
export function installRetain(d, { catalog, tl, obj, now, sound, objects }) {
  const engagement = [];
  const filled = new Map(); // tracker id → steps filled so far
  const badges = []; // { id, key, until, rect, from }
  let made = 0;
  let autoTimer = null;
  const engage = (kind, t, extra = {}) => engagement.push({ t, kind, ...extra });
  const internal = (spec) => {
    const id = `~${spec.kind}${++made}`;
    d.add({ ...spec, id, internal: true });
    return id;
  };
  const kindOf = (id, kind, what) => {
    const o = obj(id);
    if (o.kind !== kind) throw new Error(`${what} needs a ${kind}, "${id}" is a ${o.kind}`);
    return o;
  };
  const shownAt = (id, t) => now(id, "visible", t) && (now(id, "scale", t) ?? [1])[0] > 1e-3;

  /** A badge (icon, prop or text) ready to pop: reuses one with the same face when it is free by t. */
  function badgeFor(face, t) {
    const key = JSON.stringify(face);
    const free = badges.find((b) => b.key === key && b.until <= t);
    if (free) return free;
    const id = internal({ kind: "badge", hud: true, hidden: true, at: [0, 0, 0], ...face, model: undefined, shape: undefined, shapeColor: undefined });
    if (face.shape) {
      if (!catalog.shapes[face.shape]) throw new Error(`badge: unknown shape "${face.shape}"`);
      // Shapes that lie flat (a plate, a coin, a hoop) are stood up to face the viewer, a little tilted back.
      if (["plate", "disc", "hoop"].includes(face.shape)) {
        const size = (BADGE_D * 0.62) / 1;
        d.add({ id: `${id}_m`, kind: "shape", shape: face.shape, color: face.shapeColor, hud: true, parent: id, internal: true, size, rotation: [70, 0, 0], at: [0, 0, 0.22] });
      } else {
        const b = localBounds({ kind: "shape", shape: face.shape }, catalog);
        const w = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], 0.05);
        const size = (BADGE_D * 0.56) / w;
        d.add({ id: `${id}_m`, kind: "shape", shape: face.shape, color: face.shapeColor, hud: true, parent: id, internal: true, size, at: [-(b.min[0] + b.max[0]) * size / 2, -(b.min[1] + b.max[1]) * size / 2, 0.22] });
      }
    }
    if (face.model) {
      const m = catalog.props[face.model];
      if (!m) throw new Error(`badge: unknown prop "${face.model}"`);
      const b = localBounds({ kind: "prop", model: face.model }, catalog);
      const w = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], 0.05);
      const size = (BADGE_D * 0.56) / w;
      d.add({ id: `${id}_m`, kind: "prop", model: face.model, hud: true, parent: id, internal: true, size, at: [-(b.min[0] + b.max[0]) * size / 2, -(b.min[1] + b.max[1]) * size / 2, 0.22] });
    }
    const rec = { id, key, until: -1, rect: null };
    badges.push(rec);
    return rec;
  }

  /** Pop a badge at spot for dur seconds (with an optional pulse while it shows). */
  function popBadge(rec, spot, t, dur, { size = 1, pulse = false, s } = {}) {
    const k = [size, size, size];
    tl.set(rec.id, "position", spot, t);
    tl.set(rec.id, "visible", true, t);
    tl.tween(rec.id, "scale", { start: t, dur: 0.5, from: [0, 0, 0], to: k, ease: "elasticOut" });
    tl.tween(rec.id, "rotation", { start: t + 0.35, dur: 0.7, from: [0, 0, 0], to: [0, 0, 7], ease: "wiggle" });
    if (pulse) tl.set(rec.id, "pulse", [t + 0.4, t + dur - 0.3], t);
    tl.tween(rec.id, "scale", { start: t + dur - 0.25, dur: 0.25, to: [0, 0, 0], ease: "backIn" });
    tl.set(rec.id, "visible", false, t + dur);
    sound(s, t, { volume: 0.8, pan: Math.max(-1, Math.min(1, spot[0] / 8)) });
    rec.until = t + dur + 0.05;
    rec.rect = badgeRect(spot, size);
    rec.from = t;
  }

  const api = {
    /** Record an engagement cue (an interaction, pop-in or prompt) for the retention lints. */
    engage(kind, { at: t = 0, ...extra } = {}) {
      engage(kind, t, extra);
      return d;
    },

    /** Drain a timer ring over dur seconds; the last `count` seconds show 3, 2, 1 with ticks, then a chime. */
    timer(target, { at: t = 0, dur = 5, count = 3, sound: tick = "timer_tick", chime = "timer_chime", keep = false } = {}) {
      const id = target ?? (autoTimer ??= internal({ kind: "timer_ring", hud: true, hidden: true, at: [...SPOTS.timer] }));
      const o = kindOf(id, "timer_ring", "timer");
      const run = t + 0.3;
      const end = run + dur;
      tl.set(id, "fill", 1, t);
      tl.set(id, "num", 0, t);
      tl.set(id, "visible", true, t);
      tl.tween(id, "scale", { start: t, dur: 0.45, from: [0, 0, 0], to: o.scale, ease: "elasticOut" });
      tl.tween(id, "fill", { start: run, dur, from: 1, to: 0, ease: "linear" });
      for (let n = Math.min(count, Math.floor(dur)); n >= 1; n--) {
        const tn = end - n;
        tl.set(id, "num", n, tn);
        tl.set(id, "numAt", tn, tn);
        sound(tick, tn, { volume: 0.8 });
      }
      tl.set(id, "num", 0, end);
      tl.set(id, "rang", end, end);
      tl.tween(id, "rotation", { start: end, dur: 0.8, from: [0, 0, 0], to: [0, 0, 14], ease: "wiggle" });
      sound(chime, end, { volume: 0.9 });
      if (!keep) {
        tl.tween(id, "scale", { start: end + 1, dur: 0.3, to: [0, 0, 0], ease: "backIn" });
        tl.set(id, "visible", false, end + 1.3);
      }
      engage("timer", t, { until: end });
      return d;
    },

    /** Make answer options pulse in turn (pulse) or flash together (blink), with a glow, for dur seconds. */
    options(_, { at: t = 0, targets = [], dur = 3, style = "pulse", color = "gold" } = {}) {
      if (!Array.isArray(targets) || targets.length < 2) throw new Error("options needs targets: two or more object ids");
      const per = 0.55;
      if (style === "blink") {
        for (let k = 0; k * 0.8 < dur - 0.3; k++) for (const id of targets) d.highlight(id, { at: t + k * 0.8, color, dur: 0.55 });
      } else {
        for (const id of targets) d.highlight(id, { at: t, color, dur });
        for (let i = 0; i * per < dur - 0.2; i++) {
          const id = targets[i % targets.length];
          const s = now(id, "scale", t + i * per) ?? obj(id).scale;
          tl.tween(id, "scale", { start: t + i * per, dur: per * 0.9, from: s, to: s.map((x) => x * 1.16), ease: "hop" });
        }
      }
      engage("options", t, { until: t + dur });
      return d;
    },

    /** Show the result: correct (tick, gold glow, hop, ding, confetti) or wrong (soft shake, soft cross, hint glow). */
    answer(target, { at: t = 0, result = "correct", hint, confetti, sound: s } = {}) {
      const o = obj(target);
      if (result === "wrong") {
        d.wiggle(target, { at: t, deg: 9, dur: 0.7 });
        d.mark(target, { at: t, result: "incorrect", dur: 1.6, sound: s === undefined ? "wrong_soft" : s });
        if (hint != null) {
          d.highlight(hint, { at: t + 0.9, color: "mint", dur: 2.2 });
          const hs = now(hint, "scale", t + 1) ?? obj(hint).scale;
          tl.tween(hint, "scale", { start: t + 1, dur: 0.6, from: hs, to: hs.map((x) => x * 1.15), ease: "hop" });
        }
      } else {
        d.mark(target, { at: t, result: "correct", dur: 2, sound: s === undefined ? "ding" : s });
        d.highlight(target, { at: t, color: "gold", dur: 2 });
        d.hop(target, { at: t + 0.1, height: o.hud ? 0.3 : 0.45, dur: 0.5 });
        if (o.kind === "critter" || o.kind === "character" || (o.kind === "shape" && o.face)) d.feel(target, { at: t, feeling: "joyful" });
        if (confetti != null) d.burst(confetti, { at: t + 0.1 });
      }
      engage("answer", t, { result });
      return d;
    },

    /** Pop a keyword badge at the side of the frame away from what is being taught. */
    keyword(_, { at: t = 0, word, icon, model, shape, text, color, sound: s, dur = 2.2, side = "auto", avoid } = {}) {
      const face = icon ? { icon } : model ? { model } : shape ? { shape, shapeColor: color ?? "blue" } : { text: String(text ?? word ?? "?").slice(0, 4) };
      // A shape face (a plate, a bottle, a straw) takes color for the shape; its badge stays yellow.
      face.color = (shape ? null : color) ?? (icon ? ICONS[icon]?.color : null) ?? "yellow";
      const cam = { position: now("camera", "position", t), lookAt: now("camera", "lookAt", t), fov: now("camera", "fov", t) };
      let avoidX = 0;
      if (avoid != null) {
        const a = obj(avoid);
        avoidX = a.hud ? (now(avoid, "position", t) ?? a.at)[0] / 8 : projectPoint(focusPoint(a, catalog, now, (id) => obj(id), t), cam).x;
      }
      const busy = [...objects.values()].filter((o) => o.hud && o.kind === "tracker" && shownAt(o.id, t)).map((o) => trackerRect(o, now(o.id, "position", t)));
      for (const o of objects.values()) if (o.hud && o.kind === "timer_ring" && shownAt(o.id, t)) busy.push(badgeRect(now(o.id, "position", t), 1.2));
      for (const b of badges) if (b.until > t && b.from <= t + dur) busy.push(b.rect);
      const spot = keywordSpot({ side, avoidX, busy });
      const rec = badgeFor(face, t);
      popBadge(rec, spot, t, dur, { s: s === undefined ? (icon ? ICONS[icon]?.sound : "pop") ?? "pop" : s });
      engage("keyword", t, { word: word ?? null });
      return d;
    },

    /** A cue badge (call-and-response, the hook's "?") in the middle of the top, pulsing for dur seconds. */
    cue(icon, { at: t = 0, dur = 2, sound: s } = {}) {
      popBadge(badgeFor({ icon, color: ICONS[icon]?.color ?? "purple" }, t), [...SPOTS.cue], t, dur, { size: 1.2, pulse: true, s: s === undefined ? ICONS[icon]?.sound : s });
      return d;
    },

    /** Fill a tracker up to step (a number, or "next"), or tease its surprise slot. */
    progress(target, { at: t = 0, step = "next", tease, sound: s } = {}) {
      const o = kindOf(target, "tracker", "progress");
      const total = trackerSteps(o);
      if (tease) {
        if (!o.surprise) throw new Error(`progress "${target}": tease needs a tracker with a surprise`);
        tl.set(target, "tease", t, t);
        sound(s === undefined ? "sparkle" : s, t, { volume: 0.8 });
        engage("progress", t, { tease: true });
        return d;
      }
      const from = filled.get(target) ?? o.filled ?? 0;
      const to = step === "next" ? from + 1 : step;
      if (!(Number.isInteger(to) && to > from && to <= total)) throw new Error(`progress "${target}": step must be ${from + 1}-${total} (it moves forward only), got ${step}`);
      for (let i = from; i < to; i++) {
        const ti = t + (i - from) * 0.4;
        const surprise = o.surprise && i === total - 1;
        tl.set(target, `f${i}`, ti, ti);
        tl.tween(target, "step", { start: ti, dur: 0.35, from: i, to: i + 1, ease: "quadOut" });
        tl.tween(target, "hop", { start: ti, dur: 0.35, from: 0, to: 0.1, ease: "hop" });
        const last = (o.style ?? "train") === "train" && i === (o.slots ?? 1) - 1;
        sound(s === undefined ? (surprise ? "magic_sparkle" : last ? "train_whistle" : "pop") : s, ti, { volume: 0.75 });
      }
      filled.set(target, to);
      engage("progress", t, { step: to });
      return d;
    },
  };
  Object.assign(d, api);

  return {
    engagement,
    /** Timeline bases for a newly placed kit object. */
    bases(o) {
      if (o.kind === "timer_ring") for (const [p, v] of [["fill", 1], ["num", 0], ["numAt", -1], ["rang", -1]]) tl.base(o.id, p, v);
      if (o.kind === "badge") tl.base(o.id, "pulse", [-1, -1]);
      if (o.kind === "tracker") {
        const n = trackerSteps(o);
        tl.base(o.id, "step", o.filled ?? 0);
        tl.base(o.id, "tease", -1);
        for (let i = 0; i < n; i++) tl.base(o.id, `f${i}`, i < (o.filled ?? 0) ? -10 : -1);
        filled.set(o.id, o.filled ?? 0);
      }
    },
  };
}
