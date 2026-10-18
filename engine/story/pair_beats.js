// The director's side of paired moves (STORY_SPEC 9, S5.1). Milestone: S5.
// Before a paired move starts: the partner must be free (else the beat waits in the partner's queue),
// then the lead walks (or runs) to the pair distance, unless the partner is already attached to it
// (put_down). Unreachable partners are reported as E_SIM_PARTNER_UNREACHABLE.

import { pairStartX } from "./pairs.js";
import { motionScale } from "../combat.js";

const MAX_PAIR_APPROACH = 8; // seconds of walking before an interaction counts as unreachable
const SNAP = 14; // px (× scale) the lead may be off without walking

/**
 * @returns {boolean} true when the beat has to wait (queued on the partner, or walking there first)
 */
export function pairGate({ director, beat, actor, def, ctx, issue, command, isFree }) {
  const partner = ctx.world.byId.get(beat.partner);
  if (!partner || partner === actor) return false; // reported by the validator (E_PARTNER_MISSING, E_PARTNER_SELF)
  if (!isFree(partner) && !beat.interrupt && partner.pairedWith !== actor.id) {
    beat.state = "waiting";
    const q = director.waiting.get(partner.id) || [];
    if (!q.includes(beat)) q.push(beat);
    director.waiting.set(partner.id, q);
    return true;
  }
  const attached = (ctx.world.pairs || []).some((p) => p.lead === actor && p.partner === partner && p.attached);
  if (attached || !def.pair.gap) return false;
  const want = pairStartX(actor, partner, def.pair);
  const need = want - actor.x;
  if (beat.state === "approached" || Math.abs(need) <= SNAP * actor.scale) {
    actor.x = want; // close enough: settle exactly at the pair distance
    return false;
  }
  if (beat.approach === false) {
    issue(director, "E_SIM_PARTNER_UNREACHABLE", beat, `'${beat.who}' is ${Math.abs(need).toFixed(0)}px from where '${beat.do}' with '${beat.partner}' starts, and "approach" is false.`,
      `Remove "approach": false (the default walks there), or place them closer.`);
    actor.x = want;
    return false;
  }
  const mode = beat.approach === "run" ? "run" : "walk";
  const seconds = Math.abs(need) / ((mode === "walk" ? 120 : 550) * motionScale(actor));
  if (seconds > MAX_PAIR_APPROACH) {
    issue(director, "E_SIM_PARTNER_UNREACHABLE", beat, `'${beat.who}' would ${mode} ${seconds.toFixed(1)}s to reach '${beat.partner}' for '${beat.do}' (max ${MAX_PAIR_APPROACH}s).`,
      `Start them closer, add "approach": "run", or walk there in an earlier beat.`);
  }
  actor.facing = Math.sign(need) || actor.facing;
  command(ctx.world, beat.who, mode, { params: { distance: Math.abs(need) } });
  beat.notes.push(`${mode} ${Math.abs(need).toFixed(0)}px to ${beat.partner}`);
  beat.state = "approached";
  director.waiting.set(actor.id, [beat, ...(director.waiting.get(actor.id) || []).filter((b) => b !== beat)]);
  return true;
}
