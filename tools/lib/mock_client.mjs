// Offline stand-in for the Anthropic client (same messages.stream(...).finalMessage() shape), used by
// tests and by `generate.mjs --mock` to exercise the pipeline without network calls or cost.
// The default responder answers each stage plausibly: premises, scripts built from the example
// scripts (every other first draft carries a misspelled move so the repair path runs), critique
// and metadata.

import { exampleScripts } from "./prompt_pack.mjs";

const lastUserText = (params) => {
  const m = params.messages[params.messages.length - 1];
  return typeof m.content === "string" ? m.content : m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
};

/** Default responder: (params, n) → { text, stop_reason? } */
export function defaultResponder() {
  const examples = exampleScripts().map((e) => JSON.parse(e.text));
  let drafts = 0;
  return (params) => {
    const sys = params.system.map((b) => b.text).join("");
    const user = lastUserText(params);
    if (sys.startsWith("You pitch premises")) {
      const count = Number(/Pitch (\d+)/.exec(user)?.[1] || 1);
      const premises = Array.from({ length: count }, (_, i) => ({
        title: `Mock Premise ${i + 1}`,
        logline: `Two rivals settle argument number ${i + 1}.`,
        tone: "comedic",
        theme: "arena",
        characters: [{ id: "red", role: "hero", look: "red" }, { id: "blue", role: "rival", look: "blue" }],
        beats: ["stare-down", "exchange", "big hit", "victory"],
        standout: "a slow-motion roundhouse",
      }));
      return { text: JSON.stringify({ premises }) };
    }
    if (sys.startsWith("You review")) return { text: JSON.stringify({ score: 7, revise: false, notes: ["Hold the victory pose a little longer."] }) };
    if (sys.startsWith("Write YouTube metadata")) return { text: JSON.stringify({ title: "Mock Title", description: "Two stick figures fight. Who wins?", tags: ["stickman", "animation"] }) };

    // Script writing / repair.
    const first = params.messages.length === 1;
    const premise = first ? JSON.parse(/premise:\s*([\s\S]*?)\n\nFormat:/.exec(user)?.[1] || "{}") : null;
    const seed = Number(/meta\.seed (\d+)/.exec(user)?.[1] || 1);
    const base = structuredClone(examples[drafts % examples.length]);
    if (premise?.title) base.meta.title = premise.title.slice(0, 80);
    base.meta.seed = seed;
    if (first) {
      drafts++;
      if (drafts % 2 === 0) {
        const atk = base.beats.find((b) => b.target);
        atk.do = `${atk.do}_x`; // unknown move → E_MOVE_UNKNOWN, fixed on repair
      }
    }
    return { text: JSON.stringify(base) };
  };
}

/**
 * @param {(params: object, n: number) => { text?: string, stop_reason?: string, error?: object }} responder
 * @returns client  with messages.stream and beta.messages.stream, plus .calls (recorded params)
 */
export function createMockClient(responder = defaultResponder()) {
  const calls = [];
  const stream = (params) => ({
    async finalMessage() {
      calls.push(structuredClone(params)); // snapshot: the pipeline keeps appending to its conversation
      const r = responder(params, calls.length);
      if (r.error) throw r.error;
      const text = r.text ?? "";
      return {
        model: params.model,
        stop_reason: r.stop_reason ?? "end_turn",
        stop_details: r.stop_details ?? null,
        content: [{ type: "text", text }],
        usage: { input_tokens: 200, output_tokens: Math.ceil(text.length / 4), cache_read_input_tokens: calls.length > 1 ? 5000 : 0, cache_creation_input_tokens: calls.length > 1 ? 0 : 5000 },
      };
    },
  });
  return { calls, messages: { stream }, beta: { messages: { stream } } };
}
