// Word moves for phonics and syllable lessons (letter words, runtime/letter_layout.js): split a word into
// syllables or chunks (the characters after each split slide apart, with an optional blade that slices down
// through each gap), or close it up again. Pure: it only records timeline offsets on the pieces <id>#c<n>.

import { letterLayout } from "./letter_layout.js";

/**
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, sound }} k  director internals
 */
export function installLetters(d, { catalog, tl, obj, sound, now }) {
  let blades = 0;
  Object.assign(d, {
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
