// Stress on one word of a spoken line (#104): Piper reads the whole line in one go (no choppy split lines), then
// the stretch of the clip where the word falls is lifted a little in pitch (PSOLA, keeping the timing) and in
// loudness, easing in and out so there is no seam. Where the word falls comes from runtime/voice_style.js
// stressSpan: its place among the line's characters, spread over the clip's voiced part. Node only.

import { existsSync } from "node:fs";
import { readWav, writeWav } from "../../../tools/lib/wav.mjs";
import { psola } from "../../../tools/lib/tts/psola.mjs";
import { stressSpan } from "../../runtime/voice_style.js";

export const STRESS_SEMITONES = 2;
export const STRESS_DB = 4;
const RAMP = 0.05; // s to ease the lift in and out

/** Start and end samples of the clip's voiced part (above 3% of its loudest 10 ms). */
export function voicedRange(x, sr) {
  const win = Math.round(0.01 * sr);
  const rms = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += x[j] * x[j];
    rms.push(Math.sqrt(e / win));
  }
  const max = Math.max(...rms, 1e-9);
  const a = rms.findIndex((r) => r > max * 0.03);
  const b = rms.length - 1 - [...rms].reverse().findIndex((r) => r > max * 0.03);
  return a < 0 ? [0, x.length] : [a * win, Math.min(x.length, (b + 1) * win)];
}

/**
 * How much of the lift applies at each sample: 0 outside the word, 1 inside, eased at its edges.
 * @returns {(i:number) => number}
 */
export function liftCurve(x, sr, text, word) {
  const span = stressSpan(text, word);
  if (!span) return () => 0;
  const [v0, v1] = voicedRange(x, sr);
  const a = v0 + span[0] * (v1 - v0);
  const b = v0 + span[1] * (v1 - v0);
  const r = RAMP * sr;
  return (i) => (i < a - r || i > b + r ? 0 : i < a ? 1 - (a - i) / r : i > b ? 1 - (i - b) / r : 1);
}

/** Write the stressed copy of a clip to out (once: kept beside the cached clip). */
export function stressClip(file, out, text, word) {
  if (existsSync(out)) return out;
  const w = readWav(file);
  const x = w.samples;
  const k = liftCurve(x, w.sampleRate, text, word);
  const up = 2 ** (STRESS_SEMITONES / 12);
  const y = psola(x, w.sampleRate, (t) => 1 + (up - 1) * k(Math.round(t * w.sampleRate)));
  const g = 10 ** (STRESS_DB / 20);
  let peak = 0;
  for (let i = 0; i < y.length; i++) {
    y[i] *= 1 + (g - 1) * k(i);
    peak = Math.max(peak, Math.abs(y[i]));
  }
  if (peak > 0.98) for (let i = 0; i < y.length; i++) y[i] *= 0.98 / peak;
  writeWav(out, y, w.sampleRate, 1);
  return out;
}
