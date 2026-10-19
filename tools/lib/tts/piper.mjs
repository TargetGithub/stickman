// Piper backend (SPEECH_SPEC 2, 4.3): the `piper` CLI (MIT, rhasspy/piper release binary) renders a line with
// fixed noise settings, then ffmpeg shifts its pitch (keeping its length), applies the bubble style and the
// robot filter, and writes 48 kHz mono. Node only; nothing here runs in /engine.

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NOISE } from "./synth.mjs";

export const PIPER_DIR = fileURLToPath(new URL("../../bin/piper/", import.meta.url));
export const MODELS_DIR = fileURLToPath(new URL("../../../assets/speech/models/", import.meta.url));

/** The piper executable: $PIPER_BIN, tools/bin/piper/piper (release tarball layout), or null. */
export function findPiper() {
  const candidates = [process.env.PIPER_BIN, join(PIPER_DIR, "piper", "piper"), join(PIPER_DIR, "piper")].filter(Boolean);
  return candidates.find((p) => existsSync(p) && !p.endsWith("/")) ?? null;
}

/** Installed voice models: name → { onnx, config }. */
export function listModels(dir = MODELS_DIR) {
  if (!existsSync(dir)) return {};
  const out = {};
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".onnx")) continue;
    const name = f.slice(0, -5);
    if (existsSync(join(dir, `${f}.json`))) out[name] = { onnx: join(dir, f), config: join(dir, `${f}.json`) };
  }
  return out;
}

/** ffmpeg filter chain for a line: pitch shift at constant length, bubble style, robot. */
export function postFilters(inputRate, voice, bubble) {
  const f = [];
  if (voice.pitch) {
    const r = 2 ** (voice.pitch / 12);
    f.push(`asetrate=${Math.round(inputRate * r)}`, `aresample=${inputRate}`, `atempo=${(1 / r).toFixed(6)}`);
  }
  if (bubble === "whisper") f.push("highpass=f=350", "lowpass=f=6000");
  if (voice.filter === "robot") f.push("aeval='val(0)*(0.55+0.45*sin(2*PI*55*t))':c=same", "aecho=0.8:0.5:6|11:0.35|0.25");
  f.push("aresample=48000");
  return f.join(",");
}

/**
 * @param {{ bin?: string, modelsDir?: string }} opts
 * @returns {import("./synth.mjs").TtsBackend}
 */
export function createPiperBackend({ bin = findPiper(), modelsDir = MODELS_DIR } = {}) {
  if (!bin) throw new Error("Piper is not installed: run `node tools/tts_setup.mjs --check` for what is missing (babble still works without it).");
  const models = listModels(modelsDir);
  const v = spawnSync(bin, ["--version"], { encoding: "utf8" });
  const version = (v.stdout || v.stderr || "").trim().split("\n").pop() || "unknown";
  return {
    id: "piper",
    version,
    models,
    render(line, outPath) {
      const voice = line.voice;
      const m = models[voice.model];
      if (!m) throw new Error(`voice model "${voice.model}" is not in ${modelsDir}: run \`node tools/tts_setup.mjs --check\``);
      const rate = voice.rate * (line.bubble === "shout" ? 1.08 : 1);
      const raw = `${outPath}.piper.wav`;
      try {
        const r = spawnSync(bin, ["--model", m.onnx, "--config", m.config, "--output_file", raw, "--speaker", String(voice.speaker ?? 0),
          "--length_scale", (1 / rate).toFixed(4), "--noise_scale", String(NOISE.scale), "--noise_w", String(NOISE.w), "--quiet"],
          { input: line.spoken, encoding: "utf8", cwd: PIPER_DIR });
        if (r.status !== 0 || !existsSync(raw)) throw new Error(`piper failed for "${line.spoken}": ${(r.stderr || r.error?.message || "").trim()}`);
        const inputRate = sampleRateOf(m.config);
        const ff = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", postFilters(inputRate, voice, line.bubble), "-ac", "1", "-c:a", "pcm_s16le", outPath]);
        if (ff.status !== 0) throw new Error(`ffmpeg failed on a speech clip: ${String(ff.stderr).trim()}`);
      } finally {
        rmSync(raw, { force: true });
      }
    },
  };
}

const rates = new Map();
function sampleRateOf(config) {
  if (!rates.has(config)) rates.set(config, JSON.parse(readFileSync(config, "utf8")).audio?.sample_rate ?? 22050);
  return rates.get(config);
}
