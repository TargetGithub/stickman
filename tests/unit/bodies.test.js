// Body plans (S3.3): the combat connectivity matrix (every attack × outcome) across plan pairings,
// every move on every plan (finite joints, feet on the ground), and plan data checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, command, stepWorld, OUTCOMES } from "../../engine/world.js";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { prepareCatalog } from "../../engine/moves.js";
import { requiredStartX, buildHurtboxes, segSegDist2 } from "../../engine/combat.js";
import { BODY, lowestPoint, computeJoints } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { propByKind } from "../../engine/props.js";
import { COMBAT, STAGE } from "../../engine/config.js";
import { holdableProps } from "../../engine/objects.js";
import { catalog } from "../../catalog/index.js";

const DT = 1 / 60;
const moves = prepareCatalog(catalog.moves, catalog.poses, holdableProps(catalog));
const ATTACKS = [...moves.values()].filter((d) => d.category === "attack").map((d) => d.name);
// Humanoid moves run on the humanoid plans; quadruped plans have their own tests (quadruped.test.js).
const PLANS = Object.keys(catalog.bodies).filter((n) => catalog.bodies[n].rig === "humanoid");
const PAIRS = [["stickman", "buddy"], ["buddy", "bulky"], ["bulky", "buddy"], ["kid", "slim"], ["slim", "kid"], ["elder", "stickman"]];

function arm(actor, def) {
  if (!def.needsProp) return;
  const held = holdableProps(catalog);
  const data = def.needsProp === "any" ? catalog.props.sword : propByKind(held, def.needsProp);
  actor.prop = { name: Object.keys(held).find((k) => held[k] === data), kind: data.kind, data };
}
const actorOf = (o, plan) => Object.assign(createActor(o), bodyPlan(catalog, plan));
const clearance = (p, a) => Math.min(...buildHurtboxes(a.joints, a.scale, a.dims).map((h) => Math.sqrt(segSegDist2(p, p, h.a, h.b)) - h.r));

function exchange(attackName, outcome, [ap, tp]) {
  const hero = actorOf({ id: "hero", x: 1000, facing: 1 }, ap);
  const foe = actorOf({ id: "foe", x: 1300, facing: -1 }, tp);
  const def = moves.get(attackName);
  arm(hero, def);
  const world = createWorld({ actors: [hero, foe], moves });
  if (def.flags.ranged) foe.x = hero.x + 500 + 150;
  else hero.x = requiredStartX(hero, foe, def, def.params, outcome) + 25;
  command(world, "hero", attackName, { target: "foe", outcome, beatId: "b1" });
  const log = { hits: [], errors: [], minClear: Infinity, foeMoves: new Set(), reach: false, nan: false };
  const part = def.hits[0]?.part;
  for (let i = 0; i < 200; i++) {
    for (const e of stepWorld(world, DT)) {
      if (e.type === "hit") log.hits.push({ ...e, clear: clearance(e.point, foe) });
      if (e.type === "catch") log.hits.push({ kind: "parried", clear: 0 });
      if (e.type === "positionError") log.errors.push(e);
      if (e.type === "reachWarning") log.reach = true;
    }
    for (const a of [hero, foe]) for (const p of Object.values(a.joints)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) log.nan = true;
    if (part && hero.move?.def.name === attackName) log.minClear = Math.min(log.minClear, clearance(hero.joints[part], foe));
    for (const p of world.projectiles) log.minClear = Math.min(log.minClear, clearance(p, foe) - p.radius);
    if (foe.move) log.foeMoves.add(foe.move.def.name);
  }
  return log;
}

for (const attack of ATTACKS) {
  for (const outcome of OUTCOMES) {
    test(`body plans: ${attack} → ${outcome}`, () => {
      for (const pair of PAIRS) {
        const tag = `${attack}/${outcome} ${pair.join(" v ")}`;
        const log = exchange(attack, outcome, pair);
        assert.ok(!log.nan, `${tag}: NaN joint`);
        assert.equal(log.errors.length, 0, `${tag}: positioning error`);
        if (outcome === "hit" || outcome === "blocked" || outcome === "parried") {
          const expected = outcome === "parried" ? 1 : moves.get(attack).hits.length || 1;
          assert.equal(log.hits.length, expected, `${tag}: one contact per hit window`);
          assert.equal(log.hits[0].kind, outcome === "hit" ? "hit" : outcome, tag);
          const slack = COMBAT.hitRadius + 12;
          assert.ok(log.reach || log.hits[0].clear <= slack, `${tag}: contact ${log.hits[0].clear.toFixed(1)}px from the body`);
        } else {
          assert.equal(log.hits.length, 0, `${tag}: no contact`);
          assert.ok(log.minClear > 0, `${tag}: limb touched the body (${log.minClear.toFixed(1)}px)`);
        }
      }
    });
  }
}

test("every move on every plan: finite joints and the body never sinks below the floor", () => {
  for (const plan of PLANS) {
    for (const [name, def] of moves) {
      const a = actorOf({ id: "a", x: 1000, facing: 1, groundY: STAGE.groundY }, plan);
      arm(a, def);
      playMove(a, name, moves);
      for (let i = 0; i < Math.ceil(def.duration * 60) + 5; i++) {
        const j = stepActor(a, DT, moves).joints;
        for (const p of Object.values(j)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${plan} ${name}: NaN`);
        assert.ok(lowestPoint(j, 1, a.dims) <= STAGE.groundY + 1.5, `${plan} ${name}: below the floor by ${(lowestPoint(j, 1, a.dims) - STAGE.groundY).toFixed(1)}px`);
      }
    }
  }
});

test("standing feet touch the floor on every plan", () => {
  for (const plan of PLANS) {
    const a = actorOf({ id: "a", x: 1000, facing: 1, groundY: STAGE.groundY }, plan);
    playMove(a, "idle", moves);
    let j;
    for (let i = 0; i < 30; i++) j = stepActor(a, DT, moves).joints;
    assert.ok(Math.abs(lowestPoint(j, 1, a.dims) - STAGE.groundY) < 1, `${plan}: feet at ${lowestPoint(j, 1, a.dims)}`);
  }
});

const PLAN_DATA = [
  ["stickman equals the v1 body", () => assert.deepEqual(catalog.bodies.stickman.dims, BODY)],
  ["the stickman plan keeps the BODY object (v1 numbers unchanged)", () => assert.equal(bodyPlan(catalog, "stickman").dims, BODY)],
  ["every plan has a known rig and every bone", () => {
    for (const [n, p] of Object.entries(catalog.bodies)) {
      assert.ok(["humanoid", "quadruped"].includes(p.rig), n);
      for (const k of Object.keys(BODY)) assert.ok(p.dims[k] > 0, `${n}.${k}`);
    }
  }],
  ["stride follows leg length", () => {
    assert.equal(bodyPlan(catalog, "stickman").stride, 1);
    assert.ok(bodyPlan(catalog, "buddy").stride < 0.6);
    assert.ok(bodyPlan(catalog, "slim").stride > 1.1);
  }],
  ["heights differ as designed: buddy < kid < stickman < slim", () => {
    const h = (n) => { const d = bodyPlan(catalog, n).dims; const j = computeJoints(catalog.poses.stand, { x: 0, y: 0 }, 1, 1, d); return lowestPoint(j, 1, d) - (j.head.y - d.headR); };
    assert.ok(h("buddy") < h("kid") && h("kid") < h("stickman") && h("stickman") < h("slim"));
  }],
];
for (const [name, fn] of PLAN_DATA) test(`plan data: ${name}`, fn);

import { lookFor, lookAt } from "../../engine/renderer/looks.js";

const LOOKS = [
  ["plan defaults apply", { body: "buddy" }, [], (l) => l.eyes === "big"],
  ["cast appearance wins over plan defaults", { body: "buddy", appearance: { eyes: "oval" } }, [], (l) => l.eyes === "oval"],
  ["v1 accessories in appearance reach the accessory style", { appearance: { accessories: { cape: "#111111" } } }, [], (l) => l.style.cape === "#111111"],
  ["set_appearance adds an accessory", {}, [{ videoT: 1, params: { who: "a", accessory: "scarf", color: "#ff0000" } }], (l) => l.style.scarf === "#ff0000"],
  ["set_appearance removes one", { style: { headband: "#ff0000" } }, [{ videoT: 1, params: { who: "a", accessory: "headband", remove: true } }], (l) => !l.style.headband],
  ["later changes are not applied yet", {}, [{ videoT: 9, params: { who: "a", hair: "spiky" } }], (l) => l.hair === undefined],
];
for (const [name, cast, changes, ok] of LOOKS) {
  test(`looks: ${name}`, () => assert.ok(ok(lookAt(lookFor(catalog, { id: "a", ...cast }), changes, 2))));
}
