// Multi-core rendering for tools/record.mjs: the output frames are cut into chunks, a pool of worker processes
// (lib/render_worker.mjs) draws and encodes them at the same time, and ffmpeg joins the chunk videos without
// re-encoding. Frames are pure with respect to (script, n), so the result matches a one-process render.
//
//   const jobs = defaultJobs(3840, 2160);   // from the cores and memory of this machine
//   await renderParallel({ jobs, picks, argv, script, source, lipSync, scale, videoPath, fps, crf, preset });

import { fork, spawnSync } from "node:child_process";
import { availableParallelism, totalmem } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const WORKER = new URL("./render_worker.mjs", import.meta.url).pathname;
// Memory one worker needs: Node, the engine and its scratch canvases, plus its x264 encoder (both grow
// with the frame size). Measured on the M3 Pro: about 0.5 GB at 1080p and 1.25 GB at 4K.
const BASE_BYTES = 0.25e9;
const BYTES_PER_PIXEL = 120;
// Keep this share of the machine's memory for everything else.
const MEMORY_SHARE = 0.6;
// Below this many frames per worker, starting workers costs more than it saves.
const MIN_CHUNK = 60;

/**
 * How many workers suit a render of this size: one per core, fewer when memory would run short.
 * @param {number} width  output width in px
 * @param {number} height output height in px
 * @param {{ cpus?: number, memory?: number }} [machine] for tests
 */
export function defaultJobs(width, height, { cpus = availableParallelism(), memory = totalmem() } = {}) {
  const perJob = BASE_BYTES + width * height * BYTES_PER_PIXEL;
  return Math.max(1, Math.min(cpus, Math.floor((memory * MEMORY_SHARE) / perJob)));
}

/**
 * Cut the output frames into chunks: about four per worker, so a worker that finishes early takes another
 * (busy fight scenes draw slower than quiet ones), and never shorter than MIN_CHUNK frames.
 * @param {number[]} picks  engine frame numbers to draw, in output order
 * @param {number} jobs
 * @returns {number[][]}
 */
export function planChunks(picks, jobs) {
  const size = Math.max(MIN_CHUNK, Math.ceil(picks.length / (jobs * 4)));
  const chunks = [];
  for (let i = 0; i < picks.length; i += size) chunks.push(picks.slice(i, i + size));
  return chunks;
}

/** Workers worth starting for this many frames (1 means render in this process). */
export function usefulJobs(jobs, frames) {
  return Math.max(1, Math.min(jobs, Math.floor(frames / MIN_CHUNK)));
}

/**
 * Render picks with `jobs` workers into videoPath (or framesDir PNGs when videoPath is null).
 * @returns {Promise<string[]>} frame hashes in output order when hash is set, else []
 */
export async function renderParallel({ jobs, picks, argv, script, source, lipSync, scale, videoPath, framesDir, fps, crf, preset, hash, log = console.log }) {
  const chunks = planChunks(picks, jobs);
  const workers = Math.min(jobs, chunks.length);
  const partsDir = videoPath ? join(dirname(videoPath), "parts") : null;
  if (partsDir) {
    rmSync(partsDir, { recursive: true, force: true });
    mkdirSync(partsDir, { recursive: true });
  }
  const partPath = (i) => join(partsDir, `part_${String(i).padStart(4, "0")}.mp4`);
  // Each chunk encoder gets an even share of the cores (x264 would otherwise start one thread per core in every worker).
  const threads = Math.max(1, Math.round(availableParallelism() / workers));
  const hashes = new Array(chunks.length);
  const t0 = process.hrtime.bigint();
  let drawn = 0;
  let nextLog = 300;
  let next = 0;
  log(`  rendering ${picks.length} frames with ${workers} workers (${chunks.length} chunks)`);

  await new Promise((resolve, reject) => {
    const procs = [];
    let finished = 0;
    let failed = false;
    const fail = (err) => {
      if (failed) return;
      failed = true;
      for (const p of procs) p.kill();
      reject(err instanceof Error ? err : new Error(err));
    };
    const give = (p) => {
      if (next >= chunks.length) {
        p.send({ exit: true });
        return;
      }
      const index = next++;
      p.send({ chunk: { index, picks: chunks[index], out: partsDir ? partPath(index) : null, framesDir, fps, crf, preset, threads, hash } });
    };
    for (let w = 0; w < workers; w++) {
      const p = fork(WORKER, [], { serialization: "advanced", stdio: ["ignore", "inherit", "inherit", "ipc"] });
      procs.push(p);
      p.on("message", (m) => {
        if (m.error) fail(new Error(`render worker failed: ${m.error}`));
        else if (m.ready) give(p);
        else if (m.progress) {
          drawn += m.progress;
          if (drawn >= nextLog) {
            const secs = Number(process.hrtime.bigint() - t0) / 1e9;
            log(`  frame ${drawn}/${picks.length} (${(drawn / secs).toFixed(0)} fps)`);
            nextLog += 300;
          }
        } else if (m.done) {
          hashes[m.done.index] = m.done.hashes;
          give(p);
        }
      });
      p.on("exit", (code) => {
        if (failed) return;
        if (code !== 0) return fail(new Error(`render worker exited with code ${code}`));
        if (++finished === workers) resolve();
      });
      p.send({ init: { argv, script, source, lipSync, scale } });
    }
  });

  if (partsDir) {
    // Join the chunk videos as they are (same encoder settings, so the streams line up).
    const list = join(partsDir, "list.txt");
    writeFileSync(list, chunks.map((_, i) => `file '${partPath(i)}'`).join("\n") + "\n");
    const cat = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", videoPath]);
    if (cat.status !== 0) throw new Error(`joining the chunks failed: ${cat.stderr}`);
    rmSync(partsDir, { recursive: true, force: true });
  }
  return hash ? hashes.flat() : [];
}
