// Many-character macros (STORY_SPEC 11.1, 12). Milestone: S6.
//   @gauntlet  the hero takes on each opponent in turn; the others wait in a ring (or further down the street)
//   @brawl     two teams; at most two attacks at once, staggered, until the losing team is down
//   @chase     a runner, its chasers, obstacles to jump and near misses; caught or away

import { addFight, chooseAttack, weighted, OUTCOMES, WEIGHTS, GAP, MUSIC_INTENSITY } from "./fight_core.js";
import { attackPool, emotes, finisherFor } from "./pools.js";
import { canHit } from "./fight_core.js";
import { destX } from "./basic.js";
import { pick, round } from "../compile.js";

const RING = [340, 480, 600]; // px from the hero, by ring slot (spec 12: 300-600 px)
const TAUNTS = ["taunt", "point", "flex", "clench_fist"];
const ZONE = 560; // px between brawl duel zones
const SETTLE = { hit: 0.45, dodged: 0.5, parried: 0.6 }; // extra pause after an exchange ending this way (s)

function gauntlet(ctx, p) {
  const { hero, opponents } = p;
  const per = p.per ?? 3;
  const travel = p.travel ?? "run";
  const intensity = p.intensity ?? "medium";
  const anchors = {};
  let prev = null;
  let first = null;
  const chain = (beat, delay = 0) => {
    const id = prev ? ctx.after(prev, beat, delay) : ctx.add({ ...beat, at: 0 });
    first ??= id;
    prev = id;
    return id;
  };
  const ringWalk = new Map(); // opponent → its walk into the ring
  if (travel === "none") {
    // The waiting ring: each opponent runs to a slot on its own side of the hero (crossing over would shove
    // the hero), nearest slots first.
    const hx = ctx.pos.get(hero);
    const used = { "-1": 0, 1: 0 };
    opponents.forEach((o, k) => {
      const side = Math.sign((ctx.pos.get(o) ?? hx + 1) - hx) || 1;
      const slot = used[side]++;
      const dist = RING[Math.min(RING.length - 1, slot)] + Math.max(0, slot - RING.length + 1) * 120;
      const x = Math.max(ctx.margin, Math.min(ctx.stageWidth - ctx.margin, hx + side * dist));
      const beat = { who: o, do: "run", to: { x: round(x) } };
      if (first) ringWalk.set(o, ctx.with(first, beat, 0.15 * k));
      else ringWalk.set(o, (first = prev = ctx.add({ ...beat, at: 0 })));
      ctx.pos.set(o, x);
    });
  }
  const levels = ["low", "medium", "high"];
  let fin = null;
  opponents.forEach((o, k) => {
    const last = k === opponents.length - 1;
    if (travel !== "none") {
      // The hero arrives, the opponent squares up (taunts), then they fight. The camera frames just the two.
      const run = chain({ who: hero, do: travel, to: { near: o, gap: 230 }, face: "determined" }, k ? 0.4 : 0);
      ctx.with(run, { who: "world", do: "shot", params: { mode: "follow", targets: [hero, o] } });
      chain({ who: o, do: pick(ctx, emotes(ctx, TAUNTS)), target: hero, face: "angry" }, 0.1);
      ctx.pos.set(hero, destX(ctx, hero, { near: o, gap: 230 }));
    }
    // Intensity rises toward the last opponent.
    const level = levels[Math.min(levels.indexOf(intensity), Math.max(0, levels.indexOf(intensity) - (opponents.length - 1 - k)))] ?? intensity;
    if (travel === "none") ctx.add({ at: prev ? { after: prev } : { with: first }, who: "world", do: "shot", params: { mode: "follow", targets: [hero, o] } });
    const f = addFight(ctx, {
      // The guards fight back (even), and the last one makes it close.
      winner: hero, loser: o, exchanges: per, intensity: last ? intensity : level, style: last ? "close" : "even",
      finisher: last ? p.finisher : undefined, ko: true, prev, opening: false, victory: false,
      music: k === 0, emphasis: last, winnerLoss: 0.6 / opponents.length,
    });
    first ??= f.first;
    prev = f.last;
    anchors[`opponent${k + 1}`] = `${f.ko}.start`;
    if (last) fin = f.finisher;
    // Someone in the ring taunts while this fight goes on.
    const waiting = opponents.slice(k + 1);
    if (waiting.length) {
      // The ring may still be filling up: a waiting opponent's first taunt comes once it is in place.
      const who = pick(ctx, waiting);
      const taunt = { who, do: pick(ctx, emotes(ctx, TAUNTS)) };
      if (ringWalk.has(who)) {
        ctx.after(ringWalk.get(who), taunt, 0.5 + ctx.rng());
        ringWalk.delete(who);
      } else ctx.with(f.first, taunt, 1 + ctx.rng());
    }
    if (p.afterDefeat === "fade") ctx.after(f.ko, { who: o, do: "despawn" }, 1.2);
  });
  const end = chain({ who: hero, do: emotes(ctx, ["victory", "clench_fist"])[0], face: "happy" }, 0.4);
  ctx.with(end, { who: "world", do: "set_music", params: { intensity: 0.4, fade: 2 } });
  return { anchors: { start: `${first}.start`, end: `${end}.end`, finisher: `${fin}.hit`, ...anchors } };
}

/** One attacker's short exchange on a target (1-2 attacks), chained after `prev` or starting with `withRef`. */
function exchange(ctx, o) {
  const pool = attackPool(ctx, o.who);
  const winnerSide = o.side === "winner";
  let id = null;
  let last = null;
  for (let c = 0; c < o.count; c++) {
    const move = chooseAttack(ctx, o.who, o.target, c ? [...pool.light, ...pool.heavy] : pool.light, last);
    last = move;
    const outcome = o.finish ? "hit" : OUTCOMES[weighted(ctx, WEIGHTS[winnerSide ? "winner" : "loser"])];
    const def = ctx.moves.get(move);
    const beat = { who: o.who, do: move, target: o.target, outcome, approach: "run",
      ...(typeof def.params?.damage === "number" && !def.params.finisher ? { params: { damage: winnerSide ? 9 : 6 } } : {}) };
    if (!id) id = o.prev ? ctx.after(o.prev, beat, o.delay ?? 0.2) : o.withRef ? ctx.with(o.withRef, beat, o.delay ?? 0.5) : ctx.add({ ...beat, at: 0 });
    else id = ctx.after(id, beat, 0.05);
    o.first ??= id;
    o.outcome = outcome;
    if (outcome !== "hit" && outcome !== "blocked") break;
  }
  return { first: o.first, last: id, outcome: o.outcome };
}

function brawl(ctx, p) {
  const W = p.teams[p.winner];
  const L = p.teams[p.winner === "a" ? "b" : "a"];
  const intensity = p.intensity ?? "medium";
  const rounds = Math.max(L.length + 1, Math.round((p.dur ?? 20) / 2.6));
  // Loser i goes down in round koRound[i]; the last one in the final round.
  const koRound = L.map((_, i) => Math.round(((i + 1) * (rounds - 1)) / L.length));
  const down = new Set();
  let prev = null;
  let first = null;
  let lastKo = null;
  // Duel zones: the fighters pair off side by side along the stage, each zone a winner and a loser facing
  // each other (the bigger team's extra fighters behind their zone-mate), so every clash is a short run and
  // nobody pushes through the crowd.
  let farthest = -1;
  const mean = (ids) => ids.reduce((n, id) => n + (ctx.pos.get(id) ?? ctx.stageWidth / 2), 0) / ids.length;
  const mid = (mean(W) + mean(L)) / 2;
  const sideW = Math.sign(mean(W) - mean(L)) || -1;
  const zones = Math.min(W.length, L.length);
  const zoneOf = new Map();
  [W, L].forEach((team, t) => team.forEach((id, i) => {
    const k = i % zones;
    zoneOf.set(id, k);
    const zx = mid + (k - (zones - 1) / 2) * ZONE;
    const x = round(Math.max(ctx.margin, Math.min(ctx.stageWidth - ctx.margin, zx + (t ? -sideW : sideW) * (150 + 130 * Math.floor(i / zones)))));
    const beat = { who: id, do: "run", to: { x } };
    const run = first ? ctx.with(first, beat, 0.1) : (first = ctx.add({ ...beat, at: 0 }));
    // The clashes start once the furthest runner (scaled by its stride) is in place.
    const far = Math.abs(x - (ctx.pos.get(id) ?? x)) / (ctx.catalog.bodies?.[ctx.castById.get(id)?.body]?.dims?.thigh ?? 48);
    if (far >= farthest) [farthest, prev] = [far, run];
    ctx.pos.set(id, x);
  }));
  const zd = (a, b) => Math.abs(zoneOf.get(a) - zoneOf.get(b));
  /** The standing loser nearest to w's zone (not in `taken`). */
  const nearest = (w, standing, taken) => standing.filter((l) => !taken.includes(l)).sort((x, y) => zd(w, x) - zd(w, y) || L.indexOf(x) - L.indexOf(y))[0];
  let lastOutcome = null;
  let lane2Last = null;
  let lane2Chars = [];
  for (let r = 0; down.size < L.length && r < rounds + 2 * L.length; r++) {
    const standing = L.filter((l) => !down.has(l));
    const due = standing.find((l) => koRound[L.indexOf(l)] <= r); // a loser whose round has come goes first
    // The due loser fights the nearest winner; otherwise winners take turns against the nearest loser.
    const w1 = due ? [...W].sort((x, y) => zd(x, due) - zd(y, due) || ((W.indexOf(x) + r) % W.length) - ((W.indexOf(y) + r) % W.length))[0] : W[r % W.length];
    const l1 = due ?? nearest(w1, standing, []);
    const pairs = [[w1, l1]];
    // A second clash only between two other fighters: two attackers on one target knock it out of each other's reach.
    const w2 = W.length > 1 ? W.filter((x) => x !== w1)[r % (W.length - 1)] : null;
    const l2 = w2 ? nearest(w2, standing, [l1]) : null;
    // A knockout gets the stage to itself.
    if (w2 && l2 && !due) pairs.push([w2, l2]);
    let laneFirst = null;
    // When this round's first clash uses a fighter from the last round's second clash, wait for that one.
    if (prev && lane2Last && pairs[0].some((x) => lane2Chars.includes(x))) prev = lane2Last;
    lane2Last = null;
    lane2Chars = [];
    pairs.forEach(([w, l], lane) => {
      const finish = lane === 0 && l === due;
      const winnerAttacks = finish || ctx.rng() < 0.62;
      const [who, target] = winnerAttacks ? [w, l] : [l, w];
      const count = finish ? 1 : 1 + Math.floor(ctx.rng() * (intensity === "low" ? 1 : 2));
      let start = lane === 0 ? (prev ? { prev, delay: GAP[intensity] + 0.15 + (SETTLE[lastOutcome] ?? 0) } : {}) : { withRef: laneFirst, delay: 0.45 };
      if (zd(who, target) > 0) {
        // A clash across zones (a team-mate went down): run over first, as the gauntlet does, so the
        // attack's own approach stays short (an approach over 3 s is an error).
        const beat = { who, do: "run", to: { near: target, gap: 230 } };
        const run = start.prev ? ctx.after(start.prev, beat, start.delay) : start.withRef ? ctx.with(start.withRef, beat, start.delay) : ctx.add({ ...beat, at: 0 });
        zoneOf.set(who, zoneOf.get(target));
        start = { prev: run, delay: 0.1, first: run };
      }
      const ex = exchange(ctx, { who, target, count, side: winnerAttacks ? "winner" : "loser", finish, ...start });
      first ??= ex.first;
      if (lane === 0) {
        laneFirst = ex.first;
        lastOutcome = ex.outcome;
      } else {
        lane2Last = ex.last;
        lane2Chars = [w, l];
      }
      if (finish) {
        // Grounded finishers only: with several fighters about, a flying kick's target has often moved.
        const move = finisherFor(ctx, w, null, (list) => {
          const ok = list.filter((m) => canHit(ctx, w, l, m) && !ctx.moves.get(m).flags.airborne);
          return pick(ctx, ok.length ? ok : list);
        });
        const fin = ctx.after(ex.last, { who: w, do: move, target: l, outcome: "hit", approach: "run" }, 0.3);
        ctx.add({ at: { on: `${fin}.hit` }, who: "world", do: "shake", params: { preset: "med" } });
        lastKo = ctx.after(fin, { who: l, do: "ko_fall" }, 0.8);
        down.add(l);
        if (lane === 0) prev = lastKo;
        else lane2Last = lastKo;
      } else if (lane === 0) prev = ex.last;
    });
    // Every other round someone out of the clashes taunts; with nobody free, the next round waits a moment
    // (a short pause between the clashes keeps the rhythm).
    if (r % 2 === 1 && down.size < L.length) {
      const busy = new Set(pairs.flat());
      const free = [...W, ...L].filter((x) => !busy.has(x) && !down.has(x));
      if (free.length) ctx.with(laneFirst, { who: pick(ctx, free), do: pick(ctx, emotes(ctx, TAUNTS)) }, 0.6);
      else prev = ctx.after(prev, { who: "world", do: "zoom_punch", params: { amount: 0.08, dur: 0.3 } }, 0.2);
    }
  }
  // Fighters who are not in a lane taunt now and then; the winners celebrate at the end.
  const end = ctx.after(lastKo, { who: W[0], do: pick(ctx, emotes(ctx, ["victory", "cheer"])), face: "happy" }, 0.5);
  W.slice(1).forEach((w, k) => ctx.with(end, { who: w, do: pick(ctx, emotes(ctx, ["cheer", "jump_joy", "flex"])), face: "happy" }, 0.2 * (k + 1)));
  ctx.with(first, { who: "world", do: "set_music", params: { intensity: MUSIC_INTENSITY[intensity] } });
  ctx.with(end, { who: "world", do: "set_music", params: { intensity: 0.4, fade: 2 } });
  return { anchors: { start: `${first}.start`, end: `${end}.end` } };
}

function chase(ctx, p) {
  const { runner, chasers } = p;
  const rx = ctx.pos.get(runner);
  const mean = chasers.reduce((s, c) => s + (ctx.pos.get(c) ?? rx), 0) / chasers.length;
  const dir = Math.sign(rx - mean) || (rx < ctx.stageWidth / 2 ? 1 : -1);
  const edge = dir > 0 ? ctx.stageWidth - ctx.margin - 80 : ctx.margin + 80;
  const dist = Math.min(Math.abs(edge - rx), (p.dur ?? 8) * 500);
  const count = Math.min(p.obstacles ?? 0, Math.floor(dist / 420));
  const kinds = ["crate", "box"].filter((k) => ctx.catalog.objects?.[k]);
  // Obstacles are set pieces along the way; the runner stops short of each one and jumps it.
  const stops = [];
  for (let i = 0; i < count; i++) {
    const x = round(rx + dir * dist * ((i + 1) / (count + 1)));
    if (kinds.length) ctx.addSet({ id: `${ctx.id.slice(0, 24)}_ob${i + 1}`, object: pick(ctx, kinds), x });
    stops.push(x);
  }
  let prev = null;
  const lead = chasers[0];
  const frame = () => ctx.with(segments[0]?.run ?? lastRun, { who: "world", do: "shot", params: { mode: "follow", targets: [runner, lead] } });
  const segments = [];
  const chained = (who, beat, after, delay) => (after ? ctx.after(after, { who, ...beat }, delay) : ctx.add({ who, ...beat, at: 0 }));
  for (const x of stops) {
    const run = chained(runner, { do: "run", to: { x: round(x - dir * 150) }, face: "scared" }, prev, 0);
    prev = ctx.after(run, { who: runner, do: "jump", params: { travel: 300, height: 130 } });
    segments.push({ run, x });
  }
  const finalX = round(rx + dir * dist);
  const lastRun = chained(runner, p.caught ? { do: "run", to: { x: finalX } } : { do: "run", to: { exit: dir > 0 ? "right" : "left" } }, prev, 0);
  // Chasers follow each segment a little behind, jump the same obstacles, and the lead lunges once.
  chasers.forEach((c, j) => {
    let cprev = null;
    segments.forEach((s, si) => {
      const beat = { who: c, do: "run", to: { x: round(s.x - dir * (170 + 110 * j)) }, face: "angry" };
      cprev = cprev ? ctx.after(cprev, beat) : ctx.with(s.run, beat, 0.45 + 0.3 * j);
      cprev = ctx.after(cprev, { who: c, do: "jump", params: { travel: 300, height: 130 } });
      if (c === lead && si === Math.floor(segments.length / 2)) ctx.after(cprev, { who: c, do: "dash" });
    });
    // The last stretch: right after its own jumps (a slower chaser keeps its own pace), else with the runner.
    const last = { who: c, do: "run", to: { x: round(finalX - dir * (260 + 110 * j)) } };
    if (!p.caught || c !== lead) (cprev ? ctx.after(cprev, last) : ctx.with(lastRun, last, 0.4 + 0.3 * j));
  });
  frame(); // the camera stays on the runner and the lead chaser
  let caught = null;
  let end = lastRun;
  const leadDog = ctx.catalog.bodies?.[ctx.castById.get(lead)?.body]?.rig === "quadruped";
  if (p.caught) {
    // A dog never attacks: it grabs the runner's trouser leg instead (a comic hop, no hit; ADR-020).
    const dog = leadDog && ctx.moves.has("bite_hold");
    caught = ctx.with(lastRun, dog ? { who: lead, do: "bite_hold", partner: runner, approach: "run" }
      : { who: lead, do: ctx.moves.has("sweep") ? "sweep" : "jab", target: runner, outcome: "hit", approach: "run" }, 0.6);
    end = ctx.after(caught, { who: runner, do: "hold_head", face: "scared" }, 0.8);
  } else {
    // The runner got away: a person grumbles, a dog barks after them.
    end = ctx.after(lastRun, { who: lead, do: leadDog ? "bark" : pick(ctx, emotes(ctx, ["hold_head", "shake_head", "facepalm"])), face: "angry" }, 0.3);
  }
  const caughtAt = caught && leadDog ? `${caught}.start` : `${caught}.hit`;
  return { anchors: { start: `${segments[0]?.run ?? lastRun}.start`, end: `${end}.end`, caught: caught ? caughtAt : `${end}.end` } };
}

export const GROUP_MACROS = { gauntlet, brawl, chase };
