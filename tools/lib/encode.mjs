// Raw RGBA frames → ffmpeg → H.264 MP4 (spec 17.1 step 3). Respects pipe backpressure.
//   const enc = startEncoder("out/x.mp4", 1920, 1080);
//   await enc.write(rgba);   // per frame
//   await enc.close();

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function startEncoder(out, width, height, { fps = 60, crf = 18, preset = "medium" } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${width}x${height}`, "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "pipe"] });
  let stderr = "";
  ff.stderr.on("data", (d) => {
    // ffmpeg reports a harmless "Truncating packet" note on raw pipes (docs/benchmarks.md); keep the rest.
    for (const line of String(d).split("\n")) if (line.trim() && !line.includes("Truncating packet")) stderr += line + "\n";
  });
  const done = new Promise((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}: ${stderr}`)))));
  return {
    async write(rgba) {
      if (!ff.stdin.write(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength))) await new Promise((r) => ff.stdin.once("drain", r));
    },
    async close() {
      ff.stdin.end();
      await done;
      if (stderr) process.stderr.write(stderr);
    },
  };
}
