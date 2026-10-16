// M2.7 connectivity matrix: every attack × outcome × size pairing reads correctly in choreographed mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, command, stepWorld, OUTCOMES } from "../../engine/world.js";
import { createActor } from "../../engine/actor.js";
import { prepareCatalog } from "../../engine/moves.js";
import { requiredStartX, buildHurtboxes, segSegDist2 } from "../../engine/combat.js";
import { COMBAT } from "../../engine/config.js";
import { holdableProps } from "../../engine/objects.js";
import { catalog } from "../../data/index.js";

const DT = 1 / 60;
import { propByKind } from "../../engine/props.js";
const moves = prepareCatalog(catalog.moves, catalog.poses, holdableProps(catalog));

/** Give an attacker the prop its move needs ("any" → sword). */
function arm(actor, def) {
  if (!def.needsProp) return;
  const held = holdableProps(catalog);
  const data = def.needsProp === "any" ? catalog.props.sword : propByKind(held, def.needsProp);
  actor.prop = { name: Object.keys(held).find((k) => held[k] === data), kind: data.kind, data };
}
const ATTACKS = [...moves.values()].filter((d) => d.category === "attack").map((d) => d.name);
const PAIRS = [[1, 1], [1, 0.6], [1, 2.2], [1, 3.5], [2.2, 1]];

/** Distance from a point to the nearest hurtbox surface (negative = inside). */
function clearance(point, joints, scale) {
  return Math.min(...buildHurtboxes(joints, scale).map((h) => Math.sqrt(segSegDist2(point, point, h.a, h.b)) - h.r));
}

function exchange(attackName, outcome, [as, ts], offset = 25) {
  const hero = createActor({ id: "hero", x: 1000, facing: 1, scale: as });
  const foe = createActor({ id: "foe", x: 1000 + 220 * Math.max(as, ts), facing: -1, scale: ts });
  const def = moves.get(attackName);
  arm(hero, def);
  const world = createWorld({ actors: [hero, foe], moves });
  if (def.flags.ranged) foe.x = hero.x + 500 * as + 150 * ts; // inside the distance band
  else hero.x = requiredStartX(hero, foe, def, def.params, outcome) + offset * as; // off by a nudge-able amount
  command(world, "hero", attackName, { target: "foe", outcome, beatId: "b1" });
  const log = { hits: [], errors: [], minClear: Infinity, foeMoves: new Set(), heroMoves: new Set(), anchors: [], reachWarning: false };
  const part = def.hits[0]?.part;
  for (let i = 0; i < 200; i++) {
    for (const e of stepWorld(world, DT)) {
      if (e.type === "hit") log.hits.push({ ...e, clear: clearance(e.point, foe.joints, ts), foeMove: foe.move?.def.name });
      if (e.type === "positionError") log.errors.push(e);
      if (e.type === "reachWarning") log.reachWarning = true;
      // A parried thrown weapon is caught: that is the contact, and the defender now holds it.
      if (e.type === "catch") log.hits.push({ kind: "parried", clear: 0, foeMove: foe.move?.def.name, caught: e.name });
      if (e.type === "anchor") log.anchors.push(e.anchor);
    }
    if (part && hero.move?.def.name === attackName) log.minClear = Math.min(log.minClear, clearance(hero.joints[part], foe.joints, ts));
    for (const p of world.projectiles) log.minClear = Math.min(log.minClear, clearance(p, foe.joints, ts) - p.radius);
    if (foe.move) log.foeMoves.add(foe.move.def.name);
    if (hero.move) log.heroMoves.add(hero.move.def.name);
  }
  return log;
}

for (const attack of ATTACKS) {
  for (const outcome of OUTCOMES) {
    test(`${attack} → ${outcome} at every size pairing`, () => {
      for (const pair of PAIRS) {
        const tag = `${attack}/${outcome} ${pair[0]}v${pair[1]}`;
        const log = exchange(attack, outcome, pair);
        assert.equal(log.errors.length, 0, `${tag}: positioning error`);
        const { hits } = log;
        if (outcome === "hit" || outcome === "blocked" || outcome === "parried") {
          const expected = outcome === "parried" ? 1 : moves.get(attack).hits.length || 1;
          assert.equal(hits.length, expected, `${tag}: one contact per hit window`);
          assert.equal(hits[0].kind, outcome === "hit" ? "hit" : outcome, tag);
          const slack = COMBAT.hitRadius * pair[0] + 12;
          // Physically impossible size pairings must be flagged (W_REACH) instead of faking contact.
          assert.ok(log.reachWarning || hits[0].clear <= slack, `${tag}: contact ${hits[0].clear.toFixed(1)}px from the body (max ${slack})`);
          assert.ok(log.anchors.includes("hit"), `${tag}: hit anchor`);
        } else {
          assert.equal(hits.length, 0, `${tag}: no contact`);
          assert.ok(log.minClear > 0, `${tag}: limb touched the body (${log.minClear.toFixed(1)}px)`);
        }
        if (outcome === "hit") assert.ok([...log.foeMoves].some((n) => n.startsWith("hit_")), `${tag}: reaction played`);
        if (outcome === "blocked") assert.equal(hits[0].foeMove, "block", `${tag}: defender was blocking`);
        // A parried projectile is deflected; only a parried melee attacker staggers.
        if (outcome === "parried" && attack === "throw_prop") assert.ok(hits[0].caught, `${tag}: thrown weapon caught`);
        if (outcome === "parried") assert.ok(moves.get(attack).flags.ranged ? log.foeMoves.has("parry") || log.foeMoves.has("catch_weapon") : log.heroMoves.has("stagger"), `${tag}: parry reaction`);
        if (outcome === "dodged") assert.ok(["dodge_back", "duck", "jump"].some((n) => log.foeMoves.has(n)), `${tag}: defender dodged`);
      }
    });
  }
}

test("a large position error is reported instead of silently teleporting", () => {
  const log = exchange("jab", "hit", [1, 1], 400);
  assert.equal(log.errors.length, 1);
});

test("heavy damage launches, spins, lands into knockdown and stays down until get_up", () => {
  const hero = createActor({ id: "hero", x: 1000, facing: 1 });
  const foe = createActor({ id: "foe", x: 1200, facing: -1 });
  const world = createWorld({ actors: [hero, foe], moves });
  const def = moves.get("front_kick");
  hero.x = requiredStartX(hero, foe, def, def.params, "hit");
  command(world, "hero", "front_kick", { target: "foe", params: { damage: 20 } });
  const seen = new Set();
  let landed = false;
  for (let i = 0; i < 240; i++) {
    for (const e of stepWorld(world, DT)) if (e.type === "land" && e.actor === "foe") landed = true;
    if (foe.move) seen.add(foe.move.def.name);
  }
  assert.ok(seen.has("hit_launch") && seen.has("knockdown"), [...seen].join(","));
  assert.ok(landed);
  assert.ok(foe.holding, "stays down");
  assert.ok(foe.x > 1200, "knocked back");
  command(world, "foe", "get_up");
  for (let i = 0; i < 80; i++) stepWorld(world, DT);
  assert.equal(foe.holding, false);
});

test("simulated mode: geometry decides; guard windows block", () => {
  const hero = createActor({ id: "hero", x: 1000, facing: 1 });
  const foe = createActor({ id: "foe", x: 1120, facing: -1 });
  const world = createWorld({ actors: [hero, foe], moves, mode: "simulated" });
  command(world, "foe", "block");
  command(world, "hero", "cross", { target: "foe" });
  const kinds = [];
  for (let i = 0; i < 60; i++) for (const e of stepWorld(world, DT)) if (e.type === "hit") kinds.push(e.kind);
  assert.deepEqual(kinds, ["blocked"]);
  const far = createWorld({ actors: [createActor({ id: "a", x: 1000 }), createActor({ id: "b", x: 1600, facing: -1 })], moves, mode: "simulated" });
  command(far, "a", "jab", { target: "b" });
  const farHits = [];
  for (let i = 0; i < 60; i++) for (const e of stepWorld(far, DT)) if (e.type === "hit") farHits.push(e);
  assert.equal(farHits.length, 0, "out of range misses");
});

test("world stepping is deterministic", () => {
  const run = () => JSON.stringify(exchange("cross", "hit", [1, 2.2]).hits);
  assert.equal(run(), run());
});
