#!/usr/bin/env node
// Script → final.mp4 with mixed audio, thumbnail, contact sheet and metadata (spec 17).
// Usage: node tools/record.mjs <script.json> [options]
//   --out-dir out          parent folder; output goes to <out-dir>/<slug>/
//   --slug name            output folder name (default: from meta.title)
//   --from N --to N        render only frames N..M (inclusive; audio is cut to match)
//   --scene N              render only scene N (0-based index or scene id) of a story script
//   --frames-only          write frames/00000.png ... instead of a video (debugging)
//   --hash                 write hashes.txt (SHA-256 of every frame's RGBA)
//   --no-audio             skip the audio mix
//   --crf 16 --preset medium   x264 quality settings
//   --speech babble|tts    spoken dialogue (SPEECH_SPEC): babble (default, or meta.speech) or offline Piper voices
//   --voices file.json     per-character TTS voices for --speech tts (cast id → { model, speaker, rate, pitch, off })
//   --bundle <dir|zip>     a catalog bundle the script declares (repeatable; imported bundles are found in
//                          the store without it); credits go into meta.json

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadBackend } from "./lib/canvas.mjs";
import { startEncoder } from "./lib/encode.mjs";
import { writeWav } from "./lib/wav.mjs";
import { mixdown, mixdownStory, swapSpeech, SR } from "./lib/mixer.mjs";
import { prepareSpeech, speechReport } from "./lib/tts/index.mjs";
import { createPiperBackend } from "./lib/tts/piper.mjs";
import { speechClips, clipSampler } from "./lib/tts/synth.mjs";
import { renderScore, storyDuck } from "./lib/score.mjs";
import { measureLoudness, normalizeLoudness } from "./lib/loudness.mjs";
import { createSfxLibrary, loadMusic } from "./lib/sfx_library.mjs";
import { chooseThumbnailFrame, contactSheet } from "./lib/review_images.mjs";
import { createEngine, formatIssues, ENGINE_VERSION } from "../engine/index.js";
import { catalog as baseCatalog } from "../catalog/index.js";
import { catalogFromArgs, splitBundleArgs, bundleCredits } from "./lib/bundle_args.mjs";

const { args } = splitBundleArgs(process.argv.slice(2));
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);
const file = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(out-dir|slug|from|to|crf|preset|scene|speech|voices)$/));
if (!file) {
  console.error("usage: node tools/record.mjs <script.json> [--out-dir out] [--from N --to N | --scene N] [--frames-only] [--hash] [--no-audio] [--bundle <dir|zip>]... [--speech babble|tts] [--voices file.json]");
  process.exit(2);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video";
const script = JSON.parse(readFileSync(file, "utf8"));
// --bundle <dir|zip> (repeatable), and the store (bundles/) for the bundles the script declares.
const { catalog, bundles } = await catalogFromArgs(process.argv.slice(2), baseCatalog, script);
const backend = await loadBackend();
const engine = createEngine({ catalog, createCanvas: backend.createCanvas });
// Spoken dialogue: render (or reuse) each line's audio first, so the engine can give every line its length.
const speechMode = opt("--speech", script.meta?.speech ?? "babble");
if (!["babble", "tts"].includes(speechMode)) {
  console.error(`--speech must be babble or tts, not "${speechMode}"`);
  process.exit(2);
}
let speech = null;
if (speechMode === "tts" && script.audio?.voices !== false) {
  let tts;
  try {
    tts = createPiperBackend();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const voicesFile = opt("--voices", null);
  const overrides = voicesFile ? JSON.parse(readFileSync(voicesFile, "utf8")) : {};
  speech = { backend: tts, ...prepareSpeech(script, { catalog, backend: tts, overrides, log: (m) => console.log(m) }) };
  const fresh = speech.lines.filter((l) => !l.cached).length;
  console.log(`speech: ${speech.lines.length} lines (${fresh} new, ${speech.lines.length - fresh} from the cache)`);
  for (const r of speech.report.filter((x) => x.long)) console.log(`warning: line ${r.id} is longer than its beat can be; split it into shorter lines`);
}
const loaded = engine.load(speech ? speech.script : script);
if (loaded.warnings.length) console.log(formatIssues(loaded.warnings));
if (!loaded.ok) {
  console.error(formatIssues(loaded.errors));
  process.exit(1);
}
const meta = engine.getMeta();
const sceneArg = opt("--scene", null);
const scene = sceneArg === null ? null : engine.getScenes().find((sc) => String(sc.index) === sceneArg || sc.id === sceneArg);
if (sceneArg !== null && !scene) {
  console.error(`no scene ${sceneArg}; scenes: ${engine.getScenes().map((sc) => `${sc.index} (${sc.id})`).join(", ")}`);
  process.exit(2);
}
const slug = (opt("--slug", null) || slugify(meta.title || basename(file, ".json"))) + (scene ? `-scene-${scene.index}` : "");
const dir = join(opt("--out-dir", "out"), slug);
mkdirSync(dir, { recursive: true });
const from = scene ? scene.startFrame : Math.max(0, Number(opt("--from", 0)));
const to = scene ? scene.startFrame + scene.frames - 1 : Math.min(meta.totalFrames - 1, Number(opt("--to", meta.totalFrames - 1)));
const t0 = process.hrtime.bigint();
const seconds = () => Number(process.hrtime.bigint() - t0) / 1e9;
const canvas = backend.createCanvas(meta.width, meta.height);
const ctx = canvas.getContext("2d");

// 1. Video (or PNG frames)
const videoPath = join(dir, "video.mp4");
const hashes = [];
const enc = flag("--frames-only") ? null : startEncoder(videoPath, meta.width, meta.height, { crf: Number(opt("--crf", 16)), preset: opt("--preset", "medium") });
if (!enc) mkdirSync(join(dir, "frames"), { recursive: true });
for (let n = from; n <= to; n++) {
  engine.renderFrame(ctx, n);
  const rgba = backend.readRGBA(canvas);
  if (flag("--hash")) hashes.push(`${n} ${createHash("sha256").update(rgba).digest("hex")}`);
  if (enc) await enc.write(rgba);
  else await backend.savePng(canvas, join(dir, "frames", `${String(n).padStart(5, "0")}.png`));
  if ((n - from) % 300 === 299) process.stdout.write(`  frame ${n + 1}/${to + 1} (${((n - from + 1) / seconds()).toFixed(0)} fps)\n`);
}
if (enc) await enc.close();
const renderSeconds = seconds();
if (flag("--hash")) writeFileSync(join(dir, "hashes.txt"), hashes.join("\n") + "\n");

// 2. Audio mix and mux
let audio = { skipped: true };
const finalPath = join(dir, "final.mp4");
if (enc && !flag("--no-audio")) {
  const lib = createSfxLibrary(meta.seed);
  const startT = from / meta.fps;
  const durationSec = (to - from + 1) / meta.fps;
  const clip = speech ? clipSampler() : null;
  const sampleFor = (k) => (clip && k.startsWith("tts:") ? clip(k) : lib.sampleFor(k));
  const all = speech ? swapSpeech(engine.getAudioEvents(), speechClips(speech.lines, engine.getEvents())) : engine.getAudioEvents();
  const events = all.map((e) => ({ ...e, t: e.t - startT })).filter((e) => e.t > -2 && e.t < durationSec);
  const cues = engine.getMusicCues().map((c) => ({ ...c, t: c.t - startT }));
  const plan = engine.getMusicPlan();
  let music = null;
  let note;
  let mix;
  if (plan) {
    // Story scripts (S7): the generated score and ambience for the whole video, cut to the rendered range.
    const full = meta.totalFrames / meta.fps;
    const score = renderScore({ musicPlan: plan, ambiencePlan: engine.getAmbiencePlan(), seconds: full, seed: meta.seed, catalog,
      musicVolume: script.audio?.musicVolume ?? 0.35, ambienceVolume: script.audio?.ambienceVolume ?? 0.8, loadOverride: (mood) => loadMusic(mood).music });
    const cut = (buf) => buf.subarray(Math.round(startT * SR) * 2, Math.round((startT + durationSec) * SR) * 2);
    const shift = (spans) => spans.map(([a, b]) => [a - startT, b - startT]);
    mix = mixdownStory({ events, durationSec, sampleFor, music: cut(score.music), ambience: cut(score.ambience),
      duck: shift(plan.duck), dips: shift(plan.dips), storyDuck, normalize: normalizeLoudness, loudness: measureLoudness });
    note = score.segments.map((x) => `${x.mood} (${x.source})`).join(", ") || "no music";
  } else {
    ({ music, note } = loadMusic(script.audio?.music));
    mix = mixdown({ events, durationSec, sampleFor, music, musicVolume: script.audio?.musicVolume ?? 0.35, cues });
  }
  const wavPath = join(dir, "audio.wav");
  writeWav(wavPath, mix.samples, SR, 2);
  const mux = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", videoPath, "-i", wavPath, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", finalPath]);
  if (mux.status !== 0) {
    console.error(`mux failed: ${mux.stderr}`);
    process.exit(1);
  }
  rmSync(videoPath);
  audio = { events: events.length, music: note, limiterDb: Number(mix.reductionDb.toFixed(2)), missingSfx: [...lib.missing],
    ...(mix.loudness ? { lufs: Number(mix.loudness.integrated.toFixed(1)), shortTermMaxLufs: Number(mix.loudness.shortTermMax.toFixed(1)), gainDb: Number(mix.gainDb.toFixed(1)) } : {}) };
  if (lib.missing.size) console.log(`warning: no audio for ${[...lib.missing].join(", ")}`);
  if (!music && script.audio?.music) console.log(`warning: ${note}`);
} else if (enc) {
  spawnSync("mv", [videoPath, finalPath]);
}

// 3. Thumbnail, contact sheet, script copy, metadata
const thumb = chooseThumbnailFrame(engine);
engine.renderFrame(ctx, thumb.frame);
await backend.savePng(canvas, join(dir, "thumb.png"));
await backend.savePng(contactSheet(engine, backend), join(dir, "contact_sheet.png"));
writeFileSync(join(dir, "script.json"), JSON.stringify(script, null, 2) + "\n");
if (speech) writeFileSync(join(dir, "speech.json"), JSON.stringify(speechReport(speech.lines, speech.report, speech.backend), null, 2) + "\n");
const info = {
  title: meta.title,
  slug,
  source: file,
  format: meta.format,
  theme: meta.theme,
  seed: meta.seed,
  engineVersion: ENGINE_VERSION,
  durationSec: Number(((to - from + 1) / meta.fps).toFixed(3)),
  frames: { from, to, total: meta.totalFrames },
  thumbnail: thumb,
  audio,
  ...(speech ? { speech: { mode: "tts", backend: `${speech.backend.id} ${speech.backend.version}`, lines: speech.lines.length } } : {}),
  warnings: loaded.warnings,
  timeline: loaded.timeline,
  renderSeconds: Number(renderSeconds.toFixed(2)),
  totalSeconds: Number(seconds().toFixed(2)),
  // Bundles the script uses (CATALOG_BUNDLE_SPEC 7.3, 8): pins and credits; NC bundles mark the video non-commercial.
  ...(script.bundles?.length ? { bundles: bundleCredits(script, bundles), nonCommercial: bundleCredits(script, bundles).some((b) => b.license === "CC-BY-NC-4.0") } : {}),
  files: [enc ? "final.mp4" : "frames/", "thumb.png", "contact_sheet.png", "script.json", ...(flag("--hash") ? ["hashes.txt"] : []), ...(speech ? ["speech.json"] : []), ...(audio.skipped ? [] : ["audio.wav"])],
};
writeFileSync(join(dir, "meta.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`wrote ${dir}/ (${info.durationSec}s video, rendered at ${((to - from + 1) / renderSeconds).toFixed(0)} fps, total ${info.totalSeconds}s)`);
