// The timeline: every animated value is a pure function of time. Tracks are (target, prop) pairs holding
// segments { start, dur, from?, to, ease }. At time t a track folds its segments in start order: a segment
// not yet started leaves the value alone, a running one interpolates, a finished one leaves ease(1) of the way
// (so a "hop" ends where it began). from defaults to the value the track had when the segment started.
// No three.js here: the same code runs in Node (tests, audio, durations) and in the page.

import { ease } from "./ease.js";

/** @typedef {number | boolean | number[]} Value */
/** @typedef {{ start:number, dur:number, from?:Value, to:Value, ease?:string }} Segment */

const lerp = (a, b, k) => {
  if (typeof a === "boolean" || typeof b === "boolean") return k >= 1 ? b : a;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * k);
  return a + (b - a) * k;
};

export function createTimeline() {
  /** @type {Map<string, Map<string, Segment[]>>} target → prop → segments (kept in insertion order, sorted on use) */
  const tracks = new Map();
  /** @type {Map<string, Map<string, Value>>} */
  const bases = new Map();
  /** @type {Map<string, Array<{ name:string, start:number, loop:boolean, fade:number, speed:number }>>} */
  const clips = new Map();
  let sorted = true;

  const segs = (target, prop) => {
    if (!tracks.has(target)) tracks.set(target, new Map());
    const m = tracks.get(target);
    if (!m.has(prop)) m.set(prop, []);
    return m.get(prop);
  };

  return {
    /** The value a prop has before any segment (the object's spawn state). */
    base(target, prop, value) {
      if (!bases.has(target)) bases.set(target, new Map());
      bases.get(target).set(prop, value);
    },
    tween(target, prop, { start, dur, from, to, ease: e = "quadInOut" }) {
      if (!(dur >= 0)) throw new Error(`tween ${target}.${prop}: dur must be >= 0`);
      segs(target, prop).push({ start, dur, from, to, ease: e });
      sorted = false;
    },
    set(target, prop, value, start) {
      segs(target, prop).push({ start, dur: 0, to: value, ease: "linear" });
      sorted = false;
    },
    clip(target, name, { start, loop = true, fade = 0.3, speed = 1 }) {
      if (!clips.has(target)) clips.set(target, []);
      clips.get(target).push({ name, start, loop, fade, speed });
      clips.get(target).sort((a, b) => a.start - b.start);
    },

    /** Value of one prop at time t (undefined when the prop has neither base nor a started segment). */
    valueAt(target, prop, t) {
      if (!sorted) {
        // Stable: segments starting together keep the order they were added in.
        for (const m of tracks.values()) for (const list of m.values()) list.sort((a, b) => a.start - b.start);
        sorted = true;
      }
      let v = bases.get(target)?.get(prop);
      for (const s of tracks.get(target)?.get(prop) ?? []) {
        if (s.start > t) break;
        const from = s.from ?? v ?? s.to;
        const u = s.dur > 0 ? (t - s.start) / s.dur : 1;
        v = lerp(from, s.to, ease(s.ease, Math.min(1, u)));
      }
      return v;
    },

    /** Every target's props at t: { target: { prop: value } }. */
    evaluate(t) {
      const out = {};
      const targets = new Set([...bases.keys(), ...tracks.keys()]);
      for (const target of targets) {
        const props = new Set([...(bases.get(target)?.keys() ?? []), ...(tracks.get(target)?.keys() ?? [])]);
        const o = (out[target] = {});
        for (const p of props) o[p] = this.valueAt(target, p, t);
      }
      return out;
    },

    /**
     * Clip weights and local times for a character at t: the newest started clip at full weight after its
     * fade-in, the one before it fading out. Looping clips wrap with `clipDur`.
     * @param {(name:string) => number} clipDur  seconds per clip
     * @returns {Array<{ name:string, time:number, weight:number }>}
     */
    clipsAt(target, t, clipDur) {
      const list = (clips.get(target) ?? []).filter((c) => c.start <= t);
      if (!list.length) return [];
      const local = (c) => {
        const d = clipDur(c.name);
        const x = (t - c.start) * c.speed;
        return c.loop ? ((x % d) + d) % d : Math.min(x, d);
      };
      const cur = list[list.length - 1];
      const k = cur.fade > 0 ? Math.min(1, (t - cur.start) / cur.fade) : 1;
      const out = [{ name: cur.name, time: local(cur), weight: k }];
      const prev = list[list.length - 2];
      if (prev && k < 1 && prev.name !== cur.name) out.push({ name: prev.name, time: local(prev), weight: 1 - k });
      else if (prev && k < 1) out[0].weight = 1;
      return out;
    },

    /** Latest end time over every segment and clip start. */
    end() {
      let e = 0;
      for (const m of tracks.values()) for (const list of m.values()) for (const s of list) e = Math.max(e, s.start + s.dur);
      for (const list of clips.values()) for (const c of list) e = Math.max(e, c.start);
      return e;
    },

    /** Plain data (for a plan dump or a test snapshot). */
    toJSON() {
      const obj = (m, f) => Object.fromEntries([...m].map(([k, v]) => [k, f(v)]));
      return { bases: obj(bases, (m) => obj(m, (v) => v)), tracks: obj(tracks, (m) => obj(m, (v) => v)), clips: obj(clips, (v) => v) };
    },
  };
}
