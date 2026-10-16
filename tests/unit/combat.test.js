import { test } from "node:test";
import assert from "node:assert/strict";
import {
  segSegDist2, sweptHit, buildHurtboxes, deriveReach, aimCandidates, resolveAimPoint, ikWeight, applyAimIK, requiredStartX, whiffGap,
} from "../../engine/combat.js";
import { computeJoints } from "../../engine/skeleton.js";
import { prepareCatalog, rootOffsetAt } from "../../engine/moves.js";
import { samplePoseKeys } from "../../engine/pose.js";
import { createActor, poseActor } from "../../engine/actor.js";
import { catalog } from "../../data/index.js";

const moves = prepareCatalog(catalog.moves, catalog.poses);
const P = (x, y) => ({ x, y });

test("segment distance cases", () => {
  const cases = [
    [[P(0, 0), P(10, 0), P(0, 5), P(10, 5)], 25, "parallel"],
    [[P(0, 0), P(10, 0), P(5, -5), P(5, 5)], 0, "crossing"],
    [[P(0, 0), P(10, 0), P(13, 4), P(13, 4)], 25, "point beyond end"],
    [[P(0, 0), P(0, 0), P(3, 4), P(3, 4)], 25, "two points"],
  ];
  for (const [[a, b, c, d], want, name] of cases) assert.ok(Math.abs(segSegDist2(a, b, c, d) - want) < 1e-9, name);
});

test("swept hitbox catches a fast limb that would tunnel through a thin torso", () => {
  const target = buildHurtboxes(computeJoints({}, P(500, 786), -1, 1), 1);
  const prev = P(400, 740);
  const cur = P(600, 740); // moved 200 px in one tick, straight through the torso at x=500
  assert.ok(sweptHit(prev, cur, 5, target), "swept test hits");
  assert.equal(sweptHit(cur, cur, 5, target), null, "point test alone misses");
});

test("derived reach: attacks reach forward at a sensible height", () => {
  const table = { jab: [50, 110, 160], cross: [50, 110, 160], front_kick: [60, 60, 120] };
  for (const [name, [minReach, minH, maxH]] of Object.entries(table)) {
    const [d] = deriveReach(moves.get(name));
    assert.ok(d.reach > minReach, `${name} reach ${d.reach}`);
    assert.ok(d.height > minH && d.height < maxH, `${name} contact height ${d.height}`);
  }
});

test("auto aim picks a reachable point closest to the authored contact", () => {
  const hero = computeJoints(catalog.poses.guard, P(1000, 786), 1, 1);
  const smallTarget = computeJoints({}, P(1080, 880 - 94 * 0.6), -1, 0.6);
  const giant = computeJoints({}, P(1080, 880 - 94 * 2.2), -1, 2.2);
  const contact = P(1070, 720);
  const onSmall = resolveAimPoint(hero, "rHand", 1, smallTarget, "auto", contact);
  const onGiant = resolveAimPoint(hero, "rHand", 1, giant, "auto", contact);
  assert.equal(onSmall.name, "head", "small target: punch comes down to the head");
  assert.ok(["hip", "knees"].includes(onGiant.name), `giant: lands low (${onGiant.name})`);
  assert.equal(resolveAimPoint(hero, "rHand", 1, giant, "head", contact).name, "head", "explicit aim respected");
});

test("ikWeight ramps in, holds, releases", () => {
  const hit = { t0: 0.5, t1: 0.6 };
  assert.equal(ikWeight(0.1, hit), 0);
  assert.ok(ikWeight(0.35, hit) > 0 && ikWeight(0.35, hit) < 1);
  assert.equal(ikWeight(0.55, hit), 1);
  assert.ok(ikWeight(0.65, hit) > 0 && ikWeight(0.65, hit) < 1);
  assert.equal(ikWeight(0.9, hit), 0);
});

test("applyAimIK at full weight puts the hand on a reachable aim point and keeps bone lengths", () => {
  const j = computeJoints(catalog.poses.jabExtend, P(1000, 786), 1, 1.5);
  const aim = P(j.shoulder.x + 60, j.shoulder.y + 40);
  const out = applyAimIK(j, "rHand", aim, 1, 1.5);
  assert.ok(Math.hypot(out.rHand.x - aim.x, out.rHand.y - aim.y) < 1e-6);
  assert.ok(Math.abs(Math.hypot(out.rElbow.x - j.shoulder.x, out.rElbow.y - j.shoulder.y) - 38 * 1.5) < 1e-6);
  assert.equal(out.lHand, j.lHand, "other limbs untouched");
});

test("requiredStartX puts the FK contact point on the aim point at the window middle", () => {
  for (const name of ["jab", "cross", "front_kick"]) {
    for (const [as, ts] of [[1, 1], [1, 2.2], [2.2, 0.6]]) {
      const def = moves.get(name);
      const target = createActor({ x: 1500, facing: -1, scale: ts });
      target.pose = { ...catalog.poses.stand };
      poseActor(target, 0);
      const attacker = createActor({ x: 900, facing: 1, scale: as });
      const x0 = requiredStartX(attacker, target, def, def.params, "hit");
      const [d] = deriveReach(def);
      const contactX = x0 + (d.reach + rootOffsetAt(def, d.tmid, def.params).dx) * as;
      const aimXs = aimCandidates(target.joints, ts, -1).map((c) => c.point.x);
      assert.ok(aimXs.some((x) => Math.abs(x - contactX) < 1e-6), `${name} ${as}v${ts}`);
      const whiffX = requiredStartX(attacker, target, def, def.params, "whiff");
      assert.ok(Math.abs(x0 - whiffX - whiffGap(attacker, target)) < 1e-6, "whiff starts whiffGap further back");
      assert.ok(samplePoseKeys(def.keys, d.tmid));
    }
  }
});
