// Offline adapter (no network, no cost), used by tests and by `generate.mjs --mock` / `--provider mock`.
// The default responder answers each stage plausibly: premises, scripts built from the example
// scripts (every other first draft carries a misspelled move so the repair path runs), critique
// and metadata. Story stages (S8) answer from the "brave_heart" example story: its outline (scene lengths
// stretched to the requested minimum) and its scenes; the first draft of scene 2 has a misspelled move.
// Tests pass their own responder.

import { exampleScripts } from "../prompt_pack.mjs";
import { exampleStories } from "../story_prompts.mjs";
import { workbookExamples, PROMPT_EXAMPLE } from "../workbook_prompts.mjs";

const textOf = (m) => (typeof m.content === "string" ? m.content : m.content.filter((p) => p.type === "text").map((p) => p.text).join("\n"));

/** Default responder: (request) → { text, stop? } */
export function defaultResponder() {
  const examples = exampleScripts().map((e) => JSON.parse(e.text));
  let drafts = 0;
  return (req) => {
    const user = textOf(req.messages[req.messages.length - 1]);
    const story = storyStage(req, user);
    if (story) return story;
    if (req.system.startsWith("You write printable activity workbooks")) return workbookStage(req);
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

/** Story stages (S8): ideation, outline, scenes, critique; null for other requests. */
function storyStage(req, user) {
  const ex = exampleStories().find((e) => e.name.startsWith("brave"));
  if (req.system.startsWith("You pitch premises for animated stickman stories")) {
    const count = Number(/Pitch (\d+)/.exec(user)?.[1] || 1);
    return { text: JSON.stringify({ premises: Array.from({ length: count }, (_, i) => ({ title: `Mock Story ${i + 1}`, logline: "Two friends are parted and find each other again.", tone: "heartfelt", theme: "city_park", characters: [{ id: "kai", role: "hero", look: "blue" }], beats: ["play", "loss", "journey", "rescue", "reunion"], standout: "the reunion hug" })) }) };
  }
  if (req.system.startsWith("You plan stories")) {
    const min = Number(/at least (\d+) s/.exec(user)?.[1] || 300);
    const outline = structuredClone(ex.outline);
    const total = outline.scenes.reduce((n, sc) => n + sc.seconds, 0);
    for (const sc of outline.scenes) sc.seconds = Math.ceil((sc.seconds * min * 1.1) / total);
    const title = /"title":\s*"([^"]+)"/.exec(user)?.[1];
    if (title) outline.title = title;
    return { text: JSON.stringify(outline) };
  }
  if (req.system.startsWith("You write ONE scene")) {
    // Extend and revise requests get the previous scene back unchanged.
    if (req.messages.length > 1 && /too short|reviewer/.test(user)) return { text: textOf(req.messages[req.messages.length - 2]) };
    const i = Number(/Write scene (\d+) of/.exec(textOf(req.messages[0]))?.[1] || 1) - 1;
    const scene = structuredClone(ex.story.scenes[i % ex.story.scenes.length]);
    if (i === 1 && req.messages.length === 1) {
      const b = scene.beats.find((x) => x.who && x.who !== "world");
      b.do = `${b.do}_x`; // E_MOVE_UNKNOWN, fixed on repair
    }
    return { text: JSON.stringify(scene) };
  }
  if (req.system.startsWith("You review an animated stickman story")) return { text: JSON.stringify({ score: 7, revise: true, notes: ["s1: Hold the high five a moment longer."] }) };
  return null;
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

/**
 * Workbooks (WORKBOOK_SPEC 11): the prompt's example workbook titled after the topic, at the asked grade and seed.
 * The first draft asks for a maze too big for its grade, so the repair path runs.
 */
function workbookStage(req) {
  const user = textOf(req.messages[0]); // the task (later messages are repairs)
  const book = structuredClone(workbookExamples()[PROMPT_EXAMPLE]);
  const topic = /about: (.*)/.exec(user)?.[1] ?? "shapes";
  book.title = `Mock Workbook: ${topic}`.slice(0, 60);
  book.documents.forEach((d) => (d.title = book.title));
  book.seed = Number(/"seed": (\d+)/.exec(user)?.[1] || 1);
  if (req.messages.length === 1) {
    const maze = book.documents[0].pages.flatMap((p) => p.blocks).find((b) => b.activity === "maze");
    if (maze) maze.size = [20, 20];
  }
  return { text: JSON.stringify(book) };
}
