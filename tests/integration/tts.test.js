// Spoken dialogue with real Piper voices (SPEECH_SPEC 7). Skipped when Piper or a default voice is not installed
// (node tools/tts_setup.mjs --check).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { catalog } from "../../catalog/index.js";
import { prepareSpeech, loadVoiceTable } from "../../tools/lib/tts/index.mjs";
import { createPiperBackend, findPiper, listModels } from "../../tools/lib/tts/piper.mjs";
import { speechStory } from "../helpers/fake_tts.mjs";

const table = loadVoiceTable();
const models = listModels();
const needed = [...Object.values(table.timbres), table.narrator].filter((v) => v.model && !v.off).map((v) => v.model);
const missing = !findPiper() ? "Piper is not installed" : needed.filter((m) => !models[m]).map((m) => `voice ${m} is not installed`)[0];

/** The fixture story with every voice from the default table (no custom models). */
function story() {
  const s = speechStory();
  delete s.cast[1].voice.tts;
  return s;
}

test("real speech: the second run hits the cache for every line and gives identical audio", { skip: missing }, () => {
  const dir = mkdtempSync(join(tmpdir(), "stickman-tts-"));
  try {
    const backend = createPiperBackend();
    const a = prepareSpeech(story(), { catalog, backend, table, cacheDir: dir });
    assert.ok(a.lines.length >= 4 && a.lines.every((l) => !l.cached && l.dur > 0.3));
    const bytes = a.lines.map((l) => readFileSync(l.file));
    for (const l of a.lines) rmSync(l.file);
    const b = prepareSpeech(story(), { catalog, backend, table, cacheDir: dir });
    assert.ok(b.lines.every((l) => !l.cached), "rendered again from scratch");
    b.lines.forEach((l, i) => assert.ok(readFileSync(l.file).equals(bytes[i]), `deterministic: ${l.spoken}`));
    const c = prepareSpeech(story(), { catalog, backend, table, cacheDir: dir });
    assert.ok(c.lines.every((l) => l.cached), "the third run is all cache");
    assert.deepEqual(c.script, b.script);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("record.mjs --speech tts renders a short sample with speech.json", { skip: missing }, () => {
  const out = mkdtempSync(join(tmpdir(), "stickman-tts-rec-"));
  try {
    const file = join(out, "speech.json");
    writeFileSync(file, JSON.stringify(story()));
    const r = spawnSync("node", ["tools/record.mjs", file, "--out-dir", out, "--slug", "s", "--speech", "tts", "--preset", "ultrafast"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const dir = join(out, "s");
    for (const f of ["final.mp4", "speech.json", "meta.json"]) assert.ok(existsSync(join(dir, f)), f);
    const report = JSON.parse(readFileSync(join(dir, "speech.json"), "utf8"));
    assert.equal(report.lines.length, 4);
    assert.equal(JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")).speech.mode, "tts");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
