// Loudness (EBU R128 / ITU-R BS.1770, S7.6) for interleaved stereo Float32 at 48 kHz.
// K-weighting (a high shelf and a high-pass), 400 ms blocks with 75% overlap, an absolute gate at
// -70 LUFS and a relative gate 10 LU below: integrated loudness. Short-term is the 3 s window.

const SR = 48000;
// BS.1770 K-weighting biquads at 48 kHz.
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
const HIGHPASS = { b: [1.0, -2.0, 1.0], a: [-1.99004745483398, 0.99007225036621] };

function biquad(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

/** Running sum (index i = samples before i) of the K-weighted power summed over both channels. */
function weightedPower(stereo) {
  const frames = stereo.length / 2;
  const power = new Float64Array(frames);
  for (let ch = 0; ch < 2; ch++) {
    const x = new Float64Array(frames);
    for (let i = 0; i < frames; i++) x[i] = stereo[i * 2 + ch];
    const y = biquad(biquad(x, SHELF), HIGHPASS);
    for (let i = 0; i < frames; i++) power[i] += y[i] * y[i];
  }
  const cum = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) cum[i + 1] = cum[i] + power[i];
  return cum;
}

const lufs = (power) => -0.691 + 10 * Math.log10(power);

/**
 * @param {Float32Array} stereo  interleaved stereo at 48 kHz
 * @returns {{ integrated:number, shortTermMax:number, peak:number }} LUFS (−Infinity for silence), sample peak (dBFS)
 */
export function measureLoudness(stereo) {
  const cum = weightedPower(stereo);
  const frames = stereo.length / 2;
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const powers = [];
  for (let s = 0; s + block <= frames; s += hop) powers.push((cum[s + block] - cum[s]) / block);
  const gated = powers.filter((p) => lufs(p) > -70);
  let integrated = -Infinity;
  if (gated.length) {
    const rel = lufs(gated.reduce((n, p) => n + p, 0) / gated.length) - 10;
    const kept = gated.filter((p) => lufs(p) > rel);
    if (kept.length) integrated = lufs(kept.reduce((n, p) => n + p, 0) / kept.length);
  }
  const st = Math.round(3 * SR);
  let shortTermMax = -Infinity;
  for (let s = 0; s + st <= frames; s += hop) shortTermMax = Math.max(shortTermMax, lufs((cum[s + st] - cum[s]) / st));
  if (frames < st && frames > 0) shortTermMax = lufs(cum[frames] / frames);
  let peak = 0;
  for (const v of stereo) peak = Math.max(peak, Math.abs(v));
  return { integrated, shortTermMax, peak: 20 * Math.log10(peak || 1e-12) };
}

/** Scale a buffer in place so its integrated loudness is `target` LUFS (gain capped at maxGainDb). Returns the gain in dB. */
export function normalizeLoudness(stereo, target, { maxGainDb = 18 } = {}) {
  const { integrated } = measureLoudness(stereo);
  if (!Number.isFinite(integrated)) return 0;
  const db = Math.min(maxGainDb, target - integrated);
  const g = 10 ** (db / 20);
  for (let i = 0; i < stereo.length; i++) stereo[i] *= g;
  return db;
}
