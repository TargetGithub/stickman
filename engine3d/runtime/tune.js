// Tunes for sung rhymes. A `say` with `tune` ("G4 G4 G4 D4 E4 E4 D4") gets one melody note per syllable: the
// audio mix (tools/lib/tune3d.mjs) plays each note on a toy glockenspiel as its syllable starts in the measured
// clip, so the melody and the words land together whatever speed the voice takes. With `sing` the voice itself
// is moved onto the notes as well (tools/lib/tts/psola.mjs). Pure: Node and the page.

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Patches a tune may use (tools/lib/instruments.mjs). */
export const TUNE_PATCHES = ["glock", "bell", "music_box", "toy", "pluck_high", "flute", "glass"];
export const TUNE_DEFAULTS = { patch: "glock", gain: 0.5 };

/**
 * Note names to MIDI numbers: "C4" is 60, "F#4" 66, "Bb3" 58. Bar lines "|" are ignored.
 * @param {string} tune
 * @returns {{ notes:number[], bad:string[] }}  bad: tokens that are not notes
 */
export function parseTune(tune) {
  const notes = [];
  const bad = [];
  for (const tok of String(tune ?? "").trim().split(/\s+/)) {
    if (!tok || tok === "|") continue;
    const m = /^([A-Ga-g])([#b]?)(\d)$/.exec(tok);
    if (!m) {
      bad.push(tok);
      continue;
    }
    const midi = 12 * (Number(m[3]) + 1) + STEP[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    if (midi < 36 || midi > 96) bad.push(tok);
    else notes.push(midi);
  }
  return { notes, bad };
}

/**
 * About how many syllables a line has (vowel groups per word, a silent final e dropped, "-le" kept). Used to
 * warn when a tune has a different number of notes; the mix itself cuts the clip into as many pieces as notes.
 */
export function countSyllables(text) {
  let n = 0;
  for (const raw of String(text).toLowerCase().split(/[^a-z']+/)) {
    const w = raw.replace(/'/g, "");
    if (!w) continue;
    if (/^[^aeiouy]+$/.test(w)) { n += 1; continue; } // "hmm", "shh"
    let groups = (w.match(/[aeiouy]+/g) ?? []).length;
    if (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w) && groups > 1) groups--;
    n += Math.max(1, groups);
  }
  return n;
}
