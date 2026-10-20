// Pace checks (ADR-038), from a dry run: only scenes with a pace. All warnings.
//   W_PACE_TRAVEL  a walk, run or sneak beat lasts longer than PACE_LIMITS.travel seconds
//   W_PACE_GAP     nothing happens on screen for more than PACE_LIMITS.gap seconds (no character acting,
//                  speaking or narrated; holding still with wait, idle or sleep does not count)

import { TO_MOVES } from "../story/destinations.js";
import { narrateDuration } from "../story/timing.js";

export const PACE_LIMITS = { travel: 4, gap: 1.5 }; // s
const QUIET = ["wait", "idle", "sleep"];
const WORLD_ACTION = ["activity", "narrate", "caption", "text_pop", "title_card", "chapter_card", "time_card", "end_card"];
const DUR = { narrate: narrateDuration, caption: (p) => p.dur ?? 2, text_pop: (p) => p.dur ?? 0.8 };

/**
 * @param {object} sim  simulate(..., { dryRun: true })
 * @returns {object[]} issues
 */
export function paceIssues(sim) {
  const out = [];
  for (const sc of sim.scenes) {
    if (!sc.pace) continue;
    const beats = sim.beats.filter((b) => b.scene === sc.index && b.firedAt != null);
    const t0 = sc.storyStart;
    const t1 = Math.max(t0, ...beats.map((b) => b.endedAt ?? b.firedAt));
    for (const b of beats) {
      if (!TO_MOVES.includes(b.do) || b.endedAt == null) continue;
      const d = b.endedAt - (b.approachAt ?? b.firedAt);
      if (d > PACE_LIMITS.travel) {
        out.push({ code: "W_PACE_TRAVEL", path: b.path, message: `'${b.who}' ${b.do} lasts ${d.toFixed(1)}s (a paced scene keeps travel under ${PACE_LIMITS.travel}s).`,
          fix: "Shorten the walk, start closer, use \"to\" (a long walk then cuts to the arrival) or cut to the next scene." });
      }
    }
    const busy = [];
    for (const b of beats) {
      if (b.who === "world" ? !WORLD_ACTION.includes(b.do) : QUIET.includes(b.do) && !b.say) continue;
      const end = b.who === "world" && DUR[b.do] ? b.firedAt + DUR[b.do](b.params || {}) : b.endedAt ?? b.firedAt;
      busy.push([b.approachAt ?? b.firedAt, Math.max(end, b.firedAt + 0.2), b]);
    }
    for (const e of sim.events) if (e.type === "say" && e.scene === sc.index) busy.push([e.storyT, e.storyT + e.dur, null]);
    busy.sort((a, b) => a[0] - b[0]);
    let covered = t0;
    for (const [s, e, b] of busy) {
      if (s - covered > PACE_LIMITS.gap) {
        out.push({ code: "W_PACE_GAP", path: b?.path ?? sc.srcPath ?? `scenes[${sc.index}]`, message: `Nothing happens in scene '${sc.id}' from ${(covered - t0).toFixed(1)}s to ${(s - t0).toFixed(1)}s (a paced scene keeps pauses under ${PACE_LIMITS.gap}s).`,
          fix: "Trim the delay before this beat, or give someone something to do meanwhile." });
      }
      covered = Math.max(covered, e);
    }
    if (t1 - covered > PACE_LIMITS.gap) {
      out.push({ code: "W_PACE_GAP", path: `scenes[${sc.index}]`, message: `Nothing happens for the last ${(t1 - covered).toFixed(1)}s of scene '${sc.id}'.`, fix: "End the scene sooner." });
    }
  }
  return out;
}
