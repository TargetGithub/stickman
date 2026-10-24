// Story macros (S6.2-S6.5): every macro with every body plan, gauntlets of 1-6, fight outcomes that match
// `winner`, brawls with at most two attacks at once, chases, fight cards of at least 3 minutes, montages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { validate } from "../../engine/validator/index.js";
import { simulate, movesFor, frameAt } from "../../engine/sim.js";
import { splitText } from "../../engine/story/macros/basic.js";
import { story, fightStory, gauntletStory, PLANS } from "../helpers/macro_stories.js";

const moves = movesFor(catalog);
const NOISE = ["W_CONTRAST", "W_NO_ENDING"]; // test stories use plain colours and stop anywhere
const clean = (s, name) => {
  const r = validate(s, catalog);
  const issues = [...r.errors, ...r.warnings].filter((i) => !NOISE.includes(i.code));
  assert.deepEqual(issues.map((i) => `${i.code} ${i.message}`), [], name);
  return r;
};
const run = (s) => simulate(s, catalog, { dryRun: true });
const fired = (sim, who, names) => sim.beats.filter((b) => b.who === who && names.includes(b.do) && b.firedAt != null);
const KO = ["ko_fall", "ko_spin"];

test("@fight: every body plan pairing, both ways, validates cleanly and the winner wins", () => {
  for (const p of PLANS) {
    for (const q of PLANS) {
      for (const [winner, style] of [["a", "even"], ["b", "comeback"]]) {
        const s = fightStory(p, q, { winner, style, intensity: "high" });
        clean(s, `${p} v ${q} ${style}`);
        const sim = run(s);
        const loser = winner === "a" ? "b" : "a";
        assert.equal(fired(sim, loser, KO).length, 1, `${p} v ${q}: loser KO`);
        assert.equal(fired(sim, winner, KO).length, 0, `${p} v ${q}: winner stays up`);
        const dealt = (to) => sim.events.filter((e) => e.type === "hit" && e.target === to).reduce((n, e) => n + e.damage, 0);
        assert.ok(dealt(loser) > dealt(winner), `${p} v ${q}: the loser takes more damage`);
        const fin = sim.events.filter((e) => e.type === "hit" && e.kind === "hit").at(-1);
        assert.equal(fin.attacker, winner, `${p} v ${q}: the winner lands the last hit`);
      }
    }
  }
});

test("@fight: phases with a charge-up, weapons, ko false, every style and intensity", () => {
  const styles = ["even", "dominant", "comeback", "close"];
  for (let seed = 1; seed <= 8; seed++) {
    const s = fightStory(PLANS[seed % 6], PLANS[(seed * 5) % 6], { style: styles[seed % 4], intensity: ["low", "medium", "high"][seed % 3] },
      { seed, props: [seed % 2 ? "sword" : null, seed % 3 ? "staff" : null] });
    clean(s, `seed ${seed}`);
  }
  const phases = fightStory("stickman", "slim", { phases: [{ exchanges: 4 }, { exchanges: 4, style: "comeback", intensity: "high", chargeUp: true }], ko: false });
  clean(phases, "phases");
  const sim = run(phases);
  assert.equal(fired(sim, "b", ["charge_up"]).length, 1);
  assert.equal(fired(sim, "b", KO).length, 0, "ko false leaves the loser standing");
  assert.equal(fired(sim, "b", ["dizzy"]).length, 1);
});

test("@gauntlet: 1 to 6 opponents, running between them or waiting in a ring; each goes down in turn", () => {
  for (let n = 1; n <= 6; n++) {
    for (const travel of ["run", "none"]) {
      const s = gauntletStory(n, { travel, afterDefeat: n % 2 ? "fade" : "stay" });
      clean(s, `${n} ${travel}`);
      const sim = run(s);
      const order = sim.beats.filter((b) => KO.includes(b.do) && b.firedAt != null).sort((a, b) => a.firedAt - b.firedAt).map((b) => b.who);
      assert.deepEqual(order, Array.from({ length: n }, (_, i) => String.fromCharCode(98 + i)), `${n} ${travel}`);
      assert.equal(fired(sim, "a", KO).length, 0);
    }
  }
});

test("@gauntlet: every body plan as the hero", () => {
  for (const p of PLANS) clean(gauntletStory(3, {}, [p, "bulky", "slim", "kid"]), p);
});

test("@brawl: the losing team goes down, at most two attacks run at once", () => {
  const cases = [
    [["stickman", "bulky", "slim", "kid"], { a: ["a", "b"], b: ["c", "d"] }, "a"],
    [["stickman", "bulky", "slim", "kid", "buddy"], { a: ["a", "b", "c"], b: ["d", "e"] }, "b"],
    [["elder", "kid", "buddy"], { a: ["a"], b: ["b", "c"] }, "b"],
  ];
  for (const [plans, teams, winner] of cases) {
    const s = story(plans, [{ id: "br", at: 0.3, macro: "brawl", params: { teams, winner, dur: 18 } }]);
    clean(s, JSON.stringify(teams));
    const sim = run(s);
    const losers = teams[winner === "a" ? "b" : "a"];
    for (const id of losers) assert.equal(fired(sim, id, KO).length, 1, `${id} goes down`);
    for (const id of teams[winner]) assert.equal(fired(sim, id, KO).length, 0, `${id} stays up`);
    const attacks = sim.beats.filter((b) => b.firedAt != null && moves.get(b.do)?.category === "attack").map((b) => [b.firedAt, b.endedAt]);
    for (const [t] of attacks) assert.ok(attacks.filter(([s0, s1]) => s0 <= t && t < s1).length <= 2, `at ${t.toFixed(2)}`);
  }
});

test("@chase: jumps the obstacles; caught or away", () => {
  for (const caught of [false, true]) {
    const s = story(["kid", "bulky", "slim"], [{ id: "ch", at: 0.3, macro: "chase", params: { runner: "a", chasers: ["b", "c"], obstacles: 2, caught } }], { xs: [1200, 700, 500], stageWidth: 5000 });
    clean(s, `caught ${caught}`);
    const sim = run(s);
    assert.equal(fired(sim, "a", ["jump"]).length, 2);
    const caughtHit = sim.events.some((e) => e.type === "hit" && e.attacker === "b" && e.target === "a");
    assert.equal(caughtHit, caught);
  }
});

test("talk and movement macros work for every body plan", () => {
  for (const p of PLANS) {
    clean(story([p, "buddy"], [{ id: "d", at: 0.3, macro: "dialogue", params: { lines: [["a", "Hello there, my friend! How are you doing on this lovely sunny day?", "happy"], ["b", "Great!", "laugh", "shout"], ["a", "Shh.", "neutral", "whisper"]] } }]), `dialogue ${p}`);
    clean(story([p, "kid"], [{ id: "t", at: 0.3, macro: "travel", params: { who: ["a", "b"], to: { x: 3000 }, mode: "run" } }, { at: { after: "t" }, who: "a", do: "wave" }]), `travel ${p}`);
    clean(story([p, "buddy"], [{ id: "w", at: 0.3, macro: "walk_together", params: { who: ["a", "b"], to: { x: 2600 } } }, { at: { after: "w" }, who: "a", do: "wave" }]), `walk_together ${p}`);
    clean(story(["stickman", p], [{ id: "e", at: 0.3, macro: "enter", params: { who: "b", side: "right" } }, { id: "w", at: { after: "e" }, who: "b", do: "wave" },
      { at: { after: "w" }, macro: "exit", params: { who: "b", side: "left", mode: "run" } }], { hidden: ["b"] }), `enter/exit ${p}`);
    clean(story([p, "slim"], [{ id: "ac", at: 0.3, macro: "activity", params: { name: "dance_together", with: ["a", "b"] } }]), `activity ${p}`);
  }
});

test("@dialogue: lines split into bubbles of at most 40 characters; speakers take turns", () => {
  for (const text of ["Short.", "Hello there, my friend! How are you doing on this lovely sunny day?", "a ".repeat(60)]) {
    const parts = splitText(text);
    assert.ok(parts.every((x) => x.length <= 40 && x.length > 0), text);
    assert.equal(parts.join(" ").replace(/\s+/g, " ").trim(), text.replace(/\s+/g, " ").trim());
  }
  const sim = run(story(["stickman", "buddy"], [{ id: "d", at: 0.3, macro: "dialogue", params: { lines: [["a", "One"], ["b", "Two"], ["a", "Three"]] } }]));
  assert.deepEqual(sim.events.filter((e) => e.type === "say").map((e) => e.actor), ["a", "b", "a"]);
});

test("@enter shows a hidden character walking in; @exit fades it out at the edge", () => {
  const s = story(["stickman", "slim"], [{ id: "e", at: 1, macro: "enter", params: { who: "b", side: "right" } }, { id: "x", at: { after: "e", delay: 0.5 }, macro: "exit", params: { who: "b", side: "right" } }], { hidden: ["b"] });
  clean(s, "enter/exit");
  const sim = simulate(s, catalog);
  const b = (n) => frameAt(sim, n).chars.find((c) => c.id === "b");
  const walks = sim.beats.filter((x) => x.who === "b").sort((x, y) => x.firedAt - y.firedAt);
  assert.deepEqual(walks.map((x) => x.do), ["walk", "walk"]);
  const at = (t) => b(Math.round(t * 60));
  assert.equal(at(0.5).alpha, 0, "hidden before it enters");
  assert.equal(at(walks[0].endedAt).alpha, 1, "shown once in");
  assert.equal(b(sim.totalFrames - 1).alpha, 0, "gone after the exit");
  assert.ok(Math.abs(at(walks[0].endedAt).joints[0] - 2050) < 120, "walked in to its place (x 2050)");
});

test("@defeat and @grief: every style allowed for the audience; grief kneels, cries and rains", () => {
  for (const style of ["ko", "faint", "vanish", "captured", "flee"]) {
    const beats = [{ id: "d", at: 0.3, macro: "defeat", params: { who: "b", by: "a", style } }];
    if (style === "vanish") beats.push({ at: { after: "d" }, who: "b", do: "return" });
    clean(story(["stickman", "slim"], beats), style);
  }
  clean(story(["stickman", "slim"], [{ id: "d", at: 0.3, macro: "defeat", params: { who: "b", style: "ghost" } }], { audience: "general" }), "ghost");
  const s = story(["stickman", "buddy"], [{ id: "v", at: 0.3, who: "b", do: "vanish" }, { id: "g", at: { after: "v" }, macro: "grief", params: { who: "a", over: "b", rain: true } }, { at: { after: "g" }, who: "b", do: "return" }]);
  clean(s, "grief");
  const sim = run(s);
  assert.ok(fired(sim, "a", ["kneel"]).length === 1 && fired(sim, "a", ["cry"]).length >= 2);
  assert.ok(sim.events.some((e) => e.type === "world" && e.do === "set_weather" && e.params.weather === "rain"));
});

/** A fight card story with n matchups for kai. */
function card(n, extra = {}) {
  const cast = ["kai", "zed", "bo", "rex", "mia"].slice(0, n + 1).map((id, i) => ({ id, name: id.toUpperCase(), color: ["#3fd8ff", "#ff5c8a", "#ffcc33", "#7cff6b", "#c58bff"][i], body: PLANS[i] }));
  return {
    version: 2, meta: { title: "Card", format: "landscape", seed: 5, kind: "fight", audience: "kids" }, cast,
    locations: [{ id: "roof", theme: "rooftop_city" }, { id: "dojo", theme: "dojo_dusk" }],
    scenes: [{ id: "card", macro: "fight_card", params: { title: "Rooftop Cup", matchups: cast.slice(1).map((c, i) => ({ sides: ["kai", c.id], winner: "kai", location: i % 2 ? "dojo" : "roof" })), ...extra } }],
  };
}

test("@fight_card: at least 3 minutes for 1 to 4 matchups, with intro, rounds, breathers and an end card", () => {
  for (let n = 1; n <= 4; n++) {
    const r = clean(card(n), `card ${n}`);
    assert.ok(r.durationSec >= 180, `card ${n}: ${r.durationSec}s`);
    const sim = run(card(n));
    const ids = sim.scenes.map((s) => s.id);
    assert.equal(ids[0], "card_intro");
    assert.equal(ids.at(-1), "card_end");
    assert.ok(ids.filter((id) => /_r\d+$/.test(id)).length >= Math.min(3, n + 2) || n > 1, ids.join(","));
    assert.ok(sim.events.some((e) => e.type === "world" && e.do === "end_card"));
  }
});

test("@montage: one short scene per clip, cut together", () => {
  const s = {
    version: 2, meta: { title: "M", format: "landscape", seed: 2, kind: "clip" },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "pip", color: "#2fd3c0", body: "buddy" }],
    scenes: [{ id: "mt", macro: "montage", params: { clipDur: 2.5, cut: "dissolve", clips: [
      { location: "city_street", who: ["kai"], text: "Kai walked all day." },
      { location: "alley_night", who: ["kai", "pip"], do: "walk_together", time: "night" },
      { location: "snow_mountain", who: ["kai"], do: "run", weather: "snow" },
    ] } }],
  };
  clean(s, "montage");
  const sim = run(s);
  assert.deepEqual(sim.scenes.map((x) => x.id), ["mt_c1", "mt_c2", "mt_c3"]);
  for (const sc of sim.scenes) assert.ok(Math.abs(sc.frames / 60 - 2.5) < 0.05, `${sc.id}: ${sc.frames} frames`);
});

test("extras: seeded plans per scene, at most 40, never in the simulation", () => {
  const s = story(["stickman", "slim"], [{ at: 0.3, who: "a", do: "wave" }]);
  s.locations[0].extras = [{ count: 30, behavior: "walk_by" }, { count: 20, behavior: "cheer", layer: "front" }];
  const a = run(s);
  const b = run(s);
  assert.equal(a.scenes[0].extras.length, 40);
  assert.deepEqual(a.scenes[0].extras, b.scenes[0].extras);
  assert.equal(a.beats.length, b.beats.length);
  assert.deepEqual(run(story(["stickman", "slim"], [{ at: 0.3, who: "a", do: "wave" }])).events.map((e) => e.type), a.events.map((e) => e.type));
});

test("brawl, chase, defeat and grief with every body plan", () => {
  for (const p of PLANS) {
    clean(story([p, "stickman", "bulky", p], [{ id: "br", at: 0.3, macro: "brawl", params: { teams: { a: ["a", "b"], b: ["c", "d"] }, winner: "a", dur: 12 } }]), `brawl ${p}`);
    clean(story([p, "slim"], [{ id: "ch", at: 0.3, macro: "chase", params: { runner: "a", chasers: ["b"], obstacles: 1, caught: true } }], { xs: [1200, 700], stageWidth: 5000 }), `chase ${p}`);
    clean(story(["stickman", p], [{ id: "d", at: 0.3, macro: "defeat", params: { who: "b", by: "a", style: "captured" } }]), `defeat ${p}`);
    clean(story([p, "buddy"], [{ id: "v", at: 0.3, who: "b", do: "vanish" }, { id: "g", at: { after: "v" }, macro: "grief", params: { who: "a", over: "b" } }, { at: { after: "g" }, who: "b", do: "return" }]), `grief ${p}`);
  }
});

// Regression (found by the catalog build): fighters whose lanes cross, or a bystander standing between an
// attacker and its target, used to block the approach runs (E_SIM_UNREACHABLE), and a clash across brawl
// zones could need an approach over 3 s (E_SIM_APPROACH). Approach runs now pass bystanders, and a brawl
// clash across zones runs over first.
test("@brawl and @gauntlet: crossing lanes and a bystander in the way never leave an attack unreachable, on any seed", () => {
  const cast = [
    { id: "kai", color: "#1f4fbf", prop: "sword" }, { id: "pip", body: "buddy", color: "#c2185b" },
    { id: "vex", body: "slim", color: "#5b2a86" }, { id: "g1", body: "bulky", color: "#8b2500" }, { id: "g2", body: "bulky", color: "#2b2b2b" },
  ];
  const x = { kai: 1100, pip: 1350, vex: 1900, g1: 2300, g2: 2700 };
  const macros = [
    { id: "m", at: 0, macro: "brawl", params: { teams: { a: ["kai", "pip"], b: ["g1", "g2"] }, winner: "a" } },
    { id: "m", at: 0, macro: "gauntlet", params: { hero: "kai", opponents: ["g1", "g2"] } },
  ];
  for (const beat of macros) {
    for (const withVex of [false, true]) {
      for (let seed = 1; seed <= 12; seed++) {
        const here = cast.filter((c) => withVex || c.id !== "vex");
        const s = { version: 2, meta: { title: "lanes", format: "landscape", seed, kind: "clip" }, cast: here,
          locations: [{ id: "l", theme: "white_stage" }],
          scenes: [{ id: "s1", location: "l", cast: here.map((c) => ({ id: c.id, x: x[c.id], facing: x[c.id] < 1600 ? 1 : -1 })), beats: [beat] }] };
        const r = validate(s, catalog);
        assert.deepEqual(r.errors.map((e) => `${e.code} ${e.message}`), [], `${beat.macro} seed ${seed}${withVex ? " with a bystander" : ""}`);
      }
    }
  }
});
