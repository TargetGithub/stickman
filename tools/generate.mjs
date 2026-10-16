#!/usr/bin/env node
// LLM ideation, script writing, repair, scoring and review queue (spec 18). Milestone: M8.
// Usage:
//   node tools/generate.mjs [options]
//     --count N            premises to generate (default 1)
//     --premise "text"     skip ideation and write this one premise
//     --tone T             epic | comedic | parody | ... (default: mixed)
//     --format F           landscape | portrait (default landscape)
//     --length S           target length in seconds (default 30)
//     --flagship           write with the flagship model (llm.config.json models.flagship)
//     --critique           vision critique of a contact sheet, plus one revision round
//     --no-render          stop after the script (no video); for batch metrics
//     --out DIR            output root (default out)
//     --provider NAME      provider entry in llm.config.json: anthropic, openai, gemini, openrouter,
//                          ollama, lmstudio, or any you add (default: config "provider")
//     --model ID           use this model for every stage (overrides the provider's models)
//     --attempts N         write + repair attempts per script (default config maxAttempts, 3)
//     --mock               offline: fake model responses, no network, no cost (= --provider mock)
//     --print-prompt       print the writer system prompt and exit (no API call)
//     --config FILE        provider/model/price config (default tools/llm.config.json)
// API keys are read from the environment variable each provider names (ANTHROPIC_API_KEY,
// OPENAI_API_KEY, ...); they are never written anywhere. No key? Use tools/manual.mjs (copy-paste).
// Writes: <out>/scripts/<slug>.json, <out>/<slug>/ (video, thumb, contact sheet, youtube.json),
// appends <out>/review_queue.json and <out>/history.json, and a run summary in <out>/runs/.
// Nothing is uploaded anywhere.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { catalog } from "../data/index.js";
import { createEngine } from "../engine/index.js";
import { createLlm, loadProvider, LlmError } from "./lib/llm/index.mjs";
import { IDEATION_SCHEMA } from "./lib/llm_schema.mjs";
import { ideationSystem, ideationRequest, writerSystem } from "./lib/prompt_pack.mjs";
import { generateOne } from "./lib/pipeline.mjs";
import { loadHistory, saveHistory, avoidList, historyEntry, appendReviewQueue } from "./lib/history.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);

if (flag("--print-prompt")) {
  const text = writerSystem(catalog);
  console.log(text);
  console.error(`\n(${text.length} characters, about ${Math.round(text.length / 3.6)} tokens)`);
  process.exit(0);
}

const config = JSON.parse(readFileSync(opt("--config", join(HERE, "llm.config.json")), "utf8"));
const OUT = opt("--out", "out");
const count = Math.max(1, Number(opt("--count", 1)));
const opts = {
  tone: opt("--tone", null),
  format: opt("--format", "landscape"),
  length: Number(opt("--length", 30)),
  flagship: flag("--flagship"),
  critique: flag("--critique"),
};
if (!["landscape", "portrait"].includes(opts.format)) {
  console.error("--format must be landscape or portrait");
  process.exit(2);
}

const log = (line) => console.log(line);
let provider;
try {
  provider = await loadProvider(config, { provider: opt("--provider", null), model: opt("--model", null), mock: flag("--mock") });
} catch (e) {
  const hint = /anthropic-ai\/sdk|ANTHROPIC|credential|api key/i.test(e.message) ? "\nSet ANTHROPIC_API_KEY in your shell, pick another --provider, use --mock, or use tools/manual.mjs (copy-paste, no key)." : "";
  console.error(`Cannot set up the LLM provider: ${e.message}${hint}`);
  process.exit(2);
}
const cfg = { models: provider.models, effort: provider.effort, maxAttempts: Math.max(1, Number(opt("--attempts", config.maxAttempts ?? 3))), minScore: config.minScore ?? 60 };
const llm = createLlm(provider.adapter, { prices: provider.prices, structured: provider.structured, log });
if (opts.critique && provider.adapter.vision === false) {
  log(`note: provider '${provider.name}' is configured without vision; skipping --critique`);
  opts.critique = false;
}
log(`provider: ${provider.name} (write: ${cfg.models.write}, repair: ${cfg.models.repair})`);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video";
function uniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; existsSync(join(OUT, slug)) || existsSync(join(OUT, "scripts", `${slug}.json`)); i++) slug = `${base}-${i}`;
  return slug;
}

/** Contact sheet PNG for the vision critique (no video render needed). */
async function renderSheet(script) {
  const { loadBackend } = await import("./lib/canvas.mjs");
  const { contactSheet } = await import("./lib/review_images.mjs");
  const backend = await loadBackend();
  const engine = createEngine({ catalog });
  engine.load(script);
  const png = await backend.encodePng(contactSheet(engine, backend));
  engine.dispose();
  return Buffer.from(png);
}

const historyFile = join(OUT, "history.json");
const queueFile = join(OUT, "review_queue.json");
const history = loadHistory(historyFile);
const started = new Date();

// 1. Premises.
let premises;
if (opt("--premise", null)) {
  const text = opt("--premise");
  premises = [{ title: text.split(/[.!?]/)[0].slice(0, 60), logline: text, tone: opts.tone || "any", theme: "any", characters: [], beats: [], standout: "" }];
} else {
  log(`ideation: ${count} premise(s) with ${cfg.models.ideation}`);
  try {
    const r = await llm.json({
      model: cfg.models.ideation,
      system: ideationSystem(catalog),
      schema: IDEATION_SCHEMA,
      effort: cfg.effort?.ideation,
      maxTokens: 16000,
      stage: "ideation",
      messages: [{ role: "user", content: ideationRequest({ count, ...opts }, avoidList(history)) }],
    });
    premises = r.json.premises.slice(0, count);
  } catch (e) {
    console.error(`ideation failed: ${e.message}`);
    process.exit(1);
  }
}

// 2. One script (and video) per premise.
const results = [];
for (const [i, premise] of premises.entries()) {
  log(`\n[${i + 1}/${premises.length}] ${premise.title}: ${premise.logline}`);
  let rec;
  try {
    rec = await generateOne({ llm, catalog, cfg, log, renderSheet }, premise, { ...opts, seed: randomInt(1, 2 ** 31 - 1) });
  } catch (e) {
    if (e instanceof LlmError && [401, 403].includes(e.status)) {
      console.error(`authentication failed: ${e.message}\nCheck the API key environment variable for this provider, or use tools/manual.mjs (copy-paste, no key).`);
      process.exit(1);
    }
    log(`    error: ${e.message}`);
    rec = { premise, status: "error", error: e.message, attempts: [], firstPassValid: false, validAtAttempt: null };
  }
  results.push(rec);
  if (rec.status !== "accepted") {
    log(`    ${rec.status}${rec.score !== undefined ? ` (score ${rec.score})` : ""}: discarded`);
    continue;
  }

  const slug = uniqueSlug(rec.script.meta.title);
  const scriptPath = join(OUT, "scripts", `${slug}.json`);
  mkdirSync(dirname(scriptPath), { recursive: true });
  writeFileSync(scriptPath, JSON.stringify(rec.script, null, 2) + "\n");
  log(`    accepted: score ${rec.score} ${JSON.stringify(rec.scoreParts)} → ${scriptPath}`);

  let rendered = false;
  if (!flag("--no-render")) {
    const r = spawnSync(process.execPath, [join(HERE, "record.mjs"), scriptPath, "--out-dir", OUT, "--slug", slug], { encoding: "utf8" });
    rendered = r.status === 0;
    log(`    ${rendered ? r.stdout.trim().split("\n").pop() : `render failed: ${(r.stderr || r.stdout).trim().split("\n").pop()}`}`);
    if (rendered) writeFileSync(join(OUT, slug, "youtube.json"), JSON.stringify(rec.metadata, null, 2) + "\n");
  }

  const n = appendReviewQueue(queueFile, {
    slug,
    status: "pending_review",
    createdAt: new Date().toISOString(),
    title: rec.metadata.title,
    scriptTitle: rec.script.meta.title,
    premise: premise.logline,
    script: scriptPath,
    video: rendered ? join(OUT, slug, "final.mp4") : null,
    score: rec.score,
    stats: rec.stats,
    warnings: rec.warnings,
    attempts: rec.attempts.length,
    critique: rec.critique ?? null,
    metadata: rec.metadata,
  });
  history.entries.push(historyEntry(premise, rec.script, { slug, createdAt: new Date().toISOString() }));
  saveHistory(historyFile, history);
  log(`    review queue: ${n} item(s)`);
}

// 3. Run summary and batch metrics (spec M8.5).
const written = results.filter((r) => r.attempts.length);
const rate = (k) => (written.length ? Number((written.filter(k).length / written.length).toFixed(3)) : null);
const summary = {
  startedAt: started.toISOString(),
  finishedAt: new Date().toISOString(),
  provider: provider.name,
  options: { count, ...opts },
  premises: results.length,
  accepted: results.filter((r) => r.status === "accepted").length,
  lowScore: results.filter((r) => r.status === "low_score").length,
  invalid: results.filter((r) => r.status === "invalid").length,
  errors: results.filter((r) => r.status === "error").length,
  firstPassValidity: rate((r) => r.firstPassValid),
  validWithinAttempts: rate((r) => r.validAtAttempt !== null),
  failureCodes: Object.entries(results.flatMap((r) => r.attempts.flatMap((a) => a.errors || [a.failure].filter(Boolean))).reduce((m, c) => ((m[c] = (m[c] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]),
  usage: llm.state.usage,
  estimatedCostUsd: Number(llm.cost().toFixed(4)),
  downgrades: llm.state.downgrades,
  results: results.map((r) => ({ title: r.premise.title, status: r.status, score: r.score ?? null, attempts: r.attempts })),
};
mkdirSync(join(OUT, "runs"), { recursive: true });
const runFile = join(OUT, "runs", `${started.toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(runFile, JSON.stringify(summary, null, 2) + "\n");
log(`\n${summary.accepted}/${summary.premises} accepted (low score ${summary.lowScore}, invalid ${summary.invalid}, errors ${summary.errors})`);
log(`first-pass validity ${summary.firstPassValidity ?? "-"}, valid within ${cfg.maxAttempts} attempts ${summary.validWithinAttempts ?? "-"}`);
log(`estimated cost $${summary.estimatedCostUsd}${provider.name === "mock" ? " (mock)" : ""}; run summary: ${runFile}`);
if (summary.downgrades.length) log(`notes: ${summary.downgrades.join("; ")}`);
