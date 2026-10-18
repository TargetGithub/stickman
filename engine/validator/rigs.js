// Rig checks (STORY_SPEC 6.2, ADR-020). Milestone: A1.
//   E_MOVE_RIG    a move the character's rig can't play (a jab for a dog, a dog move for a stickman), also as the
//                 partner of a paired move (pat_head with a dog: use pet_dog)
//   E_TARGET_RIG  an attack aimed at a quadruped (pets never take hits)
//   E_MACRO_RIG   a fight macro (@fight, @gauntlet, @brawl) naming a quadruped as a fighter

import { resolveMove, rigAccepts } from "../moves.js";
import { closestMatch } from "./report.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/** A character's body plan from the catalog (its rig, move map and name), stickman when unknown. */
export function planOf(catalog, body) {
  const plan = catalog.bodies?.[body || "stickman"];
  return { name: body || "stickman", rig: plan?.rig || "humanoid", moveMap: plan?.moves || null };
}

/** Move names a rig can play, generic names its map covers included. */
function movesForRig(moves, plan) {
  const own = [...moves.values()].filter((d) => rigAccepts(d, plan.rig) && !d.flags.partner).map((d) => d.name);
  return [...new Set([...Object.keys(plan.moveMap || {}), ...own])];
}

/**
 * E_MOVE_RIG and E_TARGET_RIG for one character beat (after its move was found).
 * @param {{ who:string, do:string, target?:string }} b
 * @param {Map<string, object>} bodyOf  character id → body plan name
 */
export function beatRigIssues(b, path, catalog, moves, bodyOf) {
  const out = [];
  const plan = planOf(catalog, bodyOf.get(b.who));
  const def = resolveMove(moves, plan, b.do);
  if (def && !rigAccepts(def, plan.rig)) {
    const pool = movesForRig(moves, plan);
    const near = closestMatch(b.do, pool);
    out.push(issue("E_MOVE_RIG", `${path}.do`, `'${b.who}' (${plan.name}, a ${plan.rig}) can't play '${b.do}' (a ${def.rig} move).`,
      near ? `Use a ${plan.rig} move such as '${near}'.` : `Use one of: ${pool.slice(0, 12).join(", ")}.`));
  }
  if (def?.pair && b.partner && bodyOf.has(b.partner)) {
    const other = planOf(catalog, bodyOf.get(b.partner));
    const pm = resolveMove(moves, other, def.pair.partnerMove);
    if (pm && !rigAccepts(pm, other.rig)) {
      const fits = [...moves.values()].filter((d) => d.pair && rigAccepts(d, plan.rig) && rigAccepts(resolveMove(moves, other, d.pair.partnerMove) || {}, other.rig)).map((d) => d.name);
      out.push(issue("E_MOVE_RIG", `${path}.partner`, `'${b.partner}' (${other.name}, a ${other.rig}) can't be the partner of '${b.do}'.`,
        fits.length ? `Use a paired move made for it: ${fits.join(", ")}.` : `No paired move of '${b.who}' suits a ${other.rig}.`));
    }
  }
  if (def?.category === "attack" && b.target && planOf(catalog, bodyOf.get(b.target)).rig === "quadruped") {
    out.push(issue("E_TARGET_RIG", `${path}.target`, `'${b.target}' is a ${bodyOf.get(b.target)}: animals never take hits.`, "Target another character, or let the animal dodge, bark or run instead."));
  }
  return out;
}

/** Fighters a fight macro names, with their param paths. */
function fighters(macro, p) {
  if (macro === "fight") return (p.sides || []).map((id, i) => [id, `sides[${i}]`]);
  if (macro === "gauntlet") return [[p.hero, "hero"], ...(p.opponents || []).map((id, i) => [id, `opponents[${i}]`])];
  if (macro === "brawl") return ["a", "b"].flatMap((t) => (p.teams?.[t] || []).map((id, i) => [id, `teams.${t}[${i}]`]));
  return [];
}

/**
 * E_MACRO_RIG for one beat macro.
 * @param {Map<string, string>} bodyOf  cast id → body plan name
 */
export function macroRigIssues(b, path, catalog, bodyOf) {
  const out = [];
  for (const [id, k] of fighters(b.macro, b.params || {})) {
    if (typeof id === "string" && planOf(catalog, bodyOf.get(id)).rig === "quadruped") {
      out.push(issue("E_MACRO_RIG", `${path}.params.${k}`, `'${id}' is a ${bodyOf.get(id)} and can't fight in @${b.macro}.`, "Leave the animal out of the fight: it can bark, dodge, chase or tug a villain's cape in its own beats."));
    }
  }
  return out;
}
