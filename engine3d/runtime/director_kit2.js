// Round 2 of the teaching kit for the director: place value shifts and digit swaps, text card highlights,
// reparent (change an object's parent keeping where it is in the world) and point (a character or critter
// raises an arm toward something). Like the rest of the director it only records timeline data. Pure: no
// three.js, no I/O, no clocks.

import { letterLayout, letterWords } from "./letter_layout.js";
import { wordSpots } from "./text_layout.js";
import { focusPoint } from "./bounds.js";
import { findWords } from "./card_words.js";
import { parseDigits, pvLayout, shiftDigits } from "./place_value.js";
import { withDefaults } from "./teach_layout.js";
import { apply, chain, compose, decompose, eulerMat, invert, matEuler, mul, rotBetween, transpose } from "./xform.js";

/** Actions this module adds (compile.js dispatches them; `set` is d.setDigits, since d.set sets a prop). */
export const KIT2_ACTIONS = ["shift", "set", "emphasize", "reparent", "point"];
/** Named parts a critter or prop can point with, in the order they are tried. */
export const POINT_PARTS = ["arm", "wing", "hand", "paw", "flipper"];

const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const ref = (parent, part) => (parent == null ? "" : part != null ? `${parent}#${part}` : String(parent));

/** The model (catalog entry) of a critter or prop. */
const modelOf = (o, catalog) => (o.kind === "critter" ? catalog.critters[o.species] : o.kind === "prop" ? catalog.props[o.model] : null);

/** The part a critter or prop points with (an explicit name, else the first of POINT_PARTS it has). */
export function pointPart(o, catalog, name) {
  const parts = (modelOf(o, catalog)?.parts ?? []).filter((p) => p.name);
  return name != null ? parts.find((p) => p.name === name) ?? null : POINT_PARTS.map((n) => parts.find((p) => p.name === n)).find(Boolean) ?? null;
}

/**
 * Add the round 2 moves to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, objects: Map, V }} k  director internals
 * @returns {{ bases: (o:object) => void }}  timeline bases for a newly placed round 2 object
 */
export function installKit2(d, { catalog, tl, obj, now, sound, objects, V }) {
  const charts = new Map(); // place value chart id → its digits on show [{ slot, ch, place }]
  const reparented = new Set();
  const based = new Set();
  const baseOnce = (target, prop, value) => {
    const k = `${target}|${prop}`;
    if (based.has(k)) return;
    based.add(k);
    tl.base(target, prop, value);
  };
  const kindOf = (id, kinds, what) => {
    const o = obj(id);
    if (!kinds.includes(o.kind)) throw new Error(`${what} needs a ${kinds.join(" or ")}, "${id}" is a ${o.kind}`);
    return o;
  };

  /** A new digit slot on a chart (the page builds one mesh per slot), hidden until shown. */
  const newSlot = (o, ch, place, zero) => {
    o.pvSlots.push({ ch, zero });
    const i = o.pvSlots.length - 1;
    tl.base(o.id, `pvp${i}`, place);
    tl.base(o.id, `pvs${i}`, 0);
    return i;
  };
  const checkFits = (o, entries) => {
    const L = pvLayout(withDefaults(o));
    for (const e of entries) if (e.place > L.max || e.place < L.min) throw new Error(`place value chart "${o.id}": a digit would leave the chart (place ${e.place}; it holds ${L.min} to ${L.max})`);
  };

  // --- reparent: world transforms from the timeline (position, rotation, scale; parts from the catalog) ---

  const parentRef = (o, t) => now(o.id, "parentRef", t) ?? ref(o.parent, o.part);
  function objectWorld(id, t) {
    const o = objects.get(id);
    const p = now(id, "position", t);
    const local = compose(p, now(id, "rotation", t) ?? [0, 0, 0], now(id, "scale", t) ?? [1, 1, 1]);
    const r = parentRef(o, t);
    return r ? chain(nodeWorld(r, t), local) : local;
  }
  function nodeWorld(r, t) {
    const [pid, part] = r.split("#");
    const W = objectWorld(pid, t);
    return part ? chain(W, partLocal(objects.get(pid), part, t)) : W;
  }
  /** A critter or prop part's pivot in its object's frame (rest pose plus the part's timeline offsets). */
  function partLocal(o, part, t) {
    if (o.kind === "text_card") {
      // A word on a text card: its centre on the card's face (text_layout.js).
      const w = wordSpots(o, catalog.fontMetrics).find((x) => `w${x.n}` === part);
      if (!w) throw new Error(`"${o.id}" has no word "${part}"`);
      return compose([w.x, w.y, 0.04], [0, 0, 0], [1, 1, 1]);
    }
    if (o.kind === "letter" && /^w\d+$/.test(part)) {
      // A word of a letter sentence (#105): the middle of its characters, half the x-height up.
      const L = letterLayout(o, catalog.fontMetrics);
      const cs = (letterWords(o)[Number(part.slice(1)) - 1] ?? []).map((n) => L[n - 1]);
      if (!cs.length) throw new Error(`"${o.id}" has no word "${part}"`);
      const lo = Math.min(...cs.map((c) => c.x - c.w / 2));
      const hi = Math.max(...cs.map((c) => c.x + c.w / 2));
      return compose([(lo + hi) / 2, 0.5 * (o.size ?? 1), 0.1], [0, 0, 0], [1, 1, 1]);
    }
    if (o.kind === "letter") {
      // A character of a word: at its centre on the baseline (letter_layout.js), plus its own offsets.
      const c = letterLayout(o, catalog.fontMetrics).find((x) => `c${x.n}` === part);
      if (!c) throw new Error(`"${o.id}" has no character "${part}"`);
      const pos = now(`${o.id}#${part}`, "position", t) ?? [0, 0, 0];
      return compose([c.x + pos[0], pos[1], pos[2]], now(`${o.id}#${part}`, "rotation", t) ?? [0, 0, 0], [1, 1, 1]);
    }
    const m = modelOf(o, catalog);
    const size = o.size ?? 1;
    const off = (name, prop) => now(`${o.id}#${name}`, prop, t) ?? [0, 0, 0];
    const add = (a, b) => a.map((x, i) => x + b[i]);
    const root = compose([0, 0, 0], [0, 0, 0], [size, size, size]);
    if (part === "body") return root;
    const head = compose(add(m?.head?.at ?? [0, 0, 0], off("head", "position")), off("head", "rotation"), [1, 1, 1]);
    if (part === "head") return chain(root, head);
    const def = m?.parts.find((p) => p.name === part);
    if (!def) throw new Error(`"${o.id}" has no part "${part}"`);
    const node = compose(add(def.at ?? [0, 0, 0], off(part, "position")), add(def.r ?? [0, 0, 0], off(part, "rotation")), [1, 1, 1]);
    return chain(root, def.on === "head" ? chain(head, node) : node);
  }

  Object.assign(d, {
    /** Slide a chart's digits by powers of ten (+ left: × 10 each place; − right: ÷ 10); the point stays. */
    shift(id, { at: t = 0, places, dur = 1.2, sound: s = "whoosh" } = {}) {
      const o = kindOf(id, ["place_value_chart"], "shift");
      if (!(Number.isInteger(places) && places !== 0)) throw new Error(`shift "${id}": places must be a whole number other than 0`);
      const cur = charts.get(id);
      const { kept, gone, added } = shiftDigits(cur, places);
      checkFits(o, [...kept, ...added]);
      const next = kept.map((e) => ({ ...cur[e.from], place: e.place }));
      for (const e of kept) tl.tween(id, `pvp${cur[e.from].slot}`, { start: t, dur, to: e.place, ease: "quadInOut" });
      for (const i of gone) tl.tween(id, `pvs${cur[i].slot}`, { start: t, dur: Math.min(0.4, dur / 2), to: 0, ease: "linear" });
      // Placeholder zeros pop in once the digits have slid past.
      for (const a of added) {
        const slot = newSlot(o, "0", a.place, true);
        tl.tween(id, `pvs${slot}`, { start: t + dur * 0.8, dur: 0.4, from: 0, to: 1, ease: "linear" });
        next.push({ slot, ch: "0", place: a.place });
      }
      charts.set(id, next.sort((a, b) => b.place - a.place));
      sound(s, t);
      return d;
    },

    /** Put new digits in a chart: popping in (pop, default) or at once. */
    setDigits(id, { at: t = 0, digits, pop = true, dur = 0.4, sound: s } = {}) {
      const o = kindOf(id, ["place_value_chart"], "set");
      const entries = parseDigits(digits);
      checkFits(o, entries);
      for (const e of charts.get(id)) {
        if (pop) tl.tween(id, `pvs${e.slot}`, { start: t, dur: Math.min(0.25, dur), to: 0, ease: "linear" });
        else tl.set(id, `pvs${e.slot}`, 0, t);
      }
      charts.set(id, entries.map((e) => {
        const slot = newSlot(o, e.ch, e.place, false);
        if (pop) tl.tween(id, `pvs${slot}`, { start: t, dur, from: 0, to: 1, ease: "linear" });
        else tl.set(id, `pvs${slot}`, 1, t);
        return { slot, ...e };
      }));
      sound(s === undefined ? (pop ? "pop" : null) : s, t);
      return d;
    },

    /** Highlight a phrase on a text card with a marker sweep (words: "a phrase" or [start, end] word indices), on the text the card shows then (#67). */
    emphasize(id, { at: t = 0, words, color = "yellow", dur = 0.4, clear = false, sound: s } = {}) {
      const o = kindOf(id, ["text_card"], "emphasize");
      if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
      o.marks ??= [];
      // clear: the earlier highlights wipe away first.
      if (clear) o.marks.forEach((_, i) => tl.tween(id, `hl${i}`, { start: t, dur: 0.3, to: 0, ease: "linear" }));
      if (words != null) {
        // After a retext the card shows another text: the words are found in, and drawn on, the text showing then.
        const ti = Math.round(now(id, "textIdx", t) ?? 0);
        const range = findWords(o.texts?.[ti] ?? o.text, words);
        if (!range) throw new Error(`emphasize "${id}": no words ${JSON.stringify(words)} on the card`);
        o.marks.push({ words: range, color, ...(ti ? { text: ti } : {}) });
        const i = o.marks.length - 1;
        tl.base(id, `hl${i}`, 0);
        tl.tween(id, `hl${i}`, { start: t + (clear ? 0.3 : 0), dur, from: 0, to: 1, ease: "sineInOut" });
      }
      sound(s, t);
      return d;
    },

    /**
     * Move an object onto another parent (or a part of one, or the world when parent is null) at a time,
     * keeping where it is in the world then; with to (and dur) it then glides to that spot in the new parent.
     */
    reparent(id, { at: t = 0, parent = null, part, dur = 0.6, to, rotation, ease = "quadInOut" } = {}) {
      const o = obj(id);
      if (String(id).includes("#")) throw new Error("reparent moves whole objects, not parts");
      if (parent != null) {
        const p = obj(parent);
        if (part != null && !["critter", "prop", "letter"].includes(p.kind)) throw new Error(`reparent "${id}": only critters, props and letter words have parts`);
        // No loops: the new parent must not ride on the object itself.
        for (let r = String(parent); r; r = parentRef(objects.get(r.split("#")[0]), t)) {
          if (r.split("#")[0] === id) throw new Error(`reparent "${id}": "${parent}" rides on it`);
        }
      }
      if (!reparented.has(id)) {
        reparented.add(id);
        tl.base(id, "parentRef", ref(o.parent, o.part));
      }
      // Shown (or popped) right now, its scale still 0: hand over at the scale it is growing to, then grow in again.
      const sNow = now(id, "scale", t) ?? [1, 1, 1];
      const growing = sNow.some((x) => Math.abs(x) < 1e-6) && now(id, "visible", t) !== false;
      let W = objectWorld(id, t);
      if (growing) {
        const r = parentRef(o, t);
        const local = compose(now(id, "position", t), now(id, "rotation", t) ?? [0, 0, 0], o.scale);
        W = r ? chain(nodeWorld(r, t), local) : local;
      }
      const P = parent == null ? compose([0, 0, 0], [0, 0, 0], [1, 1, 1]) : nodeWorld(ref(parent, part), t);
      const L = decompose(chain(invert(P), W));
      tl.set(id, "parentRef", ref(parent, part), t);
      tl.set(id, "position", L.position, t);
      tl.set(id, "rotation", L.rotation, t);
      if (growing) tl.tween(id, "scale", { start: t, dur: 0.4, from: [0, 0, 0], to: L.scale, ease: "backOut" });
      else tl.set(id, "scale", L.scale, t);
      if (to != null) tl.tween(id, "position", { start: t, dur, from: L.position, to: V(to), ease });
      if (rotation != null) tl.tween(id, "rotation", { start: t, dur, from: L.rotation, to: V(rotation), ease });
      return d;
    },

    /** Raise an arm (Robo) or an arm or wing part (critters) toward an object or a point, hold, and lower it. */
    point(id, { at: t = 0, to, arm, part, dur = 0.5, hold = 1.5, look = true, sound: s } = {}) {
      const o = obj(id);
      const end = t + dur;
      // A piece ("word#c3" a letter, "card#w3" a word on a text card, "dog#tail") is aimed at exactly (#84).
      const target = Array.isArray(to) ? V(to) : String(to).includes("#") ? nodeWorld(to, end).p.map((v) => Math.round(v * 1e6) / 1e6) : focusPoint(obj(to), catalog, now, (x) => obj(x), end);
      const pos = now(id, "position", end) ?? o.at;
      const R = eulerMat(now(id, "rotation", end) ?? [0, 0, 0]);
      const rel = transpose(R);
      const side = arm ?? (apply(rel, target.map((x, i) => x - pos[i]))[0] >= 0 ? "left" : "right");
      if (side !== "left" && side !== "right") throw new Error(`point: arm must be "left" or "right"`);
      if (o.kind === "character") {
        // Each arm has its own track (pointL / pointR), so both can point at once: a T, a V, arms up.
        const S = side === "left" ? "L" : "R";
        baseOnce(id, `point${S}`, 0);
        baseOnce(id, `pointAt${S}`, [0, 0, 0]);
        tl.set(id, `pointAt${S}`, target.map(r6), t);
        tl.tween(id, `point${S}`, { start: t, dur, from: 0, to: 1, ease: "quadOut" });
        tl.tween(id, `point${S}`, { start: end + hold, dur, to: 0, ease: "quadInOut" });
      } else {
        const def = pointPart(o, catalog, part);
        if (!def) throw new Error(`point: "${id}" has no arm or wing part to point with`);
        // The copy on that side: the part as listed, or its mirror image (a critter's left is +x).
        const x0 = def.at?.[0] ?? 0;
        const mirrored = !!def.mirror && (side === "left" ? x0 < 0 : x0 > 0);
        const at = [mirrored ? -x0 : x0, def.at?.[1] ?? 0, def.at?.[2] ?? 0];
        const head = def.on === "head" ? modelOf(o, catalog).head?.at ?? [0, 0, 0] : [0, 0, 0];
        const size = o.size ?? 1;
        const pivot = apply(R, at.map((x, i) => (x + head[i]) * size)).map((x, i) => x + pos[i]);
        const want = apply(rel, target.map((x, i) => x - pivot[i]));
        const r = def.r ?? [0, 0, 0];
        const rest = mirrored ? [r[0], -r[1], -r[2]] : r;
        const hang = def.hang ? [mirrored ? -def.hang[0] : def.hang[0], def.hang[1], def.hang[2]] : [0, -1, 0];
        const restM = eulerMat(rest);
        const e = matEuler(mul(rotBetween(apply(restM, hang), want), restM));
        const lift = e.map((x, i) => r6(wrap(x - rest[i])));
        const sub = `${id}#${def.name}`;
        baseOnce(sub, "lift", [0, 0, 0]);
        baseOnce(sub, "liftSide", 1);
        tl.set(sub, "liftSide", mirrored ? -1 : 1, t);
        tl.tween(sub, "lift", { start: t, dur, from: [0, 0, 0], to: lift, ease: "quadOut" });
        tl.tween(sub, "lift", { start: end + hold, dur, to: [0, 0, 0], ease: "quadInOut" });
      }
      if (look && (o.kind === "critter" || o.kind === "character")) {
        const before = now(id, "look", t) ?? [0, 0];
        d.look(id, { at: t, to: Array.isArray(to) || String(to).includes("#") ? target : to, dur });
        tl.tween(id, "look", { start: end + hold, dur, to: before, ease: "quadInOut" });
      }
      sound(s, t);
      return d;
    },
  });

  return {
    /** Timeline bases for a newly placed round 2 object. */
    bases(o) {
      if (o.kind === "stroke") tl.base(o.id, "drawn", 1);
      if (o.kind === "place_value_chart") {
        o.pvSlots = [];
        const entries = o.digits != null && o.digits !== "" ? parseDigits(o.digits) : [];
        checkFits(o, entries);
        charts.set(o.id, entries.map((e) => {
          const slot = newSlot(o, e.ch, e.place, false);
          tl.base(o.id, `pvs${slot}`, 1);
          return { slot, ...e };
        }));
      }
    },
  };
}
