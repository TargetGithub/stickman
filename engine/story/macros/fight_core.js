// Fight choreography for macros (STORY_SPEC 12): a 1v1 exchange chain built from v1 attack beats.
// Milestone: S6. Used by @fight, @gauntlet, @brawl and @fight_card.
// Every attack beat has "approach": "run", so the v1 approach/aim system brings the attacker in range.
// Outcomes are weighted toward the eventual winner as intensity rises; damage is budgeted so the loser's
// HP bar runs down to the finisher and the winner keeps some HP (choreographed mode never KOs by damage:
// the KO is its own beat).

import { createActor, poseActor } from "../../actor.js";
import { canReach } from "../../combat.js";
import { samplePoseKeys } from "../../pose.js";
import { bodyPlan } from "../bodies.js";
import { attackPool, finisherFor, emotes } from "./pools.js";
import { pick, round } from "../compile.js";
import { STAGE } from "../../config.js";

export const OUTCOMES = ["hit", "blocked", "dodged", "parried", "whiff"];
export const WEIGHTS = { winner: [4, 2.5, 1.5, 1, 0.4], loser: [2.4, 3, 2, 1.5, 0.5] };
const HIT_BOOST = { low: 0.7, medium: 1, high: 1.4 };
const COMBO = { low: [1, 1], medium: [1, 2], high: [1, 3] };
export const GAP = { low: 0.55, medium: 0.35, high: 0.18 }; // pause between exchanges (s)
const ATTACK_SHARE = { even: 0.5, dominant: 0.78, close: 0.5, comeback: 0.5 };
const WINNER_LEFT = { dominant: 0.75, even: 0.5, close: 0.35, comeback: 0.3 }; // winner HP share at the end
export const MUSIC_INTENSITY = { low: 0.5, medium: 0.7, high: 0.9 };

/** Can attacker `a` physically land `move` on `b` (body plans and sizes)? Cached per compile context. */
export function canHit(ctx, a, b, move) {
  ctx.reach ??= new Map();
  const key = `${a}|${b}|${move}`;
  if (!ctx.reach.has(key)) {
    const probe = (id, x, facing) => {
      const c = ctx.castById.get(id) || {};
      const actor = createActor({ id, x, facing, scale: c.scale ?? 1, groundY: STAGE.groundY });
      if (c.body && c.body !== "stickman") Object.assign(actor, bodyPlan(ctx.catalog, c.body));
      actor.pose = samplePoseKeys(ctx.moves.get("idle").keys, 0);
      poseActor(actor, 0, true);
      return actor;
    };
    const def = ctx.moves.get(move);
    const ok = def.hits.every((_, i) => canReach(probe(a, 1000, 1), probe(b, 1300, -1), def, def.params, i));
    ctx.reach.set(key, ok);
  }
  return ctx.reach.get(key);
}

/** HP a character starts the macro with (scene placement, else the cast entry, else 100). */
export function hpOf(ctx, id) {
  return ctx.placement?.(id)?.hp ?? ctx.castById.get(id)?.hp ?? 100;
}

export function weighted(ctx, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = ctx.rng() * total;
  for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) <= 0) return i;
  return weights.length - 1;
}

/** Pick an attack the attacker can land on the target, avoiding the last one used. */
export function chooseAttack(ctx, a, b, list, last) {
  const ok = list.filter((m) => canHit(ctx, a, b, m));
  const pool = ok.filter((m) => m !== last);
  return pick(ctx, pool.length ? pool : ok.length ? ok : list);
}

/**
 * Plan the exchanges of one fight: a list of steps
 *   { kind: "attack", who, target, move, outcome } | { kind: "emote", who, move, face? } | { kind: "charge", who }
 */
function planSteps(ctx, o) {
  const { winner, loser } = o;
  const phases = o.phases?.length ? o.phases : [{ exchanges: o.exchanges, style: o.style, intensity: o.intensity }];
  const total = phases.reduce((s, p) => s + p.exchanges, 0);
  const pools = new Map([[winner, attackPool(ctx, winner)], [loser, attackPool(ctx, loser)]]);
  const steps = [];
  let done = 0;
  let sinceBreak = 0;
  let reversed = false;
  const last = new Map();
  phases.forEach((ph, pi) => {
    const style = ph.style ?? o.style;
    const intensity = ph.intensity ?? o.intensity;
    if (pi > 0) {
      if (ph.chargeUp && ctx.moves.has("charge_up")) {
        steps.push({ kind: "charge", who: loser });
        if (ctx.moves.has("energy_blast") && canHit(ctx, loser, winner, "energy_blast")) {
          steps.push({ kind: "attack", who: loser, target: winner, move: "energy_blast", outcome: pick(ctx, ["blocked", "dodged"]) });
        }
      } else steps.push({ kind: "emote", who: pick(ctx, [winner, loser]), move: pick(ctx, emotes(ctx, ["taunt", "flex", "point"])) });
      sinceBreak = 0;
    }
    for (let i = 0; i < ph.exchanges; i++, done++) {
      const u = done / Math.max(1, total);
      let share = ATTACK_SHARE[style];
      if (style === "comeback") {
        if (u >= 0.55 && !reversed) {
          reversed = true;
          steps.push({ kind: "emote", who: winner, move: emotes(ctx, ["clench_fist", "charge_up"])[0], face: "determined" });
          sinceBreak = 0;
        }
        share = reversed ? 0.85 : 0.22;
      }
      const attacker = style === "close" ? (done % 2 === (o.firstIsWinner ? 0 : 1) ? winner : loser) : ctx.rng() < share ? winner : loser;
      const target = attacker === winner ? loser : winner;
      const [cmin, cmax] = COMBO[intensity];
      const combo = cmin + Math.floor(ctx.rng() * (cmax - cmin + 1));
      const weights = WEIGHTS[attacker === winner ? "winner" : "loser"].map((w, k) => (k === 0 ? w * HIT_BOOST[intensity] : w));
      for (let c = 0; c < combo; c++) {
        const pool = pools.get(attacker);
        const move = chooseAttack(ctx, attacker, target, c === 0 && combo > 1 ? pool.light : [...pool.light, ...pool.heavy], last.get(attacker));
        last.set(attacker, move);
        const outcome = OUTCOMES[weighted(ctx, weights)];
        // Switching attackers after a hit: the new attacker is still reacting, so wait for it.
        const prevAttack = steps.findLast((x) => x.kind === "attack");
        const reacting = c === 0 && prevAttack && prevAttack.who !== attacker && prevAttack.outcome === "hit";
        // A parried attacker staggers before it can attack again; a dodger needs a moment to settle.
        const staggered = c === 0 && prevAttack && prevAttack.who === attacker && prevAttack.outcome === "parried";
        const dodged = c === 0 && prevAttack?.outcome === "dodged";
        steps.push({ kind: "attack", who: attacker, target, move, outcome,
          gap: c === 0 ? GAP[intensity] + (reacting ? 0.45 : 0) + (staggered ? 0.6 : 0) + (dodged ? 0.5 : 0) : prevAttack?.outcome === "hit" ? 0.3 : 0.05 });
        sinceBreak++;
        if (outcome === "dodged" || outcome === "parried" || outcome === "whiff") break; // the combo is broken
      }
      // A breather keeps runs of attacks short (W_PACING_MONOTONE) and gives the fight a rhythm.
      if (sinceBreak >= (intensity === "high" ? 6 : 4) && i < ph.exchanges - 1) {
        const hurt = steps[steps.length - 1].target;
        steps.push({ kind: "emote", who: ctx.rng() < 0.5 ? hurt : (hurt === winner ? loser : winner), move: pick(ctx, emotes(ctx, ["taunt", "flex", "shake_head", "clench_fist", "point"])) });
        sinceBreak = 0;
      }
    }
  });
  // The finisher is an attack too: break a long run before it.
  if (sinceBreak >= 5) steps.push({ kind: "emote", who: loser, move: pick(ctx, emotes(ctx, ["taunt", "shake_head", "point"])) });
  return steps;
}

/** Spread damage so the loser runs down toward the finisher and the winner keeps WINNER_LEFT of its HP. */
function budget(ctx, steps, o) {
  const hits = (who) => steps.filter((s) => s.kind === "attack" && s.who === who && s.outcome === "hit");
  const wh = hits(o.winner);
  const lh = hits(o.loser);
  const per = (hp, n) => Math.max(3, Math.min(15, round(hp / Math.max(1, n))));
  const toLoser = per(hpOf(ctx, o.loser) * 0.78, wh.length);
  const toWinner = per(hpOf(ctx, o.winner) * (o.winnerLoss ?? 1 - WINNER_LEFT[o.style]), lh.length);
  for (const s of wh) s.damage = toLoser;
  for (const s of lh) s.damage = toWinner;
}

/**
 * Add a 1v1 fight to the macro as a chain of beats.
 * @param {object} ctx  macro builder context
 * @param {{ winner, loser, exchanges, intensity, style, finisher?, ko, phases?, prev?: string|null, opening?: boolean,
 *           victory?: boolean, music?: boolean, emphasis?: boolean, winnerLoss?: number }} o
 *   winnerLoss: share of the winner's HP this fight takes (a gauntlet spreads it over its opponents)
 *   prev: beat id to start after (null: this fight's first beat is the macro's first beat)
 * @returns {{ first, last, finisher, ko }} beat ids
 */
export function addFight(ctx, o) {
  let prev = o.prev ?? null;
  let first = null;
  const next = (beat, delay = 0) => {
    const id = prev ? ctx.after(prev, beat, delay) : ctx.add({ ...beat, at: 0 });
    first ??= id;
    prev = id;
    return id;
  };
  if (o.opening) {
    next({ who: o.loser, do: pick(ctx, emotes(ctx, ["taunt", "point", "flex"])), face: "smug" });
    next({ who: o.winner, do: pick(ctx, emotes(ctx, ["clench_fist", "bow", "nod"])), face: "determined" }, 0.1);
  }
  const steps = planSteps(ctx, o);
  budget(ctx, steps, o);
  let hasHit = false;
  for (const s of steps) {
    if (s.kind === "charge") next({ who: s.who, do: "charge_up", fx: ["aura"], face: "furious" }, 0.3);
    else if (s.kind === "emote") next({ who: s.who, do: s.move, ...(s.face ? { face: s.face } : {}) }, 0.25);
    else {
      const def = ctx.moves.get(s.move);
      const beat = { who: s.who, do: s.move, target: s.target, outcome: s.outcome, approach: "run" };
      if (s.damage && typeof def.params?.damage === "number" && !def.params.finisher) beat.params = { damage: s.damage };
      next(beat, s.gap ?? 0.3);
      hasHit ||= s.outcome === "hit";
    }
  }
  if (o.music !== false) ctx.with(first, { who: "world", do: "set_music", params: { intensity: MUSIC_INTENSITY[o.intensity] } });
  if (o.frame) ctx.with(first, { who: "world", do: "shot", params: { mode: "follow", targets: [o.winner, o.loser] } }); // only the fighters
  // The finisher: slowmo, a shake and a focus shot on the loser.
  const move = finisherFor(ctx, o.winner, o.finisher, (list) => {
    const ok = list.filter((m) => canHit(ctx, o.winner, o.loser, m));
    return pick(ctx, ok.length ? ok : list);
  });
  const fdef = ctx.moves.get(move);
  const fin = next({ who: o.winner, do: move, target: o.loser, outcome: "hit", approach: "run",
    ...(typeof fdef.params?.damage === "number" && !fdef.params.finisher ? { params: { damage: o.ko ? Math.max(18, round(hpOf(ctx, o.loser) * 0.22)) : 15 } } : {}),
    ...(ctx.catalog.fxNames?.includes("afterimage") ? { fx: ["afterimage"] } : {}) }, 0.4);
  if (o.emphasis !== false) {
    ctx.add({ at: { on: `${fin}.hit` }, who: "world", do: "slowmo", params: { scale: 0.3, duration: 0.5 } });
    ctx.add({ at: { on: `${fin}.hit` }, who: "world", do: "shake", params: { preset: "big" } });
    ctx.add({ at: { on: `${fin}.hit` }, who: "world", do: "shot", params: { mode: "focus", target: o.loser, dur: 1.4 } });
  }
  let ko = null;
  if (o.ko) {
    // The finisher's damage launches the loser: it lands before the KO fall.
    ko = next({ who: o.loser, do: pick(ctx, ["ko_fall", "ko_spin"].filter((m) => ctx.moves.has(m))) }, 0.8);
    if (o.emphasis !== false) ctx.with(ko, { who: "world", do: "text_pop", params: { text: "K.O.!" } }, 0.3);
    if (o.victory) next({ who: o.winner, do: pick(ctx, emotes(ctx, ["victory", "flex", "jump_joy"])), face: "happy" }, 0.3);
  } else {
    next({ who: o.loser, do: ctx.moves.has("dizzy") ? "dizzy" : "stagger", face: "dizzy" }, 0.3);
  }
  if (o.music !== false) ctx.with(prev, { who: "world", do: "set_music", params: { intensity: 0.4, fade: 2 } });
  return { first, last: prev, finisher: fin, ko, hasHit };
}
