// Adapter for any OpenAI-compatible Chat Completions endpoint: POST {baseURL}/chat/completions.
// Works with OpenAI, Google Gemini (OpenAI-compatible endpoint), Azure OpenAI, OpenRouter, Groq,
// Together, Mistral, DeepSeek, and local servers (Ollama, LM Studio, vLLM, llama.cpp).
// Uses plain fetch (Node 20+), no SDK. The API key is read from the environment variable named in
// the provider entry (apiKeyEnv); local servers usually need none.
//
// Provider entry fields:
//   baseURL          e.g. "https://api.openai.com/v1", "http://localhost:11434/v1"
//   apiKeyEnv        env var holding the key (omit for local servers)
//   headers          extra headers (e.g. OpenRouter's HTTP-Referer), optional
//   structured       "json_schema" (default) | "json_object" | "off"
//   maxTokensField   "max_tokens" (default) or "max_completion_tokens" (newer OpenAI models)
//   reasoningEffort  true to send the stage effort as reasoning_effort (reasoning models only)
//   vision           false if the model cannot read images (critique is then skipped)
//   stream           false to disable streaming (default on: slow models would otherwise hit Node's
//                    5-minute wait-for-headers limit before the first byte arrives)
//   timeoutSec       give up on one request after this many seconds (default 1800)

import { SchemaRejected, LlmError } from "./index.mjs";

const toParts = (content) =>
  typeof content === "string"
    ? content
    : content.map((p) => (p.type === "image" ? { type: "image_url", image_url: { url: `data:${p.mediaType};base64,${p.data}` } } : { type: "text", text: p.text }));

/**
 * @param {object} cfg  provider entry (see header)
 * @param {string} name  provider name, for messages
 * @param {typeof fetch} [fetchImpl]  injected in tests
 */
export function createOpenAICompatAdapter(cfg, name = "openai-compatible", fetchImpl = globalThis.fetch) {
  if (!cfg.baseURL) throw new LlmError("config", `provider '${name}' needs a baseURL`);
  const key = cfg.apiKeyEnv ? process.env[cfg.apiKeyEnv] : null;
  if (cfg.apiKeyEnv && !key) throw new LlmError("config", `provider '${name}' reads its API key from ${cfg.apiKeyEnv}, which is not set in this shell`);
  let mode = cfg.structured || "json_schema";
  const url = `${cfg.baseURL.replace(/\/$/, "")}/chat/completions`;

  return {
    name,
    vision: cfg.vision !== false,
    async complete(req) {
      const body = {
        model: req.model,
        messages: [{ role: "system", content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: toParts(m.content) }))],
        [cfg.maxTokensField || "max_tokens"]: req.maxTokens ?? 16000,
      };
      if (cfg.reasoningEffort && req.effort) body.reasoning_effort = req.effort;
      if (req.schema && mode === "json_schema") body.response_format = { type: "json_schema", json_schema: { name: "output", schema: req.schema, strict: false } };
      else if (req.schema && mode === "json_object") body.response_format = { type: "json_object" };

      if (cfg.stream !== false) {
        body.stream = true;
        body.stream_options = { include_usage: true };
      }

      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}), ...(cfg.headers || {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout((cfg.timeoutSec ?? 1800) * 1000),
      });
      if (res.ok && /event-stream/.test(res.headers?.get?.("content-type") || "")) return readStream(res, req.model);
      const text = await res.text();
      if (!res.ok) {
        // Schema not supported: step down json_schema → json_object → off, then let the core retry.
        if (res.status === 400 && body.response_format && /response_format|json_schema|schema|json_object/i.test(text)) {
          mode = mode === "json_schema" ? "json_object" : "off";
          throw new SchemaRejected(`${res.status} ${text.slice(0, 200)}`);
        }
        const hint = /context|too long|maximum.*tokens/i.test(text)
          ? " (the prompt needs about 8K tokens of context; raise the model's context window, e.g. Ollama: OLLAMA_CONTEXT_LENGTH=16384 ollama serve)"
          : "";
        const err = new Error(`${name} ${res.status}: ${text.slice(0, 300)}${hint}`);
        err.status = res.status;
        throw err;
      }
      // Non-streaming reply (stream: false, or a server that ignores "stream").
      const data = JSON.parse(text);
      const choice = data.choices?.[0] || {};
      const msg = choice.message || {};
      const content = typeof msg.content === "string" ? msg.content : (msg.content || []).map((p) => p.text || "").join("");
      return result(content, choice.finish_reason, msg.refusal, data.model || req.model, data.usage);
    },
  };
}

// prompt_tokens includes cached tokens; count them once, at the cached rate.
function result(text, finish, refusal, model, u = {}) {
  const cached = u?.prompt_tokens_details?.cached_tokens || 0;
  return {
    text,
    stop: refusal ? "refusal" : finish === "length" ? "max_tokens" : "end",
    refusalCategory: refusal || undefined,
    model,
    usage: { input: (u?.prompt_tokens || 0) - cached, output: u?.completion_tokens || 0, cacheRead: cached, cacheWrite: 0 },
  };
}

/** Read a server-sent-events stream of chat.completion.chunk objects. */
async function readStream(res, fallbackModel) {
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let refusal = "";
  let finish = null;
  let usage = null;
  let model = fallbackModel;
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      const ev = JSON.parse(payload);
      if (ev.error) throw Object.assign(new Error(`stream error: ${JSON.stringify(ev.error).slice(0, 300)}`), { status: ev.error.code || 500 });
      model = ev.model || model;
      if (ev.usage) usage = ev.usage;
      const c = ev.choices?.[0];
      if (!c) continue;
      text += c.delta?.content || "";
      refusal += c.delta?.refusal || "";
      finish = c.finish_reason || finish;
    }
  }
  return result(text, finish, refusal || null, model, usage || {});
}
