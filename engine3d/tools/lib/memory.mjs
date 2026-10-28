// Peak resident memory of this Node process and its children (Chromium's processes, ffmpeg), sampled with ps
// every half second. macOS ps reports rss in KiB.

import { execFileSync } from "node:child_process";

function snapshot(root) {
  const rows = execFileSync("ps", ["-A", "-o", "pid=,ppid=,rss=,comm="], { encoding: "utf8" }).trim().split("\n").map((l) => {
    const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    return m && { pid: +m[1], ppid: +m[2], rss: +m[3], comm: m[4] };
  }).filter(Boolean);
  const kids = new Map();
  for (const r of rows) kids.set(r.ppid, [...(kids.get(r.ppid) ?? []), r]);
  const sums = { node: 0, chromium: 0, ffmpeg: 0, other: 0 };
  const walk = (r) => {
    const k = r.pid === root ? "node" : /ffmpeg/.test(r.comm) ? "ffmpeg" : /chrom|headless/i.test(r.comm) ? "chromium" : "other";
    sums[k] += r.rss / 1024;
    for (const c of kids.get(r.pid) ?? []) walk(c);
  };
  const me = rows.find((r) => r.pid === root);
  if (me) walk(me);
  return sums;
}

export function sampleMemory(root) {
  const peak = { node: 0, chromium: 0, ffmpeg: 0, other: 0, total: 0 };
  const tick = () => {
    const s = snapshot(root);
    for (const k of Object.keys(s)) peak[k] = Math.max(peak[k], s[k]);
    peak.total = Math.max(peak.total, s.node + s.chromium + s.ffmpeg + s.other);
  };
  tick();
  const timer = setInterval(tick, 500);
  return {
    stop() {
      clearInterval(timer);
      tick();
      return Object.fromEntries(Object.entries(peak).map(([k, v]) => [k, Math.round(v)]));
    },
  };
}
