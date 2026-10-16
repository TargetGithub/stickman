import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulate, frameAt } from "../../engine/sim.js";
import { parseAt } from "../../engine/director.js";
import { catalog } from "../../data/index.js";

const sample = JSON.parse(readFileSync(new URL("../../scripts/samples/m3_duel.json", import.meta.url), "utf8"));

function script(beats, chars) {
  return {
    version: 1,
    meta: { title: "t", format: "landscape", seed: 1, mode: "choreographed" },
    characters: chars || [
      { id: "a", x: 1000, facing: 1, color: "#22aaff" },
      { id: "b", x: 1110, facing: -1, color: "#ff3b3b" },
    ],
    camera: [{ at: 0, mode: "follow", targets: ["a", "b"] }],
    beats,
  };
}
const run = (beats, chars) => simulate(script(beats, chars), catalog, { dryRun: true });
const beat = (r, id) => r.beats.find((b) => b.id === id);
const codes = (r) => r.issues.map((i) => i.code);

test("parseAt understands the four forms", () => {
  assert.deepEqual(parseAt(2), { kind: "abs", t: 2 });
  assert.deepEqual(parseAt({ after: "k", delay: 0.5 }), { kind: "after", ref: "k", anchor: "end", delay: 0.5 });
  assert.deepEqual(parseAt({ with: "k" }), { kind: "with", ref: "k", anchor: "start", delay: 0 });
  assert.deepEqual(parseAt({ on: "my.beat.hit" }), { kind: "on", ref: "my.beat", anchor: "hit", delay: 0 });
});

test("the sample script runs cleanly: every beat done, no issues", () => {
  const r = simulate(sample, catalog, { dryRun: true });
  assert.deepEqual(codes(r), []);
  for (const b of r.beats) assert.equal(b.state, "done", `${b.id} is ${b.state}`);
  assert.ok(r.durationSec > 10 && r.durationSec < 25, `duration ${r.durationSec}`);
});

test("anchors chain: after = end, with = start, on hit = contact, delays add up", () => {
  const r = run([
    { id: "j", at: 0.5, who: "a", do: "jab", target: "b" },
    { id: "w", at: { with: "j", delay: 0.1 }, who: "world", do: "shake", params: { preset: "small" } },
    { id: "h", at: { on: "j.hit" }, who: "world", do: "flash" },
    { id: "n", at: { after: "j", delay: 0.25 }, who: "a", do: "cross", target: "b" },
  ]);
  const j = beat(r, "j");
  const eps = 1 / 60 + 1e-9;
  assert.ok(Math.abs(beat(r, "w").firedAt - (j.startedAt + 0.1)) <= eps);
  assert.ok(Math.abs(beat(r, "h").firedAt - j.hitAt) <= eps);
  assert.ok(Math.abs(beat(r, "n").firedAt - (j.endedAt + 0.25)) <= eps);
  assert.ok(j.hitAt > j.startedAt && j.endedAt > j.hitAt);
});

test("whiff and dodged attacks still fire their hit anchor (at window open)", () => {
  const r = run([
    { id: "j", at: 0.2, who: "a", do: "jab", target: "b", outcome: "whiff", approach: "walk" },
    { id: "after", at: { on: "j.hit" }, who: "world", do: "flash" },
  ]);
  assert.equal(beat(r, "after").state, "done");
});

test("a beat for a busy character waits, with a drift warning; interrupt cuts in", () => {
  const queued = run([
    { id: "t", at: 0.2, who: "a", do: "taunt" },
    { id: "late", at: 0.4, who: "a", do: "jab", target: "b" },
  ]);
  assert.ok(beat(queued, "late").firedAt >= beat(queued, "t").endedAt - 1e-9, "waited for taunt");
  assert.ok(codes(queued).includes("W_QUEUE_DRIFT"));
  const cut = run([
    { id: "t", at: 0.2, who: "a", do: "taunt" },
    { id: "now", at: 0.4, who: "a", do: "jab", target: "b", interrupt: true },
  ]);
  assert.ok(Math.abs(beat(cut, "now").firedAt - 0.4) < 1 / 60 + 1e-9);
  assert.ok(beat(cut, "t").notes.includes("interrupted"));
});

test("approach runs in so the attack connects without a position error", () => {
  const r = run([{ id: "j", at: 0.2, who: "a", do: "cross", target: "b", approach: "run" }],
    [{ id: "a", x: 600, facing: 1, color: "#22aaff" }, { id: "b", x: 1500, facing: -1, color: "#ff3b3b" }]);
  assert.deepEqual(codes(r), []);
  assert.ok(beat(r, "j").notes.some((n) => n.startsWith("run")));
  assert.ok(beat(r, "j").notes.some((n) => n.startsWith("hit b")));
});

test("runtime issues: unreachable, too-long approach, dead actor, unresolved anchor", () => {
  const far = [{ id: "a", x: 200, facing: 1, color: "#22aaff" }, { id: "b", x: 3000, facing: -1, color: "#ff3b3b" }];
  assert.ok(codes(run([{ id: "j", at: 0.2, who: "a", do: "jab", target: "b" }], far)).includes("E_SIM_UNREACHABLE"));
  assert.ok(codes(run([{ id: "j", at: 0.2, who: "a", do: "jab", target: "b", approach: "walk" }], far)).includes("E_SIM_APPROACH"));
  assert.ok(codes(run([
    { id: "k", at: 0.2, who: "b", do: "ko_fall" },
    { id: "z", at: { after: "k" }, who: "b", do: "jab", target: "a" },
  ])).includes("E_SIM_DEAD_ACTOR"));
  assert.ok(codes(run([
    { id: "t", at: 0.2, who: "a", do: "taunt" },
    { id: "z", at: { on: "t.hit" }, who: "world", do: "flash" },
  ])).includes("E_SIM_UNRESOLVED"));
});

test("slowmo stretches video time relative to story time", () => {
  const plain = run([{ id: "t", at: 0.2, who: "a", do: "taunt" }]);
  const slow = run([
    { id: "t", at: 0.2, who: "a", do: "taunt" },
    { at: 0.2, who: "world", do: "slowmo", params: { scale: 0.25, duration: 1 } },
  ]);
  assert.ok(slow.durationSec - plain.durationSec > 2.5, `${plain.durationSec} → ${slow.durationSec}`);
});

test("non-dry runs record one snapshot per frame; runs are deterministic", () => {
  const a = simulate(sample, catalog);
  const b = simulate(sample, catalog);
  assert.equal(a.store.length, a.totalFrames);
  assert.deepEqual(a.anchors, b.anchors);
  const last = (r) => Array.from(frameAt(r, r.totalFrames - 1).chars[0].joints);
  assert.deepEqual(last(a), last(b));
});

test("spawn, teleport behind a target, and despawn", () => {
  const r = simulate(script([
    { id: "s", at: 0.5, who: "b", do: "spawn" },
    { id: "t", at: { after: "s", delay: 0.2 }, who: "b", do: "teleport", target: "a" },
    { id: "d", at: { after: "t", delay: 0.3 }, who: "b", do: "despawn" },
  ], [{ id: "a", x: 1000, facing: 1, color: "#22aaff" }, { id: "b", x: 1400, facing: -1, color: "#ff3b3b" }]), catalog);
  const at = (t) => frameAt(r, Math.round(t * 60));
  const bIndex = 1;
  assert.equal(at(0.1).chars[bIndex].alpha, 0, "hidden before spawning");
  const s = r.beats.find((b) => b.id === "s");
  const tBeat = r.beats.find((b) => b.id === "t");
  const d = r.beats.find((b) => b.id === "d");
  assert.ok(at(s.endedAt + 0.05).chars[bIndex].alpha > 0.9, "visible after spawning");
  const after = at(tBeat.endedAt + 0.05);
  const hipX = (c) => c.joints[0];
  assert.ok(hipX(after.chars[bIndex]) < hipX(after.chars[0]), "landed on the far side of the target");
  assert.equal(after.chars[bIndex].facing, 1, "facing the target");
  assert.equal(frameAt(r, r.totalFrames - 1).chars[bIndex].alpha, 0, "gone after despawning");
  assert.deepEqual(codes(r), []);
  assert.ok(d.endedAt > tBeat.endedAt);
});

test("acting before spawning warns W_HIDDEN", () => {
  const r = run([
    { id: "x", at: 0.2, who: "b", do: "taunt" },
    { id: "s", at: 2, who: "b", do: "spawn" },
  ]);
  assert.ok(codes(r).includes("W_HIDDEN"));
});
