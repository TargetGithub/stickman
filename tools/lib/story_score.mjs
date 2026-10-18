// Automatic score for a valid story or fight video (STORY_SPEC 18, S8.4), 0-100, before rendering.
//   arc        setup → incident → journey → climax → resolution, from the outline's scene purposes (fights:
//              intro, rounds, finale)
//   variety    places, kinds of scenes, not all fights
//   emotion    distinct faces shown
//   narration  narration and cards across the scenes, and a closing line
//   action     scenes planned as fights land hits and emphasize the finisher (stories without them get the points)
//   length     the minimum length for the kind
//   clean      few warnings; kids rules (a loss that never comes back, strong words) cost more

import { createEngine } from "../../engine/index.js";
import { MIN_LENGTH } from "./story_prompts.mjs";

const ARC = { story: ["setup", "incident", "journey", "climax", "resolution"], fight: ["intro", "round", "finale"] };
const FIGHTS = new Set(["fight", "round", "finale"]); // scenes planned as fights (a climax may be a chase or a talk)
const KIDS = new Set(["W_KIDS_NO_HOPE", "W_TEXT_SOFT"]);
const NARRATION = new Set(["narrate", "title_card", "chapter_card", "time_card", "end_card", "caption"]);

/** Fraction of the arc's stages present in order in the purposes list. */
function arcShare(purposes, stages) {
  let k = 0;
  for (const p of purposes) if (k < stages.length && (p === stages[k] || (stages[k] === "round" && p === "fight"))) k++;
  return k / stages.length;
}

/**
 * @param {object} script  a valid v2 script; outline: its outline ({ scenes: [{ purpose, location }] })
 * @returns {{ ok, score, parts, stats, loaded }}
 */
export function scoreStory(script, outline, catalog, { minLength } = {}) {
  const engine = createEngine({ catalog });
  const loaded = engine.load(script);
  if (!loaded.ok) return { ok: false, loaded };
  const events = engine.getEvents();
  const scenes = engine.getScenes();
  engine.dispose();
  const kind = script.meta.kind === "fight" ? "fight" : "story";
  const min = minLength ?? MIN_LENGTH[kind];
  const purposes = (outline?.scenes || []).map((s) => s.purpose);
  const fightScenes = purposes.filter((p) => FIGHTS.has(p)).length;
  const faces = new Set(script.scenes.flatMap((s) => [...(s.cast || []).map((c) => c.face), ...(s.beats || []).map((b) => b.face), ...(s.beats || []).flatMap((b) => (b.macro === "dialogue" ? (b.params?.lines || []).map((l) => l[2]) : []))]).filter((f) => f && f !== "neutral"));
  const narrated = new Set(events.filter((e) => e.type === "world" && NARRATION.has(e.do)).map((e) => e.scene));
  const cards = script.scenes.filter((s) => s.transitionIn?.type === "card").length;
  const coverage = Math.min(1, (narrated.size + cards) / Math.max(1, scenes.length) / 0.6);
  const lastScene = scenes.length - 1;
  const closing = events.some((e) => e.type === "world" && e.scene === lastScene && ["narrate", "end_card"].includes(e.do)) || !!script.scenes.at(-1)?.transitionOut;
  const hits = events.filter((e) => e.type === "hit" && e.kind === "hit").length;
  const slowmo = events.some((e) => e.type === "world" && e.do === "slowmo");
  const warnings = loaded.warnings.map((w) => w.code);
  const kidsIssues = warnings.filter((c) => KIDS.has(c)).length;

  const parts = {
    arc: Math.round(20 * arcShare(purposes, ARC[kind])),
    variety: Math.round(5 * Math.min(1, new Set(script.scenes.map((s) => s.location).filter(Boolean)).size / 3)
      + 5 * Math.min(1, new Set(purposes).size / 4)
      + 5 * (kind === "fight" ? Math.min(1, fightScenes / 3) : fightScenes <= Math.ceil(purposes.length / 2) ? 1 : 0.4)),
    emotion: Math.round(15 * Math.min(1, faces.size / 6)),
    narration: Math.round(7 * coverage + (closing ? 3 : 0)),
    action: fightScenes ? Math.round(10 * Math.min(1, hits / (5 * fightScenes)) + (slowmo ? 5 : 0)) : 15,
    length: Math.round(15 * Math.min(1, loaded.durationSec / min)),
    clean: Math.max(0, 10 - warnings.filter((c) => !KIDS.has(c)).length) - 5 * kidsIssues,
  };
  const score = Math.max(0, Object.values(parts).reduce((a, b) => a + b, 0));
  const stats = {
    durationSec: Number(loaded.durationSec.toFixed(1)), scenes: scenes.length, fightScenes, faces: faces.size,
    narratedScenes: narrated.size, cards, hits, warnings: warnings.length, kidsIssues,
  };
  return { ok: true, score, parts, stats, loaded };
}

/** Plain-language feedback for a low story score. */
export function storyFeedback({ parts, stats }, kind = "story") {
  const out = [];
  if (parts.arc < 20) out.push(kind === "fight" ? "Give it a clear shape: an intro, rounds that build, and a finale." : "Give it a full arc: setup, incident, journey, climax and resolution.");
  if (parts.variety < 15) out.push("Vary the places and the kinds of scenes (talk, play, travel, action, feelings).");
  if (parts.emotion < 15) out.push(`Show more feelings on faces (now ${stats.faces} different ones; aim for 6+).`);
  if (parts.narration < 10) out.push("Add narration or cards so young viewers can follow, and a closing line in the last scene.");
  if (parts.action < 15) out.push("Make the fights land: more hits and a slow-motion finisher.");
  if (parts.length < 15) out.push(`It runs ${stats.durationSec} s; it needs more.`);
  if (parts.clean < 10) out.push(`Fix the warnings (${stats.warnings})${stats.kidsIssues ? ", especially the kids rules" : ""}.`);
  return out;
}
