#!/usr/bin/env node
// One episode's YouTube kit: render3d.mjs renders, plus a thumbnail, a contact sheet and youtube.txt.
//   node engine3d/tools/episode3d.mjs engine3d/scripts/series/toybox/pk01_count_to_ten.json --review   (1080p30)
//   node engine3d/tools/episode3d.mjs <script> --final                                                    (4K60)
//   node engine3d/tools/episode3d.mjs <script>                                                            (thumbnail + youtube.txt only)
// Output: out/series3d/<meta.series>/<file name>/{review_1080p30.mp4, final_4k60.mp4, thumbnail.jpg, contact.jpg, youtube.txt}

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadCatalog3d } from "../catalog/index.mjs";
import { buildPlan, thumbnailTime } from "../runtime/plan.js";
import { speakPlan } from "./lib/audio3d.mjs";
import { REPO } from "./lib/server.mjs";

const args = process.argv.slice(2);
const input = resolve(args.find((a) => !a.startsWith("--")));
const script = JSON.parse(readFileSync(input, "utf8"));
const meta = script.meta ?? {};
const id = basename(input, ".json");
const dir = join(REPO, "out/series3d", meta.series ?? "misc", id);
mkdirSync(dir, { recursive: true });
const render = (extra) => {
  const r = spawnSync(process.execPath, [join(REPO, "engine3d/tools/render3d.mjs"), input, ...extra], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const ff = (a) => {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...a]);
  if (r.status !== 0) throw new Error(String(r.stderr));
};

const want = (f) => args.includes(f);
const videos = [];
if (want("--review")) videos.push(["1080p", 30, "review_1080p30.mp4"]);
if (want("--final")) videos.push(["4k", 60, "final_4k60.mp4"]);
for (const [res, fps, file] of videos) {
  render(["--res", res, "--fps", String(fps), "--out", join(dir, file)]);
  renameSync(join(dir, file.replace(/\.mp4$/, ".json")), join(dir, file.replace(/\.mp4$/, "_stats.json")));
}

// The plan timed with the real TTS clips (cached by the renders above), as the videos are: thumbnail
// { scene, at } and the chapter stamps come from its scene starts.
const catalog = loadCatalog3d();
const plan = await buildPlan({ script, catalog, speech: speakPlan(await buildPlan({ script, catalog })) });

// Thumbnail: the frame at meta.thumbnail ({ t } or { scene, at }; default 1 s), drawn at 4K and scaled to 1280x720.
const tt = thumbnailTime(plan, meta.thumbnail);
render(["--res", "4k", "--fps", "60", "--speech", "tts", "--stills", String(tt), "--out", join(dir, "thumb.mp4")]);
const stillDir = join(dir, `${id}_stills`);
const png = join(stillDir, `${id}_4k_t${tt.toFixed(2)}.png`);
ff(["-i", png, "-vf", "scale=1280:720:flags=lanczos", "-q:v", "2", join(dir, "thumbnail.jpg")]);
rmSync(stillDir, { recursive: true, force: true });

// Contact sheet from the newest video: 12 frames spread over the episode.
const video = join(dir, videos[videos.length - 1]?.[2] ?? "review_1080p30.mp4");
if (existsSync(video)) {
  const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout);
  ff(["-i", video, "-vf", `fps=${(12 / dur).toFixed(5)},scale=640:-1,tile=4x3`, "-frames:v", "1", join(dir, "contact.jpg")]);
}

// youtube.txt: title, description with chapters, tags. Upload is left to Sridhar.
const stamp = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// YouTube chapters must be 10 s or longer: a short one merges into the next (the last into the one before).
const chapters = (plan.scenes ?? []).filter((s) => s.title).map((c) => ({ ...c }));
const len = (i) => (chapters[i + 1]?.start ?? plan.duration) - chapters[i].start;
for (let i = 0; i < chapters.length && chapters.length > 1; ) {
  if (len(i) >= 10) i++;
  else if (i < chapters.length - 1) chapters.splice(i + 1, 1, { ...chapters[i + 1], start: chapters[i].start, title: i === 0 ? chapters[0].title : chapters[i + 1].title }) && chapters.splice(i, 1);
  else chapters.splice(i, 1);
}
if (chapters[0]) chapters[0].start = 0;
const chapterOk = chapters.length >= 3;
const y = meta.youtube ?? {};
writeFileSync(join(dir, "youtube.txt"), [
  `TITLE: ${y.title ?? meta.title}`,
  "",
  "DESCRIPTION:",
  y.description ?? "",
  ...(chapterOk ? ["", ...chapters.map((c) => `${stamp(c.start)} ${c.title}`)] : []),
  "",
  ...(meta.skills?.length ? [`Skills: ${meta.skills.join(", ")}`, ""] : []),
  `TAGS: ${(y.tags ?? []).join(", ")}`,
  "",
  `AUDIENCE: Made for kids (${meta.audience ?? "prek"}). Length ${stamp(plan.duration)}.`,
  "",
].join("\n"));
console.log(`  kit -> ${dir}`);
