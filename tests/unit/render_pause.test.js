// Pausing renders (tools/lib/render_pause.mjs): which processes a pause stops, from a ps table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePs, renderProcesses, recordTarget } from "../../tools/lib/render_pause.mjs";

const PS = `
  100     1 zsh series/doopi/s2/render_queue.sh
  101     1 caffeinate -is -w 100
  102   100 node tools/record.mjs scripts/series/doopi/s2/ep10_v3.json --speech tts --res 4k --fps 60 --out-dir /Volumes/D/x --slug s2_ep10_4k60 --resume
  103   102 /usr/local/bin/node /repo/tools/lib/render_worker.mjs 3
  104   103 ffmpeg -y -f rawvideo -i - /Volumes/D/x/s2_ep10_4k60/parts/part_0007.mp4
  105     1 ffmpeg -y -f rawvideo -i - /Volumes/D/x/s2_ep09_4k60/parts/part_0010.mp4
  106     1 grep render_queue.sh
  107     1 node tools/render_pause.mjs
  108     1 caffeinate -is -w 999
  109     1 /bin/zsh -c tail -f out/logs/s2_render_ep10_4k60.log
  110     1 ffmpeg -i in.mp4 out.mp4
  111     1 zsh out/logs/queue_comp56.sh
`;

const ids = (list) => list.map((p) => p.pid).sort((a, b) => a - b);
const found = renderProcesses(parsePs(PS), 107);

const CASES = [
  ["queues: shells running queue scripts, not a grep for one", found.queues, [100, 111]],
  ["renders: record.mjs, its workers and encoders, and orphaned chunk encoders", found.renders, [102, 103, 104, 105]],
  ["keep-awake: only caffeinate waiting on a queue or render", found.helpers, [101]],
];
for (const [name, list, want] of CASES) test(`renderProcesses ${name}`, () => assert.deepEqual(ids(list), want));

test("renderProcesses never includes the pausing tool itself or unrelated ffmpeg", () => {
  const all = ids([...found.queues, ...found.renders, ...found.helpers]);
  for (const pid of [106, 107, 108, 109, 110]) assert.ok(!all.includes(pid), String(pid));
});

test("nothing running: nothing to stop", () => {
  const none = renderProcesses(parsePs("  5 1 node tools/serve.mjs 5173\n"), 0);
  assert.deepEqual([none.queues.length, none.renders.length, none.helpers.length], [0, 0, 0]);
});

const TARGETS = [
  ["node tools/record.mjs scripts/a.json --res 4k --slug s2_ep01_4k60", { slug: "s2_ep01_4k60", script: "scripts/a.json" }],
  ["/usr/local/bin/node /repo/tools/lib/render_worker.mjs 3", null],
];
for (const [cmd, want] of TARGETS) test(`recordTarget(${cmd.slice(0, 40)})`, () => assert.deepEqual(recordTarget(cmd), want));
