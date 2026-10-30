// Speech and the audio mix for engine3d, reusing the 2D tools: Piper TTS with its clip cache
// (tools/lib/tts), the story mixer and loudness levelling (tools/lib/mixer.mjs, loudness.mjs), procedural
// music (tools/lib/music_gen.mjs) and the shared SFX in assets/sfx/generated/.

import { join } from "node:path";
import { createPiperBackend } from "../../../tools/lib/tts/piper.mjs";
import { synthesizeLines, clipSampler } from "../../../tools/lib/tts/synth.mjs";
import { cleanText, resolveVoice, narratorVoice } from "../../../tools/lib/tts/lines.mjs";
import { loadVoiceTable } from "../../../tools/lib/tts/index.mjs";
import { mixdownStory, SR } from "../../../tools/lib/mixer.mjs";
import { measureLoudness, normalizeLoudness } from "../../../tools/lib/loudness.mjs";
import { readWav, writeWav } from "../../../tools/lib/wav.mjs";
import { loadCatalogSync } from "../../../catalog/index.js";
import { REPO } from "./server.mjs";
import { musicTimeline, renderMusicBed } from "./music3d.mjs";
import { ensurePhonemes } from "../phonemes.mjs";

/**
 * Render (or reuse) a clip for every spoken line of a plan.
 * @returns {Record<string, { dur:number, key:string, file:string }>} line id → clip
 */
export function speakPlan(plan, { log = () => {} } = {}) {
  if (!plan.lines.length) return {};
  const table = loadVoiceTable();
  const lines = plan.lines.map((l) => ({
    id: l.id, who: l.voice, text: l.text, spoken: cleanText(l.text), bubble: "speech",
    voice: l.voice === "narrator" ? narratorVoice({}, table) : resolveVoice({ timbre: l.voice, pitch: 1.1, speed: plan.meta?.voiceSpeed ?? 0.95 }, table),
  }));
  const out = {};
  for (const l of synthesizeLines(lines, createPiperBackend(), { log })) out[l.id] = { dur: l.dur, key: l.key, file: l.file };
  return out;
}

/** Story-style ducking: music and ambience dip to 45% under speech, with 0.2 s ramps. */
function speechDuck(spans) {
  return (t) => {
    let g = 1;
    for (const [a, b] of spans) {
      const k = t < a ? (a - t) / 0.2 : t > b ? (t - b) / 0.2 : 0;
      g = Math.min(g, 0.45 + 0.55 * Math.min(1, k));
    }
    return g;
  };
}

/**
 * Mix the plan's sounds, speech and an optional music bed to a 48 kHz stereo WAV levelled for YouTube.
 * `scenes` are the script's scenes: their `music` / `musicGain` override the episode's per scene (music3d.mjs).
 * music null turns all music off, scene music included.
 * @returns {{ file:string, lufs:number }}
 */
export function mixPlan(plan, speech, out, { music = plan.meta?.music ?? "bouncy", musicGain = plan.meta?.musicGain ?? 0.32, scenes = [], log = () => {} } = {}) {
  ensurePhonemes(plan, { log }); // letter sounds are made on first use, like speech clips
  const sfxDir = join(REPO, "assets/sfx/generated");
  const tts = clipSampler();
  const sfx = new Map();
  const events = plan.audio.map((a) => (a.speech ? { t: a.t, sfx: speech[a.speech] ? `tts:${speech[a.speech].key}` : null, volume: 1, pan: 0 } : { t: a.t, sfx: a.sound, volume: a.volume * 0.7, pan: a.pan }))
    .filter((e) => e.sfx);
  const sampleFor = (name) => {
    if (name.startsWith("tts:")) return tts(name);
    if (!sfx.has(name)) {
      const w = readWav(join(sfxDir, `${name}.wav`));
      if (w.sampleRate !== SR) throw new Error(`${name}.wav is ${w.sampleRate} Hz; expected ${SR}`);
      sfx.set(name, w.channels === 1 ? w.samples : w.samples.filter((_, i) => i % w.channels === 0));
    }
    return sfx.get(name);
  };
  const spans = plan.lines.map((l) => [l.t, l.t + (speech[l.id]?.dur ?? l.dur)]);
  let bed = null;
  if (music !== null) {
    const segs = musicTimeline(plan.scenes, scenes, { music: music || null, musicGain, duration: plan.duration });
    bed = renderMusicBed(segs, { catalog: loadCatalogSync(), seed: plan.seed, duration: plan.duration });
    log(`  music: ${segs.map((s) => `${s.mood ?? "none"}${s.gain !== musicGain && s.mood ? ` x${s.gain}` : ""}@${s.start.toFixed(1)}`).join(" -> ")}`);
  }
  const duck = speechDuck(spans);
  // mixdownStory asks storyDuck twice per step: (t, duck, []) for speech, (t, [], dips) for sad dips (none here).
  const { samples, loudness } = mixdownStory({ events, durationSec: plan.duration, sampleFor, music: bed, duck: spans, storyDuck: (t, d) => (d === spans ? duck(t) : 1),
    normalize: normalizeLoudness, loudness: measureLoudness });
  writeWav(out, samples, SR, 2);
  return { file: out, lufs: loudness?.integrated ?? null };
}
