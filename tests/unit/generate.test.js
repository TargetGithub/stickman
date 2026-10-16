// M8: prompt pack, structured-output schema, LLM wrapper and generation pipeline (offline, mock client).
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../data/index.js";
import { validate, createEngine } from "../../engine/index.js";
import { movesFor } from "../../engine/sim.js";
import { WORLD_COMMANDS } from "../../engine/validator/index.js";
import { catalogData, catalogMarkdown } from "../../tools/lib/prompt_tables.mjs";
import { exampleScripts, writerSystem, ideationSystem, repairRequest } from "../../tools/lib/prompt_pack.mjs";
import { scriptOutputSchema, toStructured } from "../../tools/lib/llm_schema.mjs";
import { createLlm, parseJsonText, LlmError } from "../../tools/lib/llm.mjs";
import { generateOne, evaluate } from "../../tools/lib/pipeline.mjs";
import { avoidList, historyEntry } from "../../tools/lib/history.mjs";
import { createMockClient } from "../../tools/lib/mock_client.mjs";

const cfg = {
  models: { write: "claude-sonnet-5-5", flagship: "claude-opus-5-5", repair: "claude-haiku-5-5", repairEscalate: "claude-sonnet-5-5", critique: "claude-opus-5-5", metadata: "claude-haiku-5-5" },
  maxAttempts: 3,
  minScore: 60,
};
const silent = () => {};
const example = (i) => JSON.parse(exampleScripts()[i].text);
const isMeta = (p) => /Write YouTube metadata/.test(p.system[0].text);

test("catalog tables list every move, world command, fx and theme", () => {
  const d = catalogData(catalog);
  assert.deepEqual(d.moves.map((m) => m.name), [...movesFor(catalog).keys()]);
  assert.deepEqual(d.world.map((w) => w.name), Object.keys(WORLD_COMMANDS));
  const md = catalogMarkdown(catalog);
  for (const name of [...movesFor(catalog).keys(), ...catalog.themeNames]) assert.ok(md.includes(name), name);
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
  assert.ok(a.length > 12000 && a.length < 40000, `writer prompt is ${a.length} chars`);
  assert.doesNotMatch(ideationSystem(catalog), /\{\{\w+\}\}/);
});

test("structured-output schema uses only the supported subset", () => {
  const s = scriptOutputSchema(catalog);
  const json = JSON.stringify(s);
  assert.doesNotMatch(json, /"(oneOf|minimum|maximum|minLength|maxLength|pattern|minItems|maxItems|\$schema)"/);
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === "object") assert.equal(n.additionalProperties, false);
    assert.ok(!Array.isArray(n.type), "type arrays become anyOf");
    Object.values(n).forEach(walk);
  })(s);
  const doEnum = s.properties.beats.items.properties.do.enum;
  for (const m of movesFor(catalog).keys()) assert.ok(doEnum.includes(m));
  for (const w of Object.keys(WORLD_COMMANDS)) assert.ok(doEnum.includes(w));
  assert.ok(s.properties.beats.items.properties.params.properties.damage);
  assert.deepEqual(toStructured({ type: ["string", "null"] }), { anyOf: [{ type: "string" }, { type: "null" }] });
});

test("parseJsonText tolerates fences and surrounding prose", () => {
  assert.deepEqual(parseJsonText('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonText('Here it is: {"a":{"b":2}} done'), { a: { b: 2 } });
  assert.throws(() => parseJsonText("no json"));
});

test("llm: caches the system prompt, sends the schema, uses refusal fallbacks on Sonnet/Opus", async () => {
  const client = createMockClient(() => ({ text: '{"ok":true}' }));
  const llm = createLlm(client, { prices: { "claude-sonnet-5-5": { input: 2, output: 10 } } });
  const r = await llm.json({ model: "claude-sonnet-5-5", system: "S", messages: [{ role: "user", content: "x" }], schema: { type: "object" }, effort: "medium", stage: "t" });
  assert.deepEqual(r.json, { ok: true });
  const p = client.calls[0];
  assert.deepEqual(p.system[0].cache_control, { type: "ephemeral" });
  assert.deepEqual(p.output_config, { effort: "medium", format: { type: "json_schema", schema: { type: "object" } } });
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  await llm.json({ model: "claude-haiku-5-5", system: "S", messages: [{ role: "user", content: "x" }], stage: "t" });
  assert.equal(client.calls[1].fallbacks, undefined, "no fallbacks on Haiku");
  assert.equal(llm.state.usage["claude-sonnet-5-5"].calls, 1);
  assert.ok(llm.cost() > 0);
});

test("llm: a rejected schema downgrades to plain-JSON mode and retries", async () => {
  const client = createMockClient((p) => (p.output_config.format ? { error: Object.assign(new Error("output_config.format: schema too complex"), { status: 400 }) } : { text: '{"a":1}' }));
  const llm = createLlm(client, {});
  const r = await llm.json({ model: "claude-haiku-5-5", system: "S", messages: [{ role: "user", content: "x" }], schema: { type: "object" }, stage: "t" });
  assert.deepEqual(r.json, { a: 1 });
  assert.equal(llm.state.structured, false);
  assert.equal(llm.state.downgrades.length, 1);
});

test("llm: refusal and truncation become typed errors", async () => {
  const refuse = createLlm(createMockClient(() => ({ text: "", stop_reason: "refusal", stop_details: { category: "cyber" } })), {});
  await assert.rejects(refuse.json({ model: "claude-haiku-5-5", system: "S", messages: [], stage: "t" }), (e) => e instanceof LlmError && e.kind === "refusal");
  const cut = createLlm(createMockClient(() => ({ text: '{"a":', stop_reason: "max_tokens" })), {});
  await assert.rejects(cut.json({ model: "claude-haiku-5-5", system: "S", messages: [], stage: "t" }), (e) => e.kind === "max_tokens");
});

test("pipeline: a broken first draft is repaired by the repair model with errors and timeline", async () => {
  const broken = example(0);
  broken.beats[3].do = "jabb";
  const client = createMockClient((p) => {
    if (isMeta(p)) return { text: '{"title":"T","description":"D","tags":["x"]}' };
    return { text: JSON.stringify(p.messages.length === 1 ? broken : example(0)) };
  });
  const rec = await generateOne({ llm: createLlm(client, {}), catalog, cfg, log: silent }, { title: "x", logline: "y" }, { format: "landscape", length: 20, seed: 5 });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.firstPassValid, false);
  assert.equal(rec.validAtAttempt, 2);
  assert.deepEqual(rec.attempts.map((a) => a.model), ["claude-sonnet-5-5", "claude-haiku-5-5"]);
  const repairMsg = client.calls[1].messages.at(-1).content;
  assert.match(repairMsg, /E_MOVE_UNKNOWN/);
  assert.equal(client.calls[1].messages[1].role, "assistant");
  assert.deepEqual(rec.metadata, { title: "T", description: "D", tags: ["x"] });
});

test("pipeline: three failures discard the premise and escalate the last attempt", async () => {
  const bad = example(1);
  bad.beats[0].who = "nobody";
  const client = createMockClient(() => ({ text: JSON.stringify(bad) }));
  const rec = await generateOne({ llm: createLlm(client, {}), catalog, cfg, log: silent }, { title: "x", logline: "y" }, { format: "landscape", length: 20, seed: 5, flagship: true });
  assert.equal(rec.status, "invalid");
  assert.deepEqual(rec.attempts.map((a) => a.model), ["claude-opus-5-5", "claude-haiku-5-5", "claude-sonnet-5-5"]);
  assert.equal(rec.validAtAttempt, null);
});

test("pipeline: unparseable output counts as an attempt and asks again", async () => {
  let n = 0;
  const client = createMockClient((p) => (isMeta(p) ? { text: '{"title":"T","description":"D","tags":[]}' } : { text: n++ === 0 ? "Sure! Here is a script." : JSON.stringify(example(2)) }));
  const rec = await generateOne({ llm: createLlm(client, {}), catalog, cfg, log: silent }, { title: "x", logline: "y" }, { format: "portrait", length: 10, seed: 5 });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.attempts[0].failure, "parse");
  assert.match(client.calls[1].messages.at(-1).content, /could not be used/);
});

test("pipeline: a low score triggers one improvement round, then discards", async () => {
  const dull = {
    version: 1,
    meta: { title: "Dull", format: "landscape", seed: 1 },
    characters: [{ id: "a", x: 1400, facing: 1, color: "#2255ee" }, { id: "b", x: 1600, facing: -1, color: "#ee3322" }],
    camera: [{ at: 0, mode: "follow", targets: ["a", "b"], zoom: "auto" }],
    beats: [{ id: "w", at: 0.2, who: "a", do: "wave" }, { id: "w2", at: { after: "w" }, who: "b", do: "wave" }, { at: { after: "w2" }, who: "a", do: "bow" }],
  };
  const client = createMockClient(() => ({ text: JSON.stringify(dull) }));
  const rec = await generateOne({ llm: createLlm(client, {}), catalog, cfg, log: silent }, { title: "x", logline: "y" }, { format: "landscape", length: 20, seed: 5 });
  assert.equal(rec.status, "low_score");
  assert.ok(rec.score < 60);
  assert.ok(rec.attempts.some((a) => a.improve));
  assert.match(client.calls[1].messages.at(-1).content, /scored low/);
});

test("pipeline: critique sends the contact sheet image and can trigger a revision", async () => {
  const client = createMockClient((p) => {
    const sys = p.system[0].text;
    if (/You review/.test(sys)) return { text: '{"score":5,"revise":true,"notes":["Add a taunt at the start."]}' };
    if (isMeta(p)) return { text: '{"title":"T","description":"D","tags":[]}' };
    return { text: JSON.stringify(example(1)) };
  });
  const renderSheet = async () => Buffer.from("png");
  const rec = await generateOne({ llm: createLlm(client, {}), catalog, cfg, log: silent, renderSheet }, { title: "x", logline: "y" }, { format: "landscape", length: 20, seed: 5, critique: true });
  assert.equal(rec.status, "accepted");
  assert.equal(rec.revised, true);
  const crit = client.calls.find((c) => /You review/.test(c.system[0].text));
  assert.equal(crit.model, "claude-opus-5-5");
  assert.equal(crit.messages[0].content[0].type, "image");
  assert.equal(crit.messages[0].content[0].source.media_type, "image/png");
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

test("a KO beat that fires while the target is airborne lands into ko_fall, not knockdown", () => {
  const engine = createEngine({ catalog });
  assert.equal(engine.load(example(2)).ok, true);
  const late = engine.getEvents().filter((e) => e.actor === "rex" && e.type === "moveEvent" && e.storyT > 4.2);
  assert.ok(late.some((e) => e.move === "ko_fall"));
  assert.ok(!late.some((e) => e.move === "knockdown"));
});
