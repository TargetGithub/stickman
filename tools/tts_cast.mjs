#!/usr/bin/env node
// Voice sampler (SPEECH_SPEC 8): the narrator names each character, then the character says its first line
// from the script, all in one WAV for a listening review.
// Usage: node tools/tts_cast.mjs <script.json> [--voices file.json] [--who a,b,c] [--out out/demos/tts_cast.wav]
//        node tools/tts_cast.mjs <script.json> --moods "A line." [--who doopi]   the same line in every mood (tone)

import { readFileSync } from "node:fs";
import { catalog } from "../catalog/index.js";
import { compileScript } from "../engine/index.js";
import { collectLines, cleanText, resolveVoice, narratorVoice, moodTone } from "./lib/tts/lines.mjs";
import { synthesizeLines } from "./lib/tts/synth.mjs";
import { loadVoiceTable } from "./lib/tts/index.mjs";
import { createPiperBackend } from "./lib/tts/piper.mjs";
import { readWav, writeWav } from "./lib/wav.mjs";
import { SR } from "./lib/mixer.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const file = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(voices|who|out|moods)$/));
if (!file) {
  console.error("usage: node tools/tts_cast.mjs <script.json> [--voices file.json] [--who a,b,c] [--out out/demos/tts_cast.wav]");
  process.exit(2);
}
const table = loadVoiceTable();
const overrides = opt("--voices", null) ? JSON.parse(readFileSync(opt("--voices"), "utf8")) : {};
const compiled = compileScript(JSON.parse(readFileSync(file, "utf8")), catalog).script;
const said = collectLines(compiled, table, overrides).filter((l) => l.kind === "say" && l.bubble !== "whisper");
const who = opt("--who", null)?.split(",") ?? compiled.cast.map((c) => c.id);
const narrator = narratorVoice(compiled.meta, table, overrides.narrator);

const lines = [];
const moodLine = opt("--moods", null);
for (const id of moodLine ? [] : who) {
  const c = compiled.cast.find((x) => x.id === id);
  const voice = c && resolveVoice(c.voice, table, overrides.cast?.[id]);
  if (!voice) continue;
  const first = said.find((l) => l.who === id && l.spoken.split(" ").length >= 3) ?? said.find((l) => l.who === id);
  const name = c.name ?? id;
  lines.push({ id: `${id}_name`, kind: "narrate", who: "narrator", spoken: `${name}.`, bubble: "speech", voice: narrator });
  lines.push({ id, kind: "say", who: id, spoken: first?.spoken ?? cleanText(`Hi, I'm ${name}!`), bubble: first?.bubble ?? "speech", voice });
}
if (moodLine) {
  // One character says the same line in each mood; the narrator names the mood first.
  const id = who[0];
  const c = compiled.cast.find((x) => x.id === id);
  const voice = c && resolveVoice(c.voice, table, overrides.cast?.[id]);
  if (!voice) throw new Error(`${id} has no spoken voice`);
  for (const mood of Object.keys(table.moods)) {
    lines.push({ id: `${mood}_name`, kind: "narrate", who: "narrator", spoken: `${mood}.`, bubble: "speech", voice: narrator });
    lines.push({ id: mood, kind: "say", who: `${id} (${mood})`, spoken: cleanText(moodLine), bubble: "speech", voice, tone: moodTone(mood, table) });
  }
}
const done = synthesizeLines(lines, createPiperBackend(), { log: (m) => console.log(m) });
const gap = (s) => new Float32Array(Math.round(s * SR));
const parts = [gap(0.3)];
for (const [i, l] of done.entries()) {
  parts.push(readWav(l.file).samples, gap(i % 2 ? 0.8 : 0.35));
  if (i % 2) console.log(`  ${l.who}: ${l.spoken} (${l.voice.model}, pitch ${l.voice.pitch}, rate ${l.voice.rate}${l.tone ? `, ${l.tone.mood}` : ""}, ${l.dur.toFixed(2)} s)`);
}
const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
let at = 0;
for (const p of parts) out.set(p, (at += p.length) - p.length);
const path = opt("--out", "out/demos/tts_cast.wav");
writeWav(path, out, SR, 1);
console.log(`wrote ${path} (${(out.length / SR).toFixed(1)} s, ${lines.length / 2} ${moodLine ? "moods" : "voices"})`);
