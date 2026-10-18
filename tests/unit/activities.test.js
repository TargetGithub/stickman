// Activities (S5.6): every activity runs and ends on its own; rallies pass the ball `reps` times and
// end with a miss; winners, interruptions, seats, held objects, and the end anchor for later beats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../engine/sim.js";
import { catalog } from "../../catalog/index.js";

const PLANS = { kai: "stickman", pip: "buddy", mo: "kid" };

function run(params, { beats = [], set = [], cast = ["kai", "pip"] } = {}) {
  const script = {
    version: 2, meta: { title: "a", format: "landscape", seed: 4, kind: "clip", audience: "kids" },
    cast: cast.map((id) => ({ id, body: PLANS[id], color: "#3fd8ff" })),
    locations: [{ id: "park", theme: "city_park", stageWidth: 3600, set }],
    scenes: [{ id: "s", location: "park", cast: cast.map((id, i) => ({ id, x: 1400 + i * 260, facing: i ? -1 : 1 })),
      beats: [{ id: "act", at: 0.3, who: "world", do: "activity", params }, ...beats] }],
  };
  const sim = simulate(script, catalog, { dryRun: true });
  const ev = (type, what) => sim.events.filter((e) => e.type === type && (!what || e.what === what));
  const end = sim.anchors.find((a) => a.beatId === "act" && a.anchor === "end");
  return { sim, ev, end, errors: sim.issues.filter((i) => !i.code.startsWith("W_")) };
}

// [name, players, extra params, set pieces]
const ALL = [
  ["blow_bubbles", ["pip", "kai"], { dur: 4 }],
  ["tennis_rally", ["kai", "pip"], { reps: 3, object: "net" }, [{ id: "net", object: "tennis_net", x: 1700 }]],
  ["play_catch", ["kai", "mo"], { reps: 3 }],
  ["kick_ball", ["mo", "kai"], { reps: 3 }],
  ["eat_together", ["kai", "pip"], { dur: 3, object: "bench1" }, [{ id: "bench1", object: "bench", x: 1500 }]],
  ["dance_together", ["kai", "pip"], { reps: 1 }],
  ["selfie", ["pip", "kai"], { reps: 1 }],
  ["sleep", ["kai"], { dur: 4 }],
  ["comfort", ["kai", "pip"], { reps: 1 }],
];

for (const [name, players, extra, set = []] of ALL) {
  test(`activity ${name}: runs and ends (end anchor)`, () => {
    const r = run({ name, with: players, ...extra }, { set, cast: [...new Set([...players, "kai"])] });
    assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
    assert.ok(r.end, `${name} never ended`);
    assert.ok(r.end.t < 60, `${name} ended at ${r.end.t}`);
  });
}

test("rallies: reps passes, then the receiver misses", () => {
  for (const [name, reps] of [["tennis_rally", 4], ["play_catch", 3], ["kick_ball", 5]]) {
    const r = run({ name, with: ["kai", "pip"], reps });
    const launches = r.ev("object", "launch").filter((e) => e.id === "act_ball");
    assert.equal(launches.length, reps, `${name}: ${launches.length} launches`);
    if (name === "play_catch") assert.equal(r.ev("object", "catch").length, reps - 1, "every pass but the last is caught");
    assert.ok(r.end, name);
  }
});

test("a rally winner: the other player misses (an extra pass when needed)", () => {
  const launches = (winner) => run({ name: "tennis_rally", with: ["kai", "pip"], reps: 4, winner }).ev("object", "launch").length;
  // Pass k is hit by player k % 2: after 4 passes kai (player 0) receives the last one and misses.
  assert.equal(launches("pip"), 4);
  assert.equal(launches("kai"), 5); // one more pass so pip misses
});

test("bubbles: the wand is handed over, bubbles float, pokes pop them", () => {
  const r = run({ name: "blow_bubbles", with: ["pip", "kai"], dur: 5 });
  assert.ok(r.ev("object", "spawn").filter((e) => e.kind === "bubble").length >= 6);
  const pokes = r.sim.events.filter((e) => e.type === "moveEvent" && e.poke).map((e) => e.storyT);
  const pops = r.ev("object", "pop").map((e) => e.storyT);
  assert.ok(pokes.some((t) => pops.some((p) => Math.abs(p - t) < 1e-6)), "a poke popped a bubble");
});

test("players are busy until the activity ends; an interrupting beat stops it", () => {
  const waits = run({ name: "dance_together", with: ["kai", "pip"], reps: 1 }, { beats: [{ id: "w", at: 1, who: "kai", do: "wave" }] });
  const wave = waits.sim.anchors.find((a) => a.beatId === "w" && a.anchor === "start");
  assert.ok(wave.t >= waits.end.t - 1e-9, "the wave waited for the dance");
  const cut = run({ name: "dance_together", with: ["kai", "pip"], reps: 3 }, { beats: [{ id: "w", at: 2, who: "kai", do: "wave", interrupt: true }] });
  assert.ok(Math.abs(cut.end.t - 2) < 0.05, `stopped at ${cut.end.t}`);
  assert.ok(cut.ev("activityEnd").some((e) => e.interrupted));
});

test("eat_together on a bench: players walk to the bench's two slots", () => {
  const set = [{ id: "bench1", object: "bench", x: 1500 }];
  const r = run({ name: "eat_together", with: ["kai", "pip"], dur: 2, object: "bench1" }, { set });
  assert.deepEqual(r.errors, []);
  const sim = simulate({
    version: 2, meta: { title: "a", format: "landscape", seed: 4, kind: "clip" },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "pip", body: "buddy", color: "#2fd3c0" }],
    locations: [{ id: "park", theme: "city_park", set }],
    scenes: [{ id: "s", location: "park", cast: [{ id: "kai", x: 1300, facing: 1 }, { id: "pip", x: 1800, facing: -1 }],
      beats: [{ id: "act", at: 0.3, who: "world", do: "activity", params: { name: "eat_together", with: ["kai", "pip"], dur: 2, object: "bench1" } }] }],
  }, catalog);
  const f = sim.store && sim.totalFrames - 1;
  assert.ok(f > 0);
  const xs = sim.events.filter((e) => e.type === "moveEnd" && e.move === "sit").map((e) => e.actor).sort();
  assert.deepEqual(xs, ["kai", "pip"], "both sat down");
});

test("the next beat waits for the activity's end", () => {
  const r = run({ name: "selfie", with: ["pip", "kai"], reps: 1 }, { beats: [{ id: "n", at: { after: "act" }, who: "kai", do: "wave" }] });
  const n = r.sim.anchors.find((a) => a.beatId === "n" && a.anchor === "start");
  assert.ok(n && Math.abs(n.t - r.end.t) < 0.05);
});
