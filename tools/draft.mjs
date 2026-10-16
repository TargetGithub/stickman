#!/usr/bin/env node
// Draft catalog data with an LLM, check it, and render a review sheet (STORY_SPEC 5.5, S4.10).
// Nothing is written into data/: you review the sheet and copy an accepted draft yourself.
// Usage:
//   node tools/draft.mjs object "a red mailbox on a post" [--provider NAME --model ID | --mock]
//   node tools/draft.mjs theme "a snowy village at night" --manual        → writes the prompt to paste in any chat
//   node tools/draft.mjs object "..." --reply reply.txt                   → checks a pasted reply
// Output: out/drafts/<name>.<kind>.json and .png (--out to change).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { draftPrompt, checkDraft, mockDraft } from "./lib/draft.mjs";
import { createLlm, loadProvider, parseJsonText } from "./lib/llm/index.mjs";
import { loadBackend } from "./lib/canvas.mjs";
import { createEngine } from "../engine/index.js";
import { catalog } from "../data/index.js";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const flag = (n) => args.includes(n);
const [kind, description] = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(provider|model|reply|out)$/));
if (!["object", "theme"].includes(kind) || !description) {
  console.error('usage: node tools/draft.mjs object|theme "<description>" [--mock | --provider NAME --model ID | --manual | --reply file] [--out out/drafts]');
  process.exit(2);
}
const outDir = opt("--out", "out/drafts");
mkdirSync(outDir, { recursive: true });
const { system, user } = draftPrompt(kind, description, catalog);

if (flag("--manual")) {
  const path = join(outDir, `${kind}.prompt.md`);
  writeFileSync(path, `${system}\n\n---\n\n${user}\n\nReply with only the JSON object in a single \`\`\`json code block.\n`);
  console.log(`wrote ${path}: paste it into any chat, save the reply, then run:\n  node tools/draft.mjs ${kind} "${description}" --reply <reply.txt>`);
  process.exit(0);
}

let draft;
if (opt("--reply", null)) draft = parseJsonText(readFileSync(opt("--reply"), "utf8"));
else if (flag("--mock")) draft = mockDraft(kind, description, catalog);
else {
  const config = JSON.parse(readFileSync(new URL("./llm.config.json", import.meta.url), "utf8"));
  const provider = await loadProvider(config, { provider: opt("--provider", null), model: opt("--model", null) });
  const llm = createLlm(provider.adapter, { prices: provider.prices, structured: "off" });
  const messages = [{ role: "user", content: user }];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await llm.json({ model: provider.models.write, system, messages, schema: null, maxTokens: 8000, stage: `draft#${attempt}` });
    const problems = checkDraft(kind, res.json, catalog);
    draft = res.json;
    if (!problems.length) break;
    console.log(`attempt ${attempt}: ${problems.length} problem(s); asking for a fix`);
    messages.push({ role: "assistant", content: res.text }, { role: "user", content: `Fix these problems and reply with the whole JSON again:\n- ${problems.join("\n- ")}` });
  }
}

const problems = checkDraft(kind, draft, catalog);
const name = draft?.name || "draft";
writeFileSync(join(outDir, `${name}.${kind}.json`), JSON.stringify(draft, null, 2) + "\n");
if (problems.length) {
  console.log(`draft has ${problems.length} problem(s):\n- ${problems.join("\n- ")}\n(saved to ${join(outDir, `${name}.${kind}.json`)})`);
  process.exit(1);
}

// Review sheet through the public API: a tiny story using the draft, at three camera distances.
const cat = { ...catalog, objects: { ...catalog.objects }, themes: { ...catalog.themes } };
if (kind === "object") cat.objects[name] = draft.entry;
else {
  cat.themes[name] = draft.entry;
  cat.themeNames = [...catalog.themeNames, name];
}
const story = {
  version: 2,
  meta: { title: `Draft ${name}`, format: "landscape", seed: 1, kind: "clip" },
  cast: [{ id: "a", color: "#3fd8ff" }, { id: "b", body: "buddy", color: "#2fd3c0" }],
  locations: [{ id: "here", theme: kind === "theme" ? name : "white_stage", ...(kind === "object" ? { set: [{ id: "it", object: name, x: 1600 }] } : {}) }],
  scenes: [{ id: "s", location: "here", duration: 3, cast: [{ id: "a", x: kind === "object" ? 1330 : 1450, facing: 1 }, { id: "b", x: kind === "object" ? 1850 : 1750, facing: -1 }],
    camera: [{ at: 0, mode: "fixed", x: 1600, zoom: 0.6 }, { at: 1, mode: "fixed", x: 1600, zoom: 1 }, { at: 2, mode: "fixed", x: 1600, zoom: 1.7 }],
    beats: [{ at: 0.5, who: "a", do: "wave" }] }],
};
const backend = await loadBackend();
const engine = createEngine({ catalog: cat, createCanvas: backend.createCanvas });
const r = engine.load(story);
if (!r.ok) {
  console.log(`the draft does not load in a story:\n${r.errors.map((e) => `- ${e.code}: ${e.message}`).join("\n")}`);
  process.exit(1);
}
const frame = backend.createCanvas(r.width, r.height);
const sheet = backend.createCanvas(r.width / 2 * 3, r.height / 2);
const sctx = sheet.getContext("2d");
[0.7, 1.7, 2.7].forEach((t, i) => {
  engine.renderFrame(frame.getContext("2d"), Math.min(r.totalFrames - 1, Math.round(t * 60)));
  sctx.drawImage(frame, i * r.width / 2, 0, r.width / 2, r.height / 2);
});
const png = join(outDir, `${name}.${kind}.png`);
await backend.savePng(sheet, png);
console.log(`wrote ${png}: review it, then copy "${name}" from ${join(outDir, `${name}.${kind}.json`)} into data/${kind === "object" ? "objects" : "themes"}.js`);
