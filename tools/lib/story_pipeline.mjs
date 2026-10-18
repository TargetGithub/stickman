// Two-stage story generation (STORY_SPEC 18, S8.2): outline → scene by scene (each validated in the story so
// far and repaired on its own) → assemble → extend when short → score → optional critique and scene revisions
// → metadata. All model calls go through tools/lib/llm/ (any provider); the story sheet renderer is injected
// so the pipeline runs offline in tests.

import { validate } from "../../engine/index.js";
import { LlmError } from "./llm/index.mjs";
import { CRITIQUE_SCHEMA, METADATA_SCHEMA } from "./llm_schema.mjs";
import { metadataSystem, metadataRequest, unusableRequest } from "./prompt_pack.mjs";
import {
  MIN_LENGTH, storyOutlineSystem, storySceneSystem, storyCritiqueSystem, outlineRequest, outlineRepairRequest,
  sceneRequest, sceneRepairRequest, extendRequest, reviseSceneRequest, storyCritiqueRequest,
  assembleStory, normalizeScene, checkOutline,
} from "./story_prompts.mjs";
import { scoreStory } from "./story_score.mjs";

const fatal = (e) => e instanceof LlmError && e.kind === "api" && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
const TIMELINE_LINES = 120;

/** Issues that belong to scene i (or to no scene in particular). */
export function sceneIssues(result, i) {
  return result.errors.filter((e) => e.path.startsWith(`scenes[${i}]`) || !e.path.startsWith("scenes["));
}

/** The tail of the timeline: the newest scene is last in a prefix story. */
const tail = (timeline) => (timeline || "").split("\n").slice(-TIMELINE_LINES).join("\n");

/**
 * Validate scene i in the story so far (scenes 0..i), with the story header from the outline.
 * @returns {{ ok:boolean, result, issues:object[] }}
 */
export function checkSceneInContext(outline, scenes, i, catalog, opts) {
  const script = assembleStory(outline, scenes.slice(0, i + 1), opts);
  const result = validate(script, catalog);
  const issues = result.ok ? [] : sceneIssues(result, i);
  // An error elsewhere (an earlier scene that was fine before) still blocks: report it here too.
  return { ok: result.ok, result, issues: issues.length ? issues : result.errors };
}

/** Seconds per outline scene (a scene macro's scenes count toward the scene that wrote it). */
export function sceneSeconds(result, outline) {
  return outline.scenes.map((o) => ({ id: o.id, seconds: Number(result.scenes.filter((s) => s.id === o.id || s.id.startsWith(`${o.id}_`)).reduce((n, s) => n + s.seconds, 0).toFixed(2)) }));
}

const stageWidths = (outline) => Object.fromEntries((outline.locations || []).map((l) => [l.id, l.stageWidth ?? 3200]));

/**
 * One JSON reply per attempt, repaired in the same conversation.
 * check(json) → { ok, feedback: string } decides whether to stop.
 */
async function converse(ctx, { system, messages, models, stage, check }) {
  const attempts = [];
  for (let i = 0; i < models.length; i++) {
    let res;
    try {
      res = await ctx.llm.json({ model: models[i], system, messages, schema: null, effort: ctx.cfg.effort?.[i ? "repair" : "write"], stage: `${stage}#${i + 1}`, maxTokens: 32000 });
    } catch (e) {
      if (fatal(e) || !(e instanceof LlmError)) throw e;
      attempts.push({ model: models[i], ok: false, failure: e.kind });
      ctx.log(`    ${stage} attempt ${i + 1}: ${e.kind}`);
      if (e.text) messages.push({ role: "assistant", content: e.text }, { role: "user", content: unusableRequest(e.kind === "max_tokens" ? "it was cut off" : "it was not valid JSON") });
      continue;
    }
    messages.push({ role: "assistant", content: JSON.stringify(res.json) });
    const c = check(res.json);
    attempts.push({ model: models[i], ok: c.ok, errors: c.codes || [] });
    ctx.log(`    ${stage} attempt ${i + 1}: ${c.ok ? "ok" : c.summary}`);
    if (c.ok) return { json: c.value ?? res.json, attempts, messages };
    messages.push({ role: "user", content: c.feedback });
  }
  return { json: null, attempts, messages };
}

/**
 * Generate one story (or fight video) from a premise.
 * @param {object} ctx  { llm, catalog, cfg { models, effort, maxAttempts, minScore }, log(line), renderStorySheet?(script) → Promise<Buffer PNG> }
 * @param {object} premise  from ideation (title, logline, ...)
 * @param {{ kind?:"story"|"fight", minLength?:number, format?:string, audience?:string, seed:number, critique?:boolean, flagship?:boolean }} opts
 */
export async function generateStory(ctx, premise, opts) {
  const { catalog, cfg } = ctx;
  const kind = opts.kind ?? "story";
  const minLength = opts.minLength ?? MIN_LENGTH[kind];
  const sopts = { seed: opts.seed, format: opts.format ?? "landscape", kind, audience: opts.audience ?? "kids" };
  const M = cfg.models;
  const max = cfg.maxAttempts ?? 3;
  const models = [opts.flagship ? M.flagship : M.write, ...Array.from({ length: max - 1 }, (_, i) => (i === max - 2 ? M.repairEscalate : M.repair))];
  const record = { premise, kind, status: "invalid_outline", attempts: [] };

  // 1. Outline.
  ctx.log("  outline");
  const outlineOut = await converse(ctx, {
    system: storyOutlineSystem(catalog, { kind, minLength, audience: sopts.audience }),
    messages: [{ role: "user", content: outlineRequest(premise, { kind, minLength, format: sopts.format }) }],
    models, stage: "outline",
    check: (json) => {
      const issues = checkOutline(json, catalog, { kind, minLength, ...sopts });
      return { ok: !issues.length, summary: `${issues.length} problem(s)`, feedback: outlineRepairRequest(issues), codes: issues.map((x) => x.split(" ")[0]) };
    },
  });
  record.attempts.push(...outlineOut.attempts.map((a) => ({ ...a, stage: "outline" })));
  const outline = outlineOut.json;
  if (!outline) return record;
  record.outline = outline;

  // 2. Scenes, each validated in the story so far.
  const sceneSystem = storySceneSystem(catalog, { audience: sopts.audience });
  const scenes = [];
  const convos = [];
  let endState = null;
  for (let i = 0; i < outline.scenes.length; i++) {
    const entry = outline.scenes[i];
    ctx.log(`  scene ${i + 1}/${outline.scenes.length}: ${entry.id}`);
    const messages = [{ role: "user", content: sceneRequest(outline, i, { endState, stageWidths: stageWidths(outline) }) }];
    let last = null;
    const out = await converse(ctx, {
      system: sceneSystem, messages, models, stage: entry.id,
      check: (json) => {
        const scene = normalizeScene(json, entry);
        last = checkSceneInContext(outline, [...scenes, scene], i, catalog, sopts);
        const codes = [...new Set(last.issues.map((x) => x.code))];
        return { ok: last.ok, value: scene, codes, summary: `${last.issues.length} error(s) [${codes.join(", ")}]`, feedback: sceneRepairRequest(last.issues, tail(last.result.timeline)) };
      },
    });
    record.attempts.push(...out.attempts.map((a) => ({ ...a, stage: entry.id })));
    if (!out.json) return { ...record, status: "invalid_scene", failedScene: entry.id, scenes };
    scenes.push(out.json);
    convos.push(out.messages);
    endState = last.result.endState;
  }

  // 3. Assemble; 4. extend when short (one round over the scenes furthest under their target).
  let script = assembleStory(outline, scenes, sopts);
  let result = validate(script, catalog);
  if (!result.ok) return { ...record, status: "invalid_story", script, errors: result.errors };
  if (result.durationSec < minLength) {
    const need = minLength * 1.08 - result.durationSec;
    const ranked = sceneSeconds(result, outline).map((s, i) => ({ i, seconds: s.seconds, gap: outline.scenes[i].seconds - s.seconds })).sort((a, b) => b.gap - a.gap).slice(0, 3);
    ctx.log(`  ${result.durationSec.toFixed(0)} s is short of ${minLength} s: extending ${ranked.map((r) => outline.scenes[r.i].id).join(", ")}`);
    for (const r of ranked) {
      const target = r.seconds + need / ranked.length;
      convos[r.i].push({ role: "user", content: extendRequest(r.seconds, target) });
      const out = await converse(ctx, {
        system: sceneSystem, messages: convos[r.i], models: models.slice(0, 2), stage: `${outline.scenes[r.i].id}+`,
        check: (json) => {
          const scene = normalizeScene(json, outline.scenes[r.i]);
          const trial = assembleStory(outline, scenes.map((s, k) => (k === r.i ? scene : s)), sopts);
          const v = validate(trial, catalog);
          const issues = v.ok ? [] : sceneIssues(v, r.i);
          return { ok: v.ok, value: scene, codes: issues.map((x) => x.code), summary: `${issues.length} error(s)`, feedback: sceneRepairRequest(issues.length ? issues : v.errors, tail(v.timeline)) };
        },
      });
      record.attempts.push(...out.attempts.map((a) => ({ ...a, stage: `${outline.scenes[r.i].id}+extend` })));
      if (out.json) scenes[r.i] = out.json;
    }
    script = assembleStory(outline, scenes, sopts);
    result = validate(script, catalog);
    if (!result.ok) return { ...record, status: "invalid_story", script, errors: result.errors };
  }

  // 5. Score.
  let ev = scoreStory(script, outline, catalog, { minLength });
  ctx.log(`  ${ev.stats.durationSec} s, score ${ev.score} ${JSON.stringify(ev.parts)}`);

  // 6. Optional critique of a story sheet and one revision of the scenes it names.
  if (opts.critique && ctx.renderStorySheet) {
    const png = await ctx.renderStorySheet(script);
    const c = await ctx.llm.json({
      model: M.critique, system: storyCritiqueSystem(), schema: CRITIQUE_SCHEMA, effort: cfg.effort?.critique, maxTokens: 8000, stage: "critique",
      messages: [{ role: "user", content: [{ type: "image", mediaType: "image/png", data: png.toString("base64") }, { type: "text", text: storyCritiqueRequest(outline, sceneSeconds(result, outline)) }] }],
    });
    record.critique = c.json;
    ctx.log(`  critique: ${c.json.score}/10${c.json.revise ? `, ${c.json.notes.length} note(s)` : ""}`);
    if (c.json.revise) {
      const byScene = new Map();
      for (const n of c.json.notes) {
        const id = /^([a-z][a-z0-9_]*)\s*:/.exec(n)?.[1];
        const i = outline.scenes.findIndex((s) => s.id === id);
        if (i >= 0) byScene.set(i, [...(byScene.get(i) || []), n.replace(/^[^:]+:\s*/, "")]);
      }
      const revised = [...scenes];
      for (const [i, notes] of [...byScene].slice(0, 3)) {
        convos[i].push({ role: "user", content: reviseSceneRequest(notes) });
        const out = await converse(ctx, {
          system: sceneSystem, messages: convos[i], models: models.slice(0, 2), stage: `${outline.scenes[i].id}~`,
          check: (json) => {
            const scene = normalizeScene(json, outline.scenes[i]);
            const v = validate(assembleStory(outline, revised.map((s, k) => (k === i ? scene : s)), sopts), catalog);
            const issues = v.ok ? [] : sceneIssues(v, i);
            return { ok: v.ok, value: scene, codes: issues.map((x) => x.code), summary: `${issues.length} error(s)`, feedback: sceneRepairRequest(issues.length ? issues : v.errors, tail(v.timeline)) };
          },
        });
        record.attempts.push(...out.attempts.map((a) => ({ ...a, stage: `${outline.scenes[i].id}+revise` })));
        if (out.json) revised[i] = out.json;
      }
      const trial = assembleStory(outline, revised, sopts);
      const ev2 = scoreStory(trial, outline, catalog, { minLength });
      record.revised = ev2.ok && ev2.score >= ev.score - 5;
      if (record.revised) [script, ev] = [trial, ev2];
    }
  }

  // 7. Metadata.
  const meta = await ctx.llm.json({
    model: M.metadata, system: metadataSystem(), schema: METADATA_SCHEMA, effort: cfg.effort?.metadata, maxTokens: 4000, stage: "metadata",
    messages: [{ role: "user", content: metadataRequest(script, { logline: outline.logline || premise.logline }, ev.loaded.timeline.split("\n").slice(0, 200).join("\n")) }],
  });
  const short = ev.stats.durationSec < minLength;
  return {
    ...record,
    status: short ? "short" : ev.score < (cfg.minScore ?? 60) ? "low_score" : "accepted",
    script, outline, score: ev.score, scoreParts: ev.parts, stats: ev.stats,
    warnings: ev.loaded.warnings.map((w) => w.code), metadata: meta.json,
  };
}
