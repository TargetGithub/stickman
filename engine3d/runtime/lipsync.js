// Lip-sync for 3D faces: how open a speaker's mouth is (0 shut, 1 wide) while a line plays. With TTS the
// track comes from the clip's loudness envelope (tools/lib/tts/lipsync.mjs envelope(), 100 values per second,
// measured in Node and handed to the page inside `speech`, like the clip lengths); without TTS (--speech off)
// a syllable-ish pattern is made from the text, so stills and reviews still animate. Both are smoothed so the
// mouth never flaps faster than about 12 Hz, and gated so it shuts between words. Pure: no three.js, no clocks.

export const MOUTH_HZ = 50; // track samples per second

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round = (x) => Math.round(x * 1000) / 1000;

/** Centred moving average over `w` samples (a box filter of 80 ms at 50 Hz has its first null at 12.5 Hz). */
function smooth(a, w) {
  const h = Math.floor(w / 2);
  return a.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let j = i - h; j <= i - h + w - 1; j++) if (j >= 0 && j < a.length) (s += a[j]), n++;
    return n ? s / n : 0;
  });
}

/** Resample a track of `hz` samples per second to MOUTH_HZ (averaging the windows that fall in each step). */
function resample(env, hz) {
  const n = Math.max(1, Math.ceil((env.length * MOUTH_HZ) / hz));
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * hz) / MOUTH_HZ);
    const b = Math.max(a + 1, Math.floor(((i + 1) * hz) / MOUTH_HZ));
    let s = 0;
    for (let j = a; j < b && j < env.length; j++) s += env[j];
    out.push(s / Math.max(1, Math.min(b, env.length) - a));
  }
  return out;
}

/**
 * Mouth openness from a loudness envelope. Levels are taken relative to the line's own loud parts (the 95th
 * percentile), so quiet and loud voices both open fully; anything under 15% of that counts as closed.
 * @param {number[]} env  RMS per 1/hz s
 * @returns {number[]} openness 0-1 at MOUTH_HZ
 */
export function mouthFromEnvelope(env, hz = 100) {
  if (!env?.length) return [];
  const x = smooth(smooth(resample(env, hz), 4), 3);
  // Take away part of the slow average (about a quarter second) so each syllable opens and closes, rather
  // than the mouth hanging open through a loud phrase.
  const slow = smooth(x, 13);
  const y = x.map((v, i) => Math.max(0, v - 0.4 * slow[i]));
  const sorted = [...y].sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1e-9;
  return y.map((v) => round(clamp01((v / ref - 0.15) / 0.8)));
}

/** Syllables in a word: groups of vowels (y counts), a silent final e dropped; numbers count
 * about 1.3 per figure; 0 for punctuation alone. */
export function syllableCount(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  const nums = word.replace(/[^0-9]/g, "").length; // "12" is said "twelve", "345" takes a while
  if (!w) return nums ? Math.max(1, Math.round(nums * 1.3)) : 0;
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  const silentE = /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w) && groups > 1 ? 1 : 0; // "make", not "apple"
  return Math.max(1, groups - silentE);
}

/**
 * The fallback track: one rounded open-close per syllable, short rests between words, longer ones at commas
 * and full stops, spread over the line's length. Peaks vary a little (from the syllable index) so it does not
 * look mechanical.
 * @returns {number[]} openness 0-1 at MOUTH_HZ
 */
export function mouthFromText(text, dur) {
  const units = [];
  for (const tok of String(text).split(/\s+/).filter(Boolean)) {
    const n = syllableCount(tok);
    for (let i = 0; i < n; i++) units.push({ len: 1, open: true }, ...(i < n - 1 ? [{ len: 0.15, open: false }] : []));
    units.push({ len: /[.!?]$/.test(tok) ? 1.6 : /[,;:]$/.test(tok) ? 1.1 : 0.45, open: false });
  }
  const n = Math.max(1, Math.round(dur * MOUTH_HZ));
  const out = new Array(n).fill(0);
  const total = units.reduce((a, u) => a + u.len, 0);
  if (!total) return out;
  // The voice starts a beat after the line does and ends a little early; the last rest is trimmed.
  const span = dur * 0.94;
  let x = dur * 0.03;
  let k = 0;
  for (const u of units) {
    const len = (u.len / total) * span;
    if (u.open) {
      const peak = 0.65 + 0.3 * (((k++ * 7) % 5) / 4);
      const a = Math.floor(x * MOUTH_HZ);
      const b = Math.ceil((x + len) * MOUTH_HZ);
      for (let i = Math.max(0, a); i < Math.min(n, b); i++) {
        const u01 = (i / MOUTH_HZ - x) / len;
        if (u01 >= 0 && u01 <= 1) out[i] = Math.max(out[i], round(peak * Math.sin(Math.PI * u01) ** 0.7));
      }
    }
    x += len;
  }
  return out;
}

/** Openness at `u` seconds into a track (linear between samples, 0 outside it). */
export function sampleMouth(track, u) {
  if (!track?.length || u < 0) return 0;
  const x = u * MOUTH_HZ;
  const i = Math.floor(x);
  if (i >= track.length - 1) return i === track.length - 1 ? track[i] * (1 - (x - i)) : 0;
  return track[i] + (track[i + 1] - track[i]) * (x - i);
}

/**
 * Record a spoken line's mouth on the timeline: prop "talk" of the speaker, a curve segment over the line
 * (it reads 0 before the line and again once it ends; a newer line takes over from its start), and prop
 * "speaking" (1 for the whole line, pauses between words included; 0 otherwise), so a face that rests on an
 * open grin can tell a pause in a line from not talking at all.
 * @param {object} tl  the timeline
 * @param {{ env?: number[], hz?: number }} [clip]  the measured clip (speech[lineId]); else the text fallback
 */
export function addTalk(tl, who, { t, dur, text, clip, bases }) {
  const track = clip?.env?.length ? mouthFromEnvelope(clip.env, clip.hz ?? 100) : mouthFromText(text, dur);
  if (!bases.has(who)) {
    bases.add(who);
    tl.base(who, "talk", 0);
    tl.base(who, "speaking", 0);
  }
  tl.tween(who, "speaking", { start: t, dur, from: 0, to: 0, ease: "linear", curve: (_, k) => (k >= 1 ? 0 : 1) });
  tl.tween(who, "talk", { start: t, dur, from: 0, to: 0, ease: "linear", curve: (_, k) => (k >= 1 ? 0 : sampleMouth(track, k * dur)) });
  return track;
}
