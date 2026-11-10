#!/usr/bin/env node
// Letter sounds for phonics videos: one short clip per phoneme (ph_a_short, ph_sh, ...), cued like any sound.
// Piper reads letters by their names, but it also takes raw espeak IPA inside [[ ]], so each clip is the
// series' `soft` voice saying a bare sound. The entries live in engine3d/catalog/sounds.json (those with an
// `ipa` field); clips are cached like speech (assets/speech/cache) and copied to assets/sfx/generated/, where
// the mix finds sounds. Both folders are git-ignored: this script (or a render that cues one) remakes them.
//   node engine3d/tools/phonemes.mjs            make missing clips, print a check table
//   node engine3d/tools/phonemes.mjs --force    rewrite every clip
// An entry: { ipa, maxDur? (seconds kept from the start), cut? ("voicing": keep only the consonant before the vowel
// Piper adds, for stops and affricates; cutMax caps its length, default 0.11 s), breath? (seconds: /h/ is a made breath, not TTS), description, tags }.
// A clip can be in a speaker's voice: "ph_p__deep_110" is ph_p in the deep timbre at pitch 1.1 (the sound action's
// voice / who). Each clip has a stamp ("<clip>.wav.json") of the recipe it was made from; a changed recipe remakes it.

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
import { breath, cutAtVoicing } from "./lib/phoneme_shape.mjs";
import { writeFileSync } from "node:fs";

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

/** "ph_p__deep_110" -> { base: "ph_p", timbre: "deep", pitch: 1.1 }; a plain name is the series' soft voice. */
export function parseClip(name) {
  const [base, v] = String(name).split("__");
  if (!v) return { base, timbre: "soft", pitch: 1.1 };
  const m = /^([a-z]+)_(\d+)$/.exec(v);
  return m ? { base, timbre: m[1], pitch: Number(m[2]) / 100 } : { base, timbre: v, pitch: 1.1 };
}

/** The clip name for a phoneme in a voice (the director and the mix agree on it). */
export const clipName = (base, timbre, pitch = 1.1) => (timbre && timbre !== "soft" || pitch !== 1.1 ? `${base}__${timbre ?? "soft"}_${Math.round(pitch * 100)}` : base);

const STAMP_V = 2;
const stampOf = (entry, who) => JSON.stringify({ v: STAMP_V, ipa: entry.ipa, cut: entry.cut ?? null, cutMax: entry.cutMax ?? null, breath: entry.breath ?? null, maxDur: entry.maxDur ?? null, ...who });
const stale = (name, stamp) => {
  const f = join(SFX_DIR, `${name}.wav`);
  if (!existsSync(f) || !existsSync(`${f}.json`)) return true;
  try { return readFileSync(`${f}.json`, "utf8") !== stamp; } catch { return true; }
};

/**
 * Make the clips for `names` (all phonemes by default) that are missing, or whose recipe changed, in the SFX folder.
 * @returns {Array<{ name:string, ipa:string, file:string, made:boolean } & ReturnType<typeof clipStats>>}
 */
export function makePhonemes({ names = null, force = false, log = () => {} } = {}) {
  const table = phonemeTable();
  const table2 = loadVoiceTable();
  const jobs = (names ?? Object.keys(table)).map((n) => {
    const who = parseClip(n);
    if (!table[who.base]) throw new Error(`"${who.base}" is not a phoneme in engine3d/catalog/sounds.json`);
    return { name: n, who, entry: table[who.base], stamp: stampOf(table[who.base], { timbre: who.timbre, pitch: who.pitch }) };
  }).filter((j) => force || stale(j.name, j.stamp));
  if (!jobs.length) return [];
  mkdirSync(SFX_DIR, { recursive: true });
  const write = (j, x) => {
    const file = join(SFX_DIR, `${j.name}.wav`);
    writeWav(`${file}.tmp`, x, SR, 1);
    renameSync(`${file}.tmp`, file);
    writeFileSync(`${file}.json`, j.stamp);
    return { name: j.name, ipa: j.entry.ipa, file, made: true, ...clipStats(x) };
  };
  const out = [];
  // /h/: a made breath (the same in every voice), a little under speech loudness.
  for (const j of jobs.filter((j) => j.entry.breath)) {
    const x = breath(j.entry.breath, SR, j.who.base);
    levelClip(x, SPEECH_LUFS - 4);
    out.push(write(j, x));
  }
  const tts = jobs.filter((j) => !j.entry.breath);
  if (!tts.length) return out;
  // as speakPlan voices a timbre at a pitch (meta.voiceSpeed's default 0.95)
  const lines = tts.map((j) => ({ id: j.name, who: j.who.timbre, text: j.name, spoken: `[[ ${j.entry.ipa} ]]`, bubble: "speech", voice: resolveVoice({ timbre: j.who.timbre, pitch: j.who.pitch, speed: 0.95 }, table2) }));
  const byId = new Map(tts.map((j) => [j.name, j]));
  for (const l of synthesizeLines(lines, createPiperBackend(), { log })) {
    const j = byId.get(l.id);
    let x = Float32Array.from(readWav(l.file).samples);
    // cut "voicing": keep the burst and aspiration, drop the vowel Piper adds (no "puh").
    if (j.entry.cut === "voicing") x = cutAtVoicing(x, SR, j.entry.cutMax ?? 0.11);
    // maxDur: keep only the start of a sound Piper draws out too long (a held fricative), fading out over 60 ms.
    const max = j.entry.maxDur;
    if (max) x = x.slice(0, Math.round(max * SR));
    const fIn = Math.min(Math.round(FADE * SR), x.length >> 1);
    const fOut = Math.min(Math.round((max ? 0.06 : FADE) * SR), x.length >> 1);
    for (let i = 0; i < fIn; i++) x[i] *= i / fIn;
    for (let i = 0; i < fOut; i++) x[x.length - 1 - i] *= i / fOut;
    if (max || j.entry.cut) levelClip(x, SPEECH_LUFS); // the kept part is quieter than the whole clip was
    out.push(write(j, x));
  }
  return out;
}

/** Make any phoneme clips a plan cues that are not on disk yet (renders call this before mixing). */
export function ensurePhonemes(plan, opts) {
  const table = phonemeTable();
  const names = [...new Set(plan.audio.map((a) => a.sound).filter((s) => s && table[parseClip(s).base]))].sort();
  return names.length ? makePhonemes({ names, ...opts }) : [];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const force = process.argv.includes("--force");
  makePhonemes({ force, log: console.log });
  // Check every clip on disk: length, level, bursts.
  console.log("name           ipa     dur s   LUFS   peak dB  bursts");
  let flagged = 0;
  for (const [name, p] of Object.entries(phonemeTable())) {
    if (!existsSync(join(SFX_DIR, `${name}.wav`))) continue;
    const s = clipStats(readWav(join(SFX_DIR, `${name}.wav`)).samples);
    const odd = (p.cut ? s.dur < 0.03 || s.dur > 0.25 : s.dur < 0.15 || s.dur > 0.9) || s.bursts !== 1 || s.peakDb > -1;
    flagged += odd;
    console.log(`${name.padEnd(14)} ${p.ipa.padEnd(7)} ${s.dur.toFixed(2).padStart(5)}  ${s.lufs.toFixed(1).padStart(6)}  ${s.peakDb.toFixed(1).padStart(6)}  ${String(s.bursts).padStart(4)}${odd ? "   <- listen" : ""}`);
  }
  console.log(`${Object.keys(phonemeTable()).length} clips in ${SFX_DIR}${flagged ? `, ${flagged} to listen to` : ""}`);
}
