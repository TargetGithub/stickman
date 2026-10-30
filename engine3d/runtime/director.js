// The director: the one authoring API. JSON scripts compile to these calls (compile.js) and JS scene modules
// call them directly. It only records data: objects with their spawn state, timeline segments, captions,
// audio cues and spoken lines. stage.js turns the result (a plan) into three.js; tools read the same plan for
// TTS, the audio mix and the duration. Pure: no three.js, no I/O, no clocks.

import { createTimeline } from "./timeline.js";
import { deriveRng } from "./rng.js";
import { bubblePaths } from "./particles.js";
import { installExtras, parseClock } from "./director_extras.js";

const V = (v, d) => (Array.isArray(v) ? [...v] : typeof v === "number" ? [v, v, v] : [...d]);
const LOOPING = new Set(["Idle", "Dance", "Walking", "Running"]);
// bounceOut first touches the ground at u = 1 / 2.75.
const FIRST_CONTACT = 1 / 2.75;

/** Seconds a line takes before its TTS clip exists (the same estimate the 2D synth uses to flag odd clips). */
export const estimateSpeech = (text) => 0.3 + 0.075 * text.length;

/**
 * @param {{ catalog: object, seed?: number, speech?: Record<string, { dur:number }>, voice?: string }} o
 *   speech: line id → measured clip; lines without one use estimateSpeech
 */
export function createDirector({ catalog, seed = 1, speech = {}, voice = "soft" }) {
  const tl = createTimeline();
  const objects = new Map();
  const captions = [];
  const audio = [];
  const lines = [];
  const hooks = [];
  let stage = { preset: "playroom" };
  let endAt = 0;
  let lineNo = 0;

  // Named parts of critters and props ("box#lid") are sub-targets: they take rotation and position offsets.
  const parts = new Set();
  const obj = (id) => {
    if (parts.has(id)) return objects.get(id.split("#")[0]);
    const o = objects.get(id);
    if (!o) throw new Error(`unknown object "${id}"`);
    return o;
  };
  const at = (o) => o?.at ?? 0;
  const now = (id, prop, t) => tl.valueAt(id, prop, t);
  const sound = (name, t, extra = {}) => name && audio.push({ t, sound: name, volume: 1, pan: 0, ...extra });

  tl.base("camera", "position", [0, 3, 11]);
  tl.base("camera", "lookAt", [0, 1.5, 0]);
  tl.base("camera", "fov", 40);

  const d = {
    catalog,
    rng: (name) => deriveRng(seed, name),
    timeline: tl,

    stage(s) {
      stage = { ...stage, ...s };
      return d;
    },

    /** Place an object. Fields per kind: catalog/kinds.json. */
    add(spec) {
      if (!spec?.id || objects.has(spec.id) || spec.id === "camera" || spec.id === "stage") throw new Error(`object id "${spec?.id}" is missing or taken`);
      if (!catalog.kinds[spec.kind]) throw new Error(`object "${spec.id}": unknown kind "${spec.kind}"`);
      if (spec.parent != null && !objects.has(spec.parent)) throw new Error(`object "${spec.id}": parent "${spec.parent}" must be added first`);
      const o = { ...spec, at: V(spec.at, [0, 0, 0]), rotation: V(spec.rotation, [0, 0, 0]), scale: V(spec.scale, [1, 1, 1]) };
      objects.set(o.id, o);
      tl.base(o.id, "position", o.at);
      tl.base(o.id, "rotation", o.rotation);
      tl.base(o.id, "scale", o.hidden ? [0, 0, 0] : o.scale);
      tl.base(o.id, "visible", !o.hidden);
      tl.base(o.id, "hop", 0); // a lift added on top of position, so hops combine with moves
      if (o.kind === "confetti" || o.kind === "bubbles") tl.base(o.id, "burst", -1);
      if (o.kind === "critter" || (o.kind === "shape" && o.face)) tl.base(o.id, "eyes", 1);
      if (o.kind === "critter" || o.kind === "prop") {
        const m = o.kind === "critter" ? catalog.critters[o.species] : catalog.props[o.model];
        const names = ["head", "body", ...(m?.parts ?? []).filter((p) => p.name).map((p) => p.name)];
        for (const n of names) {
          parts.add(`${o.id}#${n}`);
          tl.base(`${o.id}#${n}`, "rotation", [0, 0, 0]);
          tl.base(`${o.id}#${n}`, "position", [0, 0, 0]);
        }
      }
      if (o.kind === "critter" || (o.kind === "shape" && o.face) || o.kind === "character") {
        tl.base(o.id, "feeling", o.feeling ?? "happy");
        tl.base(o.id, "feelingFrom", o.feeling ?? "happy");
        tl.base(o.id, "feelAt", -1);
      }
      if (o.kind === "clock") {
        tl.base(o.id, "minutes", parseClock(o.time ?? "12:00"));
        tl.base(o.id, "minuteHand", o.minuteHand === false ? 0 : 1);
      }
      if (o.kind === "lamp") tl.base(o.id, "aim", V(o.aim, [o.at[0], 0, o.at[2] - 2]));
      if (o.kind === "character") tl.clip(o.id, o.clip ?? catalog.characters[o.character].idle, { start: 0, loop: true, fade: 0 });
      return d;
    },

    tween(id, prop, to, { at: start = 0, dur = 1, ease = "quadInOut", from } = {}) {
      if (id !== "camera" && id !== "stage") obj(id);
      tl.tween(id, prop, { start, dur, to, from, ease });
      return d;
    },
    set(id, prop, value, start = 0) {
      if (id !== "camera") obj(id);
      tl.set(id, prop, value, start);
      return d;
    },

    // --- moves (each is a few tweens; catalog/actions.json documents them) ---

    show(id, { at: t = 0, dur = 0.4 } = {}) {
      const o = obj(id);
      tl.set(id, "visible", true, t);
      tl.tween(id, "scale", { start: t, dur, from: [0, 0, 0], to: o.scale, ease: "backOut" });
      return d;
    },
    hide(id, { at: t = 0, dur = 0.3 } = {}) {
      obj(id);
      tl.tween(id, "scale", { start: t, dur, to: [0, 0, 0], ease: "backIn" });
      tl.set(id, "visible", false, t + dur);
      return d;
    },
    pop(id, { at: t = 0, dur = 0.5, sound: s = "pop" } = {}) {
      const o = obj(id);
      tl.set(id, "visible", true, t);
      tl.tween(id, "scale", { start: t, dur, from: [0, 0, 0], to: o.scale, ease: "elasticOut" });
      sound(s, t);
      return d;
    },
    drop(id, { at: t = 0, to, height = 6, dur = 0.9, sound: s = "block" } = {}) {
      const o = obj(id);
      const p = V(to, now(id, "position", t));
      const land = t + dur * FIRST_CONTACT;
      tl.set(id, "visible", true, t);
      tl.set(id, "scale", o.scale, t);
      tl.tween(id, "position", { start: t, dur, from: [p[0], p[1] + height, p[2]], to: p, ease: "bounceOut" });
      // Squash on the first contact, from the base (objects stand on their origin).
      tl.tween(id, "scale", { start: land, dur: 0.22, from: o.scale, to: [o.scale[0] * 1.18, o.scale[1] * 0.78, o.scale[2] * 1.18], ease: "hop" });
      sound(s, land, { pan: Math.max(-1, Math.min(1, p[0] / 6)) });
      return d;
    },
    move(id, { at: t = 0, to, dur = 1, ease = "quadInOut" } = {}) {
      return d.tween(id, "position", V(to), { at: t, dur, ease });
    },
    turn(id, { at: t = 0, to, dur = 0.8, ease = "quadInOut" } = {}) {
      return d.tween(id, "rotation", V(to), { at: t, dur, ease });
    },
    spin(id, { at: t = 0, turns = 1, dur = 1 } = {}) {
      const r = now(id, "rotation", t) ?? [0, 0, 0];
      // Spin, then snap back to the start angle (the same pose, 360° on).
      tl.tween(id, "rotation", { start: t, dur, from: r, to: [r[0], r[1] + 360 * turns, r[2]], ease: "cubicInOut" });
      tl.set(id, "rotation", r, t + dur);
      return d;
    },
    hop(id, { at: t = 0, height = 0.6, dur = 0.45, sound: s } = {}) {
      obj(id);
      tl.tween(id, "hop", { start: t, dur, from: 0, to: height, ease: "hop" });
      sound(s, t);
      return d;
    },
    /** Scale by `to` (a number, or [x, y, z] to stretch one way: a water level rising from the base). */
    grow(id, { at: t = 0, to = 1.3, dur = 0.4, ease = "backOut" } = {}) {
      const o = obj(id);
      return d.tween(id, "scale", o.scale.map((x, i) => x * (Array.isArray(to) ? to[i] : to)), { at: t, dur, ease });
    },
    clip(id, name, { at: t = 0, loop = LOOPING.has(name), then, fade = 0.25 } = {}) {
      const o = obj(id);
      const ch = catalog.characters[o.character];
      tl.clip(id, name, { start: t, loop, fade });
      const len = ch.clipDurations?.[name];
      if (!loop && len) tl.clip(id, then ?? ch.idle, { start: t + len - fade, loop: true, fade });
      return d;
    },
    burst(id, { at: t = 0, dur, sound: s } = {}) {
      const o = obj(id);
      tl.set(id, "visible", true, t);
      tl.set(id, "burst", t, t);
      if (o.kind === "bubbles") {
        // Bubbles: every third pop is heard, softly, so a stream of bubbles never turns into noise.
        const paths = bubblePaths(seed, o.id, { ...o, dur: dur ?? 8 });
        const last = Math.max(...paths.map((b) => b.popAt)) + 0.2;
        paths.forEach((b, i) => i % 3 === 0 && sound(s ?? "bubble_pop", t + b.popAt, { volume: 0.35, pan: Math.max(-1, Math.min(1, b.x / 5)) }));
        tl.set(id, "visible", false, t + last);
        endAt = Math.max(endAt, t + last);
        return d;
      }
      const len = dur ?? 3.5;
      tl.set(id, "visible", false, t + len);
      sound(s ?? "magic_sparkle", t);
      endAt = Math.max(endAt, t + len);
      return d;
    },
    wiggle(id, { at: t = 0, deg = 12, dur = 0.8 } = {}) {
      const r = now(id, "rotation", t) ?? [0, 0, 0];
      tl.tween(id, "rotation", { start: t, dur, from: r, to: [r[0], r[1], r[2] + deg], ease: "wiggle" });
      return d;
    },
    nod(id, { at: t = 0, deg = 18, dur = 0.5 } = {}) {
      const o = obj(id);
      if (o.kind === "critter") tl.tween(`${id}#head`, "rotation", { start: t, dur, from: [0, 0, 0], to: [deg, 0, 0], ease: "hop" });
      else {
        const r = now(id, "rotation", t) ?? [0, 0, 0];
        tl.tween(id, "rotation", { start: t, dur, from: r, to: [r[0] + deg, r[1], r[2]], ease: "hop" });
      }
      return d;
    },
    sleep(id, { at: t = 0, dur = 1.2 } = {}) {
      obj(id);
      tl.tween(id, "eyes", { start: t, dur, to: 0, ease: "sineInOut" });
      return d;
    },
    wake(id, { at: t = 0, dur = 0.6 } = {}) {
      obj(id);
      tl.tween(id, "eyes", { start: t, dur, to: 1, ease: "quadOut" });
      return d;
    },
    camera({ at: t = 0, dur = 1.5, ease = "sineInOut", position, lookAt, fov } = {}) {
      if (position) tl.tween("camera", "position", { start: t, dur, to: V(position), ease });
      if (lookAt) tl.tween("camera", "lookAt", { start: t, dur, to: V(lookAt), ease });
      if (fov) tl.tween("camera", "fov", { start: t, dur, to: fov, ease });
      return d;
    },

    // --- text and sound ---

    caption(text, { at: t = 0, dur = 2, style = "subtitle", color } = {}) {
      captions.push({ text: String(text), start: t, dur, style, ...(color ? { fill: catalog.colors[color].hex } : {}) });
      endAt = Math.max(endAt, t + dur);
      return d;
    },
    sound(name, { at: t = 0, volume = 1, pan = 0 } = {}) {
      sound(name, t, { volume, pan });
      return d;
    },
    /** Speak a line; returns its length in seconds (the measured clip, else an estimate). */
    say(text, { at: t = 0, voice: v = voice, id } = {}) {
      const lineId = id ?? `line${++lineNo}`;
      const dur = speech[lineId]?.dur ?? estimateSpeech(text);
      lines.push({ id: lineId, text, voice: v, t, dur });
      audio.push({ t, speech: lineId, volume: 1, pan: 0 });
      endAt = Math.max(endAt, t + dur);
      return dur;
    },

    /** Custom per-frame code (JS scenes only): fn(t, handles) runs in the page after the timeline is applied. */
    onFrame(fn) {
      hooks.push(fn);
      return d;
    },
    end(t) {
      endAt = Math.max(endAt, t);
      return d;
    },

    plan() {
      const duration = Math.max(endAt, tl.end(), ...captions.map((c) => c.start + c.dur)) + 0.5;
      return { seed, stage, objects: [...objects.values()], timeline: tl, captions, audio: audio.sort((a, b) => a.t - b.t), lines, hooks, duration };
    },
  };
  installExtras(d, { catalog, tl, obj, now, sound, getStage: () => stage, V });
  return d;
}
