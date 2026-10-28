// Compare frame-hash files written by render3d.mjs --hash (see determinism.sh). Writes summary.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const load = (n) => JSON.parse(readFileSync(join(dir, `${n}.json`), "utf8"));
const pairs = [["gpu_a", "gpu_b"], ["gpu_a", "gpu_jobs3"], ["swiftshader_a", "swiftshader_b"], ["gpu_a", "swiftshader_a"]];
const out = {};
for (const [a, b] of pairs) {
  const x = load(a).hashes;
  const y = load(b).hashes;
  const n = Math.min(x.length, y.length);
  let same = 0;
  const diff = [];
  for (let i = 0; i < n; i++) (x[i] === y[i] ? same++ : diff.push(i));
  out[`${a} vs ${b}`] = { frames: n, identical: same, firstDiffs: diff.slice(0, 10) };
  console.log(`${a} vs ${b}: ${same}/${n} identical`);
}
for (const n of ["gpu_a", "swiftshader_a"]) {
  const s = load(n);
  out[n] = { renderFps: s.renderFps, renderSec: s.renderSec, memory: s.memory, gpu: s.gpu };
}
writeFileSync(join(dir, "summary.json"), JSON.stringify(out, null, 2));
