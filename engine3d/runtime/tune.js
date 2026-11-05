// Tunes for sung rhymes. A `say` with `tune` ("G4 G4 G4 D4 E4 E4 D4:2") gets one melody note per syllable, each
// lasting its beats (":2" = two beats, default 1) at the line's `tempo`. By default the voice is chanted on that
// beat: each syllable of the clip is cut out, gently stretched and placed at its note's start, with a short rest
// after it (tools/lib/tts/psola.mjs chant), and a toy glockenspiel plays the note there (tools/lib/tune3d.mjs).
// `rhythm: false` keeps the voice's own timing and puts the notes on its syllables instead. With `sing` the voice
// is also moved onto the notes' pitches. Pure: Node and the page.

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Patches a tune may use (tools/lib/instruments.mjs). */
export const TUNE_PATCHES = ["glock", "bell", "music_box", "toy", "pluck_high", "flute", "glass"];
// gain 0.16: the melody sits 10-14 dB under the chanted voice (measured on br01's lines).
export const TUNE_DEFAULTS = { patch: "glock", gain: 0.16, tempo: 112 };
export const TEMPO_RANGE = [60, 180];

/**
 * Note names to MIDI numbers: "C4" is 60, "F#4" 66, "Bb3" 58; ":2" after a note makes it two beats long
 * (0.25-8, default 1). Bar lines "|" are ignored.
 * @param {string} tune
 * @returns {{ notes:number[], beats:number[], bad:string[] }}  bad: tokens that are not notes
 */
export function parseTune(tune) {
  const notes = [];
  const beats = [];
  const bad = [];
  for (const tok of String(tune ?? "").trim().split(/\s+/)) {
    if (!tok || tok === "|") continue;
    const m = /^([A-Ga-g])([#b]?)(\d)(?::(\d+(?:\.\d+)?))?$/.exec(tok);
    if (!m) {
      bad.push(tok);
      continue;
    }
    const midi = 12 * (Number(m[3]) + 1) + STEP[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    const len = m[4] != null ? Number(m[4]) : 1;
    if (midi < 36 || midi > 96 || len < 0.25 || len > 8) bad.push(tok);
    else {
      notes.push(midi);
      beats.push(len);
    }
  }
  return { notes, beats, bad };
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
