// Fight and feeling macros (STORY_SPEC 11.1, 12, 13). Milestone: S6.
//   @fight   a full 1v1: opening, exchanges weighted toward the winner, a comeback reversal, phases with
//            charge-ups, an emphasized finisher, and the KO (or a dizzy loser left standing, ko: false)
//   @defeat  the stylized defeat sequence: a stagger, a close-up, the style move, the other side's reaction
//   @grief   kneel by the lost friend, cry, rain, desaturate, sad music

import { addFight } from "./fight_core.js";
import { emotes } from "./pools.js";
import { pick, round } from "../compile.js";

const EXCHANGES = { low: 6, medium: 8, high: 10 };
const CLOSE_UP = { ko: 1.8, faint: 2.4, vanish: 3.2, ghost: 3.8, captured: 2.6, flee: 1.6, petrify: 2.8 };

function fight(ctx, p) {
  const [a, b] = p.sides;
  const winner = p.winner;
  const loser = winner === a ? b : a;
  const intensity = p.intensity ?? "medium";
  const ko = p.ko !== false;
  const f = addFight(ctx, {
    winner, loser, intensity, ko,
    exchanges: p.exchanges ?? EXCHANGES[intensity],
    style: p.style ?? "even",
    finisher: p.finisher,
    phases: p.phases,
    opening: true, victory: ko, firstIsWinner: ctx.rng() < 0.5, frame: true,
  });
  return { anchors: { start: `${f.first}.start`, end: `${f.last}.end`, finisher: `${f.finisher}.hit`, ko: `${f.ko ?? f.last}.start` } };
}

/** How the other side reacts to a defeat style. */
const REACTION = {
  ko: ["flex", "victory"], faint: ["laugh", "shrug"],
  captured: ["point", "clench_fist"], flee: ["laugh", "cheer"], petrify: ["laugh", "point"],
};
const REACTION_FACE = { captured: "determined", ko: "determined", faint: "laugh", flee: "laugh", petrify: "smug" };

function defeat(ctx, p) {
  const style = p.style;
  const move = style === "ko" ? "ko_fall" : style;
  const lead = ctx.add({ at: 0, who: p.who, do: ctx.moves.has("stagger") ? "stagger" : "hit_light", face: "hurt" });
  ctx.with(lead, { who: "world", do: "shot", params: { mode: "close_up", target: p.who, dur: CLOSE_UP[style] ?? 2 } });
  const gone = ctx.after(lead, { who: p.who, do: move }, 0.1);
  if (style === "vanish" || style === "ghost" || style === "petrify") ctx.with(gone, { who: "world", do: "set_music", params: { mood: "sad", intensity: 0.3, fade: 1.5 } });
  let end = gone;
  // The winner's reaction (a capture, a knockout); a villain who just took someone away is usually leaving.
  if (p.by && ctx.present(p.by) && style !== "vanish" && style !== "ghost") {
    const list = emotes(ctx, REACTION[style] || ["nod"]);
    if (list.length) end = ctx.after(gone, { who: p.by, do: pick(ctx, list), target: p.who, face: REACTION_FACE[style] ?? "neutral" }, 0.3);
  }
  return { anchors: { start: `${lead}.start`, end: `${end}.end`, gone: `${gone}.end` } };
}

function grief(ctx, p) {
  const dur = p.dur ?? 6;
  let first = null;
  if (p.over && ctx.present(p.over)) first = ctx.add({ at: 0, who: p.who, do: "walk", to: { near: p.over, gap: 90 }, face: "sad" });
  const kneelBeat = { who: p.who, do: "kneel", face: "sad" };
  const kneel = first ? ctx.after(first, kneelBeat, 0.2) : ctx.add({ ...kneelBeat, at: 0 });
  first ??= kneel;
  ctx.with(kneel, { who: "world", do: "desaturate", params: { amount: 0.55, dur: 2 } });
  ctx.with(kneel, { who: "world", do: "set_music", params: { mood: "sad", intensity: 0.3, fade: 2 } });
  ctx.with(kneel, { who: "world", do: "shot", params: { mode: "close_up", target: p.who, dur: round(Math.min(30, dur + 1.5)) } }, 0.4);
  if (p.rain) ctx.with(kneel, { who: "world", do: "set_weather", params: { weather: "rain", dur: 2 } }, 0.5);
  let prev = kneel;
  const cries = Math.max(1, Math.round((dur - 1) / 2));
  for (let k = 0; k < cries; k++) prev = ctx.after(prev, { who: p.who, do: "cry", ...(k === 0 && ctx.catalog.fxNames?.includes("tears") ? { fx: ["tears"] } : {}) }, 0.1);
  const end = ctx.after(prev, { who: p.who, do: ctx.moves.has("sigh") ? "sigh" : "wait" }, 0.2);
  return { anchors: { start: `${first}.start`, end: `${end}.end` } };
}

export const SEQUENCE_MACROS = { fight, defeat, grief };
