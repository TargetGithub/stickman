#!/usr/bin/env node
// Copy-paste workflow for any chat UI (ChatGPT, Claude.ai, Gemini, Copilot, a local chat app ...).
// No API key, no network: this tool only writes prompts and checks the replies you paste back.
//
//   node tools/manual.mjs prompt --premise "A tiny ninja vs a giant robot" [--format portrait] [--length 30] [--tone comedic] [--copy]
//       → out/manual/prompt.md: paste it into a new chat
//   node tools/manual.mjs check <reply.txt | -> [--paste] [--render] [--copy]
//       → validates the reply. Valid: saves out/scripts/<slug>.json (and renders with --render).
//         Invalid: writes out/manual/fix_prompt.md: paste it into the same chat, then check again.
//   node tools/manual.mjs ideas [--count 5] [--tone T] [--format F] [--copy]   → premise brainstorm prompt
//   node tools/manual.mjs critique <script.json> [--copy]   → contact_sheet.png + critique prompt (attach the image)
//   node tools/manual.mjs meta <script.json> [--copy]       → YouTube title/description/tags prompt
//
// --copy puts the prompt on the clipboard; --paste reads the reply from the clipboard (macOS pbcopy/
// pbpaste, Windows clip, Linux xclip/wl-copy). Output folder: --out (default out).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { catalog } from "../data/index.js";
import { createEngine } from "../engine/index.js";
import { manualWritePrompt, manualIdeasPrompt, manualCritiquePrompt, manualMetadataPrompt, checkReply } from "./lib/manual.mjs";
import { loadHistory, avoidList } from "./lib/history.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const [cmd, ...args] = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);
const positional = () => args.find((a, i) => (a === "-" || !a.startsWith("--")) && !/^--(premise|format|length|tone|count|out|slug)$/.test(args[i - 1] || ""));
const OUT = opt("--out", "out");
const DIR = join(OUT, "manual");

function copy(text) {
  const tries = process.platform === "darwin" ? [["pbcopy", []]] : process.platform === "win32" ? [["clip", []]] : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]]];
  for (const [c, a] of tries) if (spawnSync(c, a, { input: text }).status === 0) return true;
  return false;
}
function paste() {
  const tries = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [["powershell", ["-command", "Get-Clipboard"]]] : [["wl-paste", []], ["xclip", ["-selection", "clipboard", "-o"]]];
  for (const [c, a] of tries) {
    const r = spawnSync(c, a, { encoding: "utf8" });
    if (r.status === 0) return r.stdout;
  }
  throw new Error("could not read the clipboard; save the reply to a file and pass its path");
}

function emit(file, text, what) {
  mkdirSync(DIR, { recursive: true });
  const path = join(DIR, file);
  writeFileSync(path, text);
  const copied = flag("--copy") && copy(text);
  console.log(`${what}: ${path} (${text.length} characters)${copied ? " — copied to the clipboard" : ""}`);
  return path;
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video";
const format = opt("--format", "landscape");
const length = Number(opt("--length", 30));

if (cmd === "prompt") {
  const text = opt("--premise", null);
  if (!text) {
    console.error('usage: node tools/manual.mjs prompt --premise "your idea" [--format portrait] [--length 30] [--tone comedic] [--copy]');
    process.exit(2);
  }
  const premise = { title: text.split(/[.!?]/)[0].slice(0, 60), logline: text, tone: opt("--tone", "any") };
  emit("prompt.md", manualWritePrompt(catalog, premise, { format, length, seed: randomInt(1, 2 ** 31 - 1) }), "prompt");
  console.log("Next: paste it into a new chat. Save the reply (or copy it) and run:\n  node tools/manual.mjs check --paste      (or: check reply.txt)");
} else if (cmd === "ideas") {
  const count = Number(opt("--count", 5));
  emit("ideas_prompt.md", manualIdeasPrompt(catalog, { count, tone: opt("--tone", null), format, length }, avoidList(loadHistory(join(OUT, "history.json")))), "ideas prompt");
  console.log('Next: paste it into a chat, pick a premise you like, then: node tools/manual.mjs prompt --premise "<its logline>"');
} else if (cmd === "check") {
  const src = flag("--paste") ? null : positional();
  if (!flag("--paste") && !src) {
    console.error("usage: node tools/manual.mjs check <reply.txt | -> [--render]   or   check --paste");
    process.exit(2);
  }
  const text = flag("--paste") ? paste() : src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
  const r = checkReply(text, catalog);
  console.log(r.ok ? `VALID. ${r.message}` : `NOT VALID YET. ${r.message}`);
  if (r.result) for (const i of [...r.result.errors, ...r.result.warnings]) console.log(`  ${i.code} at ${i.path || "(root)"}: ${i.message}`);
  if (!r.ok) {
    emit("fix_prompt.md", r.fixPrompt, "fix prompt");
    console.log("Next: paste the fix prompt into the SAME chat, then check the new reply.");
    process.exit(1);
  }
  let slug = opt("--slug", null) || slugify(r.script.meta.title);
  for (let i = 2; !opt("--slug", null) && existsSync(join(OUT, "scripts", `${slug}.json`)); i++) slug = `${slugify(r.script.meta.title)}-${i}`;
  const path = join(OUT, "scripts", `${slug}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(r.script, null, 2) + "\n");
  console.log(`saved: ${path}`);
  if (flag("--render")) {
    const rec = spawnSync(process.execPath, [join(HERE, "record.mjs"), path, "--out-dir", OUT, "--slug", slug], { stdio: "inherit" });
    process.exit(rec.status ?? 1);
  }
  console.log(`Next: preview it in the browser player (npm run serve, /web/player.html) or render it:\n  npm run record -- ${path}`);
} else if (cmd === "critique" || cmd === "meta") {
  const file = positional();
  if (!file) {
    console.error(`usage: node tools/manual.mjs ${cmd} <script.json> [--copy]`);
    process.exit(2);
  }
  const script = JSON.parse(readFileSync(file, "utf8"));
  const engine = createEngine({ catalog });
  const loaded = engine.load(script);
  if (!loaded.ok) {
    console.error(`the script is not valid; run: node tools/validate.mjs ${file}`);
    process.exit(1);
  }
  if (cmd === "meta") {
    emit("meta_prompt.md", manualMetadataPrompt(script, opt("--premise", null), loaded.timeline), "metadata prompt");
  } else {
    const { loadBackend } = await import("./lib/canvas.mjs");
    const { contactSheet } = await import("./lib/review_images.mjs");
    const backend = await loadBackend();
    mkdirSync(DIR, { recursive: true });
    const png = join(DIR, "contact_sheet.png");
    await backend.savePng(contactSheet(engine, backend), png);
    console.log(`image: ${png}`);
    emit("critique_prompt.md", manualCritiquePrompt(script, loaded.timeline), "critique prompt");
    console.log("Next: attach the image and paste the prompt into a chat that accepts images. Paste its notes into the writing chat and ask it to apply them.");
  }
} else {
  console.error("usage: node tools/manual.mjs <prompt|check|ideas|critique|meta> ...  (see the header of tools/manual.mjs or docs/USER_GUIDE.md)");
  process.exit(2);
}
