import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareCatalog, startMove, stepMove, rootOffsetAt, MIN_WINDUP } from "../../engine/moves.js";
import { catalog } from "../../data/index.js";

const DT = 1 / 60;
const poses = { stand: catalog.poses.stand, guard: catalog.poses.guard };
const base = (over) => ({
  name: "m",
  category: "emote",
  duration: 1,
  keys: [{ t: 0, pose: "stand" }, { t: 1, pose: "guard" }],
  ...over,
});
const problemsOf = (moves) => {
  try {
    prepareCatalog(moves, poses);
    return "";
  } catch (e) {
    return e.message;
  }
};

test("the shipped catalog prepares without problems", () => {
  const moves = prepareCatalog(catalog.moves, catalog.poses);
  for (const name of ["idle", "walk", "run", "jump", "jab", "cross", "front_kick", "hit_light"]) {
    assert.ok(moves.has(name), `missing ${name}`);
  }
});

test("attacks in the catalog obey choreography rules", () => {
  for (const def of prepareCatalog(catalog.moves, catalog.poses).values()) {
    if (def.category !== "attack") continue;
    const projectile = def.events.find((e) => e.projectile);
    assert.ok(def.hits.length > 0 || projectile, `${def.name} has hits or a projectile`);
    assert.ok((def.hits[0]?.t0 ?? projectile.t) >= MIN_WINDUP, `${def.name} windup ≥ ${MIN_WINDUP}`);
    assert.ok(def.events.some((e) => e.sfx === "whoosh" || e.projectile), `${def.name} has a whoosh (or fires a projectile)`);
  }
});

test("bad move data is rejected with specific messages", () => {
  const cases = [
    [base({ category: "dance" }), "category must be one of"],
    [base({ duration: 0 }), "duration must be > 0"],
    [base({ keys: [] }), "needs at least one key"],
    [base({ keys: [{ t: 0.1, pose: "stand" }, { t: 1, pose: "guard" }] }), "keys[0].t must be 0"],
    [base({ keys: [{ t: 0, pose: "stand" }, { t: 0.9, pose: "guard" }] }), "last t must be 1"],
    [base({ keys: [{ t: 0, pose: "stand" }, { t: 0.5, pose: "guard" }, { t: 0.4, pose: "stand" }, { t: 1, pose: "stand" }] }), "sorted"],
    [base({ keys: [{ t: 0, pose: "nope" }, { t: 1, pose: "guard" }] }), "'nope' is not a named pose"],
    [base({ keys: [{ t: 0, pose: { elbow: 3 } }, { t: 1, pose: "guard" }] }), "unknown channel 'elbow'"],
    [base({ keys: [{ t: 0, pose: "stand", ease: "wobble" }, { t: 1, pose: "guard" }] }), "ease 'wobble'"],
    [base({ root: [{ t: 0, dx: "range*2" }] }), "unknown name 'range'"],
    [base({ category: "attack" }), "attacks need at least one hits entry"],
    [base({ category: "attack", hits: [{ t0: 0.05, t1: 0.2, part: "rHand" }] }), "windup must take at least"],
    [base({ category: "attack", hits: [{ t0: 0.5, t1: 0.4, part: "rHand" }] }), "t0 < t1"],
    [base({ category: "attack", hits: [{ t0: 0.3, t1: 0.4, part: "tail" }] }), "part must be one of"],
    [base({ category: "attack", hits: [{ t0: 0.3, t1: 0.4, part: "rHand", shake: "huge" }] }), "shake must be"],
    [base({ chain: "ghost" }), "chain 'ghost' is not a move"],
  ];
  for (const [move, want] of cases) assert.match(problemsOf([move]), new RegExp(want.replace(/[[\]().*]/g, "\\$&")), want);
  assert.match(problemsOf([base(), base()]), /duplicate move name/);
});

test("partial key poses inherit from the previous key", () => {
  const def = prepareCatalog([base({ keys: [{ t: 0, pose: "guard" }, { t: 1, pose: { lean: 40 } }] })], poses).get("m");
  assert.equal(def.keys[1].pose.lean, 40);
  assert.equal(def.keys[1].pose.rUA, poses.guard.rUA);
});

test("rootOffsetAt evaluates expressions with param overrides and easing", () => {
  const def = prepareCatalog([base({ params: { travel: 100 }, root: [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: "travel*2", dy: -10 }] })], poses).get("m");
  assert.deepEqual(rootOffsetAt(def, 0.5, { travel: 100 }), { dx: 100, dy: -5 });
  assert.deepEqual(rootOffsetAt(def, 1, { travel: 50 }), { dx: 100, dy: -10 });
});

function run(def, opts = {}, maxSteps = 600) {
  const actor = { pose: null };
  startMove(actor, def, opts);
  const out = { steps: 0, dx: 0, events: [], windows: 0 };
  for (let i = 0; i < maxSteps; i++) {
    const r = stepMove(actor, DT);
    out.steps++;
    out.dx += r.rootDx;
    out.events.push(...r.events);
    if (r.openWindows.length) out.windows++;
    if (r.ended) break;
  }
  return out;
}

test("a move ends after duration / speed and fires each event once", () => {
  const moves = prepareCatalog(catalog.moves, catalog.poses);
  const jab = moves.get("jab");
  const normal = run(jab);
  assert.equal(normal.steps, Math.ceil(jab.duration * 60 - 1e-9));
  const fast = run(jab, { speed: 2 });
  assert.equal(fast.steps, Math.ceil((jab.duration * 60) / 2 - 1e-9));
  const whooshes = normal.events.filter((e) => e.sfx === "whoosh").length;
  assert.equal(whooshes, 1);
  assert.equal(normal.events.filter((e) => e.type === "windowOpen").length, 1);
  assert.ok(normal.windows > 0);
  assert.ok(Math.abs(normal.dx - jab.params.travel) < 1e-9, "root travel sums to final offset");
});

test("loop moves stop at params.distance or params.cycles", () => {
  const moves = prepareCatalog(catalog.moves, catalog.poses);
  const walk = moves.get("walk");
  const byDistance = run(walk, { params: { distance: 300 } });
  assert.ok(Math.abs(byDistance.dx - 300) < 1e-9, `walked ${byDistance.dx}`);
  const byCycles = run(walk, { params: { cycles: 2 } });
  assert.ok(Math.abs(byCycles.dx - 2 * walk.params.stride) < 1e-6, `walked ${byCycles.dx}`);
  assert.equal(byCycles.events.filter((e) => e.sfx === "step").length, 4, "two steps per cycle");
});

test("blending eases from the previous pose into the new move", () => {
  const def = prepareCatalog([base()], poses).get("m");
  const actor = { pose: { ...poses.guard, rot: 0, dx: 0, dy: 0, lean: 30 } };
  startMove(actor, def, { blend: 0.1 });
  const first = stepMove(actor, DT).pose.lean;
  assert.ok(first > 20, "starts near the previous pose");
  for (let i = 0; i < 10; i++) stepMove(actor, DT);
  const after = stepMove(actor, DT).pose.lean;
  assert.ok(after < 5, "blend finished");
});

test("every effect and shake named in move data exists", () => {
  for (const def of prepareCatalog(catalog.moves, catalog.poses).values()) {
    for (const e of def.events) {
      for (const name of e.fx || []) assert.ok(name in catalog.fxPresets, `${def.name} uses unknown fx ${name}`);
      if (e.shake) assert.ok(["small", "med", "big"].includes(e.shake), `${def.name} shake ${e.shake}`);
    }
    for (const h of def.hits) for (const name of h.fx || []) assert.ok(name in catalog.fxPresets, `${def.name} hit fx ${name}`);
  }
});

test("zero-length blends (reactions) keep the prop angle finite", () => {
  const moves = prepareCatalog(catalog.moves, catalog.poses, catalog.props);
  const actor = { pose: { ...catalog.poses.guard, rot: 0, dx: 0, dy: 0 }, propAngle: 55 };
  startMove(actor, moves.get("hit_heavy"));
  assert.ok(Number.isFinite(stepMove(actor, DT).propAngle));
});
