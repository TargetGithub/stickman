#!/usr/bin/env node
// Spoken dialogue setup check (SPEECH_SPEC 6): what is installed for `record.mjs --speech tts`, and what is missing.
// Usage: node tools/tts_setup.mjs --check [--voices series/doopi/tts_voices.json]
// It never downloads anything: it prints where each missing file comes from, to fetch after approval.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { findPiper, piperVersion, listModels, PIPER_DIR, MODELS_DIR } from "./lib/tts/piper.mjs";
import { loadVoiceTable } from "./lib/tts/index.mjs";

const args = process.argv.slice(2);
if (!args.includes("--check")) {
  console.error("usage: node tools/tts_setup.mjs --check [--voices file.json]");
  process.exit(2);
}
const HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en";
/** Hugging Face folder for a Piper voice name: en_US-kristin-medium → en_US/kristin/medium. */
const hfPath = (name) => {
  const [lang, voice, quality] = name.split("-");
  return `${HF}/${lang}/${voice}/${quality}/${name}`;
};

const table = loadVoiceTable();
const voicesIdx = args.indexOf("--voices");
const overrides = voicesIdx >= 0 ? JSON.parse(readFileSync(args[voicesIdx + 1], "utf8")) : {};
const wanted = new Set([...Object.values(table.timbres), table.narrator, ...Object.values(overrides.cast || {}), overrides.narrator || {}]
  .filter((v) => v.model && !v.off).map((v) => v.model));

let missing = 0;
const bin = findPiper();
if (bin) {
  const v = spawnSync(bin, ["--help"], { encoding: "utf8" });
  console.log(`ok       piper-tts ${piperVersion(bin)} at ${bin}${v.status === 0 ? "" : " (but it does not run: " + String(v.stderr || v.error?.message).trim() + ")"}`);
  if (v.status !== 0) missing++;
} else {
  missing++;
  console.log(`missing  piper in ${PIPER_DIR}venv (or set PIPER_BIN): python3 -m venv tools/bin/piper/venv && tools/bin/piper/venv/bin/pip install piper-tts==1.8.0`);
}
const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (ff.status === 0) console.log(`ok       ${ff.stdout.split("\n")[0]}`);
else {
  missing++;
  console.log("missing  ffmpeg (brew install ffmpeg)");
}
const models = listModels();
for (const m of [...wanted].sort()) {
  if (models[m]) console.log(`ok       voice ${m}`);
  else {
    missing++;
    console.log(`missing  voice ${m}: ${hfPath(m)}.onnx and ${hfPath(m)}.onnx.json into ${MODELS_DIR}`);
  }
}
if (!existsSync(MODELS_DIR)) console.log(`(no ${MODELS_DIR} yet)`);
console.log(missing ? `${missing} missing: --speech tts will not work until they are installed (babble still works).` : "everything for --speech tts is installed.");
process.exit(missing ? 1 : 0);
