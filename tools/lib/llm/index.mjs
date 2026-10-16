// Provider-neutral LLM layer for the generation pipeline (spec 18).
//
// The pipeline speaks one request shape; adapters translate it for each API:
//   request  { model, system: string, messages: [{ role: "user"|"assistant", content }], schema?, effort?, maxTokens?, stage }
//            content is a string or parts: { type: "text", text } | { type: "image", mediaType, data (base64) }
//   adapter  { name, complete(request) → { text, stop: "end"|"max_tokens"|"refusal", refusalCategory?, model, usage } }
//            usage: { input, output, cacheRead, cacheWrite } (tokens)
//            an adapter throws SchemaRejected when the API refuses the output schema
//
// Adapters: anthropic.mjs (Claude API), openai_compat.mjs (OpenAI, Gemini, Ollama, OpenRouter, Groq,
// LM Studio, vLLM, Azure OpenAI ... anything with /chat/completions), mock.mjs (offline).
// No adapter is imported unless it is used, so the Anthropic SDK is optional for other providers.

export class LlmError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind; // refusal | max_tokens | parse | api | config
    Object.assign(this, extra);
  }
}

/** Thrown by adapters when the API rejects the structured-output schema. */
export class SchemaRejected extends Error {}

/** Parse a JSON object from model text (tolerates code fences and stray prose around it). */
export function parseJsonText(text) {
  // Reasoning models served through OpenAI-compatible APIs may prefix <think>...</think>.
  const t = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("no JSON object in the response");
  }
}

/**
 * JSON-producing calls on top of an adapter: schema downgrade, typed failures, usage and cost.
 * @param {object} adapter  see header
 * @param {{ prices?: object, structured?: "auto"|"off", log?: (line: string) => void }} cfg
 */
export function createLlm(adapter, cfg = {}) {
  const state = { provider: adapter.name, structured: cfg.structured !== "off", usage: {}, downgrades: [] };
  const log = cfg.log || (() => {});

  function account(model, u = {}) {
    const m = (state.usage[model] ??= { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    m.calls++;
    for (const k of ["input", "output", "cacheRead", "cacheWrite"]) m[k] += u[k] || 0;
  }

  /** @returns {Promise<{ json: object, text: string }>} */
  async function json(req) {
    let res;
    for (;;) {
      try {
        res = await adapter.complete({ ...req, schema: state.structured ? req.schema : null });
        break;
      } catch (e) {
        if (e instanceof SchemaRejected && state.structured && req.schema) {
          state.structured = false;
          state.downgrades.push(`structured output off (${req.stage}): ${e.message.slice(0, 160)}`);
          log("  note: the API rejected the output schema; continuing in plain-JSON mode");
          continue;
        }
        if (e instanceof LlmError) throw e;
        throw new LlmError("api", `${req.stage}: ${e.message}`, { status: e.status });
      }
    }
    account(res.model || req.model, res.usage);
    if (res.stop === "refusal") throw new LlmError("refusal", `${req.stage}: the model declined (${res.refusalCategory ?? "no category"})`);
    if (res.stop === "max_tokens") throw new LlmError("max_tokens", `${req.stage}: output was cut off at max_tokens`, { text: res.text });
    try {
      return { json: parseJsonText(res.text), text: res.text };
    } catch (e) {
      throw new LlmError("parse", `${req.stage}: ${e.message}`, { text: res.text });
    }
  }

  /** Estimated cost in USD from { model: { input, output, cacheRead?, cacheWrite? } } per 1M tokens. */
  function cost() {
    let total = 0;
    for (const [model, u] of Object.entries(state.usage)) {
      const p = cfg.prices?.[model];
      if (!p) continue;
      total += (u.input * p.input + u.output * p.output + u.cacheRead * (p.cacheRead ?? p.input * 0.1) + u.cacheWrite * (p.cacheWrite ?? p.input * 1.25)) / 1e6;
    }
    return total;
  }

  return { json, cost, state };
}

const STAGES = ["ideation", "write", "flagship", "repair", "repairEscalate", "critique", "metadata"];

/**
 * Resolve a provider entry from llm.config.json into { adapter, models, effort, prices }.
 * Stage models fall back to models.default, then to --model.
 * @param {object} config  whole llm.config.json
 * @param {{ provider?: string, model?: string, mock?: boolean }} opts
 */
export async function loadProvider(config, opts = {}) {
  const name = opts.mock ? "mock" : opts.provider || config.provider;
  const p = name === "mock" ? { type: "mock" } : config.providers?.[name];
  if (!p) throw new LlmError("config", `unknown provider '${name}'. Configured: ${Object.keys(config.providers || {}).join(", ")}`);
  const models = {};
  for (const s of STAGES) models[s] = opts.model || p.models?.[s] || p.models?.default || (p.type === "mock" ? "mock-model" : null);
  const missing = STAGES.filter((s) => !models[s] || /^SET[-_ ]?ME/i.test(models[s]));
  if (missing.length) throw new LlmError("config", `provider '${name}' has no model for: ${missing.join(", ")}. Set providers.${name}.models in tools/llm.config.json or pass --model <id>.`);

  let adapter;
  if (p.type === "anthropic") adapter = await (await import("./anthropic.mjs")).createAnthropicAdapter(p);
  else if (p.type === "openai-compatible") adapter = (await import("./openai_compat.mjs")).createOpenAICompatAdapter(p, name);
  else if (p.type === "mock") adapter = (await import("./mock.mjs")).createMockAdapter();
  else throw new LlmError("config", `provider '${name}' has unknown type '${p.type}' (use anthropic, openai-compatible or mock)`);
  return { name, adapter, models, effort: p.effort || {}, prices: p.prices || {}, structured: p.structured || "auto" };
}
