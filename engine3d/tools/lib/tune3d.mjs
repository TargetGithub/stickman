// Melodies for sung lines (runtime/tune.js): each tuned line's notes are placed on the syllables of its measured
// speech clip (tools/lib/tts/psola.mjs syllables, cut into exactly as many pieces as there are notes) and
// rendered with the shared instruments, so the glockenspiel plays each note as its syllable starts.

import { readWav } from "../../../tools/lib/wav.mjs";
import { renderNote, SR } from "../../../tools/lib/instruments.mjs";
import { syllables, trackPitch } from "../../../tools/lib/tts/psola.mjs";

const MIN_GAP = 0.13; // s between two melody notes

/**
 * Note times for a tuned line: [{ t, dur, midi }] in seconds from the line's start.
 * @param {Float32Array} clip  the line's mono speech samples
 * @param {number[]} notes  MIDI notes
 */
export function placeNotes(clip, sr, notes) {
  const syl = syllables(clip, sr, trackPitch(clip, sr), notes.length);
  const len = clip.length / sr;
  const n = notes.length;
  // A steady beat over the voiced span, pulled halfway toward the detected syllable starts: the tune keeps an even
  // rhythm (speech syllables are uneven) yet follows the words. Notes stay at least MIN_GAP apart.
  const a = syl[0]?.start ?? 0;
  const b = syl.length ? syl[syl.length - 1].start + Math.min(0.3, (syl[syl.length - 1].end - syl[syl.length - 1].start) / 2) : len;
  const grid = (i) => (n > 1 ? a + ((b - a) * i) / (n - 1) : a);
  const starts = notes.map((_, i) => (syl.length === n ? 0.5 * grid(i) + 0.5 * syl[i].start : grid(i)));
  for (let i = 1; i < n; i++) starts[i] = Math.max(starts[i], starts[i - 1] + MIN_GAP);
  return notes.map((midi, i) => ({ t: starts[i], dur: Math.max(0.12, Math.min(0.9, (starts[i + 1] ?? len) - starts[i])), midi }));
}

/** Seconds per note of a tune: its beats at its tempo. */
export function tuneSlots(tune) {
  return (tune.beats ?? tune.notes.map(() => 1)).map((b) => (b * 60) / (tune.tempo ?? 112));
}

/**
 * A mono buffer per tuned line (key `tune:<line id>`), to be mixed in like a sound effect at the line's start.
 * @param {Array<{ id, tune? }>} lines  plan.lines
 * @param {Record<string, { file:string }>} speech  speakPlan output
 * @returns {Map<string, Float32Array>}
 */
export function renderTunes(lines, speech) {
  const out = new Map();
  for (const l of lines) {
    if (!l.tune?.notes?.length || !speech[l.id]) continue;
    const w = readWav(speech[l.id].file);
    // A chanted line's syllables sit on the beat, so its notes do too; otherwise they follow the syllables.
    let t = 0;
    const placed = l.tune.rhythm
      ? tuneSlots(l.tune).map((d, i) => { const n = { t, dur: Math.min(0.9, d), midi: l.tune.notes[i] }; t += d; return n; })
      : placeNotes(w.samples, w.sampleRate, l.tune.notes);
    const end = placed.reduce((m, n) => Math.max(m, n.t + n.dur), 0) + 1.5;
    const st = new Float32Array(Math.ceil(end * SR) * 2);
    for (const n of placed) renderNote(st, { inst: l.tune.patch, t: n.t, dur: n.dur, midi: n.midi, vel: 0.8, pan: 0 });
    const mono = new Float32Array(st.length / 2);
    for (let i = 0; i < mono.length; i++) mono[i] = 0.5 * (st[i * 2] + st[i * 2 + 1]) * l.tune.gain;
    out.set(`tune:${l.id}`, mono);
  }
  return out;
}
