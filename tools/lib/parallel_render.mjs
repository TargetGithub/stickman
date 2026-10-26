// Multi-core rendering for tools/record.mjs: the output frames are cut into chunks, a pool of worker processes
// (lib/render_worker.mjs) draws and encodes them at the same time, and ffmpeg joins the chunk videos without
// re-encoding. Frames are pure with respect to (script, n), so the result matches a one-process render.
//
//   const jobs = defaultJobs(3840, 2160);   // from the cores and memory of this machine
//   await renderParallel({ jobs, picks, argv, script, source, lipSync, scale, videoPath, fps, crf, preset });

import { fork, spawnSync } from "node:child_process";
import { availableParallelism, totalmem } from "node:os";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const WORKER = new URL("./render_worker.mjs", import.meta.url).pathname;
// Memory one worker needs: Node, the engine and its scratch canvases, plus its x264 encoder (both grow
// with the frame size). Measured on the M3 Pro: about 0.5 GB at 1080p; at 4K a chunk's x264 alone holds about
// 1.7 GB once its lookahead fills (2026-10-26: nine 4K workers on 18 GB swapped 11 GB and drew 0.5 frames/s).
const BASE_BYTES = 0.25e9;
const BYTES_PER_PIXEL = 220;
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
 * @param {number} [size]  frames per chunk (a resumed render keeps the size it started with)
 * @returns {number[][]}
 */
export function planChunks(picks, jobs, size = Math.max(MIN_CHUNK, Math.ceil(picks.length / (jobs * 4)))) {
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
export async function renderParallel({ jobs, picks, argv, script, source, lipSync, scale, videoPath, framesDir, fps, crf, preset, hash, resume = false, log = console.log }) {
  const partsDir = videoPath ? join(dirname(videoPath), "parts") : null;
  const planFile = partsDir && join(partsDir, "plan.json");
  // --resume: a stopped render keeps its finished chunks (same chunk size, every frame there) and draws the rest.
  const kept = resume && planFile && existsSync(planFile) ? JSON.parse(readFileSync(planFile, "utf8")) : null;
  if (resume && !kept) log("  --resume: no earlier chunks to keep; rendering everything");
  if (kept && kept.frames !== picks.length) throw new Error(`--resume: the earlier render had ${kept.frames} frames, this one ${picks.length}; render without --resume`);
  if (kept && hash) throw new Error("--resume cannot write --hash (the kept chunks were not hashed)");
  const chunks = planChunks(picks, jobs, kept?.size);
  const partPath = (i) => join(partsDir, `part_${String(i).padStart(4, "0")}.mp4`);
  const done = new Set(kept ? chunks.map((c, i) => i).filter((i) => framesIn(partPath(i)) === chunks[i].length) : []);
  if (partsDir && !kept) {
    rmSync(partsDir, { recursive: true, force: true });
    mkdirSync(partsDir, { recursive: true });
    writeFileSync(planFile, JSON.stringify({ size: chunks[0]?.length ?? 0, frames: picks.length }));
  }
  if (kept) log(`  --resume: keeping ${done.size} of ${chunks.length} chunks`);
  const todo = chunks.map((c, i) => i).filter((i) => !done.has(i));
  const workers = Math.min(jobs, todo.length);
  // Each chunk encoder gets an even share of the cores (x264 would otherwise start one thread per core in every worker).
  const threads = Math.max(1, Math.round(availableParallelism() / workers));
  const hashes = new Array(chunks.length);
  const t0 = process.hrtime.bigint();
  let drawn = 0;
  let nextLog = 300;
  let next = 0;
  const todoFrames = todo.reduce((a, i) => a + chunks[i].length, 0);
  log(`  rendering ${todoFrames} frames with ${workers} workers (${todo.length} chunks)`);

  if (workers) await new Promise((resolve, reject) => {
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
      if (next >= todo.length) {
        p.send({ exit: true });
        return;
      }
      const index = todo[next++];
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
            log(`  frame ${drawn}/${todoFrames} (${(drawn / secs).toFixed(1)} fps)`);
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
    writeFileSync(list, concatList(chunks.map((_, i) => partPath(i))));
    const cat = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", videoPath]);
    if (cat.status !== 0) throw new Error(`joining the chunks failed: ${cat.stderr}`);
    rmSync(partsDir, { recursive: true, force: true });
  }
  return hash ? hashes.flat() : [];
}

/**
 * An ffmpeg concat list. ffmpeg reads relative entries from the list's own folder, so a relative --out-dir named
 * every chunk twice (out/x/parts/out/x/parts/part_0000.mp4) and the join failed after the whole render: use absolute paths.
 */
export function concatList(paths) {
  return paths.map((p) => `file '${resolve(p).replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

/** Frames in a chunk video (0 when it is missing or unreadable, as a chunk cut off mid-encode is). */
function framesIn(file) {
  if (!existsSync(file)) return 0;
  const r = spawnSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", file], { encoding: "utf8" });
  return r.status === 0 ? Number(r.stdout.trim()) || 0 : 0;
}
