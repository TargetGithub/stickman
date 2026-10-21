// Pace checks (ADR-038), from a dry run: only scenes with a pace. All warnings.
//   W_PACE_TRAVEL  a walk, run or sneak beat lasts longer than PACE_LIMITS.travel seconds
//   W_PACE_GAP     nothing happens on screen for more than PACE_LIMITS.gap seconds (no character acting,
//                  speaking or narrated; holding still with wait, idle or sleep does not count)
//   W_SPEAKER_OFFSCREEN  a character speaks while the shot (a script shot, or the auto camera) is built
//                  around others, so they may be out of frame (the auto camera itself keeps speakers in shot)

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
    out.push(...offscreenSpeakers(sim, sc));
    if (t1 - covered > PACE_LIMITS.gap) {
      out.push({ code: "W_PACE_GAP", path: `scenes[${sc.index}]`, message: `Nothing happens for the last ${(t1 - covered).toFixed(1)}s of scene '${sc.id}'.`, fix: "End the scene sooner." });
    }
  }
  return out;
}

const SPEAKER_SETTLE = 0.6; // s after a line starts: the camera has glided to the speaker by then

/** Lines spoken while the camera's close-up or medium leaves the speaker out (camera log, video time). */
function offscreenSpeakers(sim, sc) {
  const log = (sim.cameraLog || []).filter((c) => c.mode !== "travelCut");
  const out = [];
  for (const e of sim.events) {
    if (e.type !== "say" || e.scene !== sc.index || e.bubble === "think" || typeof e.videoT !== "number") continue;
    const k = log.findLast((c) => c.t <= e.videoT + SPEAKER_SETTLE);
    if (!k || !["close_up", "medium"].includes(k.mode) || k.target === e.actor || k.targets?.includes(e.actor)) continue;
    out.push({ code: "W_SPEAKER_OFFSCREEN", path: sc.srcPath ?? `scenes[${sc.index}]`,
      message: `'${e.actor}' speaks at ${(e.storyT - sc.storyStart).toFixed(1)}s in scene '${sc.id}' while the shot is on ${k.target ?? k.targets.join(", ")}.`,
      fix: "Add a shot of the speaker with the line, shorten the shot before it, or move the line." });
  }
  return out;
}

