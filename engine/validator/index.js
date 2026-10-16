// Validator entry point: schema → semantics → dry run (spec 16). Milestone M3.
// Every result includes a timeline the LLM can read, when the script got far enough to simulate.

import { checkSchema, jsonSchema, buildJsonSchema } from "./schema.js";
import { checkSemantics, WORLD_COMMANDS } from "./semantic.js";
import { formatIssues, formatTimeline } from "./report.js";
import { simulate, movesFor } from "../sim.js";
import { LIMITS } from "../config.js";

export { jsonSchema, buildJsonSchema, WORLD_COMMANDS, formatIssues };

const isWarning = (i) => i.code.startsWith("W_") || i.severity === "warning";
const DRAMATIC = ["slowmo", "freeze", "zoom_punch", "text_pop", "shake", "flash"];
const ENDINGS = ["victory", "ko_fall", "ko_spin", "fade"];

/** Pacing heuristics (spec 16.4), from a dry run. All warnings. */
function pacing(script, sim, moves) {
  const out = [];
  const ran = sim.beats.filter((b) => b.firedAt != null).sort((a, b) => a.firedAt - b.firedAt || a.index - b.index);
  const end = sim.clock.storyT;
  const spans = ran.map((b) => [b.firedAt, Math.max(b.endedAt ?? b.firedAt, b.firedAt + 0.2)]).sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [s, e] of spans) {
    if (s - covered > 2.5) out.push({ code: "W_PACING_GAP", path: "beats", message: `Nothing happens from ${covered.toFixed(1)}s to ${s.toFixed(1)}s.`, fix: "Add a beat (taunt, wait with say, camera move) or tighten the timing." });
    covered = Math.max(covered, e);
  }
  if (end - covered > 2.5) out.push({ code: "W_PACING_GAP", path: "beats", message: `Nothing happens for the last ${(end - covered).toFixed(1)}s.`, fix: "End with a fade or trim the delays." });

  const hits = sim.events.filter((e) => e.type === "hit" && e.kind === "hit");
  if (!sim.events.some((e) => e.type === "hitstop")) out.push({ code: "W_NO_IMPACT", path: "beats", message: "No hit lands with hitstop, so nothing feels powerful.", fix: "Make at least one attack beat use \"outcome\": \"hit\"." });

  let run = 0;
  for (const b of ran) {
    if (b.who === "world") {
      if (DRAMATIC.includes(b.do)) run = 0;
    } else if (moves.get(b.do)?.category !== "attack") run = 0;
    else if (++run === 9) out.push({ code: "W_PACING_MONOTONE", path: `beats[${b.index}]`, message: "More than 8 attacks in a row without a reaction beat, taunt or dramatic effect.", fix: "Break the run with a taunt, a slowmo, or a pause." });
  }
  if (!ran.slice(-3).some((b) => ENDINGS.includes(b.do))) out.push({ code: "W_NO_ENDING", path: "beats", message: "The script has no clear ending.", fix: "End with victory, ko_fall, or a world fade." });

  if (script.meta.autoCamera === false) {
    for (const h of hits.filter((e) => e.damage > 15)) {
      const near = ran.some((b) => b.who === "world" && ["slowmo", "zoom_punch", "freeze"].includes(b.do) && Math.abs(b.firedAt - h.storyT) <= 0.5);
      if (!near) out.push({ code: "W_HEAVY_NO_EMPHASIS", path: "beats", message: `A heavy hit at ${h.storyT.toFixed(2)}s has no slowmo or zoom.`, fix: `Add {"at": {"on": "${h.beatId}.hit"}, "who": "world", "do": "slowmo", ...}.` });
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
  const schemaIssues = checkSchema(script);
  if (schemaIssues.length) return result("schema", schemaIssues);

  const moves = movesFor(catalog);
  const semantic = checkSemantics(script, catalog, moves);
  if (semantic.some((i) => !isWarning(i))) return result("semantic", semantic);

  const sim = simulate(script, catalog, { dryRun: true });
  const issues = [...semantic, ...sim.issues];
  if (sim.durationSec < LIMITS.minDuration) {
    issues.push({ code: "E_SIM_DURATION", path: "beats", message: `The video is only ${sim.durationSec.toFixed(1)}s long.`, fix: `Make it at least ${LIMITS.minDuration}s.` });
  }
  issues.push(...pacing(script, sim, moves));
  return result("dry-run", issues, sim);
}

export { formatTimeline };
