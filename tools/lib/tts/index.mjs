// Spoken dialogue for story scripts (SPEECH_SPEC 4): compile, collect the lines, render or reuse each clip,
// and stretch each spoken beat to its audio. The engine then simulates the returned script as usual.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileScript } from "../../../engine/index.js";
import { collectLines, injectDurations } from "./lines.mjs";
import { synthesizeLines, CACHE_DIR } from "./synth.mjs";

export const TABLE_FILE = fileURLToPath(new URL("../../../catalog/story/tts_voices.json", import.meta.url));

/** catalog/story/tts_voices.json */
export const loadVoiceTable = (file = TABLE_FILE) => JSON.parse(readFileSync(file, "utf8"));

/**
 * @param {object} script  a v2 story script (left unchanged)
 * @param {{ catalog, backend, table?, overrides?, cacheDir?, log? }} o  overrides: the --voices file
 * @returns {{ script: object, lines: Array<object>, report: Array<{ id, beatDur, long }> }}
 *   script: the compiled script with sayDur / narration dur set from the audio
 */
export function prepareSpeech(script, { catalog, backend, table = loadVoiceTable(), overrides = {}, cacheDir = CACHE_DIR, log }) {
  if (script?.version !== 2) throw new Error("--speech tts needs a v2 story script");
  const compiled = structuredClone(compileScript(script, catalog).script);
  const lines = synthesizeLines(collectLines(compiled, table, overrides), backend, { cacheDir, log });
  const report = injectDurations(compiled, lines);
  return { script: compiled, lines, report };
}

/** speech.json for the render folder: one row per spoken line. */
export function speechReport(lines, report, backend) {
  const byId = new Map(report.map((r) => [r.id, r]));
  return {
    backend: `${backend.id} ${backend.version}`,
    lines: lines.map((l) => ({ id: l.id, who: l.who, text: l.text, spoken: l.spoken, model: l.voice.model, speaker: l.voice.speaker, rate: l.voice.rate, pitch: l.voice.pitch,
      file: `${l.key}.wav`, dur: Number(l.dur.toFixed(3)), beatDur: byId.get(l.id)?.beatDur, cached: l.cached, ...(byId.get(l.id)?.long ? { long: true } : {}) })),
  };
}
