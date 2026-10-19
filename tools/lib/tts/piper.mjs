// Piper backend (SPEECH_SPEC 2, 4.3): the `piper` CLI (piper-tts from PyPI in a private venv) renders a line with
// fixed noise settings, then ffmpeg shifts its pitch (keeping its length), applies the bubble style and the
// robot filter, and writes 48 kHz mono. Node only; nothing here runs in /engine.

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NOISE } from "./synth.mjs";

export const PIPER_DIR = fileURLToPath(new URL("../../bin/piper/", import.meta.url));
export const MODELS_DIR = fileURLToPath(new URL("../../../assets/speech/models/", import.meta.url));

/** The piper executable: $PIPER_BIN, or tools/bin/piper/venv/bin/piper (python3 -m venv + pip install piper-tts), or null. */
export function findPiper() {
  const candidates = [process.env.PIPER_BIN, join(PIPER_DIR, "venv", "bin", "piper")].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** The installed piper-tts version (part of every cache key), read from the venv's package metadata. */
export function piperVersion(bin) {
  const py = join(bin, "..", "python");
  const r = existsSync(py) ? spawnSync(py, ["-I", "-c", "import importlib.metadata as m; print(m.version('piper-tts'))"], { encoding: "utf8" }) : null;
  return r?.status === 0 ? r.stdout.trim() : "unknown";
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

const BATCH = fileURLToPath(new URL("./piper_batch.py", import.meta.url));

/**
 * @param {{ bin?: string, modelsDir?: string }} opts
 * @returns {import("./synth.mjs").TtsBackend}
 */
export function createPiperBackend({ bin = findPiper(), modelsDir = MODELS_DIR } = {}) {
  if (!bin) throw new Error("Piper is not installed: run `node tools/tts_setup.mjs --check` for what is missing (babble still works without it).");
  const python = join(bin, "..", "python");
  const models = listModels(modelsDir);
  return {
    id: "piper",
    version: piperVersion(bin),
    models,
    /** Render jobs [{ line, out, seed }]: one Piper process per voice model, then ffmpeg per clip. */
    render(jobs) {
      const byModel = new Map();
      for (const j of jobs) {
        const name = j.line.voice.model;
        if (!models[name]) throw new Error(`voice model "${name}" is not in ${modelsDir}: run \`node tools/tts_setup.mjs --check\``);
        if (!byModel.has(name)) byModel.set(name, []);
        byModel.get(name).push(j);
      }
      for (const [name, list] of byModel) {
        const m = models[name];
        const req = { model: m.onnx, config: m.config, jobs: list.map((j) => ({ text: j.line.spoken, out: `${j.out}.piper.wav`, speaker: j.line.voice.speaker ?? 0,
          length_scale: Number((1 / (j.line.voice.rate * (j.line.bubble === "shout" ? 1.08 : 1))).toFixed(4)), noise_scale: NOISE.scale, noise_w: NOISE.w, seed: j.seed })) };
        const r = spawnSync(python, ["-I", BATCH], { input: JSON.stringify(req), encoding: "utf8", cwd: PIPER_DIR, maxBuffer: 1 << 26 });
        if (r.status !== 0) throw new Error(`piper failed with ${name}: ${(r.stderr || r.error?.message || "").trim().split("\n").slice(-3).join(" ")}`);
        const inputRate = sampleRateOf(m.config);
        for (const j of list) {
          const raw = `${j.out}.piper.wav`;
          try {
            const ff = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", postFilters(inputRate, j.line.voice, j.line.bubble), "-ac", "1", "-c:a", "pcm_s16le", j.out]);
            if (ff.status !== 0) throw new Error(`ffmpeg failed on a speech clip: ${String(ff.stderr).trim()}`);
          } finally {
            rmSync(raw, { force: true });
          }
        }
      }
    },
  };
}

const rates = new Map();
function sampleRateOf(config) {
  if (!rates.has(config)) rates.set(config, JSON.parse(readFileSync(config, "utf8")).audio?.sample_rate ?? 22050);
  return rates.get(config);
}
