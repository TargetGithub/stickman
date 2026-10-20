// Rubber-hose limbs demo (ADR-034): renders scripts/samples/v3_10_limbs.json three times, with every scene's
// limbStyle set to straight, bendy and rubber (a corner label from a v3 text layer), then stacks them side by side.
// Usage: node tools/limb_demo.mjs [--out out/demos/v3_10_limbs] [--to N]   (needs ffmpeg)
//   writes <out>/<style>/final.mp4 for each style, side_by_side.mp4 (straight | bendy, with sound) and
//   side_by_side_rubber.mp4 (straight | rubber), 960x540 each half.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const out = arg("--out", join(root, "out/demos/v3_10_limbs"));
const to = arg("--to", null);
const base = JSON.parse(readFileSync(join(root, "scripts/samples/v3_10_limbs.json"), "utf8"));
mkdirSync(out, { recursive: true });

const STYLES = ["straight", "bendy", "rubber"];
for (const style of STYLES) {
  const s = structuredClone(base);
  for (const sc of s.scenes) sc.limbStyle = style;
  s.layers = [...(s.layers || []), { id: "limb_label", from: 0, to: 999 }];
  s.text = [...(s.text || []), { id: "limb_label_text", text: `limbStyle: ${style}`, style: "label", layer: "limb_label", x: 230, y: 70, size: 54 }];
  const file = join(out, `${style}.json`);
  writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
  const opts = ["--out-dir", out, "--slug", style, ...(style === "straight" ? [] : ["--no-audio"]), ...(to ? ["--from", "0", "--to", to] : [])];
  console.log(`rendering ${style} ...`);
  execFileSync("node", [join(root, "tools/record.mjs"), file, ...opts], { stdio: "inherit" });
}

const pair = (a, b, name) => {
  const args = ["-y", "-i", join(out, a, "final.mp4"), "-i", join(out, b, "final.mp4"),
    "-filter_complex", "[0:v]scale=960:540[a];[1:v]scale=960:540[b];[a][b]hstack=inputs=2[v]",
    "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", join(out, name)];
  execFileSync("ffmpeg", args, { stdio: "ignore" });
  console.log(`wrote ${join(out, name)}`);
};
pair("straight", "bendy", "side_by_side.mp4");
pair("straight", "rubber", "side_by_side_rubber.mp4");
