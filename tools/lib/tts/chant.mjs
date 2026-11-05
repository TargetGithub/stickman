// Chanting a spoken clip on a beat (sung lines, `say.tune`): the clip is cut into syllables, each syllable is held
// to fill its note (the vowel is stretched with psola, or with wsola when it has no clear pitch) and laid at the
// note's start, crossfading into the next. Node only, pure functions of the samples.
import { stretch, syllables, trackPitch } from "./psola.mjs";

/** Bump when chant or syllables change how a chanted clip sounds: it is part of the speech cache key. */
export const CHANT_VERSION = 6;

/**
 * Chant a spoken clip on a beat, legato: the clip is cut into one syllable per slot (syllables(..., count)), and
 * each syllable is made `fill` of its slot long by holding its vowel (only the voiced middle is stretched, from
 * `minStretch` to `maxStretch` times, so consonants keep their natural length), the way a singer holds a note.
 * Each syllable starts at its slot's start and crossfades into the next one, so the line flows without breaks.
 * @param {number[]} slots  seconds per syllable (beats × 60 / tempo)
 * @returns {Float32Array}
 */
export function chant(x, sr, slots, { fill = 0.97, minStretch = 0.6, maxStretch = 20, track = trackPitch(x, sr) } = {}) {
  const segs = syllables(x, sr, track, slots.length);
  if (segs.length !== slots.length) return Float32Array.from(x);
  const pieces = segs.map((s, i) => {
    const a = Math.max(0, Math.round(s.start * sr));
    const b = Math.min(x.length, Math.round((i + 1 < segs.length ? segs[i + 1].start : s.end + 0.04) * sr));
    const [ta, tb] = trimQuiet(x.subarray(a, b), sr);
    return holdVowel(x, sr, a + ta, a + tb, track, slots[i] * fill, minStretch, maxStretch);
  });
  const starts = [];
  let t = 0;
  for (const s of slots) {
    starts.push(Math.round(t * sr));
    t += s;
  }
  const total = Math.max(Math.round(t * sr), starts[starts.length - 1] + pieces[pieces.length - 1].length);
  const out = new Float32Array(total);
  const fadeIn = Math.round(0.012 * sr);
  const fadeOut = Math.round(0.03 * sr);
  pieces.forEach((p, i) => {
    // Each syllable runs into the next slot by up to 30 ms (the crossfade), except the last, which keeps its tail.
    const room = i + 1 < pieces.length ? Math.round((slots[i] + 0.03) * sr) : p.length;
    const n = Math.min(p.length, room);
    for (let j = 0; j < n; j++) {
      const g = Math.min(1, j / fadeIn, (n - 1 - j) / fadeOut);
      out[starts[i] + j] += p[j] * g;
    }
  });
  return out;
}

/**
 * Samples s..e of x made `target` seconds long: the voiced part (the vowel, from the whole clip's pitch track, so
 * short syllables are found too) is PSOLA-stretched, the consonants before and after it keep their length. A
 * syllable with no voiced part is stretched whole (within 0.75-1.6).
 */
function holdVowel(x, sr, s, e, track, target, minStretch, maxStretch) {
  const p = x.slice(s, e);
  const H = track.hop * sr;
  let a = Math.ceil(s / H);
  const last = Math.min(track.f0.length - 1, Math.floor((e - 1) / H));
  while (a <= last && !track.f0[a]) a++;
  let b = last;
  while (b > a && !track.f0[b]) b--;
  const len = p.length / sr || 1e-3;
  // No pitch found (a short or breathy syllable): hold its middle half instead, with wsola.
  const voiced = !(a >= b || (b - a) * track.hop < 0.02);
  const va = voiced ? Math.max(0, Math.round(a * H) - s) : Math.round(p.length * 0.25);
  const vb = voiced ? Math.min(p.length, Math.round((b + 1) * H) - s) : Math.round(p.length * 0.75);
  const head = p.slice(0, va);
  const vowel = p.slice(va, vb);
  const tail = p.slice(vb);
  const want = target - (head.length + tail.length) / sr;
  const f = Math.max(minStretch, Math.min(maxStretch, want / (vowel.length / sr)));
  const held = voiced ? stretch(vowel, sr, f) : wsola(vowel, sr, f);
  const out = new Float32Array(head.length + held.length + tail.length);
  out.set(head, 0);
  out.set(held, head.length);
  out.set(tail, head.length + held.length);
  return out;
}

/**
 * Time-stretch by overlap-add of 30 ms Hann grains, each grain taken where it best continues the last one
 * (WSOLA, a ±6 ms search). For sounds without a clear pitch, where psola has no marks to work from.
 */
export function wsola(x, sr, factor) {
  const N = Math.max(1, Math.round(x.length * factor));
  const L = Math.round(0.03 * sr);
  const hop = L >> 1;
  const D = Math.round(0.006 * sr);
  const out = new Float32Array(N + L);
  const wsum = new Float32Array(N + L);
  const win = Float32Array.from({ length: L }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / L));
  if (x.length < L + 2 * D) {
    for (let i = 0; i < N; i++) out[i] = x[Math.min(x.length - 1, Math.floor(i / factor))];
    return out.subarray(0, N);
  }
  let prev = 0; // where the last grain was taken from
  for (let o = 0; o < N; o += hop) {
    const want = Math.min(x.length - L - D, Math.max(D, Math.round(o / factor)));
    let best = want;
    if (o > 0) {
      // The grain that best matches what naturally followed the previous grain.
      const nat = Math.min(x.length - L, prev + hop);
      let top = -Infinity;
      for (let d = -D; d <= D; d += 2) {
        const c = want + d;
        let q = 0;
        for (let i = 0; i < hop; i += 2) q += x[c + i] * x[nat + i];
        if (q > top) { top = q; best = c; }
      }
    }
    for (let i = 0; i < L && o + i < out.length; i++) {
      out[o + i] += win[i] * x[best + i];
      wsum[o + i] += win[i];
    }
    prev = best;
  }
  for (let i = 0; i < N; i++) out[i] = wsum[i] > 0.1 ? out[i] / wsum[i] : out[i];
  return out.slice(0, N);
}

/** Where a syllable is, without the pause before or after it (sample range) (10 ms windows under 10% of its loudest, 10 ms kept). */
function trimQuiet(p, sr) {
  const W = Math.round(0.01 * sr);
  const n = Math.floor(p.length / W);
  if (n < 3) return [0, p.length];
  const e = Array.from({ length: n }, (_, k) => {
    let q = 0;
    for (let i = k * W; i < (k + 1) * W; i++) q += p[i] * p[i];
    return Math.sqrt(q / W);
  });
  const top = Math.max(...e);
  let a = 0;
  while (a < n - 1 && e[a] < top * 0.1) a++;
  let b = n - 1;
  while (b > a && e[b] < top * 0.1) b--;
  return [Math.max(0, (a - 1) * W), Math.min(p.length, (b + 2) * W)];
}
