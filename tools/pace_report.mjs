#!/usr/bin/env node
// Pacing report for a story script (ADR-038): how long it runs, how often the framing changes, how long
// travel and talk take, and where nothing happens. Simulates only (no frames are drawn).
//   node tools/pace_report.mjs <script.json> [--speech babble|tts] [--voices file.json] [--json]
// --speech tts reuses (or renders) the Piper clips like record.mjs, so spoken lines get their audio length.

import { readFileSync } from "node:fs";
import { createEngine, compileScript } from "../engine/index.js";
import { catalog } from "../catalog/index.js";
import { prepareSpeech } from "./lib/tts/index.mjs";
import { createPiperBackend } from "./lib/tts/piper.mjs";

const TRAVEL = ["walk", "run", "sneak", "tiptoe", "walk_together", "swim"];
const QUIET = ["wait", "idle", "sleep"]; // beats that hold still: not action for the gap count
const WORLD_ACTION = ["activity", "title_card", "chapter_card", "time_card", "end_card", "caption", "text_pop"]; // world beats that are action
const GAP = 1.5; // s

/**
 * @param {object} script
 * @param {{ speech?: "babble"|"tts", voices?: object }} o
 */
export function paceReport(script, o = {}) {
  let loadScript = script;
  if ((o.speech ?? "babble") === "tts") loadScript = prepareSpeech(script, { catalog, backend: createPiperBackend(), overrides: o.voices ?? {}, log: () => {} }).script;
  const engine = createEngine({ catalog });
  const res = engine.load(loadScript);
  if (!res.ok) throw new Error(`script does not load: ${res.errors.map((e) => e.code).join(", ")}`);
  const total = res.durationSec;
  const compiled = compileScript(loadScript, catalog).script;
  const doOf = new Map();
  for (const sc of compiled.scenes) (sc.beats || []).forEach((b, i) => doOf.set(b.id ?? `#${sc.id}.${i}`, b));
  const spans = new Map();
  for (const a of engine.getAnchors()) {
    const s = spans.get(a.beatId) ?? {};
    if (a.anchor === "start") s.t0 ??= a.videoT;
    if (a.anchor === "end") s.t1 ??= a.videoT;
    spans.set(a.beatId, s);
  }
  // Travel beats
  const travel = {};
  const long = [];
  for (const [id, s] of spans) {
    const b = doOf.get(id);
    if (!b || !TRAVEL.includes(b.do) || s.t0 == null || s.t1 == null) continue;
    const d = s.t1 - s.t0;
    const row = (travel[b.do] ??= { count: 0, seconds: 0, max: 0 });
    row.count++;
    row.seconds += d;
    row.max = Math.max(row.max, d);
    if (d > 4) long.push({ id, do: b.do, seconds: round(d) });
  }
  // Talk share: the union of the say spans
  const events = engine.getEvents();
  const says = events.filter((e) => e.type === "say").map((e) => [e.videoT, e.videoT + e.dur, e.beatId]);
  const narr = events.filter((e) => e.type === "world" && e.do === "narrate").map((e) => [e.videoT, e.videoT + (e.params.dur ?? 3), e.beatId]);
  const talk = unionLength(says);
  // Gaps: no character beat (other than holding still), say or narration running
  const busy = [...says, ...narr];
  for (const [id, s] of spans) {
    const b = doOf.get(id);
    if (!b || (b.who === "world" && !WORLD_ACTION.includes(b.do)) || QUIET.includes(b.do) || s.t0 == null) continue;
    busy.push([s.t0, Math.max(s.t1 ?? s.t0, s.t0 + 0.2), id]);
  }
  for (const sc of engine.getScenes()) busy.push([sc.startT, sc.startT + 0.01, `scene ${sc.id}`]);
  const gaps = gapsOf(busy, total).filter((g) => g[1] - g[0] > GAP);
  // Shots: hard cuts and scene starts (merged within 0.25 s); framing changes also count the camera's pans
  const merge = (ts) => ts.sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 0.25);
  const log = engine.getCameraLog();
  const starts = engine.getScenes().map((s) => s.startT);
  const shots = merge([...log.filter((c) => c.cut).map((c) => c.t), ...starts]);
  const lens = shots.map((t, i) => (shots[i + 1] ?? total) - t);
  const framings = merge([...log.map((c) => c.t), ...starts]).length;
  return {
    seconds: round(total),
    scenes: engine.getScenes().length,
    shots: shots.length,
    avgShot: round(total / Math.max(1, shots.length)),
    longestShot: round(Math.max(...lens)),
    shotsOver6s: lens.filter((l) => l > 6).length,
    framings,
    travel: Object.fromEntries(Object.entries(travel).map(([k, v]) => [k, { count: v.count, seconds: round(v.seconds), avg: round(v.seconds / v.count), max: round(v.max) }])),
    travelOver4s: long,
    sayLines: says.length,
    talkSeconds: round(talk),
    talkShare: round(talk / total),
    gaps: gaps.length,
    longestGap: round(Math.max(0, ...gaps.map((g) => g[1] - g[0]))),
    gapList: gaps.map((g) => [round(g[0]), round(g[1]), g[2]]),
  };
}

const round = (x) => Math.round(x * 100) / 100;

function unionLength(spans) {
  let len = 0;
  let end = -Infinity;
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    if (b <= end) continue;
    len += b - Math.max(a, end);
    end = b;
  }
  return len;
}

/** Spans with nothing in them: [t0, t1, what starts after it]. */
function gapsOf(spans, total) {
  const out = [];
  let end = 0;
  for (const [a, b, what] of [...spans].sort((x, y) => x[0] - y[0])) {
    if (a > end) out.push([end, a, what ?? "a line"]);
    end = Math.max(end, b);
  }
  if (total > end) out.push([end, total, "the end"]);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const file = args.find((a, i) => !a.startsWith("--") && !/^--(speech|voices)$/.test(args[i - 1] || ""));
  if (!file) {
    console.error("usage: node tools/pace_report.mjs <script.json> [--speech babble|tts] [--voices file.json] [--json]");
    process.exit(2);
  }
  const script = JSON.parse(readFileSync(file, "utf8"));
  const voices = opt("--voices", null);
  const r = paceReport(script, { speech: opt("--speech", script.meta?.speech ?? "babble"), voices: voices ? JSON.parse(readFileSync(voices, "utf8")) : {} });
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    const m = (s) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`; };
    console.log(`length        ${m(r.seconds)} (${r.seconds} s, ${r.scenes} scenes)`);
    console.log(`shots         ${r.shots} (one per ${r.avgShot} s; longest ${r.longestShot} s; ${r.shotsOver6s} over 6 s); ${r.framings} framing changes incl. pans`);
    for (const [k, v] of Object.entries(r.travel)) console.log(`${k.padEnd(13)} ${v.count} x, ${v.seconds} s (avg ${v.avg} s, max ${v.max} s)`);
    console.log(`travel > 4 s  ${r.travelOver4s.length ? r.travelOver4s.map((x) => `${x.id} ${x.seconds}s`).join(", ") : "none"}`);
    console.log(`talk          ${r.sayLines} bubbles, ${r.talkSeconds} s (${Math.round(r.talkShare * 100)}% of the episode)`);
    console.log(`gaps > ${GAP} s   ${r.gaps} (longest ${r.longestGap} s)${r.gaps ? `: ${r.gapList.map((g) => `${g[0]}-${g[1]} (then ${g[2]})`).join(", ")}` : ""}`);
  }
}
