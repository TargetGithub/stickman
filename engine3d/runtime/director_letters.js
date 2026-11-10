// Word moves for phonics and syllable lessons (letter words, runtime/letter_layout.js): split a word into
// syllables or chunks (the characters after each split slide apart, with an optional blade that slices down
// through each gap), or close it up again. Pure: it only records timeline offsets on the pieces <id>#c<n>.

import { letterLayout } from "./letter_layout.js";
import { LEAF } from "./composite2.js";

/**
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, sound }} k  director internals
 */
export function installLetters(d, { catalog, tl, obj, sound, now }) {
  let blades = 0;
  // Per-letter hop, grow and paint on a word's pieces ("word#c3"): one vowel team bounces, swells or turns gold.
  const piece = (target) => {
    const m = /^(.+)#c(\d+)$/.exec(String(target));
    if (!m) return null;
    const o = obj(m[1]);
    return o.kind === "letter" ? { id: m[1], o, n: Number(m[2]), key: `${m[1]}#c${m[2]}` } : null;
  };
  const { hop, grow, paint } = d;
  const rgbOf = (name) => {
    const h = catalog.colors[name].hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  d.hop = (id, opts = {}) => {
    const p = piece(id);
    if (!p) return hop(id, opts);
    const { at: t = 0, height = 0.6, dur = 0.45, sound: s } = opts;
    const h = height * (p.o.size ?? 1) * 0.6; // a letter hops about its own height, not a critter's
    const base = now(p.key, "position", t) ?? [0, 0, 0];
    tl.tween(p.key, "position", { start: t, dur: dur / 2, to: [base[0], base[1] + h, base[2]], ease: "quadOut" });
    tl.tween(p.key, "position", { start: t + dur / 2, dur: dur / 2, to: base, ease: "quadIn" });
    if (s) sound(s, t);
    return d;
  };
  d.grow = (id, opts = {}) => {
    const p = piece(id);
    if (!p) return grow(id, opts);
    const { at: t = 0, to = 1.3, dur = 0.4, ease = "backOut" } = opts;
    tl.base(p.key, "scale", [1, 1, 1]);
    const v = Array.isArray(to) ? to : [to, to, to];
    tl.tween(p.key, "scale", { start: t, dur, to: v, ease });
    return d;
  };
  d.paint = (id, opts = {}) => {
    const p = piece(id);
    if (!p) return paint(id, opts);
    const { at: t = 0, color, dur = 0.8, ease = "sineInOut" } = opts;
    if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
    // Every character gets its own colour track the first time one is painted (objects.js paintChars).
    if (!p.o.paintChars) {
      p.o.paintChars = true;
      Array.from(p.o.text).forEach((ch, i) => ch.trim() && tl.base(p.id, `tint@${i}`, rgbOf(p.o.colors?.[i] ?? p.o.color ?? "blue")));
    }
    tl.tween(p.id, `tint@${p.n - 1}`, { start: t, dur, to: rgbOf(color), ease });
    return d;
  };
  const turned = new Map(); // book id -> how many leaves are over
  const marks = new Map(); // word id -> its vowel mark ids
  Object.assign(d, {
    /**
     * A mark on letters of a word, drawn on as a stroke that stays (clear: true wipes the word's marks): long (a bar)
     * or short (a cup) over a vowel or vowel team (chars [2] or [2, 3]); underline or bracket under a group of letters
     * and circle (a flat oval) round them (chars [1, 2, 3]: "circle the prefix").
     */
    vowel_mark(id, { at: t = 0, chars = [], mark = "long", color = "red", dur = 0.6, clear = false, sound: s = "pop" } = {}) {
      const o = obj(id);
      if (o.kind !== "letter") throw new Error(`vowel_mark: "${id}" is a ${o.kind}, not a letter word`);
      if (clear) {
        for (const m of marks.get(id) ?? []) d.hide(m, { at: t, dur: 0.3 });
        marks.set(id, []);
        return d;
      }
      const L = letterLayout(o, catalog.fontMetrics);
      const sel = chars.map((n) => L[n - 1]);
      if (!sel.length || sel.some((c) => !c)) throw new Error(`vowel_mark "${id}": chars must be character numbers 1-${L.length}`);
      const size = o.size ?? 1;
      const lo = Math.min(...sel.map((c) => c.x - c.w / 2));
      const hi = Math.max(...sel.map((c) => c.x + c.w / 2));
      const r4 = (v) => Math.round(v * 1e4) / 1e4;
      const span = hi - lo;
      const w = span * (["underline", "bracket", "circle"].includes(mark) ? 1 : 0.78);
      const h = 0.13 * size;
      const mid = (lo + hi) / 2;
      let pts;
      let y;
      let closed = false;
      if (mark === "short") pts = Array.from({ length: 9 }, (_, i) => { const u = i / 8 * 2 - 1; return [r4(u * w / 2), r4(h * u * u), 0]; });
      else if (mark === "underline") pts = [[-w / 2, 0, 0], [w / 2, 0, 0]];
      else if (mark === "bracket") pts = [[-w / 2, 0.1 * size, 0], [-w / 2, 0, 0], [w / 2, 0, 0], [w / 2, 0.1 * size, 0]];
      else if (mark === "circle") {
        // A flat oval round the letters (circle the prefix), drawn on like a pen, not a ring that hides the tile.
        const rx = w / 2 + 0.22 * size;
        const ry = 0.85 * size;
        pts = Array.from({ length: 24 }, (_, i) => { const a = Math.PI / 2 + (i / 24) * 2 * Math.PI; return [r4(rx * Math.cos(a)), r4(ry * Math.sin(a)), 0]; });
        closed = true;
      } else pts = [[-w / 2, 0, 0], [w / 2, 0, 0]];
      pts = pts.map((p) => p.map(r4));
      // Marks above: just over the lowercase letters (x-height 0.98 x size), and over an i or j above its dot (near
      // cap height, 1.41 x size). Underline and bracket: under the baseline, below descenders; circle: round the middle.
      const dotted = sel.some((c) => c.ch === "i" || c.ch === "j");
      y = mark === "underline" || mark === "bracket" ? -0.55 * size : mark === "circle" ? 0.55 * size : (dotted ? 1.66 : mark === "short" ? 1.14 : 1.2) * size;
      const mid2 = `${id}~vowel${(marks.get(id)?.length ?? 0) + 1}_${Math.round(t * 1000)}`;
      d.add({ id: mid2, kind: "stroke", points: pts, smooth: mark === "short" || mark === "circle", closed, width: (mark === "circle" ? 0.05 : 0.07) * size, color, parent: id, at: [r4(mid), r4(y), 0.05], hidden: true, internal: true });
      d.draw(mid2, { at: t, dur });
      marks.set(id, [...(marks.get(id) ?? []), mid2]);
      if (s) sound(s, t, { volume: 0.5 });
      return d;
    },
    /** Turn a book's next leaf over the spine (back: true turns the last one back). Leaves: <id>_leaf1 .. */
    turn_page(id, { at: t = 0, dur = 1.2, back = false, sound: s = "whoosh" } = {}) {
      const leaves = [];
      for (let k = 1; ; k++) {
        try { leaves.push(obj(`${id}_leaf${k}`)); } catch { break; }
      }
      if (!leaves.length) throw new Error(`turn_page: "${id}" is not a book with more than one spread`);
      const n = leaves.length;
      const done = turned.get(id) ?? 0;
      const k = back ? done : done + 1;
      if (k < 1 || k > n) throw new Error(`turn_page "${id}": no leaf to turn ${back ? "back" : "over"} (${done} of ${n} are over)`);
      const leaf = `${id}_leaf${k}`;
      const zUp = LEAF * (n - k) + LEAF; // where it lies unturned (the next leaf on top)
      const zOver = LEAF * k + LEAF; // where it lies turned (the last one turned on top)
      tl.tween(leaf, "rotation", { start: t, dur, to: back ? [0, 0, 0] : [0, -180, 0], ease: "sineInOut" });
      // Lift a little off the stack while it turns, then settle into its new place.
      tl.tween(leaf, "position", { start: t, dur: dur / 2, to: [0, 0, LEAF * (n + 1.5)], ease: "sineOut" });
      tl.tween(leaf, "position", { start: t + dur / 2, dur: dur / 2, to: [0, 0, back ? zUp : zOver], ease: "sineIn" });
      turned.set(id, back ? done - 1 : done + 1);
      if (s) sound(s, t, { volume: 0.6 });
      return d;
    },
    /**
     * Change a word or a card's text in place ("go" -> "got", a fixed word in a sentence): at the switch the old text
     * dips and the new one pops back to full size. Targets a letter word, a text_card, or a card (its <id>_text).
     * Pieces (word#c3) and emphasize marks keep following the object's first text.
     */
    retext(id, { at: t = 0, text, dur = 0.5, sound: s = "pop" } = {}) {
      let o = obj(id);
      if (o.kind === "group") {
        try { o = obj(`${id}_text`); } catch { throw new Error(`retext: "${id}" has no text`); }
        id = o.id;
      }
      if (o.kind !== "letter" && o.kind !== "text_card") throw new Error(`retext: "${id}" is a ${o.kind}, not a letter word or a text card`);
      o.texts ??= [o.text];
      if (!o.texts.includes(text)) o.texts.push(text);
      const idx = o.texts.indexOf(text);
      tl.base(id, "textIdx", 0);
      const sc = now(id, "scale", t) ?? [1, 1, 1];
      tl.tween(id, "scale", { start: t, dur: dur * 0.4, to: sc.map((v) => v * 0.55), ease: "quadIn" });
      tl.set(id, "textIdx", idx, t + dur * 0.4);
      tl.tween(id, "scale", { start: t + dur * 0.4, dur: dur * 0.6, from: sc.map((v) => v * 0.55), to: sc, ease: "backOut" });
      if (s) sound(s, t + dur * 0.4, { volume: 0.5 });
      return d;
    },
    /**
     * Split a letter word after characters `after` ([2] splits "cable" into "ca" + "ble"; [] or gap 0 joins it).
     * Each character slides right by gap × the number of splits before it, from where it is now (a join undoes a
     * split). blade: a slim gold blade drops through each new gap as it opens, then lifts away.
     */
    split(id, { at: t = 0, after = [], gap, dur = 0.6, ease = "backOut", blade = false, sound: s = "whoosh" } = {}) {
      const o = obj(id);
      if (o.kind !== "letter") throw new Error(`split: "${id}" is a ${o.kind}, not a letter word`);
      const L = letterLayout(o, catalog.fontMetrics);
      const size = o.size ?? 1;
      const g = gap ?? 0.35 * size;
      const cuts = [...new Set(after)].sort((a, b) => a - b);
      for (const c of cuts) if (!Number.isInteger(c) || c < 1 || c >= L.length) throw new Error(`split "${id}": after must be character numbers 1-${L.length - 1}`);
      for (const ch of L) {
        const k = cuts.filter((c) => ch.n > c).length;
        tl.tween(`${id}#c${ch.n}`, "position", { start: t, dur, to: [Math.round(k * g * 1e4) / 1e4, 0, 0], ease });
      }
      if (s) sound(s, t, { volume: 0.6 });
      if (blade) {
        cuts.forEach((c, j) => {
          // The gap's middle once open: between character c (moved j gaps) and c+1 (moved j+1 gaps).
          const left = L[c - 1];
          const right = L[c];
          const x = (left.x + left.w / 2 + j * g + right.x - right.w / 2 + (j + 1) * g) / 2;
          const bid = `${id}~blade${++blades}`;
          d.add({ id: bid, kind: "shape", shape: "box", color: "gold", material: "glossy", parent: id, at: [x, 1.9 * size, 0.05], scale: [0.06 * size, 0.7 * size, 0.24 * size], hidden: true, internal: true });
          tl.set(bid, "visible", true, t);
          tl.set(bid, "scale", [0.06 * size, 0.7 * size, 0.24 * size], t);
          tl.tween(bid, "position", { start: t, dur: dur * 0.6, to: [x, -0.15 * size, 0.05], ease: "quadIn" });
          tl.tween(bid, "position", { start: t + dur * 0.6 + 0.25, dur: 0.4, to: [x, 2.2 * size, 0.05], ease: "quadOut" });
          tl.set(bid, "visible", false, t + dur * 0.6 + 0.7);
          sound("pop", t + dur * 0.6, { volume: 0.5 });
        });
      }
      return d;
    },
  });
}
