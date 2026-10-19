// WAV reading and writing (PCM 16-bit) and audio decoding through ffmpeg (any input format → Float32).

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Write interleaved Float32 samples as 16-bit PCM WAV.
 * @param {Float32Array} samples  interleaved, `channels` per frame, range [-1, 1]
 */
export function writeWav(path, samples, sampleRate, channels) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([h, data]));
}

/**
 * Decode any audio file ffmpeg understands to interleaved stereo Float32 at `sampleRate`.
 * @returns {Float32Array}
 */
export function decodeAudio(path, sampleRate = 48000) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", String(sampleRate), "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`cannot decode ${path}: ${String(r.stderr).trim()}`);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice();
}

/**
 * Read a 16-bit PCM WAV (as written by writeWav, ffmpeg or Piper) without ffmpeg.
 * @returns {{ sampleRate:number, channels:number, samples:Float32Array }}  samples interleaved
 */
export function readWav(path) {
  const b = readFileSync(path);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${path} is not a WAV file`);
  let pos = 12;
  let fmt = null;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === "fmt ") fmt = { format: b.readUInt16LE(pos + 8), channels: b.readUInt16LE(pos + 10), sampleRate: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22) };
    if (id === "data") {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16) throw new Error(`${path}: only 16-bit PCM WAV is supported`);
      const n = Math.floor(Math.min(size, b.length - pos - 8) / 2);
      const samples = new Float32Array(n);
      for (let i = 0; i < n; i++) samples[i] = b.readInt16LE(pos + 8 + i * 2) / 32768;
      return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples };
    }
    pos += 8 + size + (size & 1);
  }
  throw new Error(`${path} has no audio data`);
}
