// Paired moves (S5.1-S5.3): distances, contacts reached with IK, attachments, give, carry and put_down,
// across body-plan pairings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, movesFor } from "../../engine/sim.js";
import { frameView } from "../../engine/framestore.js";
import { unpackJoints, dimsOf } from "../../engine/skeleton.js";
import { pairDistance } from "../../engine/story/pairs.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { createActor } from "../../engine/actor.js";
import { catalog } from "../../data/index.js";

const moves = movesFor(catalog);
const LEADS = [...moves.values()].filter((d) => d.pair).map((d) => d.name);
const PAIRINGS = [["stickman", "buddy"], ["bulky", "kid"], ["slim", "elder"]];

test("every lead move names an existing partner move", () => {
  assert.ok(LEADS.length >= 14, LEADS.join(","));
  for (const n of LEADS) assert.ok(moves.get(moves.get(n).pair.partnerMove)?.flags.partner, n);
});

test("pair distance: the authored gap for two stickmen, shorter for short arms, room for round bodies", () => {
  const a = (plan) => Object.assign(createActor({ id: plan, x: 0 }), bodyPlan(catalog, plan));
  const gap = { gap: 60 };
  assert.equal(pairDistance(a("stickman"), a("stickman"), gap), 60);
  const sb = pairDistance(a("stickman"), a("buddy"), gap);
  assert.ok(sb < 60 + 30 && sb > 40, `${sb}`);
  assert.equal(pairDistance(a("stickman"), a("buddy"), { gap: 0 }), 0);
});

function run(lead, plans, extra = [], beat = {}) {
  const script = {
    version: 2, meta: { title: "p", format: "landscape", seed: 9, kind: "clip" },
    cast: [{ id: "a", body: plans[0], color: "#3fd8ff", prop: "flower" }, { id: "b", body: plans[1], color: "#ff9f43" }],
    scenes: [{ id: "s", location: "white_stage", cast: [{ id: "a", x: 1200, facing: 1 }, { id: "b", x: 1500, facing: -1 }],
      beats: [{ id: "p", at: 0.2, who: "a", do: lead, partner: "b", ...beat }, ...extra] }],
  };
  const sim = simulate(script, catalog);
  const errors = sim.issues.filter((i) => !i.code.startsWith("W_"));
  const start = sim.anchors.find((x) => x.beatId === "p" && x.anchor === "start");
  const frameAtMoveT = (u) => {
    const t = start.t + u * moves.get(lead).duration;
    return sim.clock.storyAt.findIndex((s) => s >= t - 1e-9);
  };
  const joints = (n, id) => {
    const f = frameView(sim.store, n);
    const c = f.chars.find((x) => x.id === id);
    return { j: unpackJoints(c.joints), c, f };
  };
  return { sim, errors, start, frameAtMoveT, joints };
}

const near = (p, q, tol) => Math.hypot(p.x - q.x, p.y - q.y) <= tol;

for (const lead of ["hug", "high_five", "fist_bump", "handshake", "pat_head", "give", "lean_on", "comfort"]) {
  test(`contacts reached on every pairing: ${lead}`, () => {
    for (const plans of PAIRINGS) {
      const r = run(lead, plans);
      assert.deepEqual(r.errors, [], `${lead} ${plans}`);
      assert.ok(r.start, `${lead} ${plans}: never started`);
      for (const c of moves.get(lead).pair.contacts) {
        const n = r.frameAtMoveT((c.t0 + c.t1) / 2);
        const from = r.joints(n, c.from === "partner" ? "b" : "a");
        const to = r.joints(n, c.from === "partner" ? "a" : "b");
        const hand = from.j[c.part];
        if (c.meet) assert.ok(near(hand, to.j[c.to], 10), `${lead} ${plans}: hands ${JSON.stringify(hand)} vs ${JSON.stringify(to.j[c.to])}`);
        else if (c.to === "top") assert.ok(near(hand, { x: to.j.head.x, y: to.j.head.y - dimsOf({ dims: bodyPlan(catalog, plans[1]).dims }).headR * 1.05 }, 18), `${lead} ${plans}: pat`);
        else if (c.to === "shoulder") assert.ok(near(hand, to.j.shoulder, 18), `${lead} ${plans}: shoulder`);
        else {
          // Around the back: the hand ends on the far side of the other body.
          // (Compared with the torso line at the hand's height: a stooped body's hip is behind its chest.)
          const side = Math.sign(to.j.hip.x - from.j.hip.x);
          const u = (hand.y - to.j.hip.y) / ((to.j.shoulder.y - to.j.hip.y) || -1);
          const lineX = to.j.hip.x + (to.j.shoulder.x - to.j.hip.x) * u;
          assert.ok((hand.x - lineX) * side > -6, `${lead} ${plans}: ${c.part} reaches round the back`);
        }
      }
    }
  });
}

test("give hands the held prop to the partner", () => {
  const r = run("give", ["stickman", "buddy"]);
  assert.ok(r.sim.events.some((e) => e.type === "give" && e.name === "flower"));
  const last = r.joints(r.sim.totalFrames - 1, "b");
  assert.equal(last.c.prop?.name, "flower");
});

for (const plans of PAIRINGS) {
  test(`carry keeps the partner in the arms while walking, put_down sets them on the floor (${plans})`, () => {
    const r = run("carry", plans, [
      { id: "w", at: { after: "p" }, who: "a", do: "walk", params: { distance: 200 } },
      { id: "d", at: { after: "w" }, who: "a", do: "put_down", partner: "b" },
    ]);
    assert.deepEqual(r.errors, []);
    const walk = r.sim.anchors.find((x) => x.beatId === "w" && x.anchor === "end");
    const n = r.sim.clock.storyAt.findIndex((s) => s >= walk.t - 0.05);
    const a = r.joints(n, "a");
    const b = r.joints(n, "b");
    assert.ok(Math.abs(b.j.hip.x - a.j.rHand.x) < 30 && b.j.hip.y < a.j.hip.y, `${plans}: carried at the hands`);
    const end = r.joints(r.sim.totalFrames - 1, "b");
    assert.ok(Math.abs(Math.max(end.j.lFoot.y, end.j.rFoot.y) - 880) < 3, `${plans}: back on the floor`);
  });
}

for (const lead of ["piggyback", "lift_up", "drag", "walk_together"]) {
  test(`attachments and travel run cleanly on every pairing: ${lead}`, () => {
    for (const plans of PAIRINGS) {
      const extra = lead === "piggyback" ? [{ id: "d", at: { after: "p" }, who: "a", do: "put_down", partner: "b" }] : [];
      const r = run(lead, plans, extra, lead === "walk_together" ? { params: { distance: 300 } } : {});
      assert.deepEqual(r.errors, [], `${lead} ${plans}`);
      for (let n = 0; n < r.sim.totalFrames; n += 10) {
        for (const id of ["a", "b"]) for (const p of Object.values(r.joints(n, id).j)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${lead} ${plans} NaN`);
      }
      if (lead === "lift_up") {
        const mid = r.joints(r.frameAtMoveT(0.55), "b");
        const lifter = r.joints(r.frameAtMoveT(0.55), "a");
        assert.ok(mid.j.hip.y < lifter.j.head.y, `${plans}: lifted above the head`);
      }
    }
  });
}

test("a busy partner makes the paired beat wait instead of starting halfway", () => {
  const script = {
    version: 2, meta: { title: "w", format: "landscape", seed: 2, kind: "clip" },
    cast: [{ id: "a", color: "#3fd8ff" }, { id: "b", color: "#ff9f43" }],
    scenes: [{ id: "s", location: "white_stage", cast: [{ id: "a", x: 1200, facing: 1 }, { id: "b", x: 1300, facing: -1 }],
      beats: [{ id: "d", at: 0.1, who: "b", do: "dance_a" }, { id: "h", at: 0.2, who: "a", do: "high_five", partner: "b" }] }],
  };
  const sim = simulate(script, catalog, { dryRun: true });
  const dance = sim.anchors.find((x) => x.beatId === "d" && x.anchor === "end");
  const hug = sim.anchors.find((x) => x.beatId === "h" && x.anchor === "start");
  assert.ok(hug.t >= dance.t - 1e-6, `high five at ${hug.t}, dance ends ${dance.t}`);
});
