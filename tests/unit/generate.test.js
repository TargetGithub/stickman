// M8: prompt pack, structured-output schema, provider-neutral LLM layer and adapters, generation
// pipeline, and the copy-paste workflow. Everything runs offline (fake clients, fake fetch).
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { validate, createEngine } from "../../engine/index.js";
import { movesFor, v1MoveNames } from "../../engine/sim.js";
import { WORLD_COMMANDS } from "../../engine/validator/index.js";
import { catalogData, catalogMarkdown } from "../../tools/lib/prompt_tables.mjs";
import { exampleScripts, writerSystem, ideationSystem, repairRequest } from "../../tools/lib/prompt_pack.mjs";
import { scriptOutputSchema, toStructured } from "../../tools/lib/llm_schema.mjs";
import { createLlm, parseJsonText, LlmError, loadProvider } from "../../tools/lib/llm/index.mjs";
import { createAnthropicAdapter } from "../../tools/lib/llm/anthropic.mjs";
import { createOpenAICompatAdapter } from "../../tools/lib/llm/openai_compat.mjs";
import { createMockAdapter } from "../../tools/lib/llm/mock.mjs";
import { generateOne, evaluate } from "../../tools/lib/pipeline.mjs";
import { avoidList, historyEntry } from "../../tools/lib/history.mjs";
import { manualWritePrompt, checkReply } from "../../tools/lib/manual.mjs";
import { isWorkbookCode } from "../../tools/lib/story_tables.mjs";

const cfg = {
  models: { write: "w-model", flagship: "f-model", repair: "r-model", repairEscalate: "e-model", critique: "c-model", metadata: "m-model" },
  maxAttempts: 3,
  minScore: 60,
};
const silent = () => {};
const example = (i) => JSON.parse(exampleScripts()[i].text);
const isMeta = (r) => /Write YouTube metadata/.test(r.system);
const META = '{"title":"T","description":"D","tags":["x"]}';
const ctxFor = (adapter, extra = {}) => ({ llm: createLlm(adapter, {}), catalog, cfg, log: silent, ...extra });
const PREMISE = { title: "x", logline: "y" };

// ---------- prompt pack and schema ----------

test("catalog tables list every move, world command, fx and theme", () => {
  const d = catalogData(catalog);
  assert.deepEqual(d.moves.map((m) => m.name), v1MoveNames(catalog)); // v1 prompt: no paired or story-holdable moves (S5)
  assert.deepEqual(d.world.map((w) => w.name), Object.keys(WORLD_COMMANDS));
  const md = catalogMarkdown(catalog);
  for (const name of [...v1MoveNames(catalog), ...catalog.themeNames]) assert.ok(md.includes(name), name);
  assert.ok(!md.includes("| hug |"), "paired moves stay out of the v1 prompt");
  assert.ok(md.includes("| flying_kick | attack |"));
});

test("example scripts are small and validate with no errors or warnings", () => {
  const ex = exampleScripts();
  assert.ok(ex.length >= 3);
  for (const e of ex) {
    assert.ok(e.text.length < 2600, `${e.name} is ${e.text.length} bytes`);
    const r = validate(JSON.parse(e.text), catalog);
    assert.equal(r.ok, true, `${e.name}: ${r.errors.map((x) => x.code)}`);
    assert.deepEqual(r.warnings.map((w) => w.code), [], e.name);
  }
});

test("system prompts are fully filled and byte-stable (cacheable)", () => {
  const a = writerSystem(catalog);
  assert.equal(a, writerSystem(catalog));
  assert.doesNotMatch(a, /\{\{\w+\}\}/);
  assert.ok(a.length > 12000 && a.length < 45000, `writer prompt is ${a.length} chars`);
  assert.doesNotMatch(ideationSystem(catalog), /\{\{\w+\}\}/);
});

test("the writer prompt documents every validator code, and only real ones", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const src = (dir) => readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
  const engine = src("engine") + src("engine/validator") + src("engine/story");
  const codes = (text) => new Set(text.match(/\b[EW]_[A-Z]+(?:_[A-Z]+)*\b/g));
  const real = new Set([...codes(engine)].filter((c) => !isWorkbookCode(c))); // workbook codes: the workbook prompt
  const prompt = writerSystem(catalog);
  const mentioned = codes(prompt.replace(/E_SCHEMA_\*|E_REF_\*|E_MOVE_\*|E_WORLD_\*|E_CAMERA_\*|E_TEXT_\*|E_SIM_\*/g, ""));
  for (const c of real) assert.ok(mentioned.has(c), `prompt does not explain ${c}`);
  for (const c of mentioned) assert.ok(real.has(c), `prompt mentions ${c}, which the validator never reports`);
});

test("every example puts approach on each targeted attack (the rule the prompt teaches)", () => {
  for (let i = 0; i < 3; i++) {
    for (const b of example(i).beats.filter((x) => x.target && x.who !== "world")) assert.equal(b.approach, "run", `${exampleScripts()[i].name} ${b.id}`);
  }
});

test("structured-output schema uses only the portable subset", () => {
  const s = scriptOutputSchema(catalog);
  assert.doesNotMatch(JSON.stringify(s), /"(oneOf|minimum|maximum|minLength|maxLength|pattern|minItems|maxItems|\$schema)"/);
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === "object") assert.equal(n.additionalProperties, false);
    assert.ok(!Array.isArray(n.type), "type arrays become anyOf");
    Object.values(n).forEach(walk);
  })(s);
  const doEnum = s.properties.beats.items.properties.do.enum;
  for (const m of v1MoveNames(catalog)) assert.ok(doEnum.includes(m));
  assert.ok(!doEnum.includes("hug"));
  for (const w of Object.keys(WORLD_COMMANDS)) assert.ok(doEnum.includes(w));
  assert.ok(s.properties.beats.items.properties.params.properties.damage);
  assert.deepEqual(toStructured({ type: ["string", "null"] }), { anyOf: [{ type: "string" }, { type: "null" }] });
});

test("parseJsonText tolerates fences, prose and <think> blocks", () => {
  assert.deepEqual(parseJsonText('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonText('Here it is: {"a":{"b":2}} done'), { a: { b: 2 } });
  assert.deepEqual(parseJsonText('<think>maybe {"no":1}</think>\n{"a":3}'), { a: 3 });
  assert.throws(() => parseJsonText("no json"));
});

// ---------- provider-neutral core ----------

test("core: a rejected schema downgrades to plain-JSON mode and retries", async () => {
  const { SchemaRejected } = await import("../../tools/lib/llm/index.mjs");
  const adapter = createMockAdapter((r) => (r.schema ? { error: new SchemaRejected("too complex") } : { text: '{"a":1}' }));
  const llm = createLlm(adapter, {});
  const r = await llm.json({ model: "m", system: "S", messages: [{ role: "user", content: "x" }], schema: { type: "object" }, stage: "t" });
  assert.deepEqual(r.json, { a: 1 });
  assert.equal(llm.state.structured, false);
  assert.equal(llm.state.downgrades.length, 1);
});

test("core: refusal and truncation become typed errors; usage and cost accumulate", async () => {
  const refuse = createLlm(createMockAdapter(() => ({ text: "", stop: "refusal", refusalCategory: "cyber" })), {});
  await assert.rejects(refuse.json({ model: "m", system: "S", messages: [], stage: "t" }), (e) => e instanceof LlmError && e.kind === "refusal");
  const cut = createLlm(createMockAdapter(() => ({ text: '{"a":', stop: "max_tokens" })), {});
  await assert.rejects(cut.json({ model: "m", system: "S", messages: [], stage: "t" }), (e) => e.kind === "max_tokens");
  const ok = createLlm(createMockAdapter(() => ({ text: "{}" })), { prices: { m: { input: 2, output: 10 } } });
  await ok.json({ model: "m", system: "S", messages: [], stage: "t" });
  assert.equal(ok.state.usage.m.calls, 1);
  assert.ok(ok.cost() > 0);
});

test("loadProvider resolves stage models, honors --model, and explains missing config", async () => {
  const config = {
    provider: "local",
    providers: {
      local: { type: "openai-compatible", baseURL: "http://localhost:1/v1", models: { default: "SET-ME" } },
      mixed: { type: "openai-compatible", baseURL: "http://localhost:1/v1", models: { default: "small", write: "big" } },
    },
  };
  await assert.rejects(loadProvider(config), /no model for: ideation/);
  const p = await loadProvider(config, { model: "qwen" });
  assert.equal(p.models.write, "qwen");
  assert.equal(p.adapter.name, "local");
  const m = await loadProvider(config, { provider: "mixed" });
  assert.equal(m.models.write, "big");
  assert.equal(m.models.repair, "small");
  await assert.rejects(loadProvider(config, { provider: "nope" }), /unknown provider 'nope'/);
  assert.equal((await loadProvider(config, { mock: true })).adapter.name, "mock");
});

// ---------- adapters ----------

test("anthropic adapter: cached system block, output_config, refusal fallbacks, image blocks", async () => {
  const sent = [];
  const reply = { model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: '{"ok":true}' }], usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } };
  const stream = (params) => ({ finalMessage: async () => (sent.push(params), reply) });
  const adapter = await createAnthropicAdapter({}, { messages: { stream }, beta: { messages: { stream } } });
  const res = await adapter.complete({
    model: "claude-sonnet-5-5", system: "S", effort: "medium", schema: { type: "object" }, stage: "t",
    messages: [{ role: "user", content: [{ type: "image", mediaType: "image/png", data: "AAA" }, { type: "text", text: "hi" }] }],
  });
  assert.equal(res.text, '{"ok":true}');
  assert.deepEqual(res.usage, { input: 10, output: 5, cacheRead: 100, cacheWrite: undefined });
  const p = sent[0];
  assert.deepEqual(p.system[0].cache_control, { type: "ephemeral" });
  assert.deepEqual(p.output_config, { effort: "medium", format: { type: "json_schema", schema: { type: "object" } } });
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.messages[0].content[0], { type: "image", source: { type: "base64", media_type: "image/png", data: "AAA" } });
  await adapter.complete({ model: "claude-haiku-5-5", system: "S", messages: [{ role: "user", content: "x" }], stage: "t" });
  assert.equal(sent[1].fallbacks, undefined, "no fallbacks on Haiku");
});

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, body });
    const { status = 200, json } = handler(body, calls.length);
    return { ok: status < 300, status, text: async () => JSON.stringify(json) };
  };
  fn.calls = calls;
  return fn;
}

test("openai-compatible adapter: chat/completions body, key from env, images, usage, length", async () => {
  process.env.TEST_LLM_KEY = "k-123";
  const f = fakeFetch(() => ({ json: { model: "gpt-x", choices: [{ finish_reason: "stop", message: { content: '{"a":1}' } }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 60 } } } }));
  const a = createOpenAICompatAdapter({ baseURL: "https://api.example.com/v1/", apiKeyEnv: "TEST_LLM_KEY", maxTokensField: "max_completion_tokens", reasoningEffort: true }, "ex", f);
  const res = await a.complete({
    model: "gpt-x", system: "SYS", effort: "low", maxTokens: 500, schema: { type: "object" }, stage: "t",
    messages: [{ role: "user", content: [{ type: "image", mediaType: "image/png", data: "AAA" }, { type: "text", text: "hi" }] }],
  });
  const c = f.calls[0];
  assert.equal(c.url, "https://api.example.com/v1/chat/completions");
  assert.equal(c.headers.authorization, "Bearer k-123");
  assert.deepEqual(c.body.messages[0], { role: "system", content: "SYS" });
  assert.deepEqual(c.body.messages[1].content[0], { type: "image_url", image_url: { url: "data:image/png;base64,AAA" } });
  assert.equal(c.body.max_completion_tokens, 500);
  assert.equal(c.body.reasoning_effort, "low");
  assert.equal(c.body.response_format.type, "json_schema");
  assert.deepEqual(res.usage, { input: 40, output: 20, cacheRead: 60, cacheWrite: 0 });
  assert.equal(res.stop, "end");

  const cut = createOpenAICompatAdapter({ baseURL: "http://x/v1" }, "local", fakeFetch(() => ({ json: { choices: [{ finish_reason: "length", message: { content: "{" } }] } })));
  assert.equal((await cut.complete({ model: "m", system: "S", messages: [], stage: "t" })).stop, "max_tokens");
  assert.throws(() => createOpenAICompatAdapter({ baseURL: "http://x/v1", apiKeyEnv: "NOT_SET_ANYWHERE_123" }, "p"), /NOT_SET_ANYWHERE_123/);
});

test("openai-compatible adapter: reads a streamed (SSE) reply with usage", async () => {
  const sse = [
    { model: "m1", choices: [{ delta: { content: '{"a":' } }] },
    { choices: [{ delta: { content: "1}" }, finish_reason: "stop" }] },
    { choices: [], usage: { prompt_tokens: 50, completion_tokens: 4 } },
  ].map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
  let sent;
  const fetchImpl = async (url, init) => {
    sent = JSON.parse(init.body);
    const bytes = new TextEncoder().encode(sse);
    // Split mid-line to exercise buffering.
    const body = (async function* () { yield bytes.slice(0, 17); yield bytes.slice(17); })();
    return { ok: true, status: 200, headers: new Headers({ "content-type": "text/event-stream" }), body };
  };
  const a = createOpenAICompatAdapter({ baseURL: "http://x/v1" }, "local", fetchImpl);
  const r = await a.complete({ model: "m", system: "S", messages: [{ role: "user", content: "x" }], stage: "t" });
  assert.equal(sent.stream, true);
  assert.equal(r.text, '{"a":1}');
  assert.equal(r.model, "m1");
  assert.deepEqual(r.usage, { input: 50, output: 4, cacheRead: 0, cacheWrite: 0 });
});

test("openai-compatible adapter: unsupported response_format steps down json_schema → json_object → off", async () => {
  const f = fakeFetch((body) =>
    body.response_format ? { status: 400, json: { error: { message: `response_format ${body.response_format.type} not supported` } } } : { json: { choices: [{ finish_reason: "stop", message: { content: '{"a":1}' } }] } });
  const llm = createLlm(createOpenAICompatAdapter({ baseURL: "http://x/v1" }, "local", f), {});
  const r = await llm.json({ model: "m", system: "S", messages: [{ role: "user", content: "x" }], schema: { type: "object" }, stage: "t" });
  assert.deepEqual(r.json, { a: 1 });
  assert.deepEqual(f.calls.map((c) => c.body.response_format?.type ?? "none"), ["json_schema", "none"]);
});

test("openai-compatible adapter: a too-long prompt explains the context window", async () => {
  const f = fakeFetch(() => ({ status: 400, json: { error: { message: "request (7120 tokens) exceeds the available context size (4096 tokens)" } } }));
  const a = createOpenAICompatAdapter({ baseURL: "http://x/v1" }, "ollama", f);
  await assert.rejects(a.complete({ model: "m", system: "S", messages: [], stage: "t" }), /OLLAMA_CONTEXT_LENGTH/);
});

// ---------- pipeline ----------

test("pipeline: a broken first draft is repaired by the repair model with errors and timeline", async () => {
  const broken = example(0);
  broken.beats[3].do = "jabb";
  const adapter = createMockAdapter((r) => (isMeta(r) ? { text: META } : { text: JSON.stringify(r.messages.length === 1 ? broken : example(0)) }));
  const rec = await generateOne(ctxFor(adapter), PREMISE, { format: "landscape", length: 20, seed: 5 });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.firstPassValid, false);
  assert.equal(rec.validAtAttempt, 2);
  assert.deepEqual(rec.attempts.map((a) => a.model), ["w-model", "r-model"]);
  assert.match(adapter.calls[1].messages.at(-1).content, /E_MOVE_UNKNOWN/);
  assert.equal(adapter.calls[1].messages[1].role, "assistant");
  assert.deepEqual(rec.metadata, JSON.parse(META));
});

test("pipeline: three failures discard the premise and escalate the last attempt", async () => {
  const bad = example(1);
  bad.beats[0].who = "nobody";
  const adapter = createMockAdapter(() => ({ text: JSON.stringify(bad) }));
  const rec = await generateOne(ctxFor(adapter), PREMISE, { format: "landscape", length: 20, seed: 5, flagship: true });
  assert.equal(rec.status, "invalid");
  assert.deepEqual(rec.attempts.map((a) => a.model), ["f-model", "r-model", "e-model"]);
  assert.equal(rec.validAtAttempt, null);
});

test("pipeline: unparseable output counts as an attempt and asks again", async () => {
  let n = 0;
  const adapter = createMockAdapter((r) => (isMeta(r) ? { text: META } : { text: n++ === 0 ? "Sure! Here is a script." : JSON.stringify(example(2)) }));
  const rec = await generateOne(ctxFor(adapter), PREMISE, { format: "portrait", length: 10, seed: 5 });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.attempts[0].failure, "parse");
  assert.match(adapter.calls[1].messages.at(-1).content, /could not be used/);
});

test("pipeline: a client error (e.g. prompt too long) is not retried", async () => {
  const adapter = createMockAdapter(() => ({ error: Object.assign(new Error("context too long"), { status: 400 }) }));
  await assert.rejects(generateOne(ctxFor(adapter), PREMISE, { format: "landscape", length: 20, seed: 5 }), /context too long/);
  assert.equal(adapter.calls.length, 1);
});

test("pipeline: a low score triggers one improvement round, then discards", async () => {
  const dull = {
    version: 1,
    meta: { title: "Dull", format: "landscape", seed: 1 },
    characters: [{ id: "a", x: 1400, facing: 1, color: "#2255ee" }, { id: "b", x: 1600, facing: -1, color: "#ee3322" }],
    camera: [{ at: 0, mode: "follow", targets: ["a", "b"], zoom: "auto" }],
    beats: [{ id: "w", at: 0.2, who: "a", do: "wave" }, { id: "w2", at: { after: "w" }, who: "b", do: "wave" }, { at: { after: "w2" }, who: "a", do: "bow" }],
  };
  const adapter = createMockAdapter(() => ({ text: JSON.stringify(dull) }));
  const rec = await generateOne(ctxFor(adapter), PREMISE, { format: "landscape", length: 20, seed: 5 });
  assert.equal(rec.status, "low_score");
  assert.ok(rec.score < 60);
  assert.ok(rec.attempts.some((a) => a.improve));
  assert.match(adapter.calls[1].messages.at(-1).content, /scored low/);
});

test("pipeline: critique sends the contact sheet as a neutral image part and can trigger a revision", async () => {
  const adapter = createMockAdapter((r) => {
    if (/You review/.test(r.system)) return { text: '{"score":5,"revise":true,"notes":["Add a taunt at the start."]}' };
    if (isMeta(r)) return { text: META };
    return { text: JSON.stringify(example(1)) };
  });
  const rec = await generateOne(ctxFor(adapter, { renderSheet: async () => Buffer.from("png") }), PREMISE, { format: "landscape", length: 20, seed: 5, critique: true });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.revised, true);
  const crit = adapter.calls.find((c) => /You review/.test(c.system));
  assert.equal(crit.model, "c-model");
  assert.deepEqual(crit.messages[0].content[0], { type: "image", mediaType: "image/png", data: Buffer.from("png").toString("base64") });
});

test("scoring rewards variety and emphasis; examples clear the threshold", () => {
  for (let i = 0; i < 3; i++) {
    const ev = evaluate(example(i), catalog);
    assert.ok(ev.ok);
    assert.ok(ev.score >= 60, `example ${i} scored ${ev.score} ${JSON.stringify(ev.parts)}`);
  }
});

test("history avoid list summarizes recent premises, overused themes and palettes", () => {
  const h = { entries: [0, 1, 2, 3].map((i) => historyEntry({ logline: `story ${i}` }, { ...example(0), meta: { ...example(0).meta, title: `T${i}`, theme: "arena" } })) };
  const a = avoidList(h);
  assert.equal(a.premises.length, 4);
  assert.deepEqual(a.themes, ["arena"]);
  assert.match(a.palettes[0], /^#/);
  assert.deepEqual(avoidList({ entries: [] }).premises, []);
});

test("repair request carries every issue and the timeline", () => {
  const s = example(0);
  s.beats[3].do = "jabb";
  const msg = repairRequest(validate(s, catalog));
  assert.match(msg, /E_MOVE_UNKNOWN/);
  assert.match(msg, /Return the corrected full JSON script/);
});

// ---------- copy-paste workflow ----------

test("manual: the write prompt is self-contained (rules, catalog, examples, task, reply format)", () => {
  const p = manualWritePrompt(catalog, { title: "Ninja", logline: "A ninja vs a robot" }, { format: "portrait", length: 25, seed: 7 });
  assert.match(p, /You write JSON scripts/);
  assert.match(p, /\| flying_kick \| attack \|/);
  assert.match(p, /cookie_duel\.json/);
  assert.match(p, /A ninja vs a robot/);
  assert.match(p, /Format: portrait/);
  assert.match(p, /Reply with only the JSON object/);
});

test("manual: checking a pasted reply validates it, or produces a fix prompt for the same chat", () => {
  const good = checkReply(`Here you go!\n\`\`\`json\n${exampleScripts()[0].text}\n\`\`\`\nEnjoy.`, catalog);
  assert.equal(good.ok, true);
  assert.ok(good.score.score >= 60);
  const s = example(0);
  s.beats[3].do = "jabb";
  const bad = checkReply(JSON.stringify(s), catalog);
  assert.equal(bad.ok, false);
  assert.match(bad.fixPrompt, /E_MOVE_UNKNOWN/);
  assert.match(bad.fixPrompt, /Reply with only the JSON object/);
  const junk = checkReply("I can't help with that.", catalog);
  assert.equal(junk.parsed, false);
  assert.match(junk.fixPrompt, /did not contain a JSON object/);
});

// ---------- engine fix found while writing the examples ----------

test("a KO beat that fires while the target is airborne lands into ko_fall, not knockdown", () => {
  const engine = createEngine({ catalog });
  assert.equal(engine.load(example(2)).ok, true);
  const late = engine.getEvents().filter((e) => e.actor === "rex" && e.type === "moveEvent" && e.storyT > 4.2);
  assert.ok(late.some((e) => e.move === "ko_fall"));
  assert.ok(!late.some((e) => e.move === "knockdown"));
});
