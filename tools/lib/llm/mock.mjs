// Offline adapter (no network, no cost), used by tests and by `generate.mjs --mock` / `--provider mock`.
// The default responder answers each stage plausibly: premises, scripts built from the example
// scripts (every other first draft carries a misspelled move so the repair path runs), critique
// and metadata. Tests pass their own responder.

import { exampleScripts } from "../prompt_pack.mjs";

const textOf = (m) => (typeof m.content === "string" ? m.content : m.content.filter((p) => p.type === "text").map((p) => p.text).join("\n"));

/** Default responder: (request) → { text, stop? } */
export function defaultResponder() {
  const examples = exampleScripts().map((e) => JSON.parse(e.text));
  let drafts = 0;
  return (req) => {
    const user = textOf(req.messages[req.messages.length - 1]);
    if (req.system.startsWith("You pitch premises")) {
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
    if (req.system.startsWith("You review")) return { text: JSON.stringify({ score: 7, revise: false, notes: ["Hold the victory pose a little longer."] }) };
    if (req.system.startsWith("Write YouTube metadata")) return { text: JSON.stringify({ title: "Mock Title", description: "Two stick figures fight. Who wins?", tags: ["stickman", "animation"] }) };

    // Script writing / repair.
    const first = req.messages.length === 1;
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
 * @param {(req: object, n: number) => { text?: string, stop?: string, refusalCategory?: string, error?: Error }} responder
 * @returns adapter  plus .calls (snapshots of every request)
 */
export function createMockAdapter(responder = defaultResponder()) {
  const calls = [];
  return {
    name: "mock",
    vision: true,
    calls,
    async complete(req) {
      calls.push(structuredClone(req)); // snapshot: the pipeline keeps appending to its conversation
      const r = responder(req, calls.length);
      if (r.error) throw r.error;
      const text = r.text ?? "";
      return {
        text,
        stop: r.stop ?? "end",
        refusalCategory: r.refusalCategory,
        model: req.model,
        usage: { input: 200, output: Math.ceil(text.length / 4), cacheRead: calls.length > 1 ? 5000 : 0, cacheWrite: calls.length > 1 ? 0 : 5000 },
      };
    },
  };
}
