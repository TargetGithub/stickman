// Procedural music (STORY_SPEC 15, S7.2, ADR-017). A mood from the catalog, a seed and a length give the
// same stereo samples every time. Composition: tools/lib/patterns.mjs; instruments: tools/lib/instruments.mjs.
// Each render is levelled to MUSIC_LUFS (integrated), then a soft clip keeps peaks under -1 dBFS; the
// mixer sets its place under the dialogue.

import { compose } from "./patterns.mjs";
import { renderNote, addRoom, dcBlock, SR } from "./instruments.mjs";
import { normalizeLoudness } from "./loudness.mjs";

export const MUSIC_LUFS = -16;
const CEILING = 0.89; // -1 dBFS

/** Intensity as a function of time: a number, or points [{ t, v }] (linear between them). */
export function intensityCurve(spec, fallback = 0.6) {
  if (typeof spec === "number") return () => spec;
  const pts = (spec || []).slice().sort((a, b) => a.t - b.t);
  if (!pts.length) return () => fallback;
  return (t) => {
    if (t <= pts[0].t) return pts[0].v;
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i].t) {
        const a = pts[i - 1];
        const b = pts[i];
        return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
      }
    }
    return pts[pts.length - 1].v;
  };
}

/**
 * @param {{ mood:string, catalog:object, seed:string|number, seconds:number, intensity?:number|Array<{t,v}> }} o
 * @returns {{ samples: Float32Array, tempo:number, bars:number, barSec:number, notes:number }}
 */
export function renderMusic({ mood, catalog, seed, seconds, intensity }) {
  const data = catalog.musicMoods?.[mood];
  if (!data) throw new Error(`no music mood '${mood}'`);
  const frames = Math.max(1, Math.round(seconds * SR));
  const out = new Float32Array(frames * 2);
  const comp = compose(data, catalog.scales, { seed: `${seed}:${mood}`, seconds: frames / SR, intensityAt: intensityCurve(intensity, data.intensity) });
  for (const n of comp.notes) renderNote(out, n);
  addRoom(out);
  dcBlock(out);
  normalizeLoudness(out, MUSIC_LUFS, { maxGainDb: 24 });
  // Soft clip above the ceiling (rare after levelling) so a loud bar never crackles.
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (Math.abs(v) > 0.7) out[i] = Math.sign(v) * (0.7 + (CEILING - 0.7) * Math.tanh((Math.abs(v) - 0.7) / (CEILING - 0.7)));
  }
  // Short fade at the very end so the last chord never clicks off.
  const fade = Math.min(frames, Math.round(0.08 * SR));
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[(frames - 1 - i) * 2] *= g;
    out[(frames - 1 - i) * 2 + 1] *= g;
  }
  return { samples: out, tempo: comp.tempo, bars: comp.bars, barSec: comp.barSec, notes: comp.notes.length };
}
