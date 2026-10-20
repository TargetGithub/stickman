// Validator entry point: schema → semantics → dry run (spec 16). Milestone M3.
// Every result includes a timeline the LLM can read, when the script got far enough to simulate.

import { checkSchema, checkValue, jsonSchema, buildJsonSchema } from "./schema.js";
import { schemaV2For } from "./schema_v2.js";
import { schemaV3For } from "./schema_v3.js";
import { depthIssues } from "./depth.js";
import { motionIssues } from "./motion.js";
import { audioTrackIssues } from "./audio.js";
import { checkSemantics, WORLD_COMMANDS } from "./semantic.js";
import { checkStory } from "./story.js";
import { formatIssues, formatTimeline } from "./report.js";
import { simulate, movesFor } from "../sim.js";
import { normalize } from "../story/normalize.js";
import { compileStory } from "../story/compile.js";
import { macroIssues } from "./macros.js";
import { bundleIssues } from "../bundles.js";
import { expandScript } from "../templates.js";
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
  // Objects in motion (a bubble popping, a ball bouncing, a car passing) count as something happening (S4).
  const objectSpans = sim.events.filter((e) => e.type === "object").map((e) => [e.storyT, e.storyT + 0.3]);
  const spans = [...ran.map((b) => [b.approachAt ?? b.firedAt, Math.max(b.endedAt ?? b.firedAt, b.firedAt + 0.2)]), ...objectSpans].sort((a, b) => a[0] - b[0]);
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
    ...(sim?.story && !sim.story.legacy ? { scenes: sim.scenes.map((sc) => ({ id: sc.id, seconds: Number((sc.frames / 60).toFixed(2)) })), endState: sim.endState } : {}),
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
  // Templates and markers (V3.8): expand them first; everything after sees a plain v3 script.
  const expanded = expandScript(script, catalog);
  if (expanded.issues.length) return result("semantic", expanded.issues);
  script = expanded.script;
  const v2 = script.version >= 2; // 2, or 3 with the depth lane (V3.2)
  const schemaIssues = v2 ? checkSchemaV2(script, catalog) : checkSchema(script);
  if (schemaIssues.length) return result("schema", schemaIssues);
  // Declared bundles against the loaded ones, before any name is looked up (CATALOG_BUNDLE_SPEC 7.4).
  const bundle = bundleIssues(script, catalog);
  if (bundle.some((i) => !isWarning(i))) return result("semantic", bundle);

  const moves = movesFor(catalog);
  let story = null;
  let semantic;
  if (v2) {
    // Macro params first, then compile (ADR-014), then every check on the compiled beats.
    const authored = normalize(script);
    const pre = [...macroIssues(authored, catalog, moves), ...depthIssues(authored, catalog), ...motionIssues(authored, catalog), ...audioTrackIssues(authored, catalog)];
    if (pre.length) return result("semantic", pre);
    try {
      story = compileStory(authored, catalog, moves).story;
    } catch (err) {
      return result("semantic", [{ code: "E_MACRO_PARAM", path: "scenes", message: `A macro could not be expanded (${err.message}).`, fix: "Check the macro params against the cast and the scenes." }]);
    }
    semantic = mapCompiled(checkStory(story, catalog, moves), story);
  } else semantic = checkSemantics(script, catalog, moves);
  if (semantic.some((i) => !isWarning(i))) return result("semantic", semantic);

  const sim = simulate(v2 ? story : script, catalog, { dryRun: true });
  const issues = [...bundle, ...semantic, ...sim.issues];
  if (sim.durationSec < LIMITS.minDuration) {
    issues.push({ code: "E_SIM_DURATION", path: v2 ? "scenes" : "beats", message: `The video is only ${sim.durationSec.toFixed(1)}s long.`, fix: `Make it at least ${LIMITS.minDuration}s.` });
  }
  if (v2) issues.push(...lengthIssues(story, sim), ...overlappingLines(sim), ...staticScenes(sim));
  issues.push(...pacing(v2 ? { meta: story.meta } : script, sim, moves, v2 ? { path: "scenes", impact: story.meta.kind === "fight", endsWithTransition: !!story.scenes[story.scenes.length - 1].transitionOut } : {}));
  return result("dry-run", issues, sim);
}

/**
 * Issue paths of the compiled story → the authored story: scene indices through `srcPath`, beats through
 * their `path`; issues inside a macro expansion point at the macro beat (one issue per macro and message).
 */
function mapCompiled(issues, story) {
  const seen = new Set();
  const out = [];
  for (const i of issues) {
    const m = i.path.match(/^scenes\[(\d+)\](.*)$/);
    const sc = m ? story.scenes[+m[1]] : null;
    let mapped = i;
    if (sc) {
      const bm = m[2].match(/^\.beats\[(\d+)\](.*)$/);
      const b = bm ? sc.beats[+bm[1]] : null;
      if (b?.expandedFrom) mapped = { ...i, path: b.path, message: `${i.message} (in the expansion of macro '${b.expandedFrom}')` };
      else if (b) mapped = { ...i, path: b.path + bm[2] };
      else if (sc.expandedFrom) mapped = { ...i, path: sc.srcPath, message: `${i.message} (in scene '${sc.id}' of macro '${sc.expandedFrom}')` };
      else mapped = { ...i, path: (sc.srcPath ?? `scenes[${m[1]}]`) + m[2] };
    }
    const key = `${mapped.code}|${mapped.path}|${mapped.message}`;
    if (!seen.has(key)) out.push(mapped);
    seen.add(key);
  }
  return out;
}

const STILL = ["idle", "wait", "face"];
const STILL_LIMIT = 4; // s

/** W_SCENE_STATIC: over 4 s in a scene where nobody moves and no narration, card or bubble shows. */
function staticScenes(sim) {
  const out = [];
  sim.scenes.forEach((sc, i) => {
    const t0 = sc.storyStart;
    const t1 = sim.scenes[i + 1]?.storyStart ?? sim.clock.storyT;
    const spans = [];
    for (const b of sim.beats) {
      if (b.scene !== i || b.firedAt == null) continue;
      if (b.who === "world") spans.push([b.firedAt, Math.max(b.endedAt ?? b.firedAt, b.firedAt + 0.3)]);
      else if (!STILL.includes(b.do)) spans.push([b.approachAt ?? b.firedAt, b.endedAt ?? t1]);
    }
    for (const e of sim.events) {
      if (e.scene !== i) continue;
      if (e.type === "say") spans.push([e.storyT, e.storyT + e.dur]);
      if (e.type === "object") spans.push([e.storyT, e.storyT + 0.3]);
    }
    spans.sort((a, b) => a[0] - b[0]);
    let covered = t0;
    for (const [s, e] of [...spans, [t1, t1]]) {
      if (s - covered > STILL_LIMIT) {
        out.push({ code: "W_SCENE_STATIC", path: sim.story.scenes[i]?.srcPath ?? `scenes[${i}]`, message: `Scene '${sc.id}' stands still from ${(covered - t0).toFixed(1)}s to ${(s - t0).toFixed(1)}s (no movement, narration or dialogue).`,
          fix: "Add movement (a walk, an emote, an activity) or narration, or shorten the wait." });
        break;
      }
      covered = Math.max(covered, e);
    }
  });
  return out;
}

/** E_VERSION: an unknown version, or a v1-shaped script labeled version 2 or 3. */
function versionIssue(script) {
  if (script.version === 1 || script.version === 2 || script.version === 3) {
    if (script.version >= 2 && "characters" in script && !("scenes" in script)) {
      return { code: "E_VERSION", path: "version", message: `This looks like a version 1 script (characters, camera, beats) labeled version ${script.version}.`, fix: 'Set "version": 1, or write a story with "cast" and "scenes".' };
    }
    return null;
  }
  return { code: "E_VERSION", path: "version", message: `Unknown script version ${JSON.stringify(script.version)}.`, fix: 'Use "version": 1 (a single fight clip), 2 (a story with scenes) or 3 (a story with the depth lane).' };
}

function checkSchemaV2(script, catalog) {
  const size = JSON.stringify(script).length;
  if (size > LIMITS_V2.scriptBytes) {
    return [{ code: "E_SCHEMA_SIZE", path: "", message: `Script is ${size} bytes.`, fix: `Keep scripts under ${LIMITS_V2.scriptBytes} bytes.` }];
  }
  const out = checkValue(script, script.version === 3 ? schemaV3For(catalog) : schemaV2For(catalog));
  const beats = (script.scenes || []).reduce((n, s) => n + (Array.isArray(s?.beats) ? s.beats.length : 0), 0);
  if (beats > LIMITS_V2.beatsAuthored) {
    out.push({ code: "E_SCHEMA_SIZE", path: "scenes", message: `The story has ${beats} beats.`, fix: `Keep it under ${LIMITS_V2.beatsAuthored} authored beats; use fewer, longer scenes.` });
  }
  return out;
}

/** W_DIALOGUE_FAST: a character's next line starts while its previous bubble is still up (in the same scene). */
function overlappingLines(sim) {
  const out = [];
  const last = new Map();
  for (const e of sim.events.filter((x) => x.type === "say")) {
    const key = `${e.scene}:${e.actor}`; // bubbles end with their scene
    const prev = last.get(key);
    if (prev && e.videoT < prev.videoT + prev.dur - 0.05) {
      const beat = sim.beats.find((b) => b.id === e.beatId);
      out.push({ code: "W_DIALOGUE_FAST", path: beat?.path ?? "scenes", message: `'${e.actor}' says "${e.text}" while "${prev.text}" is still showing.`,
        fix: `Start the line later: "at": {"after": "<previous beat>", "delay": ${(prev.dur).toFixed(1)}} or more.` });
    }
    last.set(key, e);
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
