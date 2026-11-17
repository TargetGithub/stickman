// Toybox 10K daily uploads: the next N rendered, reviewed, not-yet-uploaded lessons, one band after another
// (pre-K, K, grades 1-5; babies only with --bands bb), uploaded public to Toybox Elementary with tools/youtube_upload.mjs
// (grade playlist picked by the tool). A folder with youtube_upload.json is never uploaded again.
//
//   node engine3d/tools/upload10k.mjs [--count 10] [--bands pk,kg,g1,g2,g3,g4,g5] [--privacy public] [--dry]
//
// Stops at the first failed upload (quota, expired sign-in) and says why. Prints the uploaded ids with the Studio
// level each needs (Studio-only fields: Education type Lecture, US system, level), then refreshes 10K/UPLOADS.md.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, paths, scriptHash } from "./script10k/index.mjs";
import { bandOf } from "./script10k/bands.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const COUNT = Number(opt("--count", 10));
const BANDS = opt("--bands", "pk,kg,g1,g2,g3,g4,g5").split(",");
const PRIVACY = opt("--privacy", "public");
const DRY = args.includes("--dry");
const REPO = new URL("../../", import.meta.url).pathname;
export const LEVEL = { bb: "Elementary School", pk: "Elementary School", kg: "Kindergarten", g1: "First Grade", g2: "Second Grade", g3: "Third Grade", g4: "Fourth Grade", g5: "Fifth Grade" };

if (!existsSync(ROOT)) { console.error(`${ROOT} is not mounted: nothing uploaded`); process.exit(2); }
const man = JSON.parse(readFileSync(join(ROOT, "render_manifest.json"), "utf8"));
const reviewOk = (id) => {
  const f = join(paths(id).qaDir, "review.json");
  if (!existsSync(f)) return false;
  const r = JSON.parse(readFileSync(f, "utf8"));
  // Reviews from before the preview gate carry no hash; those lessons rendered under the gate that existed then.
  return r.ok && (r.scriptHash === undefined || r.scriptHash === scriptHash(id));
};
// Candidates per band: rendered and spot-checked, final present, still reviewed ok, no upload record.
const pool = Object.fromEntries(BANDS.map((b) => [b, []]));
for (const [id, m] of Object.entries(man).sort(([a], [b]) => (a < b ? -1 : 1))) {
  const b = bandOf(id);
  if (!pool[b] || !m.ok || !m.dir) continue;
  if (!existsSync(join(m.dir, "final_4k60.mp4")) || existsSync(join(m.dir, "youtube_upload.json"))) continue;
  if (!reviewOk(id)) continue;
  pool[b].push({ id, dir: m.dir });
}
const picks = [];
for (let round = 0; picks.length < COUNT && BANDS.some((b) => pool[b].length > round); round++)
  for (const b of BANDS) if (picks.length < COUNT && pool[b][round]) picks.push(pool[b][round]);

console.log(`${picks.length} to upload (${PRIVACY}): ${picks.map((p) => p.id).join(" ") || "none"}; left after: ${Object.values(pool).flat().length - picks.length}`);
if (DRY || !picks.length) process.exit(0);

const done = [];
for (const p of picks) {
  const r = spawnSync(process.execPath, [join(REPO, "tools/youtube_upload.mjs"), p.dir, "--channel", "toybox", "--privacy", PRIVACY, "--yes"], { encoding: "utf8", cwd: REPO });
  process.stdout.write(r.stdout);
  if (r.status !== 0 || !existsSync(join(p.dir, "youtube_upload.json"))) {
    console.error(`STOPPED at ${p.id}: ${(r.stderr || r.stdout).trim().split("\n").slice(-3).join(" | ")}`);
    break;
  }
  const up = JSON.parse(readFileSync(join(p.dir, "youtube_upload.json"), "utf8"));
  done.push({ id: p.id, videoId: up.videoId, level: LEVEL[bandOf(p.id)] });
}
spawnSync(process.execPath, [join(REPO, "engine3d/tools/script10k.mjs"), "uploads"], { stdio: "inherit", cwd: REPO });
console.log(`\nUploaded ${done.length}. Studio fields still to set (Type Lecture, United States, level):`);
for (const d of done) console.log(`  ${d.id} https://studio.youtube.com/video/${d.videoId}/edit  level: ${d.level}`);
process.exit(done.length === picks.length ? 0 : 1);
