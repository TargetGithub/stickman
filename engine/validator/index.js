// Validator entry point: schema → semantics → dry run (spec 16). Milestone M3.
// Every result includes a timeline the LLM can read, when the script got far enough to simulate.

import { checkSchema, checkValue, jsonSchema, buildJsonSchema } from "./schema.js";
import { jsonSchemaV2 } from "./schema_v2.js";
import { checkSemantics, WORLD_COMMANDS } from "./semantic.js";
import { checkStory } from "./story.js";
import { formatIssues, formatTimeline } from "./report.js";
import { simulate, movesFor } from "../sim.js";
import { normalize } from "../story/normalize.js";
import { LIMITS, LIMITS_V2 } from "../config.js";

export { jsonSchema, buildJsonSchema, WORLD_COMMANDS, formatIssues };

const isWarning = (i) => i.code.startsWith("W_") || i.severity === "warning";
const DRAMATIC = ["slowmo", "freeze", "zoom_punch", "text_pop", "shake", "flash"];
const ENDINGS = ["victory", "ko_fall", "ko_spin", "fade", "end_card"];

/** Pacing heuristics (spec 16.4), from a dry run. All warnings. */
function pacing(script, sim, moves, opts = {}) {
  const out = [];
  const where = opts.path ?? "beats";
  const ran = sim.beats.filter((b) => b.firedAt != null).sort((a, b) => a.firedAt - b.firedAt || a.index - b.index);
  const end = sim.clock.storyT;
  const spans = ran.map((b) => [b.firedAt, Math.max(b.endedAt ?? b.firedAt, b.firedAt + 0.2)]).sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [s, e] of spans) {
    if (s - covered > 2.5) out.push({ code: "W_PACING_GAP", path: where, message: `Nothing happens from ${covered.toFixed(1)}s to ${s.toFixed(1)}s.`, fix: "Add a beat (taunt, wait with say, camera move) or tighten the timing." });
    covered = Math.max(covered, e);
  }
  if (end - covered > 2.5) out.push({ code: "W_PACING_GAP", path: where, message: `Nothing happens for the last ${(end - covered).toFixed(1)}s.`, fix: "End with a fade or trim the delays." });

  const hits = sim.events.filter((e) => e.type === "hit" && e.kind === "hit");
  // Stories need not have fights; the impact rule is for v1 clips and fight videos.
  if (opts.impact !== false && !sim.events.some((e) => e.type === "hitstop")) out.push({ code: "W_NO_IMPACT", path: where, message: "No hit lands with hitstop, so nothing feels powerful.", fix: "Make at least one attack beat use \"outcome\": \"hit\"." });

  let run = 0;
  for (const b of ran) {
    if (b.who === "world") {
      if (DRAMATIC.includes(b.do)) run = 0;
    } else if (moves.get(b.do)?.category !== "attack") run = 0;
    else if (++run === 9) out.push({ code: "W_PACING_MONOTONE", path: b.path, message: "More than 8 attacks in a row without a reaction beat, taunt or dramatic effect.", fix: "Break the run with a taunt, a slowmo, or a pause." });
  }
  if (!opts.endsWithTransition && !ran.slice(-3).some((b) => ENDINGS.includes(b.do))) out.push({ code: "W_NO_ENDING", path: where, message: "The script has no clear ending.", fix: "End with victory, ko_fall, or a world fade." });

  if (script.meta.autoCamera === false) {
    for (const h of hits.filter((e) => e.damage > 15)) {
      const near = ran.some((b) => b.who === "world" && ["slowmo", "zoom_punch", "freeze"].includes(b.do) && Math.abs(b.firedAt - h.storyT) <= 0.5);
      if (!near) out.push({ code: "W_HEAVY_NO_EMPHASIS", path: where, message: `A heavy hit at ${h.storyT.toFixed(2)}s has no slowmo or zoom.`, fix: `Add {"at": {"on": "${h.beatId}.hit"}, "who": "world", "do": "slowmo", ...}.` });
    }
  }
  return out;
}

/**
 * Validate a script (spec 16).
 * @returns {{ ok:boolean, errors:object[], warnings:object[], timeline:string, durationSec:number|null, stage:string }}
 */
export function validate(script, catalog) {
  const result = (stage, issues, sim = null) => ({
    ok: !issues.some((i) => !isWarning(i)),
    errors: issues.filter((i) => !isWarning(i)).map(({ severity, ...i }) => i),
    warnings: issues.filter(isWarning).map(({ severity, ...i }) => i),
    timeline: sim ? formatTimeline(sim) : "",
    durationSec: sim ? sim.durationSec : null,
    stage,
  });

  if (!script || typeof script !== "object" || Array.isArray(script)) {
    return result("schema", [{ code: "E_SCHEMA_TYPE", path: "", message: "The script must be a JSON object.", fix: "Return one JSON object." }]);
  }
  const version = versionIssue(script);
  if (version) return result("schema", [version]);
  const v2 = script.version === 2;
  const schemaIssues = v2 ? checkSchemaV2(script) : checkSchema(script);
  if (schemaIssues.length) return result("schema", schemaIssues);

  const moves = movesFor(catalog);
  const story = v2 ? normalize(script) : null;
  const semantic = v2 ? checkStory(story, catalog, moves) : checkSemantics(script, catalog, moves);
  if (semantic.some((i) => !isWarning(i))) return result("semantic", semantic);

  const sim = simulate(script, catalog, { dryRun: true });
  const issues = [...semantic, ...sim.issues];
  if (sim.durationSec < LIMITS.minDuration) {
    issues.push({ code: "E_SIM_DURATION", path: v2 ? "scenes" : "beats", message: `The video is only ${sim.durationSec.toFixed(1)}s long.`, fix: `Make it at least ${LIMITS.minDuration}s.` });
  }
  if (v2) issues.push(...lengthIssues(story, sim), ...overlappingLines(sim));
  issues.push(...pacing(v2 ? { meta: story.meta } : script, sim, moves, v2 ? { path: "scenes", impact: story.meta.kind === "fight", endsWithTransition: !!story.scenes[story.scenes.length - 1].transitionOut } : {}));
  return result("dry-run", issues, sim);
}

/** E_VERSION: an unknown version, or a v1-shaped script labeled version 2. */
function versionIssue(script) {
  if (script.version === 1 || script.version === 2) {
    if (script.version === 2 && "characters" in script && !("scenes" in script)) {
      return { code: "E_VERSION", path: "version", message: "This looks like a version 1 script (characters, camera, beats) labeled version 2.", fix: 'Set "version": 1, or write a story with "cast" and "scenes".' };
    }
    return null;
  }
  return { code: "E_VERSION", path: "version", message: `Unknown script version ${JSON.stringify(script.version)}.`, fix: 'Use "version": 1 (a single fight clip) or "version": 2 (a story with scenes).' };
}

function checkSchemaV2(script) {
  const size = JSON.stringify(script).length;
  if (size > LIMITS_V2.scriptBytes) {
    return [{ code: "E_SCHEMA_SIZE", path: "", message: `Script is ${size} bytes.`, fix: `Keep scripts under ${LIMITS_V2.scriptBytes} bytes.` }];
  }
  const out = checkValue(script, jsonSchemaV2);
  const beats = (script.scenes || []).reduce((n, s) => n + (Array.isArray(s?.beats) ? s.beats.length : 0), 0);
  if (beats > LIMITS_V2.beatsAuthored) {
    out.push({ code: "E_SCHEMA_SIZE", path: "scenes", message: `The story has ${beats} beats.`, fix: `Keep it under ${LIMITS_V2.beatsAuthored} authored beats; use fewer, longer scenes.` });
  }
  return out;
}

/** W_DIALOGUE_FAST: a character's next line starts while its previous bubble is still up. */
function overlappingLines(sim) {
  const out = [];
  const last = new Map();
  for (const e of sim.events.filter((x) => x.type === "say")) {
    const prev = last.get(e.actor);
    if (prev && e.videoT < prev.videoT + prev.dur - 0.05) {
      const beat = sim.beats.find((b) => b.id === e.beatId);
      out.push({ code: "W_DIALOGUE_FAST", path: beat?.path ?? "scenes", message: `'${e.actor}' says "${e.text}" while "${prev.text}" is still showing.`,
        fix: `Start the line later: "at": {"after": "<previous beat>", "delay": ${(prev.dur).toFixed(1)}} or more.` });
    }
    last.set(e.actor, e);
  }
  return out;
}

/** Minimum lengths for stories and fight videos (W_STORY_SHORT, W_FIGHT_SHORT). */
function lengthIssues(story, sim) {
  const kind = story.meta.kind ?? "story";
  const min = kind === "story" ? LIMITS_V2.storyMin : kind === "fight" ? LIMITS_V2.fightMin : 0;
  if (!min || sim.durationSec >= min) return [];
  const code = kind === "story" ? "W_STORY_SHORT" : "W_FIGHT_SHORT";
  return [{ code, path: "scenes", message: `The ${kind} is ${sim.durationSec.toFixed(0)}s long; ${kind === "story" ? "stories" : "fight videos"} should be at least ${min}s.`,
    fix: kind === "story" ? "Add scenes (an intro, a journey, a homecoming) or lengthen activities and dialogue." : "Add rounds, breathers between them, or an intro and a victory scene." }];
}

export { formatTimeline };
