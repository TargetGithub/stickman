// Claude API adapter (Anthropic Messages API via the official SDK, loaded only when used).
// Adds: cached system prompt, output_config (effort, json_schema format), server-side refusal
// fallbacks on Sonnet/Opus, image parts as base64 image blocks. The SDK reads ANTHROPIC_API_KEY
// (or an `ant auth login` profile) from the environment; the key is never logged or stored.

import { SchemaRejected } from "./index.mjs";

const usesFallbacks = (model) => /^claude-(opus|sonnet)-5-5$|^claude-opus-5$/.test(model);
const bad = (e, re) => e?.status === 400 && re.test(e.message || "");

const toBlocks = (content) =>
  typeof content === "string"
    ? content
    : content.map((p) => (p.type === "image" ? { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } } : { type: "text", text: p.text }));

/**
 * @param {object} cfg  provider entry: { refusalFallback?: bool }
 * @param {object} [client]  an Anthropic client (tests pass a fake with messages/beta.messages.stream)
 */
export async function createAnthropicAdapter(cfg = {}, client = null) {
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic();
  }
  let fallbacks = cfg.refusalFallback !== false;

  return {
    name: "anthropic",
    async complete(req) {
      const params = {
        model: req.model,
        max_tokens: req.maxTokens ?? 32000,
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: req.messages.map((m) => ({ role: m.role, content: toBlocks(m.content) })),
        output_config: {
          ...(req.effort ? { effort: req.effort } : {}),
          ...(req.schema ? { format: { type: "json_schema", schema: req.schema } } : {}),
        },
      };
      let msg;
      for (;;) {
        try {
          msg = fallbacks && usesFallbacks(req.model)
            ? await client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }).finalMessage()
            : await client.messages.stream(params).finalMessage();
          break;
        } catch (e) {
          if (fallbacks && bad(e, /fallback/i)) {
            fallbacks = false;
            continue;
          }
          if (req.schema && bad(e, /schema|output_config|format/i)) throw new SchemaRejected(e.message);
          throw e;
        }
      }
      const u = msg.usage || {};
      return {
        text: msg.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
        stop: msg.stop_reason === "refusal" ? "refusal" : msg.stop_reason === "max_tokens" ? "max_tokens" : "end",
        refusalCategory: msg.stop_details?.category,
        model: msg.model || req.model,
        usage: { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens },
      };
    },
  };
}
