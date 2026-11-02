#!/usr/bin/env node
// Pause (and resume) long renders safely (tools/lib/render_pause.mjs).
// Pausing stops the queue script first, so it cannot start the next episode, then each tools/record.mjs with its
// workers and ffmpeg encoders, and the caffeinate keeping the Mac awake for them. Finished episodes stay finished,
// and a stopped episode keeps its finished chunks (<slug>/parts), so resuming continues where it stopped (--resume).
// Usage:
//   node tools/render_pause.mjs                       pause every running render queue and render
//   node tools/render_pause.mjs --status              show what is running, change nothing
//   node tools/render_pause.mjs --dry-run             show what a pause would stop
//   node tools/render_pause.mjs --resume [queue.sh] [first last]
//                                                     start a queue again, detached, with caffeinate
//                                                     (default series/doopi/s2/render_queue.sh; log out/logs/<queue>.out)

import { execFileSync, spawn } from "node:child_process";
import { openSync, existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { parsePs, renderProcesses, recordTarget } from "./lib/render_pause.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const ps = () => parsePs(execFileSync("ps", ["-axo", "pid=,ppid=,command="], { encoding: "utf8" }));
const short = (p) => `${String(p.pid).padStart(6)}  ${p.command.length > 150 ? `${p.command.slice(0, 147)}...` : p.command}`;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const signal = (pid, sig) => { try { process.kill(pid, sig); } catch { /* already gone */ } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function show(found) {
  for (const [name, list] of [["queues", found.queues], ["renders (with workers and encoders)", found.renders], ["keep-awake", found.helpers]]) {
    console.log(`${name}: ${list.length ? "" : "none"}`);
    for (const p of list) console.log(short(p));
  }
  for (const p of found.renders) {
    const t = recordTarget(p.command);
    if (t) console.log(`rendering ${t.slug} (${t.script})`);
  }
}

if (flag("--resume")) {
  const rest = args.filter((a) => a !== "--resume");
  const queue = rest.find((a) => a.endsWith(".sh")) ?? "series/doopi/s2/render_queue.sh";
  const range = rest.filter((a) => /^\d+$/.test(a));
  if (!existsSync(queue)) {
    console.error(`no queue script ${queue}`);
    process.exit(2);
  }
  const running = renderProcesses(ps(), process.pid);
  if (running.queues.length || running.renders.length) {
    console.error("a render is already running (pause it first, or check with --status):");
    show(running);
    process.exit(1);
  }
  mkdirSync("out/logs", { recursive: true });
  const log = `out/logs/${basename(queue, ".sh").replace(/^render_queue$/, "s2_queue")}.out`;
  const fd = openSync(log, "a");
  const q = spawn("zsh", [queue, ...range], { detached: true, stdio: ["ignore", fd, fd] });
  q.unref();
  spawn("caffeinate", ["-is", "-w", String(q.pid)], { detached: true, stdio: "ignore" }).unref();
  console.log(`resumed ${queue}${range.length ? ` (${range.join("-")})` : ""}: pid ${q.pid}, kept awake with caffeinate; log ${log}`);
  process.exit(0);
}

const found = renderProcesses(ps(), process.pid);
if (flag("--status") || flag("--dry-run")) {
  show(found);
  process.exit(0);
}
if (!found.queues.length && !found.renders.length) {
  console.log("nothing to pause: no render queue or render is running");
  process.exit(0);
}
show(found);
// Queues first: a queue left running would start the next episode the moment its render stops.
for (const p of found.queues) signal(p.pid, "SIGTERM");
await wait(500);
for (const p of found.renders) signal(p.pid, "SIGTERM");
let left = [...found.queues, ...found.renders].filter((p) => alive(p.pid));
for (let i = 0; i < 20 && left.length; i++) {
  await wait(500);
  left = left.filter((p) => alive(p.pid));
}
for (const p of left) signal(p.pid, "SIGKILL"); // an encoder that would not stop
for (const p of found.helpers) signal(p.pid, "SIGTERM");
const after = renderProcesses(ps(), process.pid);
if (after.queues.length || after.renders.length) {
  console.error("still running after the pause:");
  show(after);
  process.exit(1);
}
console.log("paused. Finished episodes stay done; the stopped one keeps its finished chunks.");
console.log("resume with: node tools/render_pause.mjs --resume");
