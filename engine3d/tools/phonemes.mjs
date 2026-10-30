#!/usr/bin/env node
// Letter sounds for phonics videos: one short clip per phoneme (ph_a_short, ph_sh, ...), cued like any sound.
// Piper reads letters by their names, but it also takes raw espeak IPA inside [[ ]], so each clip is the
// series' `soft` voice saying a bare sound. The entries live in engine3d/catalog/sounds.json (those with an
// `ipa` field); clips are cached like speech (assets/speech/cache) and copied to assets/sfx/generated/, where
// the mix finds sounds. Both folders are git-ignored: this script (or a render that cues one) remakes them.
//   node engine3d/tools/phonemes.mjs            make missing clips, print a check table
//   node engine3d/tools/phonemes.mjs --force    rewrite every clip
// An entry: { ipa, maxDur? (seconds kept from the start), description, tags }.

import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createPiperBackend } from "../../tools/lib/tts/piper.mjs";
import { synthesizeLines, clipLoudness, levelClip, SPEECH_LUFS } from "../../tools/lib/tts/synth.mjs";
import { resolveVoice } from "../../tools/lib/tts/lines.mjs";
import { loadVoiceTable } from "../../tools/lib/tts/index.mjs";
import { readWav, writeWav } from "../../tools/lib/wav.mjs";
import { SR } from "../../tools/lib/mixer.mjs";
import { REPO } from "./lib/server.mjs";

export const SFX_DIR = join(REPO, "assets/sfx/generated");
const FADE = 0.008; // seconds of fade at both ends, so a clip never clicks in or out

/** Phoneme entries from the 3D sounds catalog: name → { ipa, description, tags }. */
export function phonemeTable(sounds = JSON.parse(readFileSync(join(REPO, "engine3d/catalog/sounds.json"), "utf8")).sounds) {
  return Object.fromEntries(Object.entries(sounds).filter(([, s]) => s.ipa));
}

/** Duration, loudness, peak and the number of separate bursts (more than one suggests a garbled clip). */
export function clipStats(x) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const win = Math.round(0.02 * SR);
  const floor = peak * 10 ** (-30 / 20);
  let bursts = 0;
  let quiet = Infinity;
  for (let i = 0; i + win <= x.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e = Math.max(e, Math.abs(x[j]));
    if (e >= floor) {
      if (quiet >= 4) bursts++; // a new burst after 80 ms or more of quiet
      quiet = 0;
    } else quiet++;
  }
  return { dur: x.length / SR, lufs: clipLoudness(x), peakDb: 20 * Math.log10(peak || 1e-9), bursts };
}

/**
 * Make the clips for `names` (all phonemes by default) that are missing from the SFX folder.
 * @returns {Array<{ name:string, ipa:string, file:string, made:boolean } & ReturnType<typeof clipStats>>}
 */
export function makePhonemes({ names = null, force = false, log = () => {} } = {}) {
  const table = phonemeTable();
  const want = (names ?? Object.keys(table)).filter((n) => {
    if (!table[n]) throw new Error(`"${n}" is not a phoneme in engine3d/catalog/sounds.json`);
    return force || !existsSync(join(SFX_DIR, `${n}.wav`));
  });
  if (!want.length) return [];
  const voice = resolveVoice({ timbre: "soft", pitch: 1.1, speed: 0.95 }, loadVoiceTable()); // as speakPlan voices `soft`
  const lines = want.map((n) => ({ id: n, who: "soft", text: n, spoken: `[[ ${table[n].ipa} ]]`, bubble: "speech", voice }));
  mkdirSync(SFX_DIR, { recursive: true });
  return synthesizeLines(lines, createPiperBackend(), { log }).map((l) => {
    // maxDur: keep only the start of a sound Piper draws out too long (a held fricative), fading out over 60 ms.
    const max = table[l.id].maxDur;
    const x = Float32Array.from(readWav(l.file).samples).slice(0, max ? Math.round(max * SR) : undefined);
    const fIn = Math.min(Math.round(FADE * SR), x.length >> 1);
    const fOut = Math.min(Math.round((max ? 0.06 : FADE) * SR), x.length >> 1);
    for (let i = 0; i < fIn; i++) x[i] *= i / fIn;
    for (let i = 0; i < fOut; i++) x[x.length - 1 - i] *= i / fOut;
    if (max) levelClip(x, SPEECH_LUFS); // the kept part is louder than the whole clip was
    const file = join(SFX_DIR, `${l.id}.wav`);
    writeWav(`${file}.tmp`, x, SR, 1);
    renameSync(`${file}.tmp`, file);
    return { name: l.id, ipa: table[l.id].ipa, file, made: true, ...clipStats(x) };
  });
}

/** Make any phoneme clips a plan cues that are not on disk yet (renders call this before mixing). */
export function ensurePhonemes(plan, opts) {
  const table = phonemeTable();
  const names = [...new Set(plan.audio.map((a) => a.sound).filter((s) => table[s]))].sort();
  return names.length ? makePhonemes({ names, ...opts }) : [];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const force = process.argv.includes("--force");
  makePhonemes({ force, log: console.log });
  // Check every clip on disk: length, level, bursts.
  console.log("name           ipa     dur s   LUFS   peak dB  bursts");
  let flagged = 0;
  for (const [name, p] of Object.entries(phonemeTable())) {
    const s = clipStats(readWav(join(SFX_DIR, `${name}.wav`)).samples);
    const odd = s.dur < 0.15 || s.dur > 0.9 || s.bursts !== 1 || s.peakDb > -1;
    flagged += odd;
    console.log(`${name.padEnd(14)} ${p.ipa.padEnd(7)} ${s.dur.toFixed(2).padStart(5)}  ${s.lufs.toFixed(1).padStart(6)}  ${s.peakDb.toFixed(1).padStart(6)}  ${String(s.bursts).padStart(4)}${odd ? "   <- listen" : ""}`);
  }
  console.log(`${Object.keys(phonemeTable()).length} clips in ${SFX_DIR}${flagged ? `, ${flagged} to listen to` : ""}`);
}
