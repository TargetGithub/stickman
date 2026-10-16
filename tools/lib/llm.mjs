// Thin wrapper over the Anthropic Messages API for the generation pipeline (spec 18).
// - One call shape for every stage: cached static system prompt, JSON output, usage accounting.
// - Structured output (output_config.format) when the schema is accepted; if the API rejects the
//   schema (400), the wrapper retries in plain-JSON mode and remembers that for the rest of the run.
// - Refusals and truncation come back as errors the pipeline treats as a failed attempt.
// The client is injected so tests run offline with a mock (tools/lib/mock_client.mjs).
// The API key is read by the SDK from the environment; it is never logged or written to disk.

export class LlmError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind; // refusal | max_tokens | parse | api
    Object.assign(this, extra);
  }
}

/** Parse a JSON object from model text (tolerates code fences and stray prose around it). */
export function parseJsonText(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("no JSON object in the response");
  }
}

const usesFallbacks = (model) => /^claude-(opus|sonnet)-5-5$|^claude-opus-5$/.test(model);
const schemaRejected = (e) => e?.status === 400 && /schema|output_config|format|json/i.test(e.message || "");
const fallbackRejected = (e) => e?.status === 400 && /fallback/i.test(e.message || "");

/**
 * @param {object} client  an Anthropic client (or a mock with the same messages/beta.messages shape)
 * @param {object} cfg  { prices, structured: "auto"|"off", refusalFallback: bool, log?: (line) => void }
 */
export function createLlm(client, cfg = {}) {
  const state = {
    structured: cfg.structured !== "off",
    refusalFallback: cfg.refusalFallback !== false,
    usage: {}, // model → { calls, input, output, cacheRead, cacheWrite }
    downgrades: [],
  };
  const log = cfg.log || (() => {});

  function account(model, u = {}) {
    const m = (state.usage[model] ??= { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    m.calls++;
    m.input += u.input_tokens || 0;
    m.output += u.output_tokens || 0;
    m.cacheRead += u.cache_read_input_tokens || 0;
    m.cacheWrite += u.cache_creation_input_tokens || 0;
  }

  async function send(params) {
    if (state.refusalFallback && usesFallbacks(params.model)) {
      return client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }).finalMessage();
    }
    return client.messages.stream(params).finalMessage();
  }

  /**
   * One JSON-producing call.
   * @param {{ model, system: string, messages: object[], schema?: object, effort?: string, maxTokens?: number, stage: string }} req
   * @returns {Promise<{ json: object, text: string, message: object }>}
   */
  async function json(req) {
    const system = [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }];
    const build = () => ({
      model: req.model,
      max_tokens: req.maxTokens ?? 32000,
      system,
      messages: req.messages,
      output_config: {
        ...(req.effort ? { effort: req.effort } : {}),
        ...(state.structured && req.schema ? { format: { type: "json_schema", schema: req.schema } } : {}),
      },
    });
    let message;
    for (;;) {
      try {
        message = await send(build());
        break;
      } catch (e) {
        if (state.structured && req.schema && schemaRejected(e) && !fallbackRejected(e)) {
          state.structured = false;
          state.downgrades.push(`structured output off (${req.stage}): ${e.message.slice(0, 160)}`);
          log(`  note: the API rejected the output schema; continuing in plain-JSON mode`);
          continue;
        }
        if (state.refusalFallback && fallbackRejected(e)) {
          state.refusalFallback = false;
          state.downgrades.push(`refusal fallbacks off: ${e.message.slice(0, 160)}`);
          continue;
        }
        throw new LlmError("api", `${req.stage}: ${e.message}`, { status: e.status });
      }
    }
    account(message.model || req.model, message.usage);
    if (message.stop_reason === "refusal") {
      throw new LlmError("refusal", `${req.stage}: the model declined (${message.stop_details?.category ?? "no category"})`);
    }
    const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    if (message.stop_reason === "max_tokens") throw new LlmError("max_tokens", `${req.stage}: output was cut off at max_tokens`, { text });
    try {
      return { json: parseJsonText(text), text, message };
    } catch (e) {
      throw new LlmError("parse", `${req.stage}: ${e.message}`, { text });
    }
  }

  /** Estimated cost in USD from the price table { model: { input, output, cacheRead, cacheWrite } per 1M }. */
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
