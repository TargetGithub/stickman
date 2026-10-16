// Recorder end to end (needs ffmpeg): a short clip of the minimal fixture, with audio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("record.mjs writes final.mp4 (H.264 + AAC), thumbnail, contact sheet and metadata", () => {
  const out = mkdtempSync(join(tmpdir(), "stickman-rec-"));
  try {
    const r = spawnSync("node", ["tools/record.mjs", "tests/fixtures/good/minimal.json", "--out-dir", out, "--from", "0", "--to", "119", "--hash"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const dir = join(out, "fixture");
    for (const f of ["final.mp4", "thumb.png", "contact_sheet.png", "script.json", "meta.json", "hashes.txt", "audio.wav"]) assert.ok(existsSync(join(dir, f)), f);
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,codec_type", "-of", "csv=p=0", join(dir, "final.mp4")], { encoding: "utf8" });
    assert.match(probe.stdout, /h264,video/);
    assert.match(probe.stdout, /aac,audio/);
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    assert.equal(meta.frames.to, 119);
    assert.equal(meta.durationSec, 2);
    assert.ok(meta.audio.events > 0);
    assert.equal(readFileSync(join(dir, "hashes.txt"), "utf8").trim().split("\n").length, 120);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
