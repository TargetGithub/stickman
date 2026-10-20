// Lip-sync tracks for spoken lines (STORY_SPEC 7.1a, ADR-024): each clip's loudness envelope plus the text it
// speaks, keyed by say beat id, for engine.load(script, { lipSync }). The engine turns them into mouth shapes.

import { readWav } from "../wav.mjs";
import { SR } from "../mixer.mjs";

export const LIP_HZ = 100; // envelope samples per second (10 ms windows)

/** RMS loudness per 1/hz s of a mono clip, rounded so the track is the same on every machine. */
export function envelope(samples, sr = SR, hz = LIP_HZ) {
  const win = Math.round(sr / hz);
  const out = [];
  for (let a = 0; a < samples.length; a += win) {
    let s = 0;
    const b = Math.min(samples.length, a + win);
    for (let i = a; i < b; i++) s += samples[i] * samples[i];
    out.push(Math.round(Math.sqrt(s / (b - a)) * 1e4) / 1e4);
  }
  return out;
}

/**
 * @param {Array<object>} lines  synthesizeLines(...) (kind, id, spoken, file, parts)
 * @param {(file:string) => Float32Array} read  mono samples of a clip (the cache's WAV by default)
 * @returns {Record<string, { text:string, env:number[], hz:number, head?:string }>}
 *   the later bubbles of a line spoken as one clip point at the first (head) and share its track
 */
export function lipTracks(lines, read = (f) => readWav(f).samples) {
  const out = {};
  for (const l of lines) {
    if (l.kind !== "say") continue;
    const track = { text: l.spoken, env: envelope(read(l.file)), hz: LIP_HZ };
    out[l.id] = track;
    for (const p of (l.parts ?? []).slice(1)) out[p.id] = { ...track, head: l.id };
  }
  return out;
}
