// Shaping letter-sound clips (tools/phonemes.mjs). Piper cannot say a bare stop: even "[[ p ]]" comes out as a
// burst followed by a voiced vowel ("puh"), which phonics teaching forbids. So a stop or affricate is cut where the
// voicing begins: the burst and its aspiration are noisy (many zero crossings, little energy), the vowel is voiced
// (few crossings, much energy). /h/ is too short before Piper's vowel to hear, so it is a made breath instead.
// Pure functions on mono Float32 samples.

import { mulberry32, hash32 } from "../../../engine/math.js";

/**
 * Where the vowel starts in a "consonant + vowel" clip: the first 5 ms window, after the sound has begun, that is
 * loud (over 35% of the clip's loudest window) and voiced (under 4% of samples are zero crossings at 48 kHz).
 * @returns {number} the sample index to cut at (the end of the clip when there is no clear vowel)
 */
export function voicingOnset(x, sr = 48000) {
  const win = Math.max(8, Math.round(0.005 * sr));
  const zLimit = 0.04 * (48000 / sr); // the same crossing rate in Hz at any sample rate
  const rms = [];
  const zcr = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let e = 0;
    let z = 0;
    for (let j = i; j < i + win; j++) {
      e += x[j] * x[j];
      if (j > i && (x[j] >= 0) !== (x[j - 1] >= 0)) z++;
    }
    rms.push(Math.sqrt(e / win));
    zcr.push(z / win);
  }
  const max = Math.max(...rms, 1e-9);
  const start = rms.findIndex((r) => r > max * 0.03);
  if (start < 0) return x.length;
  for (let k = start + 1; k < rms.length; k++) if (rms[k] > max * 0.35 && zcr[k] < zLimit) return k * win;
  return x.length;
}

/**
 * The consonant part of a clip: from where the sound begins to the vowel's onset, 30 ms to `max` seconds (a stop's
 * burst and aspiration are under about 0.1 s; a clip with no vowel, a long hiss, is capped there), faded out over 8 ms.
 */
export function cutAtVoicing(x, sr = 48000, max = 0.11) {
  const begin = soundStart(x, sr);
  const end = Math.min(begin + Math.round(max * sr), Math.max(begin + Math.round(0.03 * sr), voicingOnset(x, sr)));
  const y = Float32Array.from(x.subarray(begin, Math.min(x.length, end)));
  const f = Math.min(Math.round(0.008 * sr), y.length >> 1);
  for (let i = 0; i < f; i++) y[y.length - 1 - i] *= i / f;
  return y;
}

/** The first sample of the 5 ms window where the sound begins (3% of the loudest window): leading silence is dropped. */
function soundStart(x, sr) {
  const win = Math.max(8, Math.round(0.005 * sr));
  const rms = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += x[j] * x[j];
    rms.push(Math.sqrt(e / win));
  }
  const max = Math.max(...rms, 1e-9);
  const k = rms.findIndex((r) => r > max * 0.03);
  return Math.max(0, (k - 1) * win);
}

/**
 * A soft exhaled breath for /h/: band-limited noise (about 400-3,500 Hz, the "hhh" of a warm breath) that swells over
 * 40 ms, holds and fades. Deterministic: the noise comes from a hash of `name`.
 */
export function breath(dur = 0.22, sr = 48000, name = "ph_h") {
  const n = Math.round(dur * sr);
  const y = new Float32Array(n);
  const rnd = mulberry32(hash32(`breath:${name}`));
  // One-pole low-pass at ~3.5 kHz, then a one-pole high-pass at ~400 Hz.
  const lp = 1 - Math.exp((-2 * Math.PI * 3500) / sr);
  const hp = Math.exp((-2 * Math.PI * 400) / sr);
  let l = 0;
  let hPrev = 0;
  let hOut = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    l += lp * (w - l);
    hOut = hp * (hOut + l - hPrev);
    hPrev = l;
    const t = i / sr;
    const env = Math.min(1, t / 0.04) * Math.min(1, (dur - t) / 0.09);
    y[i] = hOut * env;
  }
  return y;
}
