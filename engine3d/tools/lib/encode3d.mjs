// Raw RGBA frames from readPixels (bottom row first) → ffmpeg → H.264. Like tools/lib/encode.mjs, plus the
// flip, BT.709 conversion and tags (swscale defaults to BT.601, which shifts saturated toy colours), and
// Apple's hardware encoder as an option.
//   x264: libx264 -preset medium -crf 18 (the 2D recorder's settings)
//   vt:   h264_videotoolbox at a fixed bitrate (YouTube's recommended SDR rates, with headroom)

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const VT_BITRATE = (w, fps) => (w >= 3840 ? (fps > 30 ? "60M" : "45M") : w >= 1920 ? (fps > 30 ? "16M" : "12M") : "8M");

export function startEncoder(out, width, height, { fps = 30, encoder = "x264", crf = 18, preset = "medium", threads = 0 } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const codec = encoder === "vt"
    ? ["-c:v", "h264_videotoolbox", "-b:v", VT_BITRATE(width, fps), "-profile:v", "high", "-allow_sw", "0"]
    : ["-c:v", "libx264", ...(threads ? ["-threads", String(threads)] : []), "-preset", preset, "-crf", String(crf)];
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${width}x${height}`, "-framerate", String(fps), "-i", "-",
    "-vf", "vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    ...codec, "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "pipe"] });
  let stderr = "";
  ff.stderr.on("data", (d) => {
    for (const line of String(d).split("\n")) if (line.trim() && !line.includes("Truncating packet")) stderr += line + "\n";
  });
  const done = new Promise((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}: ${stderr}`)))));
  return {
    async write(rgba) {
      if (!ff.stdin.write(rgba)) await new Promise((r) => ff.stdin.once("drain", r));
    },
    async close() {
      ff.stdin.end();
      await done;
      if (stderr) process.stderr.write(stderr);
    },
  };
}
