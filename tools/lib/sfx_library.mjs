// SFX lookup (spec 17.2-17.3): files in assets/sfx/ override generated ones; numbered variants
// (punch_heavy_1.wav, punch_heavy_2.mp3, ...) are chosen with the seeded "audio" stream.
// Music: assets/music/<name>.(mp3|wav|ogg|flac|m4a).

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decodeAudio } from "./wav.mjs";
import { ensureGeneratedSfx, GENERATED_DIR } from "../sfxgen.mjs";
import { deriveRng } from "../../engine/math.js";
import { SR } from "./mixer.mjs";

const ASSETS = new URL("../../assets/", import.meta.url).pathname;
const AUDIO_EXT = /\.(wav|mp3|ogg|flac|m4a)$/i;

function toMono(stereo) {
  const out = new Float32Array(stereo.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = (stereo[i * 2] + stereo[i * 2 + 1]) / 2;
  return out;
}

/** @returns {{ sampleFor(sfx, index):Float32Array|null, sources:Map<string,string[]>, missing:Set<string> }} */
export function createSfxLibrary(seed) {
  ensureGeneratedSfx();
  const overrideDir = join(ASSETS, "sfx");
  const files = existsSync(overrideDir) ? readdirSync(overrideDir).filter((f) => AUDIO_EXT.test(f)) : [];
  const rng = deriveRng(seed, "audio");
  const decoded = new Map();
  const sources = new Map();
  const missing = new Set();

  const variantsOf = (key) => {
    if (sources.has(key)) return sources.get(key);
    const re = new RegExp(`^${key}(_\\d+)?\\.`, "i");
    let list = files.filter((f) => re.test(f)).sort().map((f) => join(overrideDir, f));
    if (!list.length && existsSync(join(GENERATED_DIR, `${key}.wav`))) list = [join(GENERATED_DIR, `${key}.wav`)];
    sources.set(key, list);
    return list;
  };

  return {
    sources,
    missing,
    sampleFor(sfx) {
      const list = variantsOf(sfx);
      if (!list.length) {
        missing.add(sfx);
        return null;
      }
      const path = list.length === 1 ? list[0] : list[Math.floor(rng() * list.length) % list.length];
      if (!decoded.has(path)) decoded.set(path, toMono(decodeAudio(path, SR)));
      return decoded.get(path);
    },
  };
}

/** Decoded music (interleaved stereo) for a script's audio.music name, or null with a reason. */
export function loadMusic(name) {
  if (!name) return { music: null, note: "no music" };
  const dir = join(ASSETS, "music");
  const file = existsSync(dir) ? readdirSync(dir).find((f) => f.replace(AUDIO_EXT, "") === name && AUDIO_EXT.test(f)) : null;
  if (!file) return { music: null, note: `music '${name}' not found in assets/music (playing without music)` };
  return { music: decodeAudio(join(dir, file), SR), note: `music ${file}` };
}
