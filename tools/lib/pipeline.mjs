// Generation pipeline for one premise (spec 18): write → validate → repair (up to maxAttempts) →
// score (regenerate once if low) → optional vision critique and one revision → metadata.
// All model calls go through tools/lib/llm.mjs; rendering is injected (renderSheet) so the
// pipeline runs offline in tests.

import { validate, createEngine } from "../../engine/index.js";
import { LlmError } from "./llm.mjs";
import { scriptOutputSchema, CRITIQUE_SCHEMA, METADATA_SCHEMA } from "./llm_schema.mjs";
import { scoreScript, scoreFeedback } from "./scoring.mjs";
import {
  writerSystem, critiqueSystem, metadataSystem,
  writeRequest, repairRequest, unusableRequest, improveRequest, reviseRequest, metadataRequest,
} from "./prompt_pack.mjs";

const memo = new WeakMap();
function pack(catalog) {
  if (!memo.has(catalog)) memo.set(catalog, { system: writerSystem(catalog), schema: scriptOutputSchema(catalog) });
  return memo.get(catalog);
}

const fatal = (e) => e instanceof LlmError && e.kind === "api" && [401, 403, 404].includes(e.status);

/**
 * Ask for a script until it validates or the attempt budget runs out.
 * The conversation grows with each attempt: previous JSON as the assistant turn, then the errors.
 * @returns {{ script, result, attempts, messages }}
 */
async function loop(ctx, messages, models, stage) {
  const { llm, catalog, cfg } = ctx;
  const { system, schema } = pack(catalog);
  const attempts = [];
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    let res;
    try {
      res = await llm.json({ model, system, messages, schema, effort: cfg.effort?.[i === 0 ? "write" : "repair"], stage: `${stage}#${i + 1}` });
    } catch (e) {
      if (fatal(e) || !(e instanceof LlmError)) throw e;
      attempts.push({ model, ok: false, failure: e.kind, message: e.message });
      ctx.log(`    attempt ${i + 1} (${model}): ${e.kind}`);
      if (e.text) messages.push({ role: "assistant", content: e.text }, { role: "user", content: unusableRequest(e.kind === "max_tokens" ? "it was cut off" : "it was not valid JSON") });
      continue;
    }
    const result = validate(res.json, catalog);
    attempts.push({ model, ok: result.ok, stage: result.stage, errors: result.errors.map((x) => x.code), warnings: result.warnings.map((x) => x.code) });
    ctx.log(`    attempt ${i + 1} (${model}): ${result.ok ? "valid" : `${result.errors.length} error(s) [${[...new Set(result.errors.map((x) => x.code))].join(", ")}]`}${result.warnings.length ? `, ${result.warnings.length} warning(s)` : ""}`);
    messages.push({ role: "assistant", content: JSON.stringify(res.json) });
    if (result.ok) return { script: res.json, result, attempts, messages };
    messages.push({ role: "user", content: repairRequest(result) });
  }
  return { script: null, result: null, attempts, messages };
}

/** Score a valid script with a full simulation. */
export function evaluate(script, catalog) {
  const engine = createEngine({ catalog });
  const loaded = engine.load(script);
  if (!loaded.ok) return { ok: false, loaded };
  const s = scoreScript(script, loaded, engine.getEvents());
  engine.dispose();
  return { ok: true, loaded, ...s };
}

/**
 * Generate one script from a premise.
 * @param {object} ctx  { llm, catalog, cfg (llm.config.json), log(line), renderSheet?(script) → Promise<Buffer PNG> }
 * @param {object} premise  from ideation
 * @param {object} opts  { format, length, seed, flagship, critique }
 */
export async function generateOne(ctx, premise, opts) {
  const { cfg, catalog } = ctx;
  const M = cfg.models;
  const max = cfg.maxAttempts ?? 3;
  const writeModels = [opts.flagship ? M.flagship : M.write, ...Array.from({ length: max - 1 }, (_, i) => (i === max - 2 ? M.repairEscalate : M.repair))];
  const record = { premise, status: "invalid", attempts: [], firstPassValid: false, validAtAttempt: null };

  // 1. Write and repair.
  const messages = [{ role: "user", content: writeRequest(premise, opts) }];
  let out = await loop(ctx, messages, writeModels, "write");
  record.attempts.push(...out.attempts);
  record.firstPassValid = out.attempts[0]?.ok === true;
  if (!out.script) return record;
  record.validAtAttempt = out.attempts.length;
  let script = out.script;
  let ev = evaluate(script, catalog);
  if (!ev.ok) return { ...record, status: "invalid" };

  // 2. Score; regenerate once when under the threshold.
  if (ev.score < (cfg.minScore ?? 60)) {
    ctx.log(`    score ${ev.score} < ${cfg.minScore}: improving once`);
    out.messages.push({ role: "user", content: improveRequest(scoreFeedback(ev)) });
    const again = await loop(ctx, out.messages, [writeModels[0], M.repair], "improve");
    record.attempts.push(...again.attempts.map((a) => ({ ...a, improve: true })));
    const ev2 = again.script ? evaluate(again.script, catalog) : null;
    if (!ev2?.ok || ev2.score < (cfg.minScore ?? 60)) {
      return { ...record, status: "low_score", script, score: ev.score, scoreParts: ev.parts, stats: ev.stats };
    }
    script = again.script;
    ev = ev2;
    out = again;
  }

  // 3. Optional vision critique and one revision round.
  if (opts.critique && ctx.renderSheet) {
    const png = await ctx.renderSheet(script);
    const c = await ctx.llm.json({
      model: M.critique,
      system: critiqueSystem(),
      schema: CRITIQUE_SCHEMA,
      effort: cfg.effort?.critique,
      maxTokens: 8000,
      stage: "critique",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } },
          { type: "text", text: `Timeline:\n${ev.loaded.timeline}\n\nScript:\n${JSON.stringify(script)}` },
        ],
      }],
    });
    record.critique = c.json;
    ctx.log(`    critique: ${c.json.score}/10${c.json.revise ? `, revising (${c.json.notes.length} notes)` : ""}`);
    if (c.json.revise && c.json.notes.length) {
      out.messages.push({ role: "user", content: reviseRequest(c.json.notes) });
      const rev = await loop(ctx, out.messages, [writeModels[0], M.repair], "revise");
      record.attempts.push(...rev.attempts.map((a) => ({ ...a, revise: true })));
      const ev3 = rev.script ? evaluate(rev.script, catalog) : null;
      if (ev3?.ok && ev3.score >= ev.score - 5) {
        script = rev.script;
        ev = ev3;
        record.revised = true;
      } else record.revised = false;
    }
  }

  // 4. Metadata.
  const meta = await ctx.llm.json({
    model: M.metadata,
    system: metadataSystem(),
    schema: METADATA_SCHEMA,
    effort: cfg.effort?.metadata,
    maxTokens: 4000,
    stage: "metadata",
    messages: [{ role: "user", content: metadataRequest(script, premise, ev.loaded.timeline) }],
  });

  return {
    ...record,
    status: "accepted",
    script,
    score: ev.score,
    scoreParts: ev.parts,
    stats: ev.stats,
    warnings: ev.loaded.warnings.map((w) => w.code),
    metadata: meta.json,
  };
}
