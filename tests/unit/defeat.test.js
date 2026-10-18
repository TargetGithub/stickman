// Defeat styles (S5.5): each style's end state, return, kids impact words, and v1 staying frozen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, movesFor, v1MoveNames } from "../../engine/sim.js";
import { frameView } from "../../engine/framestore.js";
import { unpackJoints } from "../../engine/skeleton.js";
import { validate } from "../../engine/validator/index.js";
import { catalog } from "../../data/index.js";

const moves = movesFor(catalog);

function run(beats, { audience = "kids", stageWidth } = {}) {
  const script = {
    version: 2, meta: { title: "d", format: "landscape", seed: 5, kind: "clip", audience },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "vex", body: "slim", color: "#8a2be2" }],
    locations: [{ id: "st", theme: "city_park", ...(stageWidth ? { stageWidth } : {}) }],
    scenes: [{ id: "s", location: "st", cast: [{ id: "kai", x: 1300, facing: 1 }, { id: "vex", x: 1500, facing: -1 }], beats }],
  };
  const sim = simulate(script, catalog);
  const last = frameView(sim.store, sim.totalFrames - 1);
  const ch = (id) => last.chars.find((c) => c.id === id);
  return { sim, last, ch, errors: sim.issues.filter((i) => !i.code.startsWith("W_")) };
}

// [style, end state check]
const STYLES = [
  ["faint", (r) => assert.ok(r.ch("vex").alpha > 0.99, "still visible, lying down")],
  ["vanish", (r) => assert.ok(r.ch("vex").alpha < 0.01, "dissolved")],
  ["ghost", (r) => assert.ok(r.ch("vex").alpha < 0.01, "floated away")],
  ["captured", (r) => {
    assert.ok(r.ch("vex").alpha > 0.99, "visible in the cage");
    assert.ok(r.sim.events.some((e) => e.type === "object" && e.what === "spawn" && e.kind === "cage"), "a cage dropped");
  }],
  ["flee", (r) => {
    assert.ok(r.ch("vex").alpha < 0.01, "gone off the stage");
    const x = unpackJoints(r.ch("vex").joints).hip.x;
    assert.ok(x > 1500 + 600, `ran away from kai (x=${x})`);
  }],
];

for (const [style, check] of STYLES) {
  test(`defeat style ${style}: end state`, () => {
    const r = run([{ id: "d", at: 0.3, who: "vex", do: style }], { audience: "general" });
    assert.deepEqual(r.errors, []);
    check(r);
  });
}

test("defeated characters cannot act until they return; return brings them back", () => {
  const r = run([
    { id: "d", at: 0.3, who: "vex", do: "vanish" },
    { id: "w", at: { after: "d" }, who: "vex", do: "wave" },
  ]);
  assert.ok(r.sim.issues.some((i) => i.code === "E_SIM_DEAD_ACTOR"));
  const back = run([
    { id: "d", at: 0.3, who: "vex", do: "vanish" },
    { id: "r", at: { after: "d" }, who: "vex", do: "return" },
    { id: "w", at: { after: "r" }, who: "vex", do: "wave" },
  ]);
  assert.deepEqual(back.errors, []);
  assert.ok(back.ch("vex").alpha > 0.99);
});

test("a captured character shows its scared face, not the knocked-out one", () => {
  const r = run([{ id: "d", at: 0.3, who: "vex", do: "captured" }]);
  assert.equal(r.last.chars.find((c) => c.id === "vex").face, "scared");
});

test("kids audience: hits get cartoon impact words; general and v1 do not", () => {
  const beats = [{ id: "h", at: 0.3, who: "kai", do: "jab", target: "vex", outcome: "hit" }, { id: "h2", at: { after: "h", delay: 0.8 }, who: "kai", do: "cross", target: "vex", outcome: "hit" }];
  const words = (r) => r.sim.fx.log.filter((p) => p.glyph === "word").map((p) => p.text);
  const kids = words(run(beats));
  assert.equal(kids.length, 2, kids.join(","));
  assert.notEqual(kids[0], kids[1], "the words cycle");
  assert.deepEqual(words(run(beats, { audience: "general" })), []);
});

test("defeat styles are story-only: not v1 moves, and internal effects are not beat fx", () => {
  const v1 = v1MoveNames(catalog);
  for (const n of ["faint", "vanish", "ghost", "captured", "flee", "return"]) {
    assert.ok(moves.has(n), n);
    assert.ok(!v1.includes(n), n);
  }
  assert.ok(!catalog.fxNames.some((n) => n.startsWith("pop_")));
  for (const n of ["sparkle", "sparkle_rise", "tears", "rope_bind", "cage_drop", "confetti", "halo"]) assert.ok(catalog.fxNames.includes(n), n);
});

test("E_DEFEAT_STYLE: ghost is for the general audience only", () => {
  const script = (audience) => ({
    version: 2, meta: { title: "d", format: "landscape", seed: 5, kind: "clip", audience },
    cast: [{ id: "kai", color: "#3fd8ff" }], scenes: [{ id: "s", location: "city_park", cast: [{ id: "kai", x: 1300 }], beats: [{ at: 0.3, who: "kai", do: "ghost" }] }],
  });
  assert.ok(validate(script("kids"), catalog).errors.some((i) => i.code === "E_DEFEAT_STYLE"));
  assert.ok(!validate(script("general"), catalog).errors.some((i) => i.code === "E_DEFEAT_STYLE"));
});
