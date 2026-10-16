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

      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}), ...(cfg.headers || {}) },
        body: JSON.stringify(body),
      });
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
      const data = JSON.parse(text);
      const choice = data.choices?.[0] || {};
      const msg = choice.message || {};
      const u = data.usage || {};
      return {
        text: typeof msg.content === "string" ? msg.content : (msg.content || []).map((p) => p.text || "").join(""),
        stop: msg.refusal ? "refusal" : choice.finish_reason === "length" ? "max_tokens" : "end",
        refusalCategory: msg.refusal || undefined,
        model: data.model || req.model,
        // prompt_tokens includes cached tokens; count them once, at the cached rate.
        usage: { input: (u.prompt_tokens || 0) - (u.prompt_tokens_details?.cached_tokens || 0), output: u.completion_tokens, cacheRead: u.prompt_tokens_details?.cached_tokens || 0, cacheWrite: 0 },
      };
    },
  };
}
