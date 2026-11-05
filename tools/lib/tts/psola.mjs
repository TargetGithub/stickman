// Pitch tools for speech clips (Node only, pure functions of the samples: the same clip always gives the same
// result). trackPitch finds the voice's pitch (a YIN-style tracker); psola moves the pitch with TD-PSOLA, which
// keeps the clip's length AND its formants (the mouth shape of each vowel), so a lifted voice sounds younger
// instead of sped up. Used by the toddler timbre (voice.lift, tts_voices.json) and by sung lines (`tune`,
// voice pitch following a melody: singContour).

const HOP = 0.005; // s between pitch frames

/**
 * The pitch of a mono clip every HOP seconds (0 = unvoiced: silence, breath, s and f sounds).
 * @param {Float32Array} x  mono samples
 * @param {number} sr  sample rate
 * @returns {{ hop:number, f0:Float32Array }}
 */
export function trackPitch(x, sr, { fmin = 90, fmax = 800, threshold = 0.2 } = {}) {
  // Track on a 16 kHz copy (box-filtered), which is plenty for a voice's pitch and ~9x cheaper.
  const k = Math.max(1, Math.round(sr / 16000));
  const rate = sr / k;
  const y = new Float32Array(Math.floor(x.length / k));
  for (let i = 0; i < y.length; i++) {
    let s = 0;
    for (let j = 0; j < k; j++) s += x[i * k + j];
    y[i] = s / k;
  }
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const W = Math.round(0.025 * rate);
  const tmin = Math.floor(rate / fmax);
  const tmax = Math.ceil(rate / fmin);
  const frames = Math.max(0, Math.floor(x.length / sr / HOP));
  const f0 = new Float32Array(frames);
  const d = new Float32Array(tmax + 2);
  for (let f = 0; f < frames; f++) {
    const c = Math.round(f * HOP * rate);
    const a = c - (W >> 1);
    if (a < 0 || a + W + tmax >= y.length) continue;
    let e = 0;
    for (let i = 0; i < W; i++) e += y[a + i] * y[a + i];
    if (Math.sqrt(e / W) < peak * 0.03) continue; // quiet: no pitch
    // Cumulative-mean-normalised difference (YIN); the first dip under the threshold is the period.
    let run = 0;
    d[0] = 1;
    let best = -1;
    for (let tau = 1; tau <= tmax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const q = y[a + i] - y[a + i + tau];
        s += q * q;
      }
      run += s;
      d[tau] = run > 0 ? (s * tau) / run : 1;
      if (tau > tmin && d[tau - 1] < threshold && d[tau - 1] <= d[tau] && d[tau - 1] <= d[tau - 2]) {
        best = tau - 1;
        break;
      }
    }
    if (best < 0) continue;
    // Parabolic interpolation round the dip for a sub-sample period.
    const l = d[best - 1];
    const m = d[best];
    const r = d[best + 1];
    const den = l - 2 * m + r;
    const tau = best + (den !== 0 ? (0.5 * (l - r)) / den : 0);
    f0[f] = rate / tau;
  }
  // Fill single-frame gaps and drop single-frame blips, so marks do not jump about.
  for (let f = 1; f + 1 < frames; f++) {
    if (!f0[f] && f0[f - 1] && f0[f + 1]) f0[f] = (f0[f - 1] + f0[f + 1]) / 2;
    else if (f0[f] && !f0[f - 1] && !f0[f + 1]) f0[f] = 0;
  }
  // Octave slips (a frame tracked at half or double the pitch around it) are folded back.
  const fixed = Float32Array.from(f0);
  for (let f = 0; f < frames; f++) {
    if (!f0[f]) continue;
    const near = [];
    for (let j = -12; j <= 12; j++) if (j && f0[f + j]) near.push(f0[f + j]);
    if (near.length < 4) continue;
    near.sort((a, b) => a - b);
    const med = near[near.length >> 1];
    const r = f0[f] / med;
    if (r > 0.4 && r < 0.62) fixed[f] = f0[f] * 2;
    else if (r > 1.6 && r < 2.5) fixed[f] = f0[f] / 2;
  }
  return { hop: HOP, f0: fixed };
}

const f0At = (track, t) => {
  const i = Math.round(t / track.hop);
  return track.f0[Math.max(0, Math.min(track.f0.length - 1, i))] || 0;
};

/**
 * Analysis marks: one per pitch period in voiced parts (each on the strongest peak near where the period says
 * it should be), every 5 ms elsewhere.
 * @returns {Float64Array}  sample positions
 */
export function pitchMarks(x, sr, track) {
  const marks = [];
  let p = 0;
  while (p < x.length) {
    marks.push(p);
    const f = f0At(track, p / sr);
    if (!f) {
      p += Math.round(sr * 0.005);
      continue;
    }
    const P = sr / f;
    const lo = Math.round(p + 0.8 * P);
    const hi = Math.min(x.length - 1, Math.round(p + 1.2 * P));
    let best = Math.round(p + P);
    let bv = -Infinity;
    for (let i = lo; i <= hi; i++) {
      if (x[i] > bv) {
        bv = x[i];
        best = i;
      }
    }
    p = Math.max(p + 1, best);
  }
  return Float64Array.from(marks);
}

/**
 * Move the pitch of a clip, keeping its length and formants (TD-PSOLA).
 * @param {Float32Array} x  mono samples
 * @param {number} sr
 * @param {number | ((t:number, f0:number) => number)} ratio  pitch factor (2 ** (semitones / 12)), or a function
 *   of the time and the voice's own pitch there (a melody: singContour)
 * @returns {Float32Array}  same length as x
 */
export function psola(x, sr, ratio, { track = trackPitch(x, sr) } = {}) {
  const rf = typeof ratio === "function" ? ratio : () => ratio;
  const marks = pitchMarks(x, sr, track);
  const out = new Float32Array(x.length);
  const wsum = new Float32Array(x.length);
  const n = marks.length;
  if (n < 2) return Float32Array.from(x);
  let ts = marks[0];
  let k = 0;
  while (ts < x.length) {
    // The analysis mark nearest the output time (the clip's timing is kept: in time = out time).
    while (k + 1 < n && Math.abs(marks[k + 1] - ts) <= Math.abs(marks[k] - ts)) k++;
    const m = marks[k];
    const P = Math.max(16, k + 1 < n ? marks[k + 1] - m : m - marks[k - 1]);
    const f = f0At(track, m / sr);
    const r = f ? Math.max(0.5, Math.min(2.2, rf(ts / sr, f))) : 1;
    // A Hann window two periods wide round the mark, added in at the output time.
    const L = Math.round(P);
    const c = Math.round(ts);
    for (let j = -L; j <= L; j++) {
      const si = Math.round(m) + j;
      const oi = c + j;
      if (si < 0 || si >= x.length || oi < 0 || oi >= out.length) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / (L + 1));
      out[oi] += w * x[si];
      wsum[oi] += w;
    }
    ts += f ? P / r : P;
  }
  // Even out the window overlap (more grains overlap when the pitch goes up).
  for (let i = 0; i < out.length; i++) out[i] = wsum[i] > 0.15 ? out[i] / Math.max(1, wsum[i]) : out[i];
  return out;
}

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/**
 * Syllable segments of a clip, in time order. With `count` (the number of sung notes, which the text's syllables
 * should match), the voice is cut into exactly that many pieces at its deepest loudness dips (silent gaps first);
 * without it, at every clear dip.
 * @returns {Array<{ start:number, end:number }>}  seconds
 */
export function syllables(x, sr, track = trackPitch(x, sr), count = 0) {
  const hop = track.hop;
  const H = Math.round(hop * sr);
  const n = track.f0.length;
  const env = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let i = f * H; i < Math.min(x.length, f * H + 2 * H); i++) s += x[i] * x[i];
    env[f] = Math.sqrt(s / (2 * H));
  }
  // Smoothed over ~35 ms.
  const sm = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    let c = 0;
    for (let j = -3; j <= 3; j++) if (f + j >= 0 && f + j < n) { s += env[f + j]; c++; }
    sm[f] = s / c;
  }
  let top = 0;
  for (const v of sm) top = Math.max(top, v);
  const loud = (f) => sm[f] >= top * 0.06;
  let first = 0;
  while (first < n && !loud(first)) first++;
  let last = n - 1;
  while (last > first && !loud(last)) last--;
  if (first >= last) return [];
  // Candidate cuts: one in the middle of every silent gap (scored highest, longer gaps first), then every local dip
  // in the voice, scored by how far below its neighbouring peaks it is (unvoiced dips, at s, f, t, score a bit more).
  const cands = [];
  for (let f = first + 6; f < last - 6; f++) {
    if (!loud(f)) {
      let g = f;
      while (g < last && !loud(g)) g++;
      cands.push({ f: Math.round((f + g) / 2), score: 1000 + (g - f) });
      f = g;
      continue;
    }
    if (!(sm[f] <= sm[f - 1] && sm[f] < sm[f + 1])) continue;
    // Only the nearest peaks count: walk out to the next rise on each side.
    let l = f;
    while (l > first && sm[l - 1] >= sm[l]) l--;
    let r = f;
    while (r < last && sm[r + 1] >= sm[r]) r++;
    const depth = Math.min(sm[l], sm[r]) / Math.max(1e-6, sm[f]);
    cands.push({ f, score: track.f0[f] ? depth : depth * 1.5 });
  }
  let cuts;
  if (count > 0) cuts = cands.sort((a, b) => b.score - a.score).slice(0, count - 1);
  else cuts = cands.filter((c) => c.score > 1.8);
  // Keep pieces at least 50 ms long.
  const sorted = cuts.map((c) => c.f).sort((a, b) => a - b).filter((f, i, all) => i === 0 || f - all[i - 1] >= 10);
  const edges = [first, ...sorted, last];
  const out = [];
  for (let i = 0; i + 1 < edges.length; i++) out.push({ start: edges[i] * hop, end: edges[i + 1] * hop });
  // Asked for more pieces than the voice has clear dips: halve the longest piece until there are enough
  // (a long vowel sung over two notes).
  while (count > 0 && out.length < count && out.length) {
    let k = 0;
    for (let i = 1; i < out.length; i++) if (out[i].end - out[i].start > out[k].end - out[k].start) k = i;
    const { start, end } = out[k];
    const mid = (start + end) / 2;
    out.splice(k, 1, { start, end: mid }, { start: mid, end });
  }
  return out;
}

/**
 * The pitch ratio function for psola that makes a spoken clip sing a melody: note i is held over syllable i
 * (from its start to the next one's), gliding 40 ms into each note. With fewer syllables than notes the extra
 * notes are dropped; with more, the last note holds.
 * @param {Array<{ start:number }>} syl  syllables(...)
 * @param {number[]} midi  the notes, one per syllable
 * @param {{ shift?: number, amount?: number }} o  shift: semitones added to every note (to sit the tune near the
 *   voice); amount 0-1: how far the voice moves to the note (1 = fully sung, 0.6 = sing-song)
 */
export function singContour(syl, midi, { shift = 0, amount = 1 } = {}) {
  const starts = syl.map((s) => s.start);
  return (t, f0) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= t) i++;
    const note = midi[Math.min(i, midi.length - 1)];
    if (note == null) return 1;
    const prev = midi[Math.min(Math.max(0, i - 1), midi.length - 1)];
    const g = Math.min(1, Math.max(0, (t - starts[i]) / 0.04));
    const target = midiHz((i > 0 ? prev + (note - prev) * g : note) + shift);
    return (target / f0) ** amount;
  };
}

/** The median pitch of the voiced frames (Hz), 0 if none. */
export function medianPitch(track) {
  const v = [...track.f0].filter((f) => f > 0).sort((a, b) => a - b);
  return v.length ? v[v.length >> 1] : 0;
}

/**
 * Change a clip's length by `factor` keeping its pitch and formants (TD-PSOLA: grains one pitch period apart are
 * repeated or skipped). Unvoiced stretches use 5 ms grains.
 * @returns {Float32Array}  round(x.length × factor) samples
 */
export function stretch(x, sr, factor, track = trackPitch(x, sr)) {
  const N = Math.max(1, Math.round(x.length * factor));
  const marks = pitchMarks(x, sr, track);
  const out = new Float32Array(N);
  const wsum = new Float32Array(N);
  if (marks.length < 2) {
    for (let i = 0; i < N; i++) out[i] = x[Math.min(x.length - 1, Math.floor(i / factor))];
    return out;
  }
  let to = 0;
  let k = 0;
  while (to < N) {
    const ti = to / factor;
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ti) <= Math.abs(marks[k] - ti)) k++;
    const m = marks[k];
    const P = Math.max(16, k + 1 < marks.length ? marks[k + 1] - m : m - marks[k - 1]);
    const L = Math.round(P);
    const c = Math.round(to);
    for (let j = -L; j <= L; j++) {
      const si = Math.round(m) + j;
      const oi = c + j;
      if (si < 0 || si >= x.length || oi < 0 || oi >= N) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / (L + 1));
      out[oi] += w * x[si];
      wsum[oi] += w;
    }
    to += P;
  }
  for (let i = 0; i < N; i++) out[i] = wsum[i] > 0.15 ? out[i] / Math.max(1, wsum[i]) : out[i];
  return out;
}

/** Bump when chant or syllables change how a chanted clip sounds: it is part of the speech cache key. */
export const CHANT_VERSION = 2;

/**
 * Chant a spoken clip on a beat: the clip is cut into one syllable per slot (syllables(..., count)), each syllable
 * is stretched toward `fill` of its slot (between `minStretch` and `maxStretch`, so words stay natural) and placed
 * at its slot's start, with a short fade at both ends; the rest of the slot is a rest. The last syllable keeps its
 * stretched length even past its slot.
 * @param {number[]} slots  seconds per syllable (beats × 60 / tempo)
 * @returns {Float32Array}
 */
export function chant(x, sr, slots, { fill = 0.8, minStretch = 0.75, maxStretch = 1.6, track = trackPitch(x, sr) } = {}) {
  const segs = syllables(x, sr, track, slots.length);
  if (segs.length !== slots.length) return Float32Array.from(x);
  const pieces = segs.map((s, i) => {
    const a = Math.max(0, Math.round(s.start * sr));
    const b = Math.min(x.length, Math.round((i + 1 < segs.length ? segs[i + 1].start : s.end + 0.04) * sr));
    const piece = trimQuiet(x.slice(a, b), sr);
    const len = piece.length / sr || 1e-3;
    const f = Math.max(minStretch, Math.min(maxStretch, (slots[i] * fill) / len));
    return stretch(piece, sr, f);
  });
  const starts = [];
  let t = 0;
  for (const s of slots) {
    starts.push(Math.round(t * sr));
    t += s;
  }
  const total = Math.max(Math.round(t * sr), starts[starts.length - 1] + pieces[pieces.length - 1].length);
  const out = new Float32Array(total);
  const fade = Math.round(0.008 * sr);
  pieces.forEach((p, i) => {
    // Keep each syllable inside its slot (plus 40 ms), except the last.
    const room = i + 1 < pieces.length ? Math.round((slots[i] + 0.04) * sr) : p.length;
    const n = Math.min(p.length, room);
    for (let j = 0; j < n; j++) {
      const g = Math.min(1, j / fade, (n - 1 - j) / fade);
      out[starts[i] + j] += p[j] * g;
    }
  });
  return out;
}

/** A syllable without the pause before or after it (10 ms windows under 10% of its loudest, 10 ms kept). */
function trimQuiet(p, sr) {
  const W = Math.round(0.01 * sr);
  const n = Math.floor(p.length / W);
  if (n < 3) return p;
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
  return p.slice(Math.max(0, (a - 1) * W), Math.min(p.length, (b + 2) * W));
}
